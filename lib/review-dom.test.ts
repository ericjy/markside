// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { ResolvedReviewComment } from "./review"
import {
  applyPendingReviewHighlight,
  buildRenderedTextIndex,
  clearPendingReviewHighlight,
  clearReviewHighlights,
  computeReviewBadgeAnchors,
  scrollReviewHeadingIntoView,
  sourceLineForNode,
} from "./review-dom"

function unanchoredComment(
  overrides: Partial<Extract<ResolvedReviewComment, { status: "unanchored" }>> & { anchor: ResolvedReviewComment["anchor"] },
): ResolvedReviewComment {
  return {
    id: "comment",
    body: "",
    createdAt: "",
    displayNumber: 1,
    status: "unanchored",
    range: null,
    ...overrides,
  }
}

describe("pending review highlight", () => {
  const highlights = new Map<string, unknown>()

  beforeEach(() => {
    highlights.clear()
    vi.stubGlobal("CSS", { highlights })
    vi.stubGlobal("Highlight", class {
      constructor(..._ranges: Range[]) {}
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("survives a refresh of persisted review highlights", () => {
    const text = document.createTextNode("Allow access to file URLs")
    document.body.replaceChildren(text)
    const range = document.createRange()
    range.setStart(text, 0)
    range.setEnd(text, text.data.length)

    applyPendingReviewHighlight(range)
    clearReviewHighlights()

    expect(highlights.has("markside-review-pending")).toBe(true)

    clearPendingReviewHighlight()

    expect(highlights.has("markside-review-pending")).toBe(false)
  })
})

describe("scrollReviewHeadingIntoView", () => {
  let root: HTMLElement

  beforeEach(() => {
    root = document.createElement("main")
    root.innerHTML = "<h2>Guide</h2><p>Current content.</p>"
    document.body.replaceChildren(root)
  })

  it("scrolls the heading element represented by a rendered heading span", () => {
    const index = buildRenderedTextIndex(root)
    const heading = root.querySelector<HTMLElement>("h2")
    let scrollOptions: boolean | ScrollIntoViewOptions | undefined
    if (heading) {
      heading.scrollIntoView = (options) => {
        scrollOptions = options
      }
    }

    expect(scrollReviewHeadingIntoView(index, index.headings[0])).toBe(true)
    expect(scrollOptions).toEqual({ behavior: "smooth", block: "center" })
  })

  it("returns false when the heading offset is not in the rendered text", () => {
    const index = buildRenderedTextIndex(root)

    expect(scrollReviewHeadingIntoView(index, {
      path: ["Missing"],
      start: 999,
      end: 999,
    })).toBe(false)
  })
})

describe("computeReviewBadgeAnchors", () => {
  let root: HTMLElement
  let originalGetClientRects: typeof Range.prototype.getClientRects

  beforeEach(() => {
    root = document.createElement("main")
    root.innerHTML = "<h2>Guide</h2><p>Current content stays here.</p>"
    document.body.replaceChildren(root)
    root.getBoundingClientRect = () =>
      ({ top: 0, left: 0, right: 500, bottom: 500, width: 500, height: 500 }) as DOMRect
    originalGetClientRects = Range.prototype.getClientRects
  })

  afterEach(() => {
    Range.prototype.getClientRects = originalGetClientRects
  })

  it("omits an anchored comment — its highlight in the text is the marker", () => {
    const index = buildRenderedTextIndex(root)
    Range.prototype.getClientRects = function () {
      return [{ top: 40, left: 10, right: 90, bottom: 60 }] as unknown as DOMRectList
    }
    const comment: ResolvedReviewComment = {
      id: "c1",
      body: "",
      createdAt: "",
      displayNumber: 1,
      status: "anchored",
      range: { start: 0, end: 5 },
      anchor: { exact: "Guide", prefix: "", suffix: "", start: 0, end: 5, headingPath: [] },
    }

    expect(computeReviewBadgeAnchors(root, index, [comment])).toEqual([])
  })

  it("positions an unanchored badge to the left of the matched heading, centered on its first line", () => {
    const index = buildRenderedTextIndex(root)
    Range.prototype.getClientRects = function () {
      return [
        { top: 5, left: 0, right: 60, bottom: 25 },
        { top: 30, left: 0, right: 40, bottom: 50 },
      ] as unknown as DOMRectList
    }
    const comment = unanchoredComment({
      id: "c2",
      anchor: { exact: "gone", prefix: "", suffix: "", start: 0, end: 0, headingPath: ["Guide"] },
    })

    expect(computeReviewBadgeAnchors(root, index, [comment])).toEqual([
      { id: "c2", displayNumber: 1, top: 15, left: -6 },
    ])
  })

  it("omits an unanchored comment with no unique heading match", () => {
    const index = buildRenderedTextIndex(root)
    const comment = unanchoredComment({
      id: "c3",
      anchor: { exact: "gone", prefix: "", suffix: "", start: 0, end: 0, headingPath: ["Missing"] },
    })

    expect(computeReviewBadgeAnchors(root, index, [comment])).toEqual([])
  })
})

describe("sourceLineForNode", () => {
  it("reads the source line from the nearest ancestor block", () => {
    const root = document.createElement("main")
    root.innerHTML = '<p data-source-line="4">Some <strong>bold</strong> text.</p>'
    document.body.replaceChildren(root)
    const strong = root.querySelector("strong")!
    const textNode = strong.firstChild!

    expect(sourceLineForNode(textNode)).toBe(4)
    expect(sourceLineForNode(strong)).toBe(4)
  })

  it("returns null when no ancestor carries a source line", () => {
    const root = document.createElement("main")
    root.innerHTML = "<p>No mapping here.</p>"
    document.body.replaceChildren(root)

    expect(sourceLineForNode(root.querySelector("p")!.firstChild!)).toBeNull()
  })
})
