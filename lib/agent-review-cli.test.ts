import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { mkdtemp, readFile, writeFile, rename, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { spawn } from "node:child_process"
import { once } from "node:events"

const cli = resolve("cli/markside.mjs")
let folder: string
let doc: string
let sidecar: string
const children: ReturnType<typeof spawn>[] = []

function run(args: string[]) {
  const child = spawn(process.execPath, [cli, ...args], { stdio: ["ignore", "pipe", "pipe"] })
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

async function send() {
  const review = JSON.parse(await readFile(sidecar, "utf8"))
  Object.assign(review, {
    status: "sent", sentAt: new Date().toISOString(), docHash: "a".repeat(64),
    comments: [{ id: "c1", quote: "First step.", line: 3, body: "Explain why.", status: "open" }],
  })
  await writeFile(`${sidecar}.tmp`, JSON.stringify(review))
  await rename(`${sidecar}.tmp`, sidecar)
}

describe("markside CLI with real files", () => {
  it("waits across atomic replacement and returns an agent prompt", async () => {
    const process = run(["review", doc, "--no-open", "--timeout", "3"])
    await process.waiting
    await send()
    expect(await process.done).toMatchObject({ code: 0, stdout: expect.stringContaining("Got 1 comment") })
    const comments = await run(["comments", doc]).done
    expect(comments.stdout).toContain("Explain why.")
    expect((await run(["resolve", doc, "c1", "--reply", "Added rationale."]).done).code).toBe(0)
    expect(JSON.parse(await readFile(sidecar, "utf8"))).toMatchObject({
      status: "resolved", comments: [{ status: "resolved", reply: "Added rationale." }],
    })
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
