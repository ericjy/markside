export const DEFAULT_REVIEW_OVERLAY_SIZE = "compact" as const

export const REVIEW_OVERLAY_WIDTHS = {
  compact: 384,
  standard: 448,
  wide: 512,
} as const

export type ReviewOverlaySize = keyof typeof REVIEW_OVERLAY_WIDTHS

const SELECTION_ACTION_WIDTH = 220
const SELECTION_ACTION_HEIGHT = 48
const SELECTION_COMPOSER_WIDTH = 470
const SELECTION_COMPOSER_HEIGHT = 312
const SELECTION_ACTION_GUTTER = 8

interface Point {
  x: number
  y: number
}

interface Size {
  width: number
  height: number
}

interface ScrollContainerBox {
  left: number
  top: number
  width: number
  height: number
  scrollLeft: number
  scrollTop: number
}

interface SelectionActionSize {
  width: number
  height: number
}

export const SELECTION_COMPOSER_SIZE: SelectionActionSize = {
  width: SELECTION_COMPOSER_WIDTH,
  height: SELECTION_COMPOSER_HEIGHT,
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value))
}

export function clampReviewOverlayPosition(
  position: Point,
  overlay: Size,
  container: Size,
  gutter = 8,
): Point {
  const maxX = Math.max(0, container.width - overlay.width - gutter)
  const maxY = Math.max(0, container.height - overlay.height - gutter)
  return {
    x: clamp(position.x, Math.min(gutter, maxX), maxX),
    y: clamp(position.y, Math.min(gutter, maxY), maxY),
  }
}

export function resolveReviewOverlayPosition(value: unknown): Point | null {
  if (!value || typeof value !== "object") return null
  const position = value as Partial<Point>
  if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) return null
  return { x: position.x as number, y: position.y as number }
}

export function getSelectionActionPosition(
  point: Point,
  container: ScrollContainerBox,
  size: SelectionActionSize = { width: SELECTION_ACTION_WIDTH, height: SELECTION_ACTION_HEIGHT },
) {
  const maxX = Math.max(SELECTION_ACTION_GUTTER, container.width - size.width - SELECTION_ACTION_GUTTER)
  const maxY = Math.max(SELECTION_ACTION_GUTTER, container.height - size.height - SELECTION_ACTION_GUTTER)
  return {
    x: container.scrollLeft + clamp(
      point.x - container.left + SELECTION_ACTION_GUTTER,
      SELECTION_ACTION_GUTTER,
      maxX,
    ),
    y: container.scrollTop + clamp(
      point.y - container.top + SELECTION_ACTION_GUTTER,
      SELECTION_ACTION_GUTTER,
      maxY,
    ),
  }
}

export function getReviewBadgeOffset(point: Point, container: ScrollContainerBox) {
  return {
    top: container.scrollTop + (point.y - container.top),
    left: container.scrollLeft + (point.x - container.left),
  }
}

export function nextReviewOverlaySize(size: ReviewOverlaySize): ReviewOverlaySize {
  return size === "compact" ? "standard" : size === "standard" ? "wide" : "compact"
}

export function clampReviewDockWidth(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(360, Math.min(600, value))
    : 384
}

export function canDockReview(availableWidth: number, panelWidth: number): boolean {
  return availableWidth - panelWidth >= 640
}
