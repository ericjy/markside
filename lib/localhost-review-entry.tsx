// Unreleased localhost Review entry, kept outside contents/ so Plasmo does not register it.
// To ship it: move it back into contents/, restore the "scripting" permission, and build
// with PLASMO_PUBLIC_LOCALHOST_REVIEW=true so the popup offers it.
//
// Review surface for a running localhost application. It stays inert until the
// user opens the Review panel from the extension popup, renders inside a shadow
// root so the application's styles and layout are untouched, and never modifies
// the reviewed page.

import { Trash2 } from "lucide-react"
import type { PlasmoCSConfig } from "plasmo"
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createRoot, type Root } from "react-dom/client"

import {
  LOCALHOST_REVIEW_STYLES,
  LocalhostReviewPanel,
} from "~components/localhost-review-panel"
import {
  addLocalhostAnnotation,
  createEmptyLocalhostReview,
  formatLocalhostReviewPrompt,
  getLocalhostPageUrl,
  getLocalhostReviewOrigin,
  groupLocalhostAnnotationsByPage,
  labelLocalhostTarget,
  removeLocalhostAnnotation,
  setLocalhostReviewNote,
  updateLocalhostAnnotation,
  type AddLocalhostAnnotationRequest,
  type LocalhostReview,
  type LocalhostTarget,
} from "~lib/localhost-review"
import {
  clampLocalhostPanelPosition,
  getDefaultLocalhostPanelPosition,
  getLocalhostOverlayPosition,
  LOCALHOST_PANEL_STEP,
  LOCALHOST_PANEL_WIDTH,
  toDocumentBox,
  type LocalhostBox,
  type LocalhostPoint,
} from "~lib/localhost-review-layout"
import {
  getLocalhostReviewPanelPosition,
  getStoredLocalhostReview,
  isLocalhostReviewPanelOpen,
  saveLocalhostReview,
  setLocalhostReviewPanelOpen,
  setLocalhostReviewPanelPosition,
  watchLocalhostReview,
  watchLocalhostReviewPanel,
} from "~lib/localhost-review-storage"
import {
  buildLocalhostElementTarget,
  buildLocalhostTextTarget,
  getLocalhostTargetRects,
  resolveLocalhostTarget,
  type LocalhostTargetResolution,
} from "~lib/localhost-target"
import { buildRenderedTextIndex } from "~lib/review-dom"
import { SELECTION_COMPOSER_SIZE } from "~lib/review-layout"

export const config: PlasmoCSConfig = {
  matches: [
    "http://localhost/*",
    "https://localhost/*",
    "http://*.localhost/*",
    "https://*.localhost/*",
    "http://127.0.0.1/*",
    "https://127.0.0.1/*",
  ],
  all_frames: false,
  run_at: "document_idle",
}

const REWORD_REQUEST = "Suggest alternative wordings."

const MUTATION_DEBOUNCE_MS = 400
const COPIED_FLASH_MS = 2_500
const COMPOSER_SIZE = SELECTION_COMPOSER_SIZE
const TOOLBAR_SIZE = { width: 280, height: 44 }

interface Draft {
  kind: "comment" | "replacement"
  target: LocalhostTarget
  text: string
  rect: DOMRect
  // Document coordinates, so the pending highlight stays on its content while
  // the composer is open.
  boxes: LocalhostBox[]
}

interface Marker {
  id: string
  box: { left: number; top: number; width: number; height: number }
}

function viewport() {
  return { width: window.innerWidth, height: window.innerHeight }
}

function boxOf(rect: DOMRect) {
  return { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
}

function scrollOffset() {
  return { x: window.scrollX, y: window.scrollY }
}

function markersFor(id: string, resolution: LocalhostTargetResolution): Marker[] {
  const scroll = scrollOffset()
  return getLocalhostTargetRects(resolution).map((rect) => ({
    id,
    box: toDocumentBox(boxOf(rect), scroll),
  }))
}

function documentBoxes(rects: DOMRect[]): LocalhostBox[] {
  const scroll = scrollOffset()
  return rects
    .filter((rect) => rect.width > 0 && rect.height > 0)
    .map((rect) => toDocumentBox(boxOf(rect), scroll))
}

async function writeToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

function LocalhostReviewApp({
  origin,
  host,
  onClose,
}: {
  origin: string
  host: HTMLElement
  onClose: () => void
}) {
  const [review, setReview] = useState<LocalhostReview>(() => createEmptyLocalhostReview(origin))
  const [pageUrl, setPageUrl] = useState(() => getLocalhostPageUrl(location.href))
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [pickMode, setPickMode] = useState(false)
  const [toolbar, setToolbar] = useState<
    { target: LocalhostTarget; rect: DOMRect; rects: DOMRect[] } | null
  >(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [draftError, setDraftError] = useState<string | null>(null)
  const [markers, setMarkers] = useState<Marker[]>([])
  const [missingTargetIds, setMissingTargetIds] = useState<ReadonlySet<string>>(new Set())
  const [hoverRect, setHoverRect] = useState<DOMRect | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [copiedAnnotationId, setCopiedAnnotationId] = useState<string | null>(null)
  const [panelPosition, setPanelPosition] = useState<LocalhostPoint>(() =>
    getDefaultLocalhostPanelPosition(viewport())
  )
  const [dragging, setDragging] = useState(false)
  const resolutionsRef = useRef(new Map<string, LocalhostTargetResolution>())
  const writtenAtRef = useRef<string | null>(null)
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const panelRef = useRef<HTMLElement | null>(null)
  const panelBoxRef = useRef(boxOf(new DOMRect(0, 0, LOCALHOST_PANEL_WIDTH, 0)))
  const dragOffsetRef = useRef({ x: 0, y: 0 })

  const panelSize = () => ({
    width: panelRef.current?.offsetWidth ?? LOCALHOST_PANEL_WIDTH,
    height: panelRef.current?.offsetHeight ?? 0,
  })

  const movePanel = useCallback((position: LocalhostPoint, persist: boolean) => {
    const clamped = clampLocalhostPanelPosition(position, panelSize(), viewport())
    setPanelPosition(clamped)
    if (persist) {
      void setLocalhostReviewPanelPosition(origin, clamped).catch(() => undefined)
    }
  }, [origin])

  const inHost = useCallback(
    (event: Event) => event.composedPath().includes(host),
    [host],
  )

  useEffect(() => {
    let active = true
    void getStoredLocalhostReview(origin)
      .then((stored) => {
        if (active) setReview(stored)
      })
      .catch(() => undefined)
    void getLocalhostReviewPanelPosition(origin)
      .then((stored) => {
        if (active && stored) movePanel(stored, false)
      })
      .catch(() => undefined)
    // Ignore the echo of this tab's own write so it cannot interrupt typing.
    const stop = watchLocalhostReview(origin, (next) => {
      if (next.updatedAt === writtenAtRef.current) return
      setReview(next)
    })
    return () => {
      active = false
      stop()
    }
  }, [origin])

  const applyReview = useCallback((next: LocalhostReview) => {
    setReview(next)
    writtenAtRef.current = next.updatedAt
    void saveLocalhostReview(next).catch(() =>
      setStatus("Markside could not save this Review. Copy it before closing the tab.")
    )
  }, [])

  const resolveTargets = useCallback(() => {
    const pageAnnotations = review.annotations.filter(
      (annotation) => annotation.url === pageUrl,
    )
    if (pageAnnotations.length === 0) {
      resolutionsRef.current = new Map()
      setMarkers([])
      setMissingTargetIds(new Set())
      return
    }
    // Walking the page text is only worth it when a text target needs it.
    const index = pageAnnotations.some((annotation) => annotation.target.kind === "text")
      ? buildRenderedTextIndex(document.body)
      : undefined
    const nextMarkers: Marker[] = []
    const missing = new Set<string>()
    const resolutions = new Map<string, LocalhostTargetResolution>()
    for (const annotation of pageAnnotations) {
      const resolution = resolveLocalhostTarget(document.body, annotation.target, index)
      if (resolution.status !== "found") {
        missing.add(annotation.id)
        continue
      }
      resolutions.set(annotation.id, resolution)
      nextMarkers.push(...markersFor(annotation.id, resolution))
    }
    resolutionsRef.current = resolutions
    setMarkers(nextMarkers)
    setMissingTargetIds(missing)
  }, [pageUrl, review.annotations])

  const resolveTargetsRef = useRef(resolveTargets)
  resolveTargetsRef.current = resolveTargets

  useEffect(() => {
    resolveTargets()
  }, [resolveTargets])

  useEffect(() => () => {
    if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current)
  }, [])

  useEffect(() => {
    const element = panelRef.current
    if (!element) return
    const observer = new ResizeObserver(() => {
      panelBoxRef.current = boxOf(element.getBoundingClientRect())
    })
    observer.observe(element)
    panelBoxRef.current = boxOf(element.getBoundingClientRect())
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    panelBoxRef.current = boxOf(
      panelRef.current?.getBoundingClientRect() ??
        new DOMRect(panelPosition.left, panelPosition.top, LOCALHOST_PANEL_WIDTH, 0)
    )
  }, [panelPosition])

  useEffect(() => {
    const onResize = () => movePanel(panelPosition, false)
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [movePanel, panelPosition])

  // Markers hold document coordinates, so scrolling the window moves them
  // natively and needs no work here. Only a scrolling container inside the page,
  // or a resize, actually moves content relative to the document.
  useEffect(() => {
    let frame = 0
    const reposition = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const next: Marker[] = []
        for (const [id, resolution] of resolutionsRef.current) {
          next.push(...markersFor(id, resolution))
        }
        setMarkers(next)
      })
    }
    const onScroll = (event: Event) => {
      const target = event.target
      if (
        target === document ||
        target === document.documentElement ||
        target === document.body
      ) return
      reposition()
    }
    window.addEventListener("scroll", onScroll, { capture: true, passive: true })
    window.addEventListener("resize", reposition)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("scroll", onScroll, true)
      window.removeEventListener("resize", reposition)
    }
  }, [])

  // The application repaints and routes on its own; re-resolve after it settles.
  useEffect(() => {
    const readPageUrl = () => setPageUrl(getLocalhostPageUrl(location.href))
    let timeout: ReturnType<typeof setTimeout> | null = null
    const observer = new MutationObserver(() => {
      if (timeout) clearTimeout(timeout)
      timeout = setTimeout(() => {
        readPageUrl()
        resolveTargetsRef.current()
      }, MUTATION_DEBOUNCE_MS)
    })
    observer.observe(document.body, { childList: true, subtree: true, characterData: true })
    window.addEventListener("popstate", readPageUrl)
    window.addEventListener("hashchange", readPageUrl)
    return () => {
      if (timeout) clearTimeout(timeout)
      observer.disconnect()
      window.removeEventListener("popstate", readPageUrl)
      window.removeEventListener("hashchange", readPageUrl)
    }
  }, [])

  useEffect(() => {
    if (pickMode) {
      setToolbar(null)
      return
    }
    const readSelection = (event: Event) => {
      if (inHost(event)) return
      requestAnimationFrame(() => {
        const selection = window.getSelection()
        if (!selection || selection.isCollapsed) {
          setToolbar(null)
          return
        }
        const captured = buildLocalhostTextTarget(document.body, selection)
        if (!captured) {
          setToolbar(null)
          return
        }
        setToolbar({
          target: captured.target,
          rect: captured.range.getBoundingClientRect(),
          rects: Array.from(captured.range.getClientRects()),
        })
      })
    }
    document.addEventListener("mouseup", readSelection, true)
    document.addEventListener("keyup", readSelection, true)
    return () => {
      document.removeEventListener("mouseup", readSelection, true)
      document.removeEventListener("keyup", readSelection, true)
    }
  }, [inHost, pickMode])

  // Pick element consumes exactly one click so the application control does not
  // activate. Later clicks reach the application normally.
  useEffect(() => {
    if (!pickMode) return
    const swallow = (event: Event) => {
      if (inHost(event)) return
      event.preventDefault()
      event.stopImmediatePropagation()
    }
    const onMove = (event: MouseEvent) => {
      if (inHost(event)) return
      const element = event.target as Element | null
      setHoverRect(element instanceof Element ? element.getBoundingClientRect() : null)
    }
    const onClick = (event: MouseEvent) => {
      if (inHost(event)) return
      event.preventDefault()
      event.stopImmediatePropagation()
      const element = event.target as Element | null
      setPickMode(false)
      setHoverRect(null)
      if (!(element instanceof Element)) return
      setDraftError(null)
      const rect = element.getBoundingClientRect()
      setDraft({
        kind: "comment",
        target: buildLocalhostElementTarget(document.body, element),
        text: "",
        rect,
        boxes: documentBoxes([rect]),
      })
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      setPickMode(false)
      setHoverRect(null)
    }
    document.addEventListener("pointerdown", swallow, true)
    document.addEventListener("mousedown", swallow, true)
    document.addEventListener("mouseup", swallow, true)
    document.addEventListener("click", onClick, true)
    document.addEventListener("mousemove", onMove, true)
    document.addEventListener("keydown", onKeyDown, true)
    return () => {
      document.removeEventListener("pointerdown", swallow, true)
      document.removeEventListener("mousedown", swallow, true)
      document.removeEventListener("mouseup", swallow, true)
      document.removeEventListener("click", onClick, true)
      document.removeEventListener("mousemove", onMove, true)
      document.removeEventListener("keydown", onKeyDown, true)
    }
  }, [inHost, pickMode])

  const startPanelDrag = (event: React.PointerEvent<HTMLElement>) => {
    if (event.button !== 0) return
    // The grip is a button so it can take focus for keyboard moves, but it is
    // also the most obvious thing to drag.
    const target = event.target instanceof Element ? event.target : null
    if (target?.closest("button") && !target.closest(".mrp-grip")) return
    const element = event.currentTarget
    element.setPointerCapture(event.pointerId)
    dragOffsetRef.current = {
      x: event.clientX - panelPosition.left,
      y: event.clientY - panelPosition.top,
    }
    setDragging(true)
    const onMove = (move: PointerEvent) => {
      movePanel(
        {
          left: move.clientX - dragOffsetRef.current.x,
          top: move.clientY - dragOffsetRef.current.y,
        },
        false,
      )
    }
    const onEnd = () => {
      element.removeEventListener("pointermove", onMove)
      element.removeEventListener("pointerup", onEnd)
      element.removeEventListener("pointercancel", onEnd)
      setDragging(false)
      void setLocalhostReviewPanelPosition(
        origin,
        clampLocalhostPanelPosition(
          {
            left: panelRef.current?.getBoundingClientRect().left ?? panelPosition.left,
            top: panelRef.current?.getBoundingClientRect().top ?? panelPosition.top,
          },
          panelSize(),
          viewport(),
        ),
      ).catch(() => undefined)
    }
    element.addEventListener("pointermove", onMove)
    element.addEventListener("pointerup", onEnd)
    element.addEventListener("pointercancel", onEnd)
  }

  const movePanelWithKeyboard = (event: React.KeyboardEvent<HTMLElement>) => {
    const step = event.shiftKey ? LOCALHOST_PANEL_STEP * 4 : LOCALHOST_PANEL_STEP
    const offsets: Record<string, LocalhostPoint> = {
      ArrowLeft: { left: -step, top: 0 },
      ArrowRight: { left: step, top: 0 },
      ArrowUp: { left: 0, top: -step },
      ArrowDown: { left: 0, top: step },
    }
    const offset = offsets[event.key]
    if (!offset) return
    event.preventDefault()
    movePanel(
      { left: panelPosition.left + offset.left, top: panelPosition.top + offset.top },
      true,
    )
  }

  const startDraft = (kind: Draft["kind"], text: string) => {
    if (!toolbar) return
    setDraftError(null)
    setDraft({
      kind,
      target: toolbar.target,
      text,
      rect: toolbar.rect,
      boxes: documentBoxes(toolbar.rects),
    })
    setToolbar(null)
  }

  // The composer and the toolbar's Delete text button share this path; they
  // differ only in where a failure is shown, since a deletion has no composer.
  const submitAnnotation = (
    request: AddLocalhostAnnotationRequest,
    reportError: (message: string) => void,
  ) => {
    const result = addLocalhostAnnotation(review, request)
    if (result.outcome === "invalid") {
      const removing = request.kind === "replacement" && !request.replacement.trim()
      reportError(
        result.reason === "empty"
          ? "Write the feedback before adding it."
          : result.reason === "unchanged"
            ? "The replacement matches the original text."
            : result.reason === "no-text"
              ? `This element renders no text to ${removing ? "delete" : "replace"}. Add a comment instead.`
              : "This selection is too long to review."
      )
      return
    }
    setDraft(null)
    setToolbar(null)
    if (result.outcome === "duplicate") {
      setSelectedId(result.annotationId)
      setStatus("That content already has this kind of feedback.")
      return
    }
    applyReview(result.review)
    setSelectedId(result.annotationId)
    setStatus(null)
    setCopied(false)
    window.getSelection()?.removeAllRanges()
  }

  const addDraft = () => {
    if (!draft) return
    submitAnnotation(
      {
        id: crypto.randomUUID(),
        url: location.href,
        createdAt: new Date().toISOString(),
        target: draft.target,
        ...(draft.kind === "comment"
          ? { kind: "comment" as const, body: draft.text }
          : { kind: "replacement" as const, replacement: draft.text }),
      },
      setDraftError,
    )
  }

  const addDeletion = () => {
    if (!toolbar) return
    submitAnnotation(
      {
        id: crypto.randomUUID(),
        url: location.href,
        createdAt: new Date().toISOString(),
        target: toolbar.target,
        kind: "replacement",
        replacement: "",
      },
      setStatus,
    )
  }

  const selectAnnotation = (id: string) => {
    setSelectedId(id)
    const resolution = resolutionsRef.current.get(id)
    if (resolution?.status === "found") {
      resolution.element.scrollIntoView({ behavior: "smooth", block: "center" })
    }
  }

  const toggleAnnotation = (id: string) => {
    if (selectedId === id) {
      setSelectedId(null)
      return
    }
    selectAnnotation(id)
  }

  const copyAnnotation = async (id: string) => {
    const markdown = formatLocalhostReviewPrompt(review, {
      missingTargetIds,
      annotationId: id,
    })
    if (!(await writeToClipboard(markdown))) {
      setStatus("Markside could not reach the clipboard. Try again after clicking the page.")
      return
    }
    setCopiedAnnotationId(id)
    if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current)
    copiedTimeoutRef.current = setTimeout(() => setCopiedAnnotationId(null), COPIED_FLASH_MS)
  }

  const copyReview = async () => {
    const markdown = formatLocalhostReviewPrompt(review, { missingTargetIds })
    const didCopy = await writeToClipboard(markdown)
    setCopied(didCopy)
    setStatus(
      didCopy
        ? null
        : "Markside could not reach the clipboard. Try again after clicking the page."
    )
    // The confirmation settles back so a second copy can confirm itself too.
    setCopiedAnnotationId(null)
    if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current)
    if (didCopy) copiedTimeoutRef.current = setTimeout(() => setCopied(false), COPIED_FLASH_MS)
  }

  const pages = useMemo(
    () => groupLocalhostAnnotationsByPage(review.annotations),
    [review.annotations],
  )
  const displayNumbers = useMemo(() => {
    const numbers = new Map<string, number>()
    let displayNumber = 0
    for (const page of pages) {
      for (const annotation of page.annotations) {
        displayNumber += 1
        numbers.set(annotation.id, displayNumber)
      }
    }
    return numbers
  }, [pages])

  const badges = useMemo(() => {
    const seen = new Set<string>()
    return markers.flatMap((marker) => {
      if (seen.has(marker.id)) return []
      seen.add(marker.id)
      return [{
        id: marker.id,
        displayNumber: displayNumbers.get(marker.id) ?? 0,
        left: Math.max(0, marker.box.left - 9),
        top: Math.max(0, marker.box.top - 9),
      }]
    })
  }, [displayNumbers, markers])

  const draftPosition = draft
    ? getLocalhostOverlayPosition(boxOf(draft.rect), COMPOSER_SIZE, viewport(), panelBoxRef.current)
    : null

  return (
    <>
      {draft?.boxes.map((box, index) => (
        <div
          key={`pending-${index}`}
          className="mrp-marker"
          data-pending="true"
          style={{ left: box.left, top: box.top, width: box.width, height: box.height }}
        />
      ))}
      {badges.map((badge) => (
        <button
          key={`badge-${badge.id}`}
          type="button"
          className="mrp-badge"
          data-selected={selectedId === badge.id}
          aria-label={`Review item ${badge.displayNumber}`}
          title={`Review item ${badge.displayNumber}`}
          style={{ left: badge.left, top: badge.top }}
          onClick={() => setSelectedId(badge.id)}>
          {badge.displayNumber}
        </button>
      ))}
      {markers.map((marker, index) => (
        <div
          key={`${marker.id}-${index}`}
          className="mrp-marker"
          data-selected={selectedId === marker.id}
          style={{
            left: marker.box.left,
            top: marker.box.top,
            width: marker.box.width,
            height: marker.box.height,
          }}
        />
      ))}
      {hoverRect && (
        <div
          className="mrp-hover-outline"
          style={{
            left: hoverRect.left,
            top: hoverRect.top,
            width: hoverRect.width,
            height: hoverRect.height,
          }}
        />
      )}

      {toolbar && !draft && (
        <div
          className="mrp-toolbar"
          style={getLocalhostOverlayPosition(
            boxOf(toolbar.rect),
            TOOLBAR_SIZE,
            viewport(),
            panelBoxRef.current,
          )}>
          <button type="button" onClick={() => startDraft("comment", "")}>Comment</button>
          <button
            type="button"
            onClick={() => startDraft("replacement", "")}>
            Replace
          </button>
          <button type="button" onClick={() => startDraft("comment", REWORD_REQUEST)}>
            Reword
          </button>
          <span className="mrp-toolbar-divider" />
          <button
            type="button"
            className="mrp-toolbar-icon"
            aria-label="Delete text"
            title="Delete text"
            onClick={addDeletion}>
            <Trash2 size={14} />
          </button>
        </div>
      )}

      {draft && draftPosition && (
        <div className="mrp-composer" style={draftPosition}>
          <p className="mrp-composer-title">
            {draft.kind === "comment" ? "Comment" : "Replace text"}
          </p>
          <span className="mrp-quote">{labelLocalhostTarget(draft.target)}</span>
          <textarea
            className="mrp-input"
            autoFocus
            aria-label={draft.kind === "comment" ? "Review Comment" : "Replacement text"}
            placeholder={
              draft.kind === "comment"
                ? "What should change here?"
                : "The text that should appear instead"
            }
            value={draft.text}
            onChange={(event) => setDraft({ ...draft, text: event.target.value })}
          />
          {draftError && <p className="mrp-composer-error">{draftError}</p>}
          <div className="mrp-composer-actions">
            <button
              type="button"
              className="mrp-ghost"
              onClick={() => {
                setDraft(null)
                setDraftError(null)
              }}>
              Cancel
            </button>
            <button
              type="button"
              className="mrp-primary"
              disabled={draft.kind === "replacement" && !draft.text.trim()}
              onClick={addDraft}>
              {draft.kind === "comment" ? "Add comment" : "Add replacement"}
            </button>
          </div>
        </div>
      )}

      <LocalhostReviewPanel
        panelRef={panelRef}
        position={panelPosition}
        dragging={dragging}
        onDragStart={startPanelDrag}
        onDragKeyDown={movePanelWithKeyboard}
        review={review}
        pages={pages}
        currentPageUrl={pageUrl}
        missingTargetIds={missingTargetIds}
        displayNumbers={displayNumbers}
        selectedId={selectedId}
        pickMode={pickMode}
        copied={copied}
        status={status}
        onNoteChange={(note) => applyReview(setLocalhostReviewNote(review, note))}
        onTogglePickMode={() => {
          setPickMode((current) => !current)
          setToolbar(null)
          setHoverRect(null)
        }}
        onSelectAnnotation={selectAnnotation}
        onToggleAnnotation={toggleAnnotation}
        onCopyAnnotation={(id) => void copyAnnotation(id)}
        copiedAnnotationId={copiedAnnotationId}
        onUpdateAnnotation={(id, text) => applyReview(updateLocalhostAnnotation(review, id, text))}
        onDeleteAnnotation={(id) => applyReview(removeLocalhostAnnotation(review, id))}
        onCopy={() => void copyReview()}
        onClear={() => {
          applyReview(createEmptyLocalhostReview(origin))
          setSelectedId(null)
          setStatus(null)
        }}
        onClose={onClose}
      />
    </>
  )
}

let surface: { host: HTMLElement; root: Root } | null = null

function mountSurface(origin: string) {
  if (surface) return
  const host = document.createElement("div")
  host.id = "markside-localhost-review"
  const shadow = host.attachShadow({ mode: "open" })
  const style = document.createElement("style")
  style.textContent = LOCALHOST_REVIEW_STYLES
  const mount = document.createElement("div")
  mount.className = "mrp-root"
  shadow.append(style, mount)
  document.documentElement.appendChild(host)
  const root = createRoot(mount)
  surface = { host, root }
  root.render(React.createElement(LocalhostReviewApp, {
    origin,
    host,
    onClose: () => {
      void setLocalhostReviewPanelOpen(origin, false).catch(() => undefined)
      unmountSurface()
    },
  }))
}

function unmountSurface() {
  if (!surface) return
  const { host, root } = surface
  surface = null
  // Unmounting from inside a React event handler has to wait for the commit.
  setTimeout(() => {
    root.unmount()
    host.remove()
  }, 0)
}

// Nothing is added to the application's DOM until the user opens the Review.
async function bootstrap() {
  const origin = getLocalhostReviewOrigin(location.href)
  if (!origin) return
  watchLocalhostReviewPanel(origin, (open) => {
    if (open) mountSurface(origin)
    else unmountSurface()
  })
  if (await isLocalhostReviewPanelOpen(origin).catch(() => false)) mountSurface(origin)
}

// The popover injects this script when it is missing, which also re-runs it on a
// page that already has it.
const MOUNTED_FLAG = "__marksideLocalhostReview"
const scope = window as unknown as Record<string, boolean | undefined>
if (!scope[MOUNTED_FLAG]) {
  scope[MOUNTED_FLAG] = true
  void bootstrap()
}

// Plasmo's content-script development overlay requires a default export.
export default function PlasmoOverlayPlaceholder() {
  return null
}
