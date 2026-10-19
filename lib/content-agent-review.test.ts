// @vitest-environment jsdom
import { act } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { useContentAgentReview } from "../hooks/use-content-agent-review"
import { createEmptyReview } from "./review"
import { renderHook, flush } from "./test-harness"

const comment = { id: "c1", body: "Clarify", createdAt: "now", anchor: { exact: "Build feature", prefix: "", suffix: "", start: 0, end: 13, headingPath: [] } }
const review = { ...createEmptyReview("file:///docs/PLAN.md", "hash"), comments: [comment] }

function setup(status = "sent") {
  let file = {
    version: 1, doc: "PLAN.md", docHash: "a".repeat(64), requestedAt: "2026-10-19T07:00:00Z", sentAt: "2026-10-19T07:01:00Z", status,
    comments: [{ id: "c1", quote: "Build feature", line: 3, body: "Clarify", status: "open", reply: "" }],
  }
  const sendMessage = vi.fn((_message, callback) => callback({ text: JSON.stringify(file) }))
  vi.stubGlobal("chrome", { runtime: { sendMessage } })
  const options = {
    fileUrl: review.sourceUrl, enabled: true, open: true, reloadVersion: 0,
    openReview: vi.fn(), review, openDirectory: vi.fn(async () => false),
    diskContentRef: { current: "Build feature" }, hasUnsavedDraftRef: { current: false }, renderedTextIndexRef: { current: null },
  }
  const hook = renderHook(useContentAgentReview, options)
  return {
    hook, options, sendMessage,
    address: () => { file = { ...file, comments: [{ ...file.comments[0], status: "addressed", reply: "Changed to Create the feature." }] } },
    resolve: () => { file = { ...file, status: "resolved", comments: [{ ...file.comments[0], status: "resolved", reply: "Changed to Create the feature." }] } },
  }
}

afterEach(() => vi.unstubAllGlobals())

describe("local agent Review result discovery", () => {
  it("loads the resolved results on explicit Reload even if the document text is unchanged", async () => {
    const { hook, options, resolve } = setup()
    await flush()
    expect(hook.result.current?.results?.get("c1")?.status).toBe("open")
    resolve()
    hook.rerender({ ...options, reloadVersion: 1 })
    await flush()
    expect(hook.result.current?.completed).toBe(true)
    expect(hook.result.current?.results?.get("c1")).toMatchObject({ status: "resolved", reply: "Changed to Create the feature." })
    hook.unmount()
  })
  it("reads replies when Review is reopened", async () => {
    const { hook, options, resolve } = setup()
    await flush()
    hook.rerender({ ...options, open: false })
    await flush()
    resolve()
    hook.rerender(options)
    await flush()
    expect(hook.result.current?.results?.get("c1")?.reply).toBe("Changed to Create the feature.")
    hook.unmount()
  })
  it("loads addressed comments without treating them as accepted or sending them again", async () => {
    const { hook, options, address } = setup()
    await flush()
    address()
    hook.rerender({ ...options, reloadVersion: 1 })
    await flush()
    expect(hook.result.current?.completed).toBe(false)
    expect(hook.result.current?.results?.get("c1")?.status).toBe("addressed")
    expect(hook.result.current?.disabled).toBe(true)
    expect(hook.result.current?.changeStatus).toBeTypeOf("function")
    hook.unmount()
  })
  it("reports the folder to choose and keeps the Review intact when the picker is cancelled", async () => {
    const { hook, options } = setup("pending")
    await flush()
    expect(hook.result.current?.folderToChoose).toBe("/docs/")
    expect(options.openDirectory).not.toHaveBeenCalled()
    await act(async () => hook.result.current?.send())
    await flush()
    expect(options.openDirectory).toHaveBeenCalledWith("readwrite")
    expect(hook.result.current?.error).toBeNull()
    expect(hook.result.current?.results?.get("c1")?.status).toBe("open")
    hook.unmount()
  })

  it("does not reread files when only the draft or comment text changes", async () => {
    const { hook, options, sendMessage } = setup()
    await flush()
    const reads = sendMessage.mock.calls.length
    hook.rerender({ ...options, review: { ...review, comments: [{ ...comment, body: "A new question" }] } })
    await flush()
    expect(sendMessage).toHaveBeenCalledTimes(reads)
    expect(hook.result.current?.results?.size).toBe(0)
    hook.unmount()
  })
})
