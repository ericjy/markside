import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { chmod, mkdtemp, readFile, writeFile, rename, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { spawn } from "node:child_process"
import { once } from "node:events"
import { finishReview, parseReviewFile, setReviewerCommentStatus, sendReview } from "../cli/review-file.mjs"

const cli = resolve("cli/markside.mjs")
let folder: string
let doc: string
let sidecar: string
const children: ReturnType<typeof spawn>[] = []

function run(args: string[], env = process.env) {
  const child = spawn(process.execPath, [cli, ...args], { env, stdio: ["ignore", "pipe", "pipe"] })
  children.push(child)
  let stdout = "", stderr = ""
  child.stdout!.on("data", (chunk) => { stdout += chunk })
  child.stderr!.on("data", (chunk) => { stderr += chunk })
  const done = once(child, "exit").then(([code]) => ({ code, stdout, stderr }))
  const waiting = new Promise<void>((resolve) => {
    child.stderr!.on("data", () => { if (stderr.includes("Waiting for review")) resolve() })
  })
  return { child, done, waiting }
}

beforeEach(async () => {
  folder = await mkdtemp(join(tmpdir(), "markside-review-"))
  doc = join(folder, "plan #1.md")
  sidecar = `${doc}.review.json`
  await writeFile(doc, "# Plan\n\nFirst step.\n")
})
afterEach(async () => {
  for (const child of children.splice(0)) if (child.exitCode === null) child.kill()
  await rm(folder, { recursive: true, force: true })
})

async function send(id = "c1", body = "Explain why.") {
  const review = JSON.parse(await readFile(sidecar, "utf8"))
  const sent = sendReview(review, {
    docHash: "a".repeat(64),
    comments: [...review.comments.filter((comment: { id: string }) => comment.id !== id), { id, quote: "First step.", line: 3, body, status: "open" }],
  })
  await writeFile(`${sidecar}.tmp`, JSON.stringify(sent))
  await rename(`${sidecar}.tmp`, sidecar)
}

describe("markside CLI with real files", () => {
  it("keeps a sent Review across retries and starts the next Review with resolved comments kept", async () => {
    const first = run(["review", doc, "--no-open", "--timeout", "3"])
    await first.waiting
    await send()
    const received = await first.done
    const retry = await run(["review", doc, "--continue", "--no-open"]).done
    expect(retry.stdout).toBe(received.stdout)
    expect((await run(["address", doc, "c1", "--reply", "Done"]).done).code).toBe(0)
    const addressed = parseReviewFile(await readFile(sidecar, "utf8"), "plan #1.md")
    await writeFile(sidecar, JSON.stringify(finishReview(setReviewerCommentStatus(addressed, "c1", "resolved"))))
    expect((await run(["review", doc, "--continue", "--no-open"]).done).stdout).toContain("Review resolved")
    const next = run(["review", doc, "--no-open", "--timeout", "3"])
    await next.waiting
    expect(parseReviewFile(await readFile(sidecar, "utf8"), "plan #1.md")).toMatchObject({ status: "pending", comments: [{ id: "c1", status: "resolved" }] })
    await send("c2", "Follow-up in the next Review")
    expect((await next.done).stdout).not.toContain("Comment c1")
    const all = await run(["comments", doc]).done
    expect(all.stdout).toContain("Agent reply: Done")
    expect(all.stdout).toContain("Follow-up in the next Review")
  })

  it("waits across atomic replacement and returns an agent prompt", async () => {
    const process = run(["review", doc, "--no-open", "--timeout", "3"])
    await process.waiting
    await send()
    expect(await process.done).toMatchObject({ code: 0, stdout: expect.stringContaining("Got 1 comment") })
    const comments = await run(["comments", doc]).done
    expect(comments.stdout).toContain("Explain why.")
    expect((await run(["address", doc, "c1", "--reply", "Added rationale."]).done).code).toBe(0)
    expect(JSON.parse(await readFile(sidecar, "utf8"))).toMatchObject({
      status: "sent", comments: [{ status: "addressed", reply: "Added rationale." }],
    })
    const resolved = await run(["comments", doc]).done
    expect(resolved.stdout).toContain("[addressed]")
    expect(resolved.stdout).toContain("Added rationale.")
  })
  it("rejects agent resolution and waits after comments are addressed", async () => {
    const first = run(["review", doc, "--no-open", "--timeout", "3"])
    await first.waiting
    await send()
    await first.done
    await run(["address", doc, "c1", "--reply", "Clarified."]).done
    const rejected = await run(["resolve", doc, "c1"]).done
    expect(rejected.code).toBe(1)
    expect(rejected.stderr).toContain("reviewer resolves")
    const second = await run(["review", doc, "--no-open", "--timeout", "0.03"]).done
    expect(second.code).toBe(2)
    expect(JSON.parse(await readFile(sidecar, "utf8")).comments[0].status).toBe("addressed")
  })

  it("keeps waiting after the reviewer resolves every comment until they finish", async () => {
    const first = run(["review", doc, "--no-open", "--timeout", "3"])
    await first.waiting
    await send()
    await first.done
    await run(["address", doc, "c1", "--reply", "Clarified."]).done
    const current = parseReviewFile(await readFile(sidecar, "utf8"), "plan #1.md")
    const accepted = setReviewerCommentStatus(current, "c1", "resolved")
    await writeFile(sidecar, JSON.stringify(accepted))
    expect((await run(["review", doc, "--no-open", "--timeout", "0.03"]).done).code).toBe(2)
    const waiting = run(["review", doc, "--no-open", "--timeout", "3"])
    await waiting.waiting
    await writeFile(`${sidecar}.tmp`, JSON.stringify(finishReview(accepted)))
    await rename(`${sidecar}.tmp`, sidecar)
    expect(await waiting.done).toMatchObject({ code: 0, stdout: expect.stringContaining("Review resolved for plan #1.md") })
  })

  it("continues an addressed Review across timeout and receives the next round", async () => {
    const first = run(["review", doc, "--no-open", "--timeout", "3"])
    await first.waiting
    await send()
    await first.done
    await run(["address", doc, "c1", "--reply", "Clarified."]).done
    const addressed = await readFile(sidecar, "utf8")
    const timedOut = await run(["review", doc, "--continue", "--no-open", "--timeout", "0.03"]).done
    expect(timedOut).toMatchObject({ code: 2, stdout: expect.stringContaining("--continue --no-open") })
    expect(await readFile(sidecar, "utf8")).toBe(addressed)
    const waiting = run(["review", doc, "--continue", "--no-open", "--timeout", "3"])
    await waiting.waiting
    const reopened = setReviewerCommentStatus(parseReviewFile(addressed, "plan #1.md"), "c1", "open")
    // The CLI is watching: replace atomically, as Chrome and the CLI do, so it never reads a partial file.
    await writeFile(`${sidecar}.tmp`, JSON.stringify(reopened))
    await rename(`${sidecar}.tmp`, sidecar)
    // Reopening alone is pending; the reviewer must explicitly send it.
    await send()
    expect(await waiting.done).toMatchObject({ code: 0, stdout: expect.stringContaining("Got 1 comment") })
  })

  it("continues until resolution and does not restart an already resolved Review", async () => {
    const first = run(["review", doc, "--no-open", "--timeout", "3"])
    await first.waiting
    await send()
    await first.done
    await run(["address", doc, "c1"]).done
    const waiting = run(["review", doc, "--continue", "--no-open", "--timeout", "3"])
    await waiting.waiting
    const accepted = finishReview(setReviewerCommentStatus(parseReviewFile(await readFile(sidecar, "utf8"), "plan #1.md"), "c1", "resolved"))
    await writeFile(`${sidecar}.tmp`, JSON.stringify(accepted))
    await rename(`${sidecar}.tmp`, sidecar)
    expect(await waiting.done).toMatchObject({ code: 0, stdout: expect.stringContaining("Review resolved for") })
    const resolved = await readFile(sidecar, "utf8")
    const retry = await run(["review", doc, "--continue", "--no-open"]).done
    expect(retry).toMatchObject({ code: 0, stdout: expect.stringContaining("Review resolved for") })
    expect(await readFile(sidecar, "utf8")).toBe(resolved)
  })

  it("requires an existing request to continue", async () => {
    const result = await run(["review", doc, "--continue", "--no-open"]).done
    expect(result).toMatchObject({ code: 1, stderr: expect.stringContaining("No Review to continue") })
  })

  it.runIf(process.platform === "darwin")("opens Chrome with a correctly encoded file URL", async () => {
    const log = join(folder, "open-args.json")
    const launcher = join(folder, "open")
    await writeFile(launcher, '#!/usr/bin/env node\nrequire("node:fs").writeFileSync(process.env.MARKSIDE_LAUNCH_LOG, JSON.stringify(process.argv.slice(2)))\n')
    await chmod(launcher, 0o755)
    const result = await run(["review", doc, "--timeout", "0.03"], { ...process.env, PATH: `${folder}:${process.env.PATH}`, MARKSIDE_LAUNCH_LOG: log }).done
    expect(result.code).toBe(2)
    expect(result.stdout).toContain('--no-open" again')
    expect(JSON.parse(await readFile(log, "utf8"))).toEqual(["-a", "Google Chrome", expect.stringContaining("plan%20%231.md")])
  })

  it("keeps a send made between timeout and retry", async () => {
    const timedOut = await run(["review", doc, "--no-open", "--timeout", "0.03"]).done
    expect(timedOut.code).toBe(2)
    expect(timedOut.stdout.startsWith("STILL_WAITING:")).toBe(true)
    const requestedAt = JSON.parse(await readFile(sidecar, "utf8")).requestedAt
    await send()
    const retried = await run(["review", doc, "--no-open", "--timeout", "0.03"]).done
    expect(retried.code).toBe(0)
    expect(retried.stdout).toContain("Explain why.")
    expect(JSON.parse(await readFile(sidecar, "utf8")).requestedAt).toBe(requestedAt)
  })
  it("returns a note-only Review and waits again once the agent addresses the note", async () => {
    expect((await run(["review", doc, "--no-open", "--timeout", "0.03"]).done).code).toBe(2)
    const review = JSON.parse(await readFile(sidecar, "utf8"))
    await writeFile(sidecar, JSON.stringify(sendReview(review, { docHash: "a".repeat(64), note: "Looks good", comments: [] })))
    const received = await run(["review", doc, "--no-open", "--timeout", "0.03"]).done
    expect(received).toMatchObject({ code: 0, stdout: expect.stringContaining("Review note (ID note):\nLooks good") })
    expect((await run(["address", doc, "note", "--reply", "Thanks."]).done).code).toBe(0)
    expect(JSON.parse(await readFile(sidecar, "utf8"))).toMatchObject({ noteStatus: "addressed", noteReply: "Thanks." })
    expect((await run(["review", doc, "--continue", "--no-open", "--timeout", "0.03"]).done).code).toBe(2)
  })
  it("leaves pending state intact on Ctrl+C", async () => {
    const process = run(["review", doc, "--no-open"])
    await process.waiting
    process.child.kill("SIGINT")
    expect((await process.done).code).toBe(130)
    expect(JSON.parse(await readFile(sidecar, "utf8")).status).toBe("pending")
  })
  it("rejects missing documents and invalid timeouts clearly", async () => {
    expect((await run(["review", `${doc}.missing`, "--no-open"]).done).stderr).toContain("not found")
    expect((await run(["review", doc, "--timeout", "NaN"]).done).stderr).toContain("--timeout")
  })
  it("does not replace malformed review files", async () => {
    await writeFile(sidecar, "broken")
    expect((await run(["review", doc, "--no-open"]).done).code).toBe(1)
    expect(await readFile(sidecar, "utf8")).toBe("broken")
  })
})
