import { refreshReviewFile, sendReview, addressReviewComment, setReviewerCommentStatus, finishReview } from "../cli/review-file.mjs"
// @vitest-environment jsdom

import { act, createElement, type ComponentProps } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ReviewPanel } from "../components/review-panel"
import { TooltipProvider } from "../components/ui/tooltip"
import type { ActiveReview, ResolvedReviewComment } from "./review"

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true

const review: ActiveReview = {
  schemaVersion: 1,
  sourceUrl: "file:///Users/eric/plan.md",
  sourceHash: "old-hash",
  note: "",
  updatedAt: "2026-08-11T12:00:00.000Z",
  comments: [
    {
      id: "comment-1",
      body: "Clarify this.",
      createdAt: "2026-08-11T12:00:00.000Z",
      anchor: {
        exact: "The removed passage.",
        prefix: "",
        suffix: "",
        start: 20,
        end: 40,
        headingPath: ["Guide"],
      },
    },
  ],
}

const comment: ResolvedReviewComment = {
  displayNumber: 1,
  ...review.comments[0],
  status: "unanchored",
  range: null,
}

describe("ReviewPanel", () => {
  let container: HTMLDivElement
  let root: Root
  let animationFrames: FrameRequestCallback[]
  const originalClipboard = Object.getOwnPropertyDescriptor(navigator, "clipboard")

  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn()
    HTMLElement.prototype.hasPointerCapture = () => false
    HTMLElement.prototype.releasePointerCapture = () => {}
    HTMLElement.prototype.scrollTo = vi.fn()
    animationFrames = []
    globalThis.requestAnimationFrame = (callback) => {
      animationFrames.push(callback)
      return animationFrames.length
    }
    container = document.createElement("div")
    document.body.append(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    if (originalClipboard) Object.defineProperty(navigator, "clipboard", originalClipboard)
    else Reflect.deleteProperty(navigator, "clipboard")
  })

  function renderPanel(overrides: Partial<ComponentProps<typeof ReviewPanel>> = {}) {
    const props: ComponentProps<typeof ReviewPanel> = {
      open: true,
      selectionVersion: 0,
      review,
      comments: [comment],
      selectedId: null,
      persistenceError: false,
      copyStatus: null,
      jumpableCommentIds: new Set(),
      resolvedImportedComments: new Map(),
      jumpableImportedCommentIds: new Set(),
      selectedImportedCommentId: null,
      onNoteChange: () => {},
      onUpdateComment: () => {},
      onDeleteComment: () => {},
      onSelectComment: () => {},
      onJumpToSection: () => {},
      onJumpToImportedComment: () => {},
      onCopy: () => {},
      onCopyComment: async () => true,
      onClear: () => {},
      ...overrides,
    }
    act(() => root.render(createElement(
      TooltipProvider,
      null,
      createElement(ReviewPanel, props),
    )))
  }

  it("keeps a finished Review's comments under Resolved when the next Review starts", () => {
    const sent = sendReview(refreshReviewFile(null, "PLAN.md"), { docHash: "a".repeat(64), comments: [{ id: comment.id, quote: comment.anchor.exact, line: 1, body: comment.body, status: "open" }] })
    const completed = finishReview(setReviewerCommentStatus(addressReviewComment(sent, comment.id, "Previous reply"), comment.id, "resolved"))
    const current = refreshReviewFile(completed, "PLAN.md")
    renderPanel({ agentHandoff: { file: current, disabled: true, disabledReason: "Add a comment", sending: false, error: null, send: vi.fn() } })
    const resolved = Array.from(container.querySelectorAll("details")).find((item) => item.querySelector("summary")?.textContent?.includes("Resolved"))!
    expect(container.querySelectorAll("article")).toHaveLength(1)
    expect(resolved.querySelector("article")?.textContent).toContain(comment.body)
  })

  it("shows current sent comments and reviewer actions when browser drafts are absent", () => {
    const sent = sendReview(refreshReviewFile(null, "PLAN.md"), { docHash: "a".repeat(64), comments: [{ id: "disk-comment", quote: "Plan", line: 1, body: "Explain this", status: "open" }] })
    const file = addressReviewComment(sent, "disk-comment", "Explained")
    const changeStatus = vi.fn()
    renderPanel({ review: null, comments: [], agentHandoff: { file, disabled: true, disabledReason: null, sending: false, error: null, send: vi.fn(), changeStatus } })
    expect(container.textContent).not.toContain("Current sent feedback")
    const addressed = container.querySelector("details")!
    expect(addressed.querySelector("summary")?.textContent).toContain("Addressed")
    expect(addressed.open).toBe(true)
    expect(container.textContent).not.toContain("Active")
    expect(addressed.querySelector("article")?.textContent).toContain("Addressed")
    expect(container.textContent).not.toContain("Round 1")
    expect(container.textContent).not.toContain("Review complete")
    expect(container.textContent).toContain("Explain this")
    expect(container.textContent).not.toContain("No comments. Select text")
    const resolve = Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "Resolve")!
    expect(resolve.className).toContain("bg-primary")
    act(() => resolve.click())
    expect(changeStatus).toHaveBeenCalledWith("disk-comment", "resolved")
  })

  it("collapses Addressed answers while the document shows a question card", () => {
    const sent = sendReview(refreshReviewFile(null, "GRILL.md"), { docHash: "a".repeat(64), comments: [
      { id: "answer-1", quote: "Q1. Where?", line: 1, body: "A", status: "open" },
      { id: "answer-2", quote: "Q2. When?", line: 9, body: "Soon", status: "open" },
    ] })
    const file = addressReviewComment(sent, "answer-1", "Recorded A; Q2 asks when.")
    renderPanel({ review: null, comments: [], interview: true, agentHandoff: { file, disabled: true, disabledReason: null, sending: false, error: null, send: vi.fn(), changeStatus: vi.fn() } })
    const groups = Array.from(container.querySelectorAll("details"))
    expect(groups.map((group) => group.querySelector("summary")?.textContent)).toEqual(["Active1", "Addressed1"])
    expect(groups[0].open).toBe(true)
    expect(groups[0].textContent).toContain("Soon")
    expect(groups[1].open).toBe(false)
    expect(groups[1].textContent).toContain("Recorded A")
  })

  it("hides Clear drafts for sent feedback and keeps resolved sidecar comments collapsed", () => {
    const sent = sendReview(refreshReviewFile(null, "PLAN.md"), { docHash: "a".repeat(64), comments: [{ id: "disk-comment", quote: "Plan", line: 1, body: "Explain this", status: "open" }] })
    const file = finishReview(setReviewerCommentStatus(addressReviewComment(sent, "disk-comment", "Explained"), "disk-comment", "resolved"))
    renderPanel({ review: null, comments: [], agentHandoff: { file, completed: true, disabled: true, disabledReason: null, sending: false, error: null, send: vi.fn() } })
    const resolved = Array.from(container.querySelectorAll("details")).find((item) => item.querySelector("summary")?.textContent?.includes("Resolved"))!
    expect(resolved.open).toBe(false)
    expect(container.textContent).toContain("Review complete")
    expect(container.textContent).not.toContain("Round 1")
    expect(resolved.querySelector("article")?.textContent).toContain("Explain this")
    expect(resolved.querySelector("article")?.textContent).toContain("Resolved")
    expect(container.textContent).not.toContain("Clear drafts")
    expect(container.textContent).not.toContain("Current sent feedback")
    expect(container.textContent).not.toContain("disk-comment")
  })

  it("offers Finish review as a secondary action once every sent comment is resolved", () => {
    const sent = sendReview(refreshReviewFile(null, "PLAN.md"), { docHash: "a".repeat(64), comments: [{ id: comment.id, quote: comment.anchor.exact, line: 1, body: comment.body, status: "open" }] })
    const file = setReviewerCommentStatus(sent, comment.id, "resolved")
    const finish = vi.fn()
    renderPanel({ agentHandoff: { file, canFinish: true, finish, sent: true, disabled: true, disabledReason: "Add or reopen a comment to send again.", sending: false, error: null, send: vi.fn() } })
    expect(container.textContent).not.toContain("Send review to agent")
    expect(container.textContent).not.toContain("Agent not picking up")
    expect(container.textContent).not.toContain("Review complete")
    const button = Array.from(container.querySelectorAll("button")).find((item) => item.textContent === "Finish review")!
    expect(button.className).toContain("border-input")
    expect(container.textContent).toContain("Your agent is waiting. Add more comments or finish.")
    act(() => button.click())
    expect(finish).toHaveBeenCalledOnce()
  })

  it("offers Resolve all and Finish review separately while comments are Addressed", () => {
    const sent = sendReview(refreshReviewFile(null, "PLAN.md"), { docHash: "a".repeat(64), comments: [{ id: comment.id, quote: comment.anchor.exact, line: 1, body: comment.body, status: "open" }] })
    const file = addressReviewComment(sent, comment.id, "Recorded")
    const finish = vi.fn()
    const resolveAll = vi.fn()
    renderPanel({ agentHandoff: { file, canFinish: true, finish, resolveAll, sent: true, disabled: true, disabledReason: "Add or reopen a comment to send again.", sending: false, error: null, send: vi.fn() } })
    const button = (name: string) => Array.from(container.querySelectorAll("button")).find((item) => item.textContent === name || item.getAttribute("aria-label") === name)!
    expect(button("Copy review as prompt")).toBeDefined()
    act(() => button("Resolve all").click())
    expect(resolveAll).toHaveBeenCalledOnce()
    expect(finish).not.toHaveBeenCalled()
    act(() => button("Finish review").click())
    expect(finish).toHaveBeenCalledOnce()
  })

  it("withholds Finish review until the agent's edits are loaded and the interview has no open questions", () => {
    const sent = sendReview(refreshReviewFile(null, "PLAN.md"), { docHash: "a".repeat(64), comments: [{ id: comment.id, quote: comment.anchor.exact, line: 1, body: comment.body, status: "open" }] })
    const file = addressReviewComment(sent, comment.id, "Recorded")
    const agentHandoff = { file, canFinish: true, finish: vi.fn(), resolveAll: vi.fn(), sent: true, disabled: true, disabledReason: "Add or reopen a comment to send again.", sending: false, error: null, send: vi.fn() }
    const labels = () => Array.from(container.querySelectorAll("button")).map((item) => item.textContent)
    renderPanel({ agentHandoff, diskChanged: true })
    expect(container.textContent).toContain("Your agent updated the document. Reload to see its changes.")
    expect(labels()).not.toContain("Finish review")
    expect(labels()).not.toContain("Resolve all")
    act(() => root.unmount())
    root = createRoot(container)
    renderPanel({ agentHandoff, interview: true, questionsOpen: true })
    expect(container.textContent).toContain("Answer the next questions in the document.")
    expect(labels()).not.toContain("Finish review")
    act(() => root.unmount())
    root = createRoot(container)
    renderPanel({ agentHandoff, interview: true })
    expect(labels()).toContain("Finish review")
  })

  it("deselects the comment when empty space in the list is clicked", () => {
    const onClearSelection = vi.fn()
    renderPanel({ selectedId: comment.id, onClearSelection })
    act(() => container.querySelector("article")!.click())
    expect(onClearSelection).not.toHaveBeenCalled()
    act(() => container.querySelector<HTMLElement>(".overflow-y-auto")!.click())
    expect(onClearSelection).toHaveBeenCalledOnce()
  })

  it("confirms Clear all for the copy-prompt workflow", () => {
    const onClear = vi.fn()
    renderPanel({ onClear })
    const clear = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Clear all"))!
    act(() => clear.click())
    expect(onClear).not.toHaveBeenCalled()
    expect(clear.textContent).toContain("Confirm")
    act(() => clear.click())
    expect(onClear).toHaveBeenCalledOnce()
  })

  it("uses Clear drafts when an agent session has unsent feedback", () => {
    const file = refreshReviewFile(null, "PLAN.md")
    renderPanel({ agentHandoff: { file, disabled: false, disabledReason: null, sending: false, error: null, send: vi.fn() } })
    expect(container.textContent).toContain("Clear drafts")
    expect(container.textContent).not.toContain("Clear all")
  })

  it("shows Draft for unsent changes and Open for copy-prompt comments", () => {
    const file = sendReview(refreshReviewFile(null, "PLAN.md"), { docHash: "a".repeat(64), comments: [{ id: comment.id, quote: comment.anchor.exact, line: 1, body: comment.body, status: "open" }] })
    const edited = { ...comment, body: "Unsent revision" }
    const local = { ...comment, id: "local-comment", body: "Copied manually", reviewMode: "local" as const }
    renderPanel({ review: { ...review, comments: [edited, local] }, comments: [edited, local], agentHandoff: { file, disabled: false, disabledReason: null, sending: false, error: null, send: vi.fn() } })
    const cards = container.querySelectorAll("article")
    expect(cards[0].textContent).toContain("Draft")
    expect(cards[0].textContent).toContain("Unsent revision")
    expect(cards[0].textContent).not.toContain("Addressed")
    expect(cards[1].textContent).toContain("Open")
  })

  it("opens setup for a new review after completion without changing the completed session", () => {
    const sent = sendReview(refreshReviewFile(null, "PLAN.md"), { docHash: "a".repeat(64), comments: [{ id: comment.id, quote: comment.anchor.exact, line: 1, body: comment.body, status: "open" }] })
    const file = finishReview(setReviewerCommentStatus(sent, comment.id, "resolved"))
    const original = structuredClone(file)
    const draft = { ...comment, id: "new-draft", reviewMode: "agent" as const, body: "New feedback" }
    renderPanel({ sourceUrl: review.sourceUrl, review: { ...review, comments: [draft] }, comments: [draft], agentHandoff: { file, completed: true, disabled: true, disabledReason: null, sending: false, error: null, send: vi.fn() } })
    expect(container.textContent).toContain("Draft")
    expect(container.textContent).not.toContain("Review complete")
    const start = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.trim() === "Start another review")!
    act(() => start.click())
    const dialog = document.querySelector('[role="dialog"]')!
    expect(dialog).not.toBeNull()
    expect(dialog.querySelector<HTMLTextAreaElement>('[aria-label="Review command for your agent"]')?.value).toContain('$markside review')
    expect(file).toEqual(original)
  })

  it("offers another review as a link after completion even without new drafts", () => {
    const sent = sendReview(refreshReviewFile(null, "PLAN.md"), { docHash: "a".repeat(64), comments: [{ id: comment.id, quote: comment.anchor.exact, line: 1, body: comment.body, status: "open" }] })
    const file = finishReview(setReviewerCommentStatus(sent, comment.id, "resolved"))
    const original = structuredClone(file)
    renderPanel({ sourceUrl: review.sourceUrl, agentHandoff: { file, completed: true, disabled: true, disabledReason: null, sending: false, error: null, send: vi.fn() } })
    const buttons = Array.from(container.querySelectorAll("button"))
    const start = buttons.find((button) => button.textContent?.trim() === "Start another review")!
    const copy = buttons.find((button) => button.textContent?.trim() === "Copy review as prompt")!
    expect(start.className).not.toContain("w-full")
    expect(copy).toBeUndefined()
    expect(container.textContent).toContain("Review complete")
    expect(container.textContent).not.toContain("Clear drafts")
    expect(container.textContent).not.toContain("Start a review in your agent…")
    act(() => start.click())
    expect(document.querySelector('[role="dialog"]')).not.toBeNull()
    expect(file).toEqual(original)
  })

  it("offers Delete instead of Resolve for an unsent Draft and provides Undo", () => {
    const undo = vi.fn()
    const onDeleteComment = vi.fn(() => undo)
    renderPanel({ onDeleteComment, onChangeCommentStatus: vi.fn(), agentHandoff: {
      disabled: false, disabledReason: null, sending: false, error: null, send: vi.fn(),
    } })
    expect(container.querySelector('[aria-label="Resolve comment 1"]')).toBeNull()
    act(() => container.querySelector<HTMLButtonElement>('[aria-label="Delete Review Comment"]')!.click())
    expect(onDeleteComment).toHaveBeenCalledWith(comment.id)
    expect(container.querySelector('[role="status"]')?.textContent).toContain("Comment deleted.")
    act(() => Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "Undo")!.click())
    expect(undo).toHaveBeenCalledOnce()
    expect(container.textContent).not.toContain("Comment deleted.")
  })

  it("keeps Copy and Delete in the Presets row while editing a Draft", () => {
    renderPanel({ selectedId: comment.id, agentHandoff: {
      disabled: false, disabledReason: null, sending: false, error: null, send: vi.fn(),
    } })
    const copy = container.querySelector('[aria-label="Copy comment as prompt"]')!
    const remove = container.querySelector('[aria-label="Delete Review Comment"]')!
    expect(copy).not.toBeNull()
    expect(remove.parentElement).toBe(copy.parentElement)
    expect(copy.parentElement!.parentElement!.textContent).toContain("Presets")
    expect(container.querySelectorAll('[aria-label="Delete Review Comment"]')).toHaveLength(1)
  })

  it("supports resolving and reopening a copy-prompt comment locally", () => {
    const changeStatus = vi.fn()
    renderPanel({ onChangeCommentStatus: changeStatus })
    const resolve = container.querySelector<HTMLButtonElement>('[aria-label="Resolve comment 1"]')!
    // Nothing has acted on an Open comment yet, so Resolve is a quiet checkmark.
    expect(resolve.className).toContain("text-muted-foreground")
    expect(resolve.textContent).toBe("")
    expect(resolve.querySelector(".lucide-check")).not.toBeNull()
    act(() => resolve.click())
    expect(changeStatus).toHaveBeenCalledWith(comment.id, "resolved")
    const resolved = { ...comment, localStatus: "resolved" as const }
    renderPanel({ review: { ...review, comments: [resolved] }, comments: [resolved], onChangeCommentStatus: changeStatus })
    const group = container.querySelector("details")!
    expect(group.querySelector("summary")?.textContent).toContain("Resolved")
    expect(group.open).toBe(false)
    expect(container.textContent).not.toContain("Passage no longer found")
    act(() => container.querySelector<HTMLButtonElement>('[aria-label="Reopen comment 1"]')!.click())
    expect(changeStatus).toHaveBeenLastCalledWith(comment.id, "open")
  })

  it("hides the actions until the Review and agent Review file load so Copy does not flash as primary", () => {
    renderPanel({ sourceUrl: review.sourceUrl, reviewLoading: true })
    const copy = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Copy review as prompt"))!
    expect(copy.closest(".invisible")).not.toBeNull()
    renderPanel({ sourceUrl: review.sourceUrl, reviewLoading: false, agentHandoff: { disabled: false, disabledReason: null, sending: false, error: null, send: vi.fn() } })
    expect(container.querySelector(".invisible")).toBeNull()
    const secondaryCopy = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Copy review as prompt"))!
    // A fresh element has no previous primary background for transition-colors to fade from.
    expect(secondaryCopy).not.toBe(copy)
  })

  it("keeps Copy review as prompt when no agent request exists", () => {
    renderPanel()
    expect(container.textContent).toContain("Copy review as prompt")
    expect(container.textContent).not.toContain("Send review to agent")
  })

  it("keeps Copy available for a Review Note without comments", () => {
    const onCopy = vi.fn()
    renderPanel({ review: { ...review, comments: [], note: "Tighten the introduction." }, comments: [], onCopy })
    const copy = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Copy review as prompt"))!
    expect(copy).toBeDefined()
    act(() => copy.click())
    expect(onCopy).toHaveBeenCalledOnce()
  })

  it("offers agent setup for an empty Review and uses the open file in the command", () => {
    renderPanel({ sourceUrl: "file:///Users/eric/My%20Plan.md", review: null, comments: [] })
    const trigger = Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "Start a review in your agent…")!
    expect(trigger.className).not.toContain("w-full")
    const copyButton = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Copy review as prompt"))!
    expect(copyButton).toBeUndefined()
    act(() => trigger.click())
    const dialog = document.querySelector('[role="dialog"]')!
    expect(dialog.textContent).toContain("Agent integration (Beta)")
    expect(dialog.querySelector<HTMLTextAreaElement>('[aria-label="Review command for your agent"]')?.value).toBe('$markside review "/Users/eric/My Plan.md" --no-open')
  })

  it("makes Copy primary with unsent local feedback and offers agent setup as a link", () => {
    const onCopy = vi.fn()
    renderPanel({ sourceUrl: review.sourceUrl, onCopy })
    const buttons = Array.from(container.querySelectorAll("button"))
    expect(buttons.find((button) => button.textContent === "Start a review in your agent…")).toBeDefined()
    expect(container.textContent).not.toContain("Check agent connection")
    const copy = buttons.find((button) => button.textContent?.trim() === "Copy review as prompt")!
    expect(copy.disabled).toBe(false)
    expect(copy.className).toContain("flex-1")
    act(() => copy.click())
    expect(onCopy).toHaveBeenCalledOnce()
    expect(container.textContent).not.toContain("Send review to agent")
  })

  it("closes setup with Done without checking for an agent review", () => {
    const onCheckAgentSession = vi.fn()
    renderPanel({ sourceUrl: review.sourceUrl, review: null, comments: [], onCheckAgentSession })
    act(() => Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "Start a review in your agent…")!.click())
    const dialog = document.querySelector('[role="dialog"]')!
    act(() => Array.from(dialog.querySelectorAll("button")).find((button) => button.textContent === "Done")!.click())
    expect(onCheckAgentSession).not.toHaveBeenCalled()
    expect(document.querySelector('[role="dialog"]')).toBeNull()
  })

  it("checks for an agent review on demand and briefly reports when none exists", () => {
    vi.useFakeTimers()
    try {
      const onCheckAgentSession = vi.fn()
      const props = { sourceUrl: review.sourceUrl, review: null, comments: [], onCheckAgentSession }
      renderPanel(props)
      const check = () => Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Check for review"))!
      const label = () => check().querySelector('[role="status"]')!.textContent
      act(() => check().click())
      expect(onCheckAgentSession).toHaveBeenCalledOnce()
      renderPanel({ ...props, agentSessionCheckStatus: "checking" })
      expect(label()).toBe("Checking…")
      expect(check().disabled).toBe(true)
      // Hidden copies of every label keep the button width constant.
      expect(check().querySelectorAll('[aria-hidden="true"].invisible')).toHaveLength(3)
      renderPanel({ ...props, agentSessionCheckStatus: "not-found" })
      expect(label()).toBe("No review yet")
      act(() => { vi.advanceTimersByTime(3_000) })
      expect(label()).toBe("Check for review")
    } finally {
      vi.useRealTimers()
    }
  })

  it("hides the agent review check while a review is active", () => {
    renderPanel({ sourceUrl: review.sourceUrl, agentHandoff: { disabled: false, disabledReason: null, sending: false, error: null, send: vi.fn() } })
    expect(container.textContent).not.toContain("Check for review")
  })

  it("lets setup grant folder access before the first send", async () => {
    let granted = false
    const choose = vi.fn(async () => granted)
    const props = { sourceUrl: review.sourceUrl, review: null, comments: [], reviewFolder: { path: "/Users/eric/project/", choose } }
    renderPanel(props)
    act(() => Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "Start a review in your agent…")!.click())
    let dialog = document.querySelector('[role="dialog"]')!
    expect(dialog.textContent).toContain("3. Allow folder access")
    expect(dialog.textContent).toContain("Chrome asks once for access to project.")
    const chooseButton = () => Array.from(document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')).find((button) => button.textContent === "Choose folder")!
    await act(async () => chooseButton().click())
    expect(choose).toHaveBeenCalledOnce()
    expect(document.querySelector('[role="dialog"] [role="alert"]')).toBeNull()
    granted = true
    await act(async () => chooseButton().click())
    expect(document.querySelector('[role="dialog"] [role="alert"]')?.textContent).toContain("doesn't contain this file")
    renderPanel({ ...props, reviewFolder: null })
    dialog = document.querySelector('[role="dialog"]')!
    expect(dialog.textContent).toContain("Your agent can receive reviews for this file.")
    expect(dialog.querySelector('[role="alert"]')).toBeNull()
  })

  it("omits the folder step when a saved folder already covers the document", () => {
    renderPanel({ sourceUrl: review.sourceUrl, review: null, comments: [], reviewFolder: null })
    act(() => Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "Start a review in your agent…")!.click())
    expect(document.querySelector('[role="dialog"]')!.textContent).not.toContain("Allow folder access")
  })

  it("sends the pending Review through its primary action", () => {
    const send = vi.fn()
    renderPanel({ agentHandoff: { disabled: false, disabledReason: null, sending: false, error: null, send } })
    const button = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Send review to agent"))!
    expect(container.querySelector('[aria-label="Review send options"]')).toBeNull()
    act(() => button.click())
    expect(send).toHaveBeenCalledOnce()
  })

  it("hides setup while an empty pending Review waits for comments", () => {
    renderPanel({ review: null, comments: [], agentHandoff: {
      sourceUrl: "file:///Users/eric/My%20Plan.md",
      disabled: true, disabledReason: "Add a comment before sending to the agent.",
      sending: false, error: null, send: vi.fn(),
    } })
    expect(container.textContent).not.toContain("Add a comment before sending to the agent.")
    const sendButton = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Send review to agent"))!
    expect(sendButton.disabled).toBe(true)
    expect(sendButton.hasAttribute("aria-describedby")).toBe(false)
    expect(container.textContent).not.toContain("Start a review in your agent…")
    expect(container.textContent).not.toContain("Start a review with your agent")
  })

  it("explains first-send folder access briefly without changing the Send action", () => {
    const send = vi.fn()
    renderPanel({ agentHandoff: {
      disabled: false, disabledReason: null, sending: false, error: null, send,
      folderToChoose: "/Users/eric/project/",
    } })
    const button = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Send review to agent"))!
    const explanation = container.querySelector(`#${button.getAttribute("aria-describedby")}`)!
    expect(explanation.textContent).toBe("Chrome will ask once for access to project so your agent can receive your review.")
    expect(explanation.querySelector("[title]")?.getAttribute("title")).toBe("/Users/eric/project/")
    expect(send).not.toHaveBeenCalled()
    act(() => button.click())
    expect(send).toHaveBeenCalledOnce()
  })

  it("keeps a separate copy button available when sending is disabled", () => {
    const onCopy = vi.fn()
    const send = vi.fn()
    renderPanel({ onCopy, agentHandoff: {
      disabled: true, disabledReason: "Add or edit a comment to send again.", sending: false, error: null, send,
    } })
    const copyButton = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.trim() === "Copy review as prompt")!
    expect(copyButton.disabled).toBe(false)
    expect(container.querySelector('[aria-label="Review send options"]')).toBeNull()
    act(() => copyButton.click())
    expect(onCopy).toHaveBeenCalledOnce()
    expect(send).not.toHaveBeenCalled()
  })

  it("shows a saved handoff with a copy fallback, then restores Send when feedback changes", () => {
    const onCopy = vi.fn()
    const send = vi.fn()
    renderPanel({ onCopy, agentHandoff: { disabled: true, disabledReason: "Add or edit a comment to send again.", sending: false, sent: true, sentAt: "2026-10-18T12:05:00Z", error: null, send } })
    const sentStatus = Array.from(container.querySelectorAll('[role="status"]')).find((element) => element.textContent?.includes("Review sent"))!
    expect(sentStatus).toBeDefined()
    expect(sentStatus.closest("button")).toBeNull()
    expect(sentStatus.textContent?.trim()).toBe("Review sent · Waiting for the agent’s reply")
    expect(container.textContent!.indexOf("Review sent")).toBeLessThan(container.textContent!.indexOf("Agent not responding?"))
    expect(container.textContent).not.toContain("Your review is saved.")
    expect(container.textContent).not.toContain("Add or edit a comment")
    expect(container.textContent).not.toContain("Send review to agent")
    const copyButton = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.trim() === "Copy as prompt")!
    act(() => copyButton.click())
    expect(onCopy).toHaveBeenCalledOnce()
    expect(send).not.toHaveBeenCalled()
    renderPanel({ agentHandoff: { disabled: false, disabledReason: null, sending: false, sent: false, sentAt: "2026-10-18T12:05:00Z", error: null, send: vi.fn() } })
    const sendButton = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Send review to agent"))!
    expect(sendButton.disabled).toBe(false)
  })

  it("checks explicitly and reports no updates without a sidebar reload action", async () => {
    const onCheckUpdates = vi.fn().mockResolvedValue(false)
    const agentHandoff = { disabled: true, disabledReason: null, sending: false, sent: true, error: null, send: vi.fn() }
    renderPanel({ agentHandoff, onCheckUpdates })
    const check = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Check for reply"))!
    await act(async () => check.click())
    expect(onCheckUpdates).toHaveBeenCalledOnce()
    expect(check.textContent).toContain("No reply yet")
    expect(container.textContent).not.toContain("Reload document")
  })

  it("reports a failed update check without claiming nothing changed", async () => {
    renderPanel({
      agentHandoff: { disabled: true, disabledReason: null, sending: false, sent: true, error: null, send: vi.fn() },
      onCheckUpdates: vi.fn().mockRejectedValue(new Error("Read failed")),
    })
    const check = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Check for reply"))!
    await act(async () => check.click())
    expect(container.textContent).toContain("Couldn’t check. Try again.")
    expect(container.textContent).not.toContain("No reply yet")
    expect(check.disabled).toBe(false)
  })

  it("opens a command dialog for the current file and supports copying or manual selection", async () => {
    const sourceUrl = "file:///Users/eric/Markside%20Samples/PLAN.md"
    const command = '$markside review "/Users/eric/Markside Samples/PLAN.md" --no-open'
    const writeText = vi.fn().mockRejectedValueOnce(new Error("Clipboard denied")).mockResolvedValueOnce(undefined)
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } })
    renderPanel({ review: null, comments: [], agentHandoff: {
      sourceUrl, sent: true, disabled: true, disabledReason: "Add or edit a comment to send again.", sending: false, error: null, send: vi.fn(),
    } })
    const help = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.trim() === "Start a review in your agent")!
    expect(help.closest("details")).toBeNull()
    act(() => help.click())
    const dialog = document.querySelector('[role="dialog"]')!
    expect(dialog.textContent).toContain("Markside finds the review when you return to this tab.")
    const input = dialog.querySelector<HTMLTextAreaElement>('[aria-label="Review command for your agent"]')!
    expect(input.value).toBe(command)
    expect(input.readOnly).toBe(true)
    const copyButton = dialog.querySelector<HTMLButtonElement>('[aria-label="Copy review command"]')!
    await act(async () => copyButton.click())
    expect(writeText).toHaveBeenCalledWith(command)
    expect(dialog.querySelector('[role="alert"]')?.textContent).toContain("Select the command above and copy it.")
    await act(async () => copyButton.click())
    expect(copyButton.querySelector(".lucide-check")).not.toBeNull()
    expect(dialog.querySelector('[role="alert"]')).toBeNull()
    const installTabs = Array.from(dialog.querySelectorAll<HTMLButtonElement>('[aria-label="Installation method"] [role="tab"]'))
    expect(installTabs[0].textContent).toBe("Ask your agent")
    expect(installTabs[0].getAttribute("aria-selected")).toBe("true")
    const installPrompt = dialog.querySelector<HTMLTextAreaElement>('[aria-label="Skill installation prompt"]')!
    expect(installPrompt.value).toBe("Install Markside skill from https://github.com/ericjy/markside.")
    await act(async () => dialog.querySelector<HTMLButtonElement>('[aria-label="Copy install prompt"]')!.click())
    expect(writeText).toHaveBeenLastCalledWith(installPrompt.value)
    act(() => installTabs[1].click())
    expect(dialog.textContent).toContain("Run this in your terminal.")
    const installInput = dialog.querySelector<HTMLTextAreaElement>('[aria-label="Skill installation command"]')!
    expect(installInput.value).toBe("npx skills add ericjy/markside --skill markside -g")
    const installButton = dialog.querySelector<HTMLButtonElement>('[aria-label="Copy install command"]')!
    await act(async () => installButton.click())
    expect(writeText).toHaveBeenLastCalledWith(installInput.value)
    act(() => installTabs[1].dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true })))
    expect(document.activeElement).toBe(installTabs[0])
    expect(installTabs[0].getAttribute("aria-selected")).toBe("true")
    expect(dialog.querySelector('[aria-label="Copy install prompt"] .lucide-copy')).not.toBeNull()
    expect(input.value).toBe(command)
    const tabs = Array.from(dialog.querySelectorAll<HTMLButtonElement>('[aria-label="Your agent"] [role="tab"]'))
    act(() => tabs.find((tab) => tab.textContent === "Codex")!.click())
    expect(input.value).toBe('$markside review "/Users/eric/Markside Samples/PLAN.md" --no-open')
    expect(copyButton.querySelector(".lucide-copy")).not.toBeNull()
    await act(async () => copyButton.click())
    expect(writeText).toHaveBeenLastCalledWith(input.value)
    act(() => tabs.find((tab) => tab.textContent === "Other agents")!.click())
    expect(input.value).toBe(command.replace("$markside", "/markside"))
    expect(tabs.find((tab) => tab.textContent === "Other agents")!.getAttribute("aria-selected")).toBe("true")
    await act(async () => copyButton.click())
    expect(writeText).toHaveBeenLastCalledWith(input.value)
    act(() => tabs[1].dispatchEvent(new KeyboardEvent("keydown", { key: "Home", bubbles: true })))
    expect(document.activeElement).toBe(tabs[0])
    expect(tabs[0].getAttribute("aria-selected")).toBe("true")
    act(() => dialog.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })))
    expect(document.querySelector('[role="dialog"]')).toBeNull()
  })

  it("keeps send failures visible so users can retry", () => {
    renderPanel({ agentHandoff: { disabled: false, disabledReason: null, sending: false, error: "Allow folder write access, then send again.", send: vi.fn() } })
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("Allow folder write access")
  })

  it("shows resolved status and the agent reply on a collapsed unanchored comment", () => {
    renderPanel({
      jumpableCommentIds: new Set([comment.id]),
      agentHandoff: {
        completed: true, disabled: true, disabledReason: null, sending: false, error: null, send: vi.fn(),
        results: new Map([[comment.id, { id: comment.id, quote: comment.anchor.exact, body: comment.body, line: 3, status: "resolved", reply: "Clarified the first step." }]]),
      },
    })
    expect(container.textContent).toContain("Resolved")
    expect(container.textContent).toContain("Agent reply")
    expect(container.textContent).toContain("Clarified the first step.")
    expect(container.textContent).not.toContain("Passage no longer found")
    expect(container.textContent).not.toContain("Copy review as prompt")
    expect(container.textContent).not.toContain("Send review to agent")
  })

  it("keeps passage warnings on unresolved comments", () => {
    renderPanel({
      agentHandoff: {
        disabled: true, disabledReason: null, sending: false, error: null, send: vi.fn(),
        results: new Map([[comment.id, { id: comment.id, quote: comment.anchor.exact, body: comment.body, line: 3, status: "open" }]]),
      },
    })
    expect(container.textContent).toContain("Passage no longer found")
    expect(container.textContent).not.toContain("Resolved")
  })

  it("shows Addressed with reviewer Resolve and Reopen actions", () => {
    const changeStatus = vi.fn()
    renderPanel({ agentHandoff: {
      disabled: true, disabledReason: null, sending: false, error: null, send: vi.fn(), changeStatus,
      results: new Map([[comment.id, { id: comment.id, quote: comment.anchor.exact, body: comment.body, line: 3, status: "addressed", reply: "Clarified." }]]),
    } })
    expect(container.textContent).toContain("Addressed")
    const expand = container.querySelector<HTMLButtonElement>('[aria-label="Expand Review Comment"]')!
    act(() => expand.click())
    expect(container.querySelector('textarea[aria-label="Review Comment"]')).toBeNull()
    expect(container.querySelector('[aria-label="Delete Review Comment"]')).toBeNull()
    expect(container.textContent).not.toContain("Passage no longer found")
    const resolve = container.querySelector<HTMLButtonElement>('[aria-label="Resolve comment 1"]')!
    act(() => resolve.click())
    expect(changeStatus).toHaveBeenCalledWith(comment.id, "resolved")
    const reopen = container.querySelector<HTMLButtonElement>('[aria-label="Reopen comment 1"]')!
    act(() => reopen.click())
    expect(changeStatus).toHaveBeenCalledWith(comment.id, "open")
  })

  it("offers a quiet Withdraw instead of Resolve for Sent feedback, only when expanded", () => {
    const changeStatus = vi.fn()
    renderPanel({ agentHandoff: {
      disabled: true, disabledReason: null, sending: false, error: null, send: vi.fn(), changeStatus,
      results: new Map([[comment.id, { id: comment.id, quote: comment.anchor.exact, body: comment.body, line: 3, status: "open", reply: "" }]]),
    } })
    expect(container.querySelector("article")?.textContent).toContain("Sent")
    expect(container.querySelector('[aria-label="Resolve comment 1"]')).toBeNull()
    expect(container.querySelector('[aria-label="Withdraw comment 1"]')).toBeNull()
    act(() => container.querySelector<HTMLButtonElement>('[aria-label="Expand Review Comment"]')!.click())
    expect(container.querySelector('[aria-label="Resolve comment 1"]')).toBeNull()
    const withdraw = container.querySelector<HTMLButtonElement>('[aria-label="Withdraw comment 1"]')!
    expect(withdraw.className).toContain("text-muted-foreground")
    act(() => withdraw.click())
    expect(changeStatus).toHaveBeenCalledWith(comment.id, "resolved")
  })

  it("groups resolved comments in a collapsed section with a Reopen action", () => {
    const changeStatus = vi.fn()
    renderPanel({ agentHandoff: {
      completed: true, disabled: true, disabledReason: null, sending: false, error: null, send: vi.fn(), changeStatus,
      results: new Map([[comment.id, { id: comment.id, quote: comment.anchor.exact, body: comment.body, line: 3, status: "resolved", reply: "Clarified." }]]),
    } })
    const group = container.querySelector("details")!
    expect(group).not.toBeNull()
    expect(group.open).toBe(false)
    expect(group.querySelector("summary")?.textContent).toContain("Resolved")
    expect(group.querySelector("summary span span")?.textContent).toBe("1")
    expect(container.textContent).not.toContain("Active")
    expect(container.textContent).not.toContain("All comments resolved.")
    expect(group.querySelector('[aria-label="Resolve comment 1"]')).toBeNull()
    const reopen = group.querySelector<HTMLButtonElement>('[aria-label="Reopen comment 1"]')!
    act(() => { group.open = true; reopen.click() })
    expect(changeStatus).toHaveBeenCalledWith(comment.id, "open")
  })

  it("keeps Resolved collapsed when saved comments arrive after the panel loads", () => {
    renderPanel({ comments: [] })
    const resolved = { ...comment, localStatus: "resolved" as const }
    renderPanel({ comments: [resolved] })
    flushAnimationFrames()
    const group = container.querySelector("details")!
    expect(group.querySelector("summary")?.textContent).toContain("Resolved")
    expect(group.open).toBe(false)

    renderPanel({ comments: [resolved], selectedId: comment.id, selectionVersion: 1 })
    flushAnimationFrames()
    expect(group.open).toBe(true)
    group.open = false
    renderPanel({ comments: [{ ...resolved }], selectedId: comment.id, selectionVersion: 1 })
    flushAnimationFrames()
    expect(group.open).toBe(false)
  })

  it("starts Active expanded and reveals a selected comment after the section was collapsed", () => {
    renderPanel()
    const group = container.querySelector("details")!
    expect(group.open).toBe(true)
    expect(group.querySelector("summary")?.textContent).toContain("Active")
    expect(group.querySelector("summary span span")?.textContent).toBe("1")
    group.open = false
    renderPanel({ selectedId: comment.id, selectionVersion: 1 })
    flushAnimationFrames()
    expect(group.open).toBe(true)
  })

  function jumpButton() {
    return Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Jump to section")
    ) ?? null
  }

  function openMenu(trigger: HTMLButtonElement | undefined) {
    act(() => trigger?.dispatchEvent(new MouseEvent("pointerdown", {
      bubbles: true,
      button: 0,
      ctrlKey: false,
    })))
  }

  function flushAnimationFrames() {
    act(() => {
      const pending = animationFrames.splice(0)
      pending.forEach((callback) => callback(0))
    })
  }

  function noteButton(label: string) {
    return Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes(label)
    )
  }

  it("announces only a newly arrived comment, without selecting it", () => {
    vi.useFakeTimers()
    renderPanel()
    expect(container.querySelector(".review-card-entering")).toBeNull()

    const added: ResolvedReviewComment = { ...comment, id: "comment-2", body: "Second." }
    renderPanel({ comments: [comment, added] })
    const entering = container.querySelectorAll(".review-card-entering")
    expect(entering).toHaveLength(1)
    expect(entering[0].textContent).toContain("Second.")
    expect(entering[0].getAttribute("aria-current")).toBeNull()

    act(() => vi.advanceTimersByTime(1_000))
    expect(container.querySelector(".review-card-entering")).toBeNull()
    vi.useRealTimers()
  })

  it("announces a comment whose text changed outside the panel, but not while typing in it", () => {
    vi.useFakeTimers()
    const onUpdateComment = vi.fn()
    renderPanel({ selectedId: comment.id, onUpdateComment })
    renderPanel({ selectedId: comment.id, onUpdateComment, comments: [{ ...comment, body: "B" }] })
    expect(container.querySelector(".review-card-entering")?.textContent).toContain("B")
    act(() => vi.advanceTimersByTime(1_000))

    const textarea = container.querySelector<HTMLTextAreaElement>("article textarea")!
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(textarea, "Typed")
      textarea.dispatchEvent(new Event("input", { bubbles: true }))
    })
    expect(onUpdateComment).toHaveBeenCalledWith(comment.id, "Typed")
    renderPanel({ selectedId: comment.id, onUpdateComment, comments: [{ ...comment, body: "Typed" }] })
    expect(container.querySelector(".review-card-entering")).toBeNull()
    vi.useRealTimers()
  })

  it("shows a failed comment copy on that comment", async () => {
    const onCopyComment = vi.fn(async () => false)
    renderPanel({ selectedId: comment.id, onCopyComment })

    await act(async () => {
      container.querySelector<HTMLButtonElement>("button[aria-label='Copy comment as prompt']")
        ?.click()
    })
    expect(onCopyComment).toHaveBeenCalledWith(comment.id)

    renderPanel({
      selectedId: comment.id,
      onCopyComment,
      copyStatus: {
        kind: "error",
        message: "Save the Unsaved Draft before copying this Review Comment.",
        commentId: comment.id,
      },
    })

    const alert = container.querySelector("article [role='alert']")
    expect(alert?.textContent).toContain("Not copied.")
    expect(alert?.textContent).toContain("Save the Unsaved Draft")
    expect(container.querySelectorAll("[role='alert']")).toHaveLength(1)
    expect(container.querySelector("button[aria-label='Comment copied as prompt']")).toBeNull()

    renderPanel({ selectedId: comment.id, copyStatus: null })
    expect(container.querySelector("[role='alert']")).toBeNull()
  })

  it("shows whole-review copy errors in the footer without offering an unrelated reload", () => {
    renderPanel({
      copyStatus: {
        kind: "error",
        message: "Save the Unsaved Draft before copying this Review.",
      },
    })

    const alert = container.querySelector("[role='alert']")
    expect(alert?.closest("article")).toBeNull()
    expect(alert?.textContent).toContain("Not copied. Save the Unsaved Draft")
    expect(alert?.querySelector("button")).toBeNull()
  })

  it("removes the previous copied confirmation when a comment retry fails", async () => {
    const onCopyComment = vi.fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)
    renderPanel({ selectedId: comment.id, onCopyComment })

    await act(async () => {
      container.querySelector<HTMLButtonElement>("button[aria-label='Copy comment as prompt']")
        ?.click()
    })
    const copiedButton = container.querySelector<HTMLButtonElement>(
      "button[aria-label='Comment copied as prompt']",
    )
    expect(copiedButton).not.toBeNull()

    await act(async () => copiedButton?.click())
    expect(container.querySelector("button[aria-label='Comment copied as prompt']")).toBeNull()
    expect(onCopyComment).toHaveBeenCalledTimes(2)
  })

  it("offers overall feedback as a button until there is a note to show", () => {
    renderPanel({ review: { ...review, note: "" } })

    expect(container.querySelector("textarea[aria-label='Overall feedback']")).toBeNull()
    const add = noteButton("Add overall feedback")
    expect(add).toBeDefined()

    act(() => add?.dispatchEvent(new MouseEvent("click", { bubbles: true })))
    expect(container.querySelector("textarea[aria-label='Overall feedback']")).not.toBeNull()
  })

  it("shows a written note as text that opens for editing", () => {
    renderPanel({ review: { ...review, note: "Tighten the introduction." } })

    expect(container.querySelector("textarea[aria-label='Overall feedback']")).toBeNull()
    const preview = noteButton("Tighten the introduction.")
    expect(preview).toBeDefined()

    act(() => preview?.dispatchEvent(new MouseEvent("click", { bubbles: true })))
    const editor = container.querySelector<HTMLTextAreaElement>(
      "textarea[aria-label='Overall feedback']",
    )
    expect(editor?.value).toBe("Tighten the introduction.")
  })

  it("guides an empty Review toward selecting Preview text", () => {
    renderPanel({
      review: { ...review, comments: [] },
      comments: [],
    })

    expect(container.textContent).toContain(
      "No comments. Select text in Preview to add comment.",
    )
    expect(container.textContent).not.toContain("then choose Add comment")
  })

  it("collapses the open comment editor when the comment is deselected", () => {
    renderPanel({ selectedId: comment.id })
    expect(container.querySelector("textarea[aria-label='Review Comment']")).not.toBeNull()

    renderPanel({ selectedId: null })
    expect(container.querySelector("textarea[aria-label='Review Comment']")).toBeNull()
    expect(container.textContent).toContain(comment.body)
  })

  it("offers section navigation for a jumpable Unanchored Review Comment", () => {
    const jumpedIds: string[] = []
    renderPanel({
      jumpableCommentIds: new Set([comment.id]),
      onJumpToSection: (id) => jumpedIds.push(id),
    })

    const button = jumpButton()
    expect(button?.textContent).toContain("Jump to section")

    act(() => button?.click())
    expect(jumpedIds).toEqual(["comment-1"])
  })

  it("omits section navigation without a unique heading target", () => {
    renderPanel()

    expect(jumpButton()).toBeNull()
  })

  it.each(["pointer", "keyboard"])("focuses preset search after opening with %s", (method) => {
    renderPanel({ selectedId: comment.id })
    const trigger = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Presets",
    )
    if (method === "pointer") {
      openMenu(trigger)
    } else {
      act(() => trigger?.dispatchEvent(new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
      })))
    }
    flushAnimationFrames()
    const input = document.querySelector<HTMLInputElement>("input[aria-label='Search presets']")
    expect(input).not.toBeNull()
    expect(document.activeElement).toBe(input)
  })

  it("shows grouped command names and closes an empty search with Escape", () => {
    renderPanel({ selectedId: comment.id })
    const presets = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Presets",
    )
    openMenu(presets)
    expect(document.body.textContent).toContain("Concision")
    expect(document.body.textContent).toContain("Structure")
    expect(document.querySelector(
      "[aria-label='Humanize: Make writing less AI']",
    )).not.toBeNull()
    expect(document.body.textContent).not.toContain(
      "Rewrite this in natural, direct prose. Preserve the meaning and intended tone.",
    )

    const input = document.querySelector<HTMLInputElement>("input[aria-label='Search presets']")
    act(() => {
      if (!input) return
      const valueSetter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )?.set
      valueSetter?.call(input, "nothing matches this")
      input.dispatchEvent(new Event("input", { bubbles: true }))
    })
    expect(document.body.textContent).toContain("No presets found.")
    act(() => input?.dispatchEvent(new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
    })))
    expect(document.querySelector("input[aria-label='Search presets']")).toBeNull()
  })

  it("navigates preset commands with arrow keys", () => {
    const updates: Array<{ id: string; body: string }> = []
    renderPanel({
      selectedId: comment.id,
      onUpdateComment: (id, body) => updates.push({ id, body }),
    })
    const presets = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Presets",
    )
    openMenu(presets)
    const input = document.querySelector<HTMLInputElement>("input[aria-label='Search presets']")
    act(() => input?.dispatchEvent(new KeyboardEvent("keydown", {
      key: "ArrowDown",
      bubbles: true,
    })))
    act(() => input?.dispatchEvent(new KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
    })))
    expect(updates).toEqual([{
      id: comment.id,
      body: `${comment.body}\n\nKeep the strongest occurrence of this point and remove the repetition.`,
    }])
  })

  it("inserts a preset into an existing Review Comment without replacing it", () => {
    const updates: Array<{ id: string; body: string }> = []
    renderPanel({
      selectedId: comment.id,
      onUpdateComment: (id, body) => updates.push({ id, body }),
    })
    const textarea = container.querySelector<HTMLTextAreaElement>(
      "textarea[aria-label='Review Comment']",
    )
    act(() => {
      textarea?.setSelectionRange(comment.body.length, comment.body.length)
      textarea?.focus()
    })
    const presets = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("Presets"),
    )
    openMenu(presets)
    const command = document.querySelector(
      "[aria-label='Clarify: Make it easier to understand']",
    )
    expect(command).toBeDefined()
    act(() => (command as HTMLElement | undefined)?.click())
    flushAnimationFrames()
    expect(updates).toEqual([{
      id: comment.id,
      body: `${comment.body}\n\nRewrite this in clear, easy-to-understand language. Simplify unfamiliar wording and sentence structure without losing meaning or adding new information.`,
    }])
    expect(document.activeElement).toBe(textarea)
  })

  it("shows imported Review Rounds as a read-only Review History section", () => {
    renderPanel({
      review: {
        ...review,
        importedRounds: [{
          id: "round-1",
          reviewerName: "Alex",
          note: "Overall looks good.",
          comments: [{
            id: "imported-comment",
            body: "Nice catch.",
            createdAt: "2026-08-16T10:00:00.000Z",
            anchor: comment.anchor,
          }],
          createdAt: "2026-08-16T10:00:00.000Z",
        }],
      },
    })

    expect(container.textContent).toContain("Review History")
    expect(container.textContent).toContain("Round 1")
    expect(container.textContent).toContain("by Alex on 2026-08-16")
    expect(container.textContent).toContain("Overall looks good.")
    expect(container.textContent).toContain("Nice catch.")
  })

  it("omits the Review History section when there are no imported Review Rounds", () => {
    renderPanel()

    expect(container.textContent).not.toContain("Review History")
  })

  it("jumps to the passage when a resolved imported comment is clicked", () => {
    const jumpedIds: string[] = []
    const importedComment = {
      id: "imported-comment",
      body: "Nice catch.",
      createdAt: "2026-08-16T10:00:00.000Z",
      anchor: comment.anchor,
    }
    renderPanel({
      review: {
        ...review,
        importedRounds: [{
          id: "round-1",
          reviewerName: "Alex",
          note: "",
          comments: [importedComment],
          createdAt: "2026-08-16T10:00:00.000Z",
        }],
      },
      resolvedImportedComments: new Map([
        [importedComment.id, { ...importedComment, status: "anchored", range: { start: 20, end: 40 } }],
      ]),
      onJumpToImportedComment: (id) => jumpedIds.push(id),
    })

    const button = Array.from(container.querySelectorAll("button")).find((candidate) =>
      candidate.textContent?.includes("Nice catch.")
    )
    expect(button).toBeTruthy()
    act(() => button?.click())
    expect(jumpedIds).toEqual(["imported-comment"])
  })

  it("does not make an unresolved imported comment clickable", () => {
    const importedComment = {
      id: "imported-comment",
      body: "Nice catch.",
      createdAt: "2026-08-16T10:00:00.000Z",
      anchor: comment.anchor,
    }
    renderPanel({
      review: {
        ...review,
        importedRounds: [{
          id: "round-1",
          reviewerName: "Alex",
          note: "",
          comments: [importedComment],
          createdAt: "2026-08-16T10:00:00.000Z",
        }],
      },
    })

    const button = Array.from(container.querySelectorAll("button")).find((candidate) =>
      candidate.textContent?.includes("Nice catch.")
    )
    expect(button?.disabled).toBe(true)
  })

  it("marks the selected imported comment as current", () => {
    const importedComment = {
      id: "imported-comment",
      body: "Nice catch.",
      createdAt: "2026-08-16T10:00:00.000Z",
      anchor: comment.anchor,
    }
    renderPanel({
      review: {
        ...review,
        importedRounds: [{
          id: "round-1",
          reviewerName: "Alex",
          note: "",
          comments: [importedComment],
          createdAt: "2026-08-16T10:00:00.000Z",
        }],
      },
      resolvedImportedComments: new Map([
        [importedComment.id, { ...importedComment, status: "anchored", range: { start: 20, end: 40 } }],
      ]),
      selectedImportedCommentId: importedComment.id,
    })

    const button = Array.from(container.querySelectorAll("button")).find((candidate) =>
      candidate.textContent?.includes("Nice catch.")
    )
    expect(button?.getAttribute("aria-current")).toBe("true")
  })

  it("keeps the Import Review action out of the footer", () => {
    renderPanel()

    expect(container.querySelector(
      "button[aria-label='Import review from link']",
    )).toBeNull()
  })
})
