// @vitest-environment jsdom
import { act } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useContentReviewHighlights } from "../hooks/use-content-review-highlights"
import type { AgentReviewComment } from "../cli/review-file.mjs"
import { createEmptyReview } from "./review"
import type { RenderedTextIndex } from "./review-dom"
import { renderHook, stubResizeObserver } from "./test-harness"

const comment = { id: "c1", body: "Clarify", createdAt: "now", anchor: { exact: "Old wording", prefix: "", suffix: "", start: 0, end: 11, headingPath: ["Test plan"] } }
const result: AgentReviewComment = { id: "c1", quote: "Old wording", line: 3, body: "Clarify", status: "resolved", reply: "Reworded." }
const originalRects = Range.prototype.getClientRects
let highlights: Map<string, unknown>
beforeEach(() => {
  stubResizeObserver()
  highlights = new Map()
  vi.stubGlobal("CSS", { highlights })
  vi.stubGlobal("Highlight", class { constructor(..._ranges: Range[]) {} })
  Range.prototype.getClientRects = () => [new DOMRect(40, 20, 120, 30)] as unknown as DOMRectList
})
afterEach(() => {
  Range.prototype.getClientRects = originalRects
  vi.unstubAllGlobals()
})
function options(text: string) {
  const root = document.createElement("div")
  root.innerHTML = `<h1>Test plan</h1><p>${text}</p>`
  return {
    review: { ...createEmptyReview("file:///docs/PLAN.md", "old"), comments: [comment] }, content: text,
    fileUrl: "file:///docs/PLAN.md", contentRef: { current: root }, previewScrollRef: { current: root },
    previewVisible: true, renderedTextIndexRef: { current: null as RenderedTextIndex | null },
    selectedReviewId: null, selectedImportedCommentId: null,
    reviewRenderVersion: 0, numberHeadings: false, changesVisible: false, reloadComparison: null,
    agentResults: new Map<string, AgentReviewComment>(),
  }
}

describe("resolved agent comments in Preview", () => {
  it("keeps a draft anchored when opening a modal hides the preview's background", () => {
    const props = options("Old wording")
    const wrapper = document.createElement("div")
    wrapper.append(props.contentRef.current)
    const hook = renderHook(useContentReviewHighlights, props)
    expect(hook.result.current.resolvedReviewComments[0].status).toBe("anchored")
    wrapper.setAttribute("aria-hidden", "true")
    hook.rerender({ ...props, reviewRenderVersion: 1 })
    expect(hook.result.current.resolvedReviewComments[0].status).toBe("anchored")
    expect(highlights.has("markside-review")).toBe(true)
    wrapper.removeAttribute("aria-hidden")
    hook.rerender({ ...props, reviewRenderVersion: 2 })
    expect(hook.result.current.resolvedReviewComments[0].status).toBe("anchored")
    hook.unmount()
  })

  it.each(["addressed", "resolved"] as const)("removes missing-passage markers for %s comments and keeps them removed after resize", (status) => {
    const props = options("New wording")
    const hook = renderHook(useContentReviewHighlights, props)
    expect(hook.result.current.reviewBadgeAnchors.map(({ id }) => id)).toEqual(["c1"])
    hook.rerender({ ...props, agentResults: new Map([["c1", { ...result, status }]]) })
    expect(hook.result.current.reviewBadgeAnchors).toEqual([])
    act(() => window.dispatchEvent(new Event("resize")))
    expect(hook.result.current.reviewBadgeAnchors).toEqual([])
    // Keep the card available in Review.
    expect(hook.result.current.resolvedReviewComments).toHaveLength(1)
    hook.unmount()
  })
  it.each(["addressed", "resolved"] as const)("clears passage highlights for %s comments and restores them when results are cleared", (status) => {
    const props = options("Old wording")
    const hook = renderHook(useContentReviewHighlights, props)
    expect(highlights.has("markside-review")).toBe(true)
    hook.rerender({ ...props, agentResults: new Map([["c1", { ...result, status }]]) })
    expect(highlights.has("markside-review")).toBe(false)
    hook.rerender(props)
    expect(highlights.has("markside-review")).toBe(true)
    hook.unmount()
  })
})
