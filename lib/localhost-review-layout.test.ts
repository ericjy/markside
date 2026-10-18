import { describe, expect, it } from "vitest"

import {
  clampLocalhostPanelPosition,
  toDocumentBox,
  getDefaultLocalhostPanelPosition,
  getLocalhostOverlayPosition,
  LOCALHOST_PANEL_TOP,
  LOCALHOST_PANEL_WIDTH,
} from "./localhost-review-layout"

const viewport = { width: 1440, height: 900 }
const panel = { width: LOCALHOST_PANEL_WIDTH, height: 600 }
const composer = { width: 320, height: 220 }

describe("panel placement", () => {
  it("opens inset from the top right corner", () => {
    expect(getDefaultLocalhostPanelPosition(viewport)).toEqual({
      left: 1440 - LOCALHOST_PANEL_WIDTH - 24,
      top: LOCALHOST_PANEL_TOP,
    })
  })

  it("keeps a dragged panel inside the viewport", () => {
    expect(clampLocalhostPanelPosition({ left: 5_000, top: 5_000 }, panel, viewport)).toEqual({
      left: 1440 - LOCALHOST_PANEL_WIDTH - 8,
      top: 900 - 600 - 8,
    })
    expect(clampLocalhostPanelPosition({ left: -400, top: -80 }, panel, viewport)).toEqual({
      left: 8,
      top: 8,
    })
  })

  it("keeps the header reachable when the panel is taller than the window", () => {
    const position = clampLocalhostPanelPosition({ left: 40, top: 400 }, { width: 384, height: 2_000 }, viewport)
    expect(position.top).toBe(8)
  })

  it("pulls a panel back on screen after the window shrinks", () => {
    const opened = getDefaultLocalhostPanelPosition(viewport)
    const position = clampLocalhostPanelPosition(opened, panel, { width: 700, height: 500 })
    expect(position.left).toBe(700 - LOCALHOST_PANEL_WIDTH - 8)
    expect(position.top).toBe(8)
  })
})

describe("marker placement", () => {
  it("converts a viewport rect into document coordinates", () => {
    expect(toDocumentBox({ left: 40, top: 120, width: 200, height: 24 }, { x: 0, y: 800 }))
      .toEqual({ left: 40, top: 920, width: 200, height: 24 })
  })

  it("keeps a marker still while the window scrolls", () => {
    const beforeScroll = toDocumentBox({ left: 40, top: 300, width: 200, height: 24 }, { x: 0, y: 0 })
    // The same content, 200px further up the viewport after scrolling 200px.
    const afterScroll = toDocumentBox({ left: 40, top: 100, width: 200, height: 24 }, { x: 0, y: 200 })
    expect(afterScroll).toEqual(beforeScroll)
  })
})

describe("overlay placement", () => {
  const anchor = { left: 200, top: 300, width: 120, height: 20 }

  it("sits below the reviewed content", () => {
    expect(getLocalhostOverlayPosition(anchor, composer, viewport)).toEqual({ left: 200, top: 328 })
  })

  it("flips above the reviewed content near the bottom of the window", () => {
    const low = { left: 200, top: 820, width: 120, height: 20 }
    expect(getLocalhostOverlayPosition(low, composer, viewport).top).toBe(820 - 220 - 8)
  })

  it("stays inside the viewport for content at the right edge", () => {
    const edge = { left: 1400, top: 300, width: 30, height: 20 }
    expect(getLocalhostOverlayPosition(edge, composer, viewport).left).toBe(1440 - 320 - 8)
  })

  it("moves clear of the panel wherever the panel sits", () => {
    const panelBox = { left: 1032, top: 72, width: LOCALHOST_PANEL_WIDTH, height: 600 }
    const rightAnchor = { left: 1100, top: 300, width: 120, height: 20 }
    const position = getLocalhostOverlayPosition(rightAnchor, composer, viewport, panelBox)
    expect(position.left + composer.width).toBeLessThanOrEqual(panelBox.left)
  })

  it("moves to the other side when there is no room before the panel", () => {
    const panelBox = { left: 0, top: 0, width: LOCALHOST_PANEL_WIDTH, height: 900 }
    const leftAnchor = { left: 20, top: 300, width: 120, height: 20 }
    const position = getLocalhostOverlayPosition(leftAnchor, composer, viewport, panelBox)
    expect(position.left).toBe(panelBox.width + 8)
  })

  it("moves above the panel when neither side has room", () => {
    const panelBox = { left: 0, top: 400, width: 1_440, height: 500 }
    const covered = { left: 200, top: 420, width: 120, height: 20 }
    const position = getLocalhostOverlayPosition(covered, composer, viewport, panelBox)
    expect(position.top + composer.height).toBeLessThanOrEqual(panelBox.top)
  })

  it("leaves a non-overlapping overlay where it is", () => {
    const panelBox = { left: 1032, top: 72, width: LOCALHOST_PANEL_WIDTH, height: 600 }
    expect(getLocalhostOverlayPosition(anchor, composer, viewport, panelBox)).toEqual({
      left: 200,
      top: 328,
    })
  })
})
