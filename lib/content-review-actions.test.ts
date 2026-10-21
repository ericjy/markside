import { sendReview, refreshReviewFile, setReviewerCommentStatus } from "../cli/review-file.mjs"
// @vitest-environment jsdom
import { act } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { useContentReview } from "../hooks/use-content-review"
import { md, mountQuestionCard } from "./markdown"
import { createEmptyReview, type ActiveReview } from "./review"
import { buildRenderedTextIndex } from "./review-dom"
import { renderHook, stubChromeStorage } from "./test-harness"

const sourceUrl = "file:///docs/PLAN.md"
const anchor = { exact: "Beta", prefix: "Alpha ", suffix: "", start: 6, end: 10, headingPath: [] }
const prior = { id: "c1", body: "Check Alpha", createdAt: "now", anchor: { ...anchor, exact: "Alpha", prefix: "", suffix: " Beta", start: 0, end: 5 } }
const review = { ...createEmptyReview(sourceUrl, "hash"), note: "Check the scope.", comments: [prior] }

afterEach(() => vi.unstubAllGlobals())

function setup(initial: ActiveReview | null = review, html = "<p>Alpha Beta</p>") {
  stubChromeStorage()
  const root = document.createElement("div")
  root.innerHTML = html
  const index = buildRenderedTextIndex(root, "hash")
  let saved = initial
  const send = vi.fn(async (_review?: ActiveReview) => true)
  const closeComposer = vi.fn()
  const openPanel = vi.fn()
  const options: Parameters<typeof useContentReview>[0] = {
    fileUrl: sourceUrl, isMdFile: true, previewVisible: true, review: initial,
    updateReview: (mutate) => { saved = mutate(saved) },
    reviewForMutation: (current) => current ?? createEmptyReview(sourceUrl, "hash"),
    currentReviewDocument: () => index, renderedTextIndexRef: { current: index },
    agentHandoff: { disabled: false, disabledReason: null, sending: false, error: null, send },
    highlights: { resolvedReviewComments: [], resolvedImportedComments: new Map(), reviewCommentIdAtPoint: () => null, importedReviewCommentIdAtPoint: () => null },
    overlay: { setReviewOverlayOpen: openPanel, closeReviewOverlay: vi.fn() },
    selection: {
      selectionAction: { anchor, range: document.createRange(), selectionPoint: { x: 0, y: 0 }, toolbarPosition: { x: 0, y: 0 }, composerPosition: { x: 0, y: 0 }, sourceLine: 1 },
      selectionComposerOpen: true, selectionComposerBody: "Clarify Beta", selectionComposerCopyState: "idle",
      selectionComposerSelectionRef: { current: { start: 0, end: 0 } }, selectionComposerTextareaRef: { current: null },
      selectionPresetPickerOpen: false, quickCommentMenuOpen: false, quickCommentPointerDismissRef: { current: false },
      quickCommentTriggerRef: { current: null }, selectionToolbarRef: { current: null },
      setSelectionAction: vi.fn(), setSelectionComposerBody: vi.fn(), setSelectionComposerCopyState: vi.fn(),
      setSelectionPresetPickerOpen: vi.fn(), setQuickCommentMenuOpen: vi.fn(), captureReviewSelection: vi.fn(),
      closeSelectionComposer: closeComposer, openSelectionComposer: vi.fn(), openSelectionComposerAt: vi.fn(), insertSelectionComposerPreset: vi.fn(),
    },
    setSelectedReviewId: vi.fn(), setSelectedImportedCommentId: vi.fn(), setReviewSelectionVersion: vi.fn(),
    setCopyReviewStatus: vi.fn(), setReviewCopyReload: vi.fn(), setClipboardFallback: vi.fn(),
    readabilityResultsRef: { current: [] }, saveReadabilityResults: vi.fn(),
    diskContentRef: { current: "Alpha Beta" }, hasUnsavedDraftRef: { current: false },
    setReviewPromptReady: vi.fn(), trackReviewPromptActivity: vi.fn(),
  }
  const hook = renderHook(useContentReview, options)
  return { hook, options, root, send, closeComposer, openPanel, saved: () => saved }
}

describe("save and send from the comment composer", () => {
  it("deletes a draft and restores its identity and position without removing newer comments", () => {
    const { hook, options, saved } = setup()
    let undo: (() => void) | void
    act(() => { undo = hook.result.current.deleteReviewCommentById(prior.id) })
    expect(saved()!.comments).toEqual([])
    options.updateReview((current) => ({ ...current!, comments: [{ ...prior, id: "new" }] }))
    act(() => undo!())
    expect(saved()!.comments.map(({ id }) => id)).toEqual([prior.id, "new"])
    expect(saved()!.comments[0]).toEqual(prior)
    hook.unmount()
  })

  it("restores the only comment after its empty Review was dropped from storage", () => {
    const { hook, options, saved } = setup({ ...review, note: "" })
    let undo: (() => void) | void
    act(() => { undo = hook.result.current.deleteReviewCommentById(prior.id) })
    // Storage deletes a Review with no items, so the next load yields null.
    options.updateReview(() => null)
    act(() => undo!())
    expect(saved()!.comments).toEqual([prior])
    expect(saved()!.sourceUrl).toBe(sourceUrl)
    hook.unmount()
  })

  it("does not delete comments already recorded in the current sidecar", () => {
    const { hook, options, saved } = setup()
    const file = sendReview(refreshReviewFile(null, "PLAN.md"), { docHash: "a".repeat(64), comments: [{ id: prior.id, quote: prior.anchor.exact, line: 1, body: prior.body, status: "open" }] })
    hook.rerender({ ...options, agentHandoff: { ...options.agentHandoff!, file } })
    act(() => { expect(hook.result.current.deleteReviewCommentById(prior.id)).toBeUndefined() })
    expect(saved()!.comments).toEqual([prior])
    hook.unmount()
  })

  it("clears only drafts, retains sent feedback, and leaves the panel open without sending", () => {
    const draft = { ...review, note: "Unsent guidance", comments: [{ ...prior, body: "Unsent edit" }, { ...prior, id: "new" }] }
    const { hook, options, saved, send } = setup(draft)
    const file = sendReview(refreshReviewFile(null, "PLAN.md"), { docHash: "a".repeat(64), note: review.note, comments: [{ id: prior.id, quote: prior.anchor.exact, line: 1, body: prior.body, status: "open" }] })
    const original = structuredClone(file)
    hook.rerender({ ...options, agentHandoff: { ...options.agentHandoff!, file } })
    act(() => hook.result.current.clearReview())
    expect(saved()).toMatchObject({ note: review.note, comments: [prior] })
    expect(file).toEqual(original)
    expect(send).not.toHaveBeenCalled()
    expect(options.overlay.closeReviewOverlay).not.toHaveBeenCalled()
    hook.unmount()
  })

  it("clears the local review and closes the panel in the copy-prompt workflow", () => {
    const local = { ...review, importedRounds: [{ id: "old", reviewerName: null, note: "Earlier feedback", comments: [prior], createdAt: "now" }] }
    const { hook, options, saved } = setup(local)
    hook.rerender({ ...options, agentHandoff: undefined })
    act(() => hook.result.current.clearReview())
    expect(saved()).toBeNull()
    expect(options.overlay.closeReviewOverlay).toHaveBeenCalledWith(true)
    hook.unmount()
  })

  it("persists manual resolution locally and routes only sent comments to the sidecar", () => {
    const { hook, options, saved, send } = setup(review)
    hook.rerender({ ...options, agentHandoff: undefined })
    act(() => hook.result.current.changeReviewCommentStatus(prior.id, "resolved"))
    expect(saved()?.comments[0].localStatus).toBe("resolved")
    hook.rerender({ ...options, review: structuredClone(saved()), agentHandoff: undefined })
    expect(saved()?.comments[0].localStatus).toBe("resolved")
    act(() => hook.result.current.changeReviewCommentStatus(prior.id, "open"))
    expect(saved()?.comments[0].localStatus).toBe("open")
    const file = sendReview(refreshReviewFile(null, "PLAN.md"), { docHash: "a".repeat(64), comments: [{ id: prior.id, quote: prior.anchor.exact, line: 1, body: prior.body, status: "open" }] })
    const changeStatus = vi.fn()
    const before = structuredClone(saved())
    hook.rerender({ ...options, review: saved(), agentHandoff: { ...options.agentHandoff!, file, changeStatus } })
    act(() => hook.result.current.changeReviewCommentStatus(prior.id, "resolved"))
    expect(changeStatus).toHaveBeenCalledWith(prior.id, "resolved")
    expect(saved()).toEqual(before)
    expect(send).not.toHaveBeenCalled()
    hook.unmount()
  })

  it("creates a distinct Draft on the same passage after a Review is complete", () => {
    const initial = { ...review, comments: [{ ...prior, anchor }] }
    const { hook, options, saved } = setup(initial)
    const sent = sendReview(refreshReviewFile(null, "PLAN.md"), { docHash: "a".repeat(64), comments: [{ id: prior.id, quote: anchor.exact, line: 1, body: prior.body, status: "open" }] })
    const file = setReviewerCommentStatus(sent, prior.id, "resolved")
    hook.rerender({ ...options, agentHandoff: { ...options.agentHandoff!, file, completed: true } })
    act(() => hook.result.current.saveSelectionComposerComment())
    expect(saved()?.comments).toHaveLength(2)
    expect(saved()?.comments[0]).toEqual(initial.comments[0])
    expect(saved()?.comments[1]).toMatchObject({ body: "Clarify Beta", reviewMode: "agent" })
    expect(saved()?.comments[1].id).not.toBe(prior.id)
    hook.unmount()
  })

  it("keeps ordinary Save local so the user can collect more comments", () => {
    const { hook, send, saved, closeComposer } = setup()
    act(() => hook.result.current.saveSelectionComposerComment())
    expect(saved()?.comments).toHaveLength(2)
    expect(send).not.toHaveBeenCalled()
    expect(closeComposer).toHaveBeenCalledOnce()
    hook.unmount()
  })

  it("does not save or send an empty comment", async () => {
    const { hook, options, send, saved } = setup()
    hook.rerender({ ...options, selection: { ...options.selection, selectionComposerBody: "  " } })
    await act(async () => hook.result.current.sendSelectionComposerComment())
    expect(send).not.toHaveBeenCalled()
    expect(saved()).toBe(review)
    hook.unmount()
  })
  it("sends the new comment with the existing comments and overall feedback during the same action", async () => {
    const { hook, send, closeComposer, saved } = setup()
    send.mockImplementation(async () => {
      expect(closeComposer).not.toHaveBeenCalled()
      return true
    })
    await act(async () => hook.result.current.sendSelectionComposerComment())
    expect(send).toHaveBeenCalledOnce()
    const sent = send.mock.calls[0][0]!
    expect(sent.note).toBe(review.note)
    expect(sent.comments.map(({ body }) => body)).toEqual(["Check Alpha", "Clarify Beta"])
    expect(saved()?.comments).toEqual(sent.comments)
    expect(closeComposer).toHaveBeenCalledOnce()
    hook.unmount()
  })

  it("can send the very first comment before React has rendered the new Review", async () => {
    const { hook, send, saved } = setup(null)
    await act(async () => hook.result.current.sendSelectionComposerComment())
    expect(send.mock.calls[0][0]?.comments).toHaveLength(1)
    expect(saved()?.comments[0].body).toBe("Clarify Beta")
    hook.unmount()
  })

  it("sends updated text when the selected passage already has a comment", async () => {
    const existing = { ...review, comments: [{ ...prior, anchor }] }
    const { hook, send, saved } = setup(existing)
    await act(async () => hook.result.current.sendSelectionComposerComment())
    expect(send.mock.calls[0][0]?.comments).toMatchObject([{ id: "c1", body: "Clarify Beta" }])
    expect(saved()?.comments).toHaveLength(1)
    hook.unmount()
  })

  it("retains the saved comment for retry when sending fails or is cancelled", async () => {
    const { hook, send, closeComposer, openPanel, saved } = setup()
    send.mockResolvedValue(false)
    await act(async () => hook.result.current.sendSelectionComposerComment())
    expect(saved()?.comments).toHaveLength(2)
    expect(openPanel).toHaveBeenCalledWith(true)
    expect(closeComposer).toHaveBeenCalledOnce()
    expect(send).toHaveBeenCalledOnce()
    hook.unmount()
  })
})

describe("question card answers", () => {
  const question = md.render("> [!QUESTION]\n> ### Q3. Where?\n>\n> - **A. Sibling.** Next to it.\n> - **B. Inside.** In the plan.\n>\n> **Recommended: A.** Stable.")
  const questionSetup = (initial: ActiveReview | null = null) => {
    const result = setup(initial, question)
    const card = mountQuestionCard(result.root.querySelector<HTMLElement>(".markdown-alert-question")!)!
    return { ...result, card }
  }

  it("sends the option letter as a comment on the question heading in one action", async () => {
    const { hook, send, saved, card } = questionSetup()
    await act(async () => hook.result.current.answerQuestion(card.target, "A"))
    expect(send).toHaveBeenCalledOnce()
    expect(send.mock.calls[0][0]?.comments).toMatchObject([{ body: "A", anchor: { exact: "Q3. Where?", headingPath: ["Q3. Where?"] } }])
    expect(saved()?.comments).toHaveLength(1)
    hook.unmount()
  })

  it("changes an earlier answer instead of adding a second comment", async () => {
    const { hook, options, send, saved, card } = questionSetup()
    await act(async () => hook.result.current.answerQuestion(card.target, "A"))
    hook.rerender({ ...options, review: saved() })
    await act(async () => hook.result.current.answerQuestion(card.target, "B"))
    expect(saved()?.comments.map(({ body }) => body)).toEqual(["B"])
    expect(send.mock.calls[1][0]?.comments.map(({ body }) => body)).toEqual(["B"])
    hook.unmount()
  })

  it("adds a local comment without sending when no agent Review is active", () => {
    const { hook, options, send, saved, card } = questionSetup()
    hook.rerender({ ...options, agentHandoff: undefined })
    act(() => hook.result.current.answerQuestion(card.target, "B"))
    expect(send).not.toHaveBeenCalled()
    expect(saved()?.comments).toMatchObject([{ body: "B", reviewMode: "local" }])
    hook.unmount()
  })

  it("ignores answers while a send is in progress", () => {
    const { hook, options, send, saved, card } = questionSetup()
    hook.rerender({ ...options, agentHandoff: { ...options.agentHandoff!, sending: true } })
    act(() => hook.result.current.answerQuestion(card.target, "A"))
    expect(send).not.toHaveBeenCalled()
    expect(saved()).toBeNull()
    hook.unmount()
  })

  it("opens the comment composer on the question heading for a free-text answer", () => {
    const { hook, options, card } = questionSetup()
    act(() => hook.result.current.composeQuestionAnswer(card.target, { x: 10, y: 20 }))
    expect(options.selection.openSelectionComposerAt).toHaveBeenCalledWith(
      expect.objectContaining({ exact: "Q3. Where?" }),
      expect.anything(),
      { x: 10, y: 20 },
    )
    hook.unmount()
  })

  it("reports the current answer and its send status", () => {
    const { hook, options, card } = questionSetup()
    const block = { start: 12, end: 22 }
    const answer = { id: "q3", body: "A", createdAt: "now", reviewMode: "agent" as const, anchor: { ...anchor, exact: "Q3. Where?", start: block.start, end: block.end } }
    expect(hook.result.current.questionAnswer(card.target)).toBeNull()
    hook.rerender({
      ...options,
      review: { ...review, comments: [answer] },
      highlights: { ...options.highlights, resolvedReviewComments: [{ ...answer, displayNumber: 1, status: "anchored", range: { start: block.start, end: block.end } }] },
    })
    expect(hook.result.current.questionAnswer(card.target)).toEqual({ body: "A", status: "Draft" })
    hook.unmount()
  })
})
