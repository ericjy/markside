import React,{ useEffect,useLayoutEffect,useRef,useState } from "react"
import {
  clampReviewOverlayPosition,
  DEFAULT_REVIEW_OVERLAY_SIZE,
  nextReviewOverlaySize,
  resolveReviewOverlayPosition,
  clampReviewDockWidth,
  canDockReview,
  type ReviewOverlaySize
} from "~lib/review-layout"

export const REVIEW_OVERLAY_POSITION_KEY_PREFIX = "reviewOverlayPosition:"
export const REVIEW_LAYOUT_KEY = "reviewLayout"
export const REVIEW_DOCK_WIDTH_KEY = "reviewDockWidth"

export const REVIEW_OVERLAY_OPEN_KEY_PREFIX = "reviewOverlayOpen:"

type Point = { x: number; y: number }

interface UseContentReviewOverlayOptions {
  fileUrl: string
  isMdFile: boolean
  isSplitView: boolean
  outlineOpen: boolean
  rightSidebarWidth: number
  sidebarInsetRef: React.RefObject<HTMLDivElement>
}

export function useContentReviewOverlay({
  fileUrl,
  isMdFile,
  outlineOpen,
  rightSidebarWidth,
  sidebarInsetRef,
}: UseContentReviewOverlayOptions) {
  const [reviewLayout, setReviewLayout] = useState<"floating" | "docked">("floating")
  const [reviewDockWidth, setReviewDockWidth] = useState(384)
  const preferenceChanged = useRef(false)
  useEffect(() => {
    let active = true
    void chrome.storage.local.get([REVIEW_LAYOUT_KEY, REVIEW_DOCK_WIDTH_KEY]).then((stored) => {
      if (!active || preferenceChanged.current) return
      setReviewLayout(stored[REVIEW_LAYOUT_KEY] === "docked" ? "docked" : "floating")
      setReviewDockWidth(clampReviewDockWidth(stored[REVIEW_DOCK_WIDTH_KEY]))
    }).catch(() => undefined)
    return () => { active = false }
  }, [])
  const toggleReviewDock = () => {
    preferenceChanged.current = true
    const next = reviewLayout === "docked" ? "floating" : "docked"
    setReviewLayout(next)
    void chrome.storage.local.set({ [REVIEW_LAYOUT_KEY]: next }).catch(() => undefined)
  }
  const resizeReviewDock = (width: number) => {
    preferenceChanged.current = true
    setReviewDockWidth(clampDockResize(width))
  }
  const saveReviewDockWidth = (width: number) => {
    void chrome.storage.local.set({ [REVIEW_DOCK_WIDTH_KEY]: clampDockResize(width) }).catch(() => undefined)
  }
  const [reviewOverlayOpen, setReviewOverlayOpen] = useState(false)
  const [restoredFile, setRestoredFile] = useState<string | null>(null)
  const [reviewOverlaySize, setReviewOverlaySize] = useState<ReviewOverlaySize>(
    DEFAULT_REVIEW_OVERLAY_SIZE,
  )
  const [reviewOverlayPosition, setReviewOverlayPosition] = useState<Point | null>(null)
  const positionRef = useRef<Point | null>(null)
  const [reviewOverlayDragging, setReviewOverlayDragging] = useState(false)
  const reviewOverlayMoved = reviewOverlayPosition !== null
  const reviewOverlayRef = useRef<HTMLElement>(null)
  const reviewTriggerRef = useRef<HTMLButtonElement | null>(null)
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    offsetX: number
    offsetY: number
    moved: boolean
  } | null>(null)
  const [layoutWidth, setLayoutWidth] = useState(0)

  useEffect(() => {
    let active = true
    setReviewOverlayOpen(false)
    setRestoredFile(null)
    setReviewOverlayPosition(null)
    positionRef.current = null
    dragRef.current = null
    setReviewOverlayDragging(false)
    if (isMdFile) {
      const positionKey = `${REVIEW_OVERLAY_POSITION_KEY_PREFIX}${fileUrl}`
      const openKey = `${REVIEW_OVERLAY_OPEN_KEY_PREFIX}${fileUrl}`
      void chrome.storage.local.get([positionKey, openKey])
        .then((stored) => {
          if (!active) return
          if (!positionRef.current) {
            const position = resolveReviewOverlayPosition(stored[positionKey])
            if (position) {
              positionRef.current = position
              setReviewOverlayPosition(position)
            }
          }
          if (stored[openKey] === true) {
            setReviewOverlayOpen(true)
          }
          setRestoredFile(fileUrl)
        })
        .catch(() => {
          if (active) setRestoredFile(fileUrl)
        })
    }
    return () => {
      active = false
    }
  }, [fileUrl, isMdFile])

  useEffect(() => {
    if (!isMdFile || restoredFile !== fileUrl) return
    void chrome.storage.local.set({
      [`${REVIEW_OVERLAY_OPEN_KEY_PREFIX}${fileUrl}`]: reviewOverlayOpen,
    }).catch(() => undefined)
  }, [fileUrl, isMdFile, reviewOverlayOpen, restoredFile])

  useEffect(() => {
    const inset = sidebarInsetRef.current
    if (!inset) return
    const updateWidth = () => setLayoutWidth(inset.getBoundingClientRect().width)
    updateWidth()
    const observer = new ResizeObserver(updateWidth)
    observer.observe(inset)
    return () => observer.disconnect()
  }, [])

  const clampDockResize = (width: number) => clampReviewDockWidth(Math.min(
    width,
    layoutWidth - (outlineOpen && window.innerWidth >= 1280 ? rightSidebarWidth : 0) - 640,
  ))

  const reviewOverlayDocked = isMdFile && reviewOverlayOpen && reviewLayout === "docked" &&
    canDockReview(
      layoutWidth - (outlineOpen && window.innerWidth >= 1280 ? rightSidebarWidth : 0),
      reviewDockWidth,
    )


  useLayoutEffect(() => {
    if (!reviewOverlayOpen || !reviewOverlayMoved || reviewOverlayDocked) return
    const inset = sidebarInsetRef.current
    const overlay = reviewOverlayRef.current
    if (!inset || !overlay) return
    const keepInBounds = () => {
      setReviewOverlayPosition((current) => {
        if (!current) return current
        const next = clampReviewOverlayPosition(
          current,
          { width: overlay.offsetWidth, height: overlay.offsetHeight },
          { width: inset.clientWidth, height: inset.clientHeight },
        )
        positionRef.current = next
        return next.x === current.x && next.y === current.y ? current : next
      })
    }
    keepInBounds()
    const observer = new ResizeObserver(keepInBounds)
    observer.observe(inset)
    observer.observe(overlay)
    window.addEventListener("resize", keepInBounds)
    return () => {
      observer.disconnect()
      window.removeEventListener("resize", keepInBounds)
    }
  }, [reviewOverlayOpen, reviewOverlayMoved, reviewOverlayDocked])

  const closeReviewOverlay = (restoreTriggerFocus = false) => {
    dragRef.current = null
    setReviewOverlayDragging(false)
    setReviewOverlayOpen(false)
    if (restoreTriggerFocus) {
      requestAnimationFrame(() => reviewTriggerRef.current?.focus())
    }
  }


  const moveReviewOverlay = (x: number, y: number) => {
    const inset = sidebarInsetRef.current
    const overlay = reviewOverlayRef.current
    if (!inset || !overlay) return null
    const position = clampReviewOverlayPosition(
      { x, y },
      { width: overlay.offsetWidth, height: overlay.offsetHeight },
      { width: inset.clientWidth, height: inset.clientHeight },
    )
    positionRef.current = position
    setReviewOverlayPosition(position)
    return position
  }

  const savePosition = (position: Point) => {
    void chrome.storage.local.set({
      [`${REVIEW_OVERLAY_POSITION_KEY_PREFIX}${fileUrl}`]: position,
    }).catch(() => undefined)
  }

  const startReviewOverlayDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    const target = event.target instanceof Element ? event.target : null
    if (target?.closest("button") && !target.closest("[data-review-drag-handle]")) return
    const inset = sidebarInsetRef.current
    const overlay = reviewOverlayRef.current
    if (!inset || !overlay) return
    const panelRect = overlay.getBoundingClientRect()
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: event.clientX - panelRect.left,
      offsetY: event.clientY - panelRect.top,
      moved: false,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    event.preventDefault()
  }

  const updateReviewOverlayDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    const inset = sidebarInsetRef.current
    if (!drag || drag.pointerId !== event.pointerId || !inset) return
    if (!drag.moved && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 3) return
    if (!drag.moved) {
      drag.moved = true
      setReviewOverlayDragging(true)
    }
    const insetRect = inset.getBoundingClientRect()
    moveReviewOverlay(
      event.clientX - insetRect.left - drag.offsetX,
      event.clientY - insetRect.top - drag.offsetY,
    )
  }

  const endReviewOverlayDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    if (drag.moved && positionRef.current) {
      savePosition(positionRef.current)
    }
    dragRef.current = null
    setReviewOverlayDragging(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const moveReviewOverlayWithKeyboard = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const step = event.shiftKey ? 40 : 10
    const offsets: Record<string, Point> = {
      ArrowLeft: { x: -step, y: 0 },
      ArrowRight: { x: step, y: 0 },
      ArrowUp: { x: 0, y: -step },
      ArrowDown: { x: 0, y: step },
    }
    const offset = offsets[event.key]
    if (!offset) return
    const inset = sidebarInsetRef.current
    const overlay = reviewOverlayRef.current
    if (!inset || !overlay) return
    event.preventDefault()
    const panelRect = overlay.getBoundingClientRect()
    const insetRect = inset.getBoundingClientRect()
    const position = moveReviewOverlay(
      panelRect.left - insetRect.left + offset.x,
      panelRect.top - insetRect.top + offset.y,
    )
    if (position) savePosition(position)
  }

  return {
    reviewLayout,
    toggleReviewDock,
    reviewDockWidth,
    resizeReviewDock,
    saveReviewDockWidth,
    reviewOverlayOpen,
    setReviewOverlayOpen,
    closeReviewOverlay,
    reviewOverlaySize,
    setReviewOverlaySize,
    nextReviewOverlaySize: nextReviewOverlaySize(reviewOverlaySize),
    reviewOverlayPosition,
    reviewOverlayDragging,
    reviewOverlayDocked,
    reviewOverlayRef,
    reviewTriggerRef,
    startReviewOverlayDrag,
    updateReviewOverlayDrag,
    endReviewOverlayDrag,
    moveReviewOverlayWithKeyboard,
  }
}

export type ContentReviewOverlay = ReturnType<typeof useContentReviewOverlay>
