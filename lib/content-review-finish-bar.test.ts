// @vitest-environment jsdom
import { act, createElement, type ComponentProps } from "react"
import { createRoot } from "react-dom/client"
import { expect, it, vi } from "vitest"
import { ContentReviewFinishBar } from "../components/content-review-finish-bar"
import { createEmptyReview } from "./review"
import "./test-harness"

it("offers Finish review in the document only when the existing finish conditions allow it", () => {
  const finish = vi.fn()
  const props: ComponentProps<typeof ContentReviewFinishBar> = {
    agentHandoff: { canFinish: true, finish, sending: false, disabled: false, disabledReason: null, error: null, send: async () => true },
    panelOpen: false, diskChanged: false, questionsOpen: false, disabled: false,
  }
  const container = document.createElement("div")
  const root = createRoot(container)
  const render = (updates: Partial<typeof props> = {}) => act(() => root.render(createElement(ContentReviewFinishBar, { ...props, ...updates })))
  try {
    render()
    expect(container.textContent).toContain("Anything else to change? Comment on it, or finish.")
    act(() => container.querySelector("button")!.click())
    expect(finish).toHaveBeenCalledOnce()
    for (const state of [{ panelOpen: true }, { diskChanged: true }, { questionsOpen: true }, { agentHandoff: undefined }, { agentHandoff: { ...props.agentHandoff!, canFinish: false } }]) {
      render(state)
      expect(container.querySelector("button")).toBeNull()
    }
    render({ agentHandoff: { ...props.agentHandoff!, finishing: true } })
    expect(container.querySelector("button")!.disabled).toBe(true)
    expect(container.textContent).toContain("Finishing review…")
    render({ agentHandoff: { ...props.agentHandoff!, error: "Could not finish the Review. Try again." } })
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("Try again.")
    expect(container.querySelector("button")!.disabled).toBe(false)
  } finally {
    act(() => root.unmount())
  }
})


it("sends saved drafts with Review closed and retains errors for retry", () => {
  const send = vi.fn(async () => true)
  const file = { version: 1 as const, doc: "plan.md", docHash: "", status: "pending" as const, requestedAt: "now", comments: [] }
  const comment = { id: "c1", body: "Clarify", createdAt: "now", anchor: { exact: "Scope", prefix: "", suffix: "", start: 0, end: 5, headingPath: [] } }
  const review = { ...createEmptyReview("file:///plan.md", "hash"), comments: [comment, { ...comment, id: "c2" }] }
  const props: ComponentProps<typeof ContentReviewFinishBar> = {
    review,
    agentHandoff: { file, canFinish: false, sending: false, disabled: false, disabledReason: null, error: null, send },
    panelOpen: false, diskChanged: false, questionsOpen: true, disabled: false,
  }
  const container = document.createElement("div")
  const root = createRoot(container)
  const render = (updates: Partial<typeof props> = {}) => act(() => root.render(createElement(ContentReviewFinishBar, { ...props, ...updates })))
  try {
    render()
    expect(container.textContent).toContain("2 comments ready to send")
    expect(container.querySelector("button")?.textContent).toBe("Send review")
    act(() => container.querySelector("button")!.click())
    expect(send).toHaveBeenCalledExactlyOnceWith()
    render({ review: { ...review, comments: [...review.comments, { ...comment, id: "local", reviewMode: "local" }, { ...comment, id: "resolved", localStatus: "resolved" }] } })
    expect(container.textContent).toContain("2 comments ready to send")
    render({ review: { ...review, note: "Check scope" } })
    expect(container.textContent).toContain("2 comments and review note ready to send")
    render({ review: { ...review, comments: [comment] } })
    expect(container.textContent).toContain("1 comment ready to send")
    render({ review: { ...review, comments: [], note: "Check scope" } })
    expect(container.textContent).toContain("Review note ready to send")
    for (const state of [{ panelOpen: true }, { diskChanged: true }, { review: null }, { agentHandoff: { ...props.agentHandoff!, completed: true } }, { agentHandoff: { ...props.agentHandoff!, file: { ...file, status: "sent" as const, comments: review.comments.map((c) => ({ id: c.id, body: c.body, quote: c.anchor.exact, line: 1, status: "open" as const })) } } }]) {
      render(state)
      expect(container.querySelector("button")).toBeNull()
    }
    for (const state of [{ disabled: true }, { agentHandoff: { ...props.agentHandoff!, disabled: true } }, { agentHandoff: { ...props.agentHandoff!, sending: true } }]) {
      render(state)
      expect(container.querySelector("button")!.disabled).toBe(true)
    }
    render({ agentHandoff: { ...props.agentHandoff!, error: "Could not send. Try again." } })
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("Try again.")
    expect(container.querySelector("button")!.disabled).toBe(false)
  } finally {
    act(() => root.unmount())
  }
})
