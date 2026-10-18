// Geometry for the floating localhost Review panel and the overlays that must
// stay clear of it. The panel is repositionable, so the selection toolbar and
// composer avoid wherever it currently sits rather than a reserved edge.

export const LOCALHOST_PANEL_WIDTH = 384
export const LOCALHOST_PANEL_TOP = 72
export const LOCALHOST_PANEL_MARGIN = 24
export const LOCALHOST_PANEL_STEP = 16

const EDGE = 8
const GUTTER = 8

export interface LocalhostBox {
  left: number
  top: number
  width: number
  height: number
}

export interface LocalhostSize {
  width: number
  height: number
}

export interface LocalhostViewport {
  width: number
  height: number
}

export interface LocalhostScroll {
  x: number
  y: number
}

// Markers are placed in document coordinates so the browser scrolls them with
// the content. Positioning them against the viewport would need a repaint per
// scroll frame, which the main thread cannot keep up with.
export function toDocumentBox(rect: LocalhostBox, scroll: LocalhostScroll): LocalhostBox {
  return {
    left: rect.left + scroll.x,
    top: rect.top + scroll.y,
    width: rect.width,
    height: rect.height,
  }
}

export interface LocalhostPoint {
  left: number
  top: number
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value))
}

export function getDefaultLocalhostPanelPosition(
  viewport: LocalhostViewport,
  width = LOCALHOST_PANEL_WIDTH,
): LocalhostPoint {
  return {
    left: Math.max(EDGE, viewport.width - width - LOCALHOST_PANEL_MARGIN),
    top: LOCALHOST_PANEL_TOP,
  }
}

// A dragged panel, or one carried over from a larger window, still has to keep
// its header on screen so it can be moved back.
export function clampLocalhostPanelPosition(
  position: LocalhostPoint,
  size: LocalhostSize,
  viewport: LocalhostViewport,
): LocalhostPoint {
  const maxLeft = Math.max(EDGE, viewport.width - size.width - EDGE)
  const visibleHeight = Math.min(size.height, Math.max(EDGE, viewport.height - EDGE * 2))
  const maxTop = Math.max(EDGE, viewport.height - visibleHeight - EDGE)
  return {
    left: clamp(position.left, EDGE, maxLeft),
    top: clamp(position.top, EDGE, maxTop),
  }
}

function overlaps(left: number, top: number, size: LocalhostSize, obstacle: LocalhostBox) {
  return (
    left < obstacle.left + obstacle.width &&
    left + size.width > obstacle.left &&
    top < obstacle.top + obstacle.height &&
    top + size.height > obstacle.top
  )
}

// Anchored below the reviewed content when it fits, above it when it does not,
// then nudged clear of the panel.
export function getLocalhostOverlayPosition(
  anchor: LocalhostBox,
  size: LocalhostSize,
  viewport: LocalhostViewport,
  obstacle: LocalhostBox | null = null,
): LocalhostPoint {
  const maxLeft = Math.max(EDGE, viewport.width - size.width - EDGE)
  const maxTop = Math.max(EDGE, viewport.height - size.height - EDGE)
  const below = anchor.top + anchor.height + GUTTER
  const above = anchor.top - size.height - GUTTER
  const left = clamp(anchor.left, EDGE, maxLeft)
  const top = clamp(
    below + size.height > viewport.height - EDGE && above >= EDGE ? above : below,
    EDGE,
    maxTop,
  )
  if (!obstacle || !overlaps(left, top, size, obstacle)) return { left, top }

  const toLeft = obstacle.left - size.width - GUTTER
  if (toLeft >= EDGE) return { left: toLeft, top }
  const toRight = obstacle.left + obstacle.width + GUTTER
  if (toRight <= maxLeft) return { left: toRight, top }

  const overObstacle = obstacle.top - size.height - GUTTER
  if (overObstacle >= EDGE) return { left, top: overObstacle }
  const underObstacle = obstacle.top + obstacle.height + GUTTER
  if (underObstacle <= maxTop) return { left, top: underObstacle }
  return { left, top }
}
