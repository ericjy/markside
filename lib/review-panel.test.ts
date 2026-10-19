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

  it("keeps Copy review as prompt when no agent request exists", () => {
    renderPanel()
    expect(container.textContent).toContain("Copy review as prompt")
    expect(container.textContent).not.toContain("Send comments to agent")
  })

  it("sends the pending Review through its primary action", () => {
    const send = vi.fn()
    renderPanel({ agentHandoff: { disabled: false, disabledReason: null, sending: false, error: null, send } })
    const button = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Send comments to agent"))!
    expect(container.textContent).not.toContain("Copy review as prompt")
    act(() => button.click())
    expect(send).toHaveBeenCalledOnce()
  })

  it("shows sent confirmation and disables repeat sends", () => {
    renderPanel({ agentHandoff: { disabled: true, disabledReason: "Add a comment before sending to the agent.", sending: false, sentAt: "2026-10-18T12:05:00Z", error: null, send: vi.fn() } })
    const button = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Send comments to agent"))!
    expect(button.disabled).toBe(true)
    expect(container.querySelector('[role="status"]')?.textContent).toContain("Sent to agent at")
    expect(button.parentElement?.tabIndex).toBe(0)
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
    expect(container.textContent).toContain("Copy review as prompt")
    expect(container.textContent).not.toContain("Send comments to agent")
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
