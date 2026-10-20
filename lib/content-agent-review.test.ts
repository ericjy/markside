import { refreshReviewFile, sendReview, addressReviewComment, setReviewerCommentStatus, type AgentReviewFile } from "../cli/review-file.mjs"
// @vitest-environment jsdom
import { act } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { useContentAgentReview } from "../hooks/use-content-agent-review"
import { createEmptyReview } from "./review"
import { renderHook, flush } from "./test-harness"

const comment = { id: "c1", body: "Clarify", createdAt: "now", anchor: { exact: "Build feature", prefix: "", suffix: "", start: 0, end: 13, headingPath: [] } }
const review = { ...createEmptyReview("file:///docs/PLAN.md", "hash"), comments: [comment] }

function setup(status: AgentReviewFile["status"] = "sent") {
  let file: AgentReviewFile = {
    version: 1, doc: "PLAN.md", docHash: "a".repeat(64), requestedAt: "2026-10-19T07:00:00Z", sentAt: "2026-10-19T07:01:00Z", status,
    comments: [{ id: "c1", quote: "Build feature", line: 3, body: "Clarify", status: "open", reply: "" }],
  }
  const sendMessage = vi.fn((_message, callback) => callback({ text: JSON.stringify(file) }))
  vi.stubGlobal("chrome", { runtime: { sendMessage } })
  const options: Parameters<typeof useContentAgentReview>[0] = {
    fileUrl: review.sourceUrl, enabled: true, open: true, reloadVersion: 0,
    openReview: vi.fn(), review, openDirectory: vi.fn(async () => false),
    diskContentRef: { current: "Build feature" }, hasUnsavedDraftRef: { current: false }, renderedTextIndexRef: { current: null },
  }
  const hook = renderHook(useContentAgentReview, options)
  return {
    hook, options, sendMessage,
    replaceFile: (next: AgentReviewFile) => { file = next },
    address: () => { file = { ...file, comments: [{ ...file.comments[0], status: "addressed", reply: "Changed to Create the feature." }] } },
    resolve: () => { file = { ...file, status: "resolved", comments: [{ ...file.comments[0], status: "resolved", reply: "Changed to Create the feature." }] } },
  }
}

afterEach(() => vi.unstubAllGlobals())

describe("local agent Review result discovery", () => {
  it("re-reads silently for discovery and reports each explicit check once", async () => {
    const { hook, options, sendMessage } = setup("pending")
    await flush()
    const onSessionChecked = vi.fn()
    sendMessage.mockClear()
    hook.rerender({ ...options, onSessionChecked, discoveryVersion: 1 })
    await flush()
    expect(sendMessage).toHaveBeenCalled()
    expect(onSessionChecked).not.toHaveBeenCalled()
    hook.rerender({ ...options, onSessionChecked, discoveryVersion: 1, sessionCheckVersion: 1 })
    await flush()
    expect(onSessionChecked).toHaveBeenCalledOnce()
    expect(onSessionChecked).toHaveBeenLastCalledWith(true)
    hook.rerender({ ...options, onSessionChecked, discoveryVersion: 2, sessionCheckVersion: 1 })
    await flush()
    expect(onSessionChecked).toHaveBeenCalledOnce()
    hook.unmount()
  })

  it("reports when the first sidecar check finishes, including when none exists", async () => {
    const { hook, options, sendMessage } = setup("pending")
    sendMessage.mockImplementation((_message, callback) => callback({ text: "" }))
    const onLoaded = vi.fn()
    hook.rerender({ ...options, reloadVersion: 1, onLoaded })
    await flush()
    expect(onLoaded).toHaveBeenCalledWith(review.sourceUrl)
    expect(hook.result.current).toBeUndefined()
    hook.unmount()
  })

  it("discovers a newly created session on an explicit setup check without reopening or reloading", async () => {
    const { hook, options, sendMessage } = setup("pending")
    sendMessage.mockImplementation((_message, callback) => callback({ text: "" }))
    await flush()
    hook.rerender({ ...options, sessionCheckVersion: 0 })
    await flush()
    expect(hook.result.current).toBeUndefined()
    const fresh = refreshReviewFile(null, "PLAN.md")
    sendMessage.mockImplementation((_message, callback) => callback({ text: JSON.stringify(fresh) }))
    hook.rerender({ ...options, sessionCheckVersion: 1 })
    await flush()
    expect(hook.result.current?.file).toEqual(fresh)
    expect(hook.result.current?.completed).toBe(false)
    expect(hook.result.current?.disabled).toBe(false)
    expect(options.review?.comments).toEqual([comment])
    hook.unmount()
  })

  it("restores sent comments missing from the browser once", async () => {
    const { hook, options, replaceFile } = setup()
    await flush()
    const sent = sendReview(refreshReviewFile(null, "PLAN.md"), {
      docHash: "a".repeat(64), comments: [{ id: "disk", quote: "Build feature", line: 3, body: "Clarify", status: "open" }],
    })
    const fresh = refreshReviewFile(setReviewerCommentStatus(addressReviewComment(sent, "disk", "Done"), "disk", "resolved"), "PLAN.md")
    replaceFile(fresh)
    const updateReview = vi.fn()
    hook.rerender({ ...options, updateReview, reloadVersion: 1 })
    await flush()
    expect(updateReview).toHaveBeenCalledOnce()
    const restored = updateReview.mock.calls[0][0](review)
    expect(restored.comments.map(({ id }: { id: string }) => id)).toEqual(["disk", "c1"])
    hook.rerender({ ...options, review: restored, updateReview, reloadVersion: 1 })
    await flush()
    expect(updateReview).toHaveBeenCalledOnce()
    expect(hook.result.current?.results?.get("disk")?.status).toBe("resolved")
    hook.unmount()
  })

  it("requests folder access during the click when sending the first newly saved comment", async () => {
    const { hook, options } = setup("pending")
    hook.rerender({ ...options, review: null })
    await flush()
    expect(hook.result.current?.disabled).toBe(true)
    let sending: Promise<boolean> | undefined
    act(() => { sending = hook.result.current?.send(review) })
    expect(options.openDirectory).toHaveBeenCalledWith("readwrite")
    await act(async () => { expect(await sending).toBe(false) })
    expect(hook.result.current?.error).toBeNull()
    hook.unmount()
  })
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
