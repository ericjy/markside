import { describe, expect, it } from "vitest"

import {
  clampReviewOverlayPosition,
  clampReviewDockWidth,
  canDockReview,
  getReviewBadgeOffset,
  getSelectionActionPosition,
  nextReviewOverlaySize,
  resolveReviewOverlayPosition,
  SELECTION_COMPOSER_SIZE,
} from "./review-layout"

describe("clampReviewOverlayPosition", () => {
  it("keeps the whole panel inside the document area", () => {
    expect(clampReviewOverlayPosition(
      { x: 900, y: -20 },
      { width: 384, height: 500 },
      { width: 1_000, height: 700 },
    )).toEqual({ x: 608, y: 8 })
  })

  it("keeps the panel reachable when the document area narrows", () => {
    expect(clampReviewOverlayPosition(
      { x: 300, y: 500 },
      { width: 384, height: 500 },
      { width: 360, height: 600 },
    )).toEqual({ x: 0, y: 92 })
  })
})

describe("resolveReviewOverlayPosition", () => {
  it("accepts a saved position and rejects invalid storage values", () => {
    expect(resolveReviewOverlayPosition({ x: 120, y: 80 })).toEqual({ x: 120, y: 80 })
    expect(resolveReviewOverlayPosition({ x: Infinity, y: 80 })).toBeNull()
    expect(resolveReviewOverlayPosition({ x: "120", y: 80 })).toBeNull()
  })
})

describe("getSelectionActionPosition", () => {
  it("anchors the action to preview content instead of the viewport", () => {
    expect(getSelectionActionPosition(
      { x: 320, y: 240 },
      {
        left: 100,
        top: 80,
        width: 800,
        height: 600,
        scrollLeft: 20,
        scrollTop: 500,
      },
    )).toEqual({ x: 248, y: 668 })
  })

  it("keeps a right gutter when clamping the action to the container edge", () => {
    expect(getSelectionActionPosition(
      { x: 780, y: 240 },
      {
        left: 100,
        top: 80,
        width: 800,
        height: 600,
        scrollLeft: 0,
        scrollTop: 0,
      },
    )).toEqual({ x: 572, y: 168 })
  })

  it("clamps using the action's measured size", () => {
    const paneWidth = 500
    const toolbarWidth = 420
    const position = getSelectionActionPosition(
      { x: 480, y: 200 },
      {
        left: 0,
        top: 0,
        width: paneWidth,
        height: 600,
        scrollLeft: 0,
        scrollTop: 0,
      },
      { width: toolbarWidth, height: 40 },
    )

    expect(position).toEqual({ x: 72, y: 208 })
    expect(position.x + toolbarWidth).toBeLessThan(paneWidth)
  })

  it("clamps to a larger footprint when sized for the inline comment composer", () => {
    expect(getSelectionActionPosition(
      { x: 780, y: 640 },
      {
        left: 100,
        top: 80,
        width: 800,
        height: 600,
        scrollLeft: 0,
        scrollTop: 0,
      },
      SELECTION_COMPOSER_SIZE,
    )).toEqual({ x: 322, y: 316 })
  })
})

describe("getReviewBadgeOffset", () => {
  it("anchors the badge to preview content, not the viewport", () => {
    expect(getReviewBadgeOffset(
      { x: 360, y: 140 },
      {
        left: 100,
        top: 80,
        width: 800,
        height: 600,
        scrollLeft: 20,
        scrollTop: 500,
      },
    )).toEqual({ top: 560, left: 280 })
  })

  it("stays correct regardless of current scroll position", () => {
    const point = { x: 300, y: 200 }
    const scrolled = getReviewBadgeOffset(point, {
      left: 0, top: 0, width: 800, height: 600, scrollLeft: 0, scrollTop: 1_000,
    })
    const scrolledMore = getReviewBadgeOffset(
      { x: point.x, y: point.y - 400 },
      { left: 0, top: 0, width: 800, height: 600, scrollLeft: 0, scrollTop: 1_400 },
    )
    expect(scrolledMore).toEqual(scrolled)
  })
})

describe("nextReviewOverlaySize", () => {
  it("cycles compact, standard, wide", () => {
    expect(nextReviewOverlaySize("compact")).toBe("standard")
    expect(nextReviewOverlaySize("standard")).toBe("wide")
    expect(nextReviewOverlaySize("wide")).toBe("compact")
  })
})

describe("explicit Review docking", () => {
  it("keeps a usable document area beside the selected panel width", () => {
    expect(canDockReview(1024, 384)).toBe(true)
    expect(canDockReview(1023, 384)).toBe(false)
    expect(canDockReview(1024, 448)).toBe(false)
  })
  it("bounds persisted widths and ignores invalid values", () => {
    expect(clampReviewDockWidth(undefined)).toBe(384)
    expect(clampReviewDockWidth(NaN)).toBe(384)
    expect(clampReviewDockWidth("448")).toBe(384)
    expect(clampReviewDockWidth(200)).toBe(360)
    expect(clampReviewDockWidth(320)).toBe(360)
    expect(clampReviewDockWidth(360)).toBe(360)
    expect(clampReviewDockWidth(900)).toBe(600)
    expect(clampReviewDockWidth(448)).toBe(448)
  })
})
