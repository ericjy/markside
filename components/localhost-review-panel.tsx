import { t } from "~lib/i18n"
import { AlertTriangle, Check, Copy, Crosshair, GripVertical, LogOut, MessageSquare, Pencil, Plus, Trash2 } from "lucide-react"
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type Ref } from "react"

import {
  getLocalhostAnnotationText,
  getLocalhostReviewItemCount,
  labelLocalhostTarget,
  type LocalhostAnnotation,
  type LocalhostReview,
  type LocalhostReviewPage,
} from "~lib/localhost-review"
import {
  LOCALHOST_PANEL_WIDTH,
  type LocalhostPoint,
} from "~lib/localhost-review-layout"
import { SELECTION_COMPOSER_SIZE } from "~lib/review-layout"

// The Review surface renders inside a shadow root over an application Markside
// does not control, so it carries its own copy of the Review tokens from
// `style.css` and plain CSS instead of the content application's Tailwind build.
export const LOCALHOST_REVIEW_STYLES = `
:host {
  --mrp-surface: hsl(0 0% 100%);
  --mrp-chrome: hsl(0 0% 98%);
  --mrp-list: hsl(220 14.3% 98%);
  --mrp-card: hsl(220 14.3% 95.9%);
  --mrp-card-hover: hsl(214 40% 92%);
  --mrp-card-selected: hsl(0 0% 100%);
  --mrp-input: hsl(0 0% 100%);
  --mrp-border: hsl(220 13% 91%);
  --mrp-foreground: hsl(224 71.4% 4.1%);
  --mrp-muted-foreground: hsl(220 8.9% 46.1%);
  --mrp-accent: hsl(220 14.3% 95.9%);
  --mrp-primary: hsl(220.9 39.3% 11%);
  --mrp-primary-foreground: hsl(210 20% 98%);
  --mrp-ring: hsl(224 71.4% 4.1%);
  --mrp-warning: hsl(32 81% 29%);
  --mrp-destructive: hsl(0 72% 41%);
  --mrp-panel-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25);
  --mrp-card-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --mrp-selected-shadow: 0 8px 20px -6px rgb(0 0 0 / 0.18), 0 2px 6px -2px rgb(0 0 0 / 0.1);
  --mrp-marker: 217 91% 60%;
  --mrp-pending: 41 96% 48%;
  /* Sits on the dark primary button, so it takes the brighter of the two
     task-list checkmark greens. */
  --mrp-success: hsl(132 60% 46%);
  all: initial;
  color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  :host {
    --mrp-surface: hsl(222 24% 10%);
    --mrp-chrome: hsl(222 18% 14%);
    --mrp-list: hsl(222 20% 12%);
    --mrp-card: hsl(222 18% 15%);
    --mrp-card-hover: hsl(217 26% 20%);
    --mrp-card-selected: hsl(218 20% 24%);
    --mrp-input: hsl(222 24% 9%);
    --mrp-border: hsl(218 16% 27%);
    --mrp-foreground: hsl(210 20% 98%);
    --mrp-muted-foreground: hsl(217.9 10.6% 64.9%);
    --mrp-accent: hsl(215 27.9% 16.9%);
    --mrp-primary: hsl(210 20% 98%);
    --mrp-primary-foreground: hsl(220.9 39.3% 11%);
    --mrp-ring: hsl(216 12.2% 83.9%);
    --mrp-warning: hsl(41 96% 62%);
    --mrp-destructive: hsl(0 91% 71%);
    --mrp-panel-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.6);
    --mrp-selected-shadow: 0 8px 20px -6px rgb(0 0 0 / 0.45), 0 2px 6px -2px rgb(0 0 0 / 0.3);
    --mrp-marker: 213 94% 68%;
    --mrp-pending: 41 96% 62%;
    --mrp-success: hsl(130 78% 29%);
    color-scheme: dark;
  }
}
* { box-sizing: border-box; }
.mrp-root {
  color: var(--mrp-foreground);
  font: 400 14px/1.5 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
}
button { cursor: pointer; font: inherit; }
button:focus-visible, textarea:focus-visible {
  outline: 2px solid var(--mrp-ring);
  outline-offset: 1px;
}

.mrp-panel {
  background: var(--mrp-surface);
  border: 1px solid var(--mrp-border);
  border-radius: 16px;
  box-shadow: var(--mrp-panel-shadow);
  display: flex;
  flex-direction: column;
  max-height: 70vh;
  max-width: calc(100vw - 16px);
  overflow: hidden;
  position: fixed;
  width: ${LOCALHOST_PANEL_WIDTH}px;
  z-index: 2147483647;
}
.mrp-chrome { background: var(--mrp-chrome); }
.mrp-header {
  align-items: center;
  border-bottom: 1px solid var(--mrp-border);
  cursor: grab;
  display: flex;
  flex-shrink: 0;
  gap: 6px;
  padding: 8px 8px 8px 4px;
  touch-action: none;
  user-select: none;
}
.mrp-heading-row { align-items: baseline; display: flex; flex: 1; gap: 8px; min-width: 0; }
.mrp-panel[data-dragging="true"] .mrp-header { cursor: grabbing; }
.mrp-title { font-size: 14px; font-weight: 600; margin: 0; }
.mrp-count { color: var(--mrp-muted-foreground); font-size: 12px; font-variant-numeric: tabular-nums; }
.mrp-icon-button {
  align-items: center;
  background: transparent;
  border: 0;
  border-radius: 6px;
  color: var(--mrp-muted-foreground);
  display: flex;
  flex-shrink: 0;
  height: 28px;
  justify-content: center;
  width: 28px;
}
.mrp-icon-button:hover { background: var(--mrp-accent); color: var(--mrp-foreground); }
.mrp-icon-button.mrp-danger:hover { color: var(--mrp-destructive); }
.mrp-exit {
  align-items: center;
  background: var(--mrp-surface);
  border: 1px solid var(--mrp-border);
  border-radius: 999px;
  color: var(--mrp-muted-foreground);
  display: inline-flex;
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
  gap: 5px;
  height: 26px;
  padding: 0 10px;
}
.mrp-exit:hover { background: var(--mrp-accent); color: var(--mrp-foreground); }
.mrp-grip { cursor: grab; }
.mrp-panel[data-dragging="true"] .mrp-grip { cursor: grabbing; }

.mrp-pick {
  align-items: center;
  background: var(--mrp-surface);
  border: 1px solid var(--mrp-border);
  border-radius: 999px;
  color: var(--mrp-foreground);
  display: inline-flex;
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
  gap: 5px;
  height: 26px;
  padding: 0 10px;
}
.mrp-pick:hover { background: var(--mrp-accent); }
.mrp-pick[aria-pressed="true"] {
  background: var(--mrp-primary);
  border-color: var(--mrp-primary);
  color: var(--mrp-primary-foreground);
}
.mrp-scroll { flex: 1; min-height: 0; overflow-y: auto; }
.mrp-note-field { background: var(--mrp-surface); display: block; padding: 16px; }
.mrp-note-field .mrp-section-label { display: block; margin-bottom: 8px; }
.mrp-note {
  background: var(--mrp-input);
  border: 1px solid var(--mrp-border);
  border-radius: 6px;
  color: inherit;
  font: inherit;
  line-height: 1.6;
  min-height: 112px;
  padding: 10px 12px;
  resize: vertical;
  width: 100%;
}
.mrp-add-note {
  align-items: center;
  background: transparent;
  border: 1px dashed var(--mrp-border);
  border-radius: 8px;
  color: var(--mrp-muted-foreground);
  display: flex;
  font-size: 13px;
  gap: 7px;
  padding: 10px 12px;
  width: 100%;
}
.mrp-add-note:hover { background: var(--mrp-card); color: var(--mrp-foreground); }
.mrp-note-preview {
  background: transparent;
  border: 0;
  border-radius: 6px;
  color: var(--mrp-foreground);
  cursor: pointer;
  display: -webkit-box;
  font: inherit;
  line-clamp: 3;
  line-height: 1.6;
  overflow: hidden;
  padding: 4px 6px;
  text-align: left;
  width: 100%;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}
.mrp-note-preview:hover { background: var(--mrp-card); }
.mrp-list {
  background: var(--mrp-list);
  border-top: 1px solid var(--mrp-border);
  min-height: 100%;
  padding-bottom: 8px;
}
.mrp-list-header {
  background: var(--mrp-list);
  padding: 10px 16px 6px;
  position: sticky;
  top: 0;
  z-index: 1;
}
.mrp-list-header-row { align-items: center; display: flex; gap: 8px; justify-content: space-between; }
.mrp-section-label {
  color: var(--mrp-muted-foreground);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.75px;
  text-transform: uppercase;
}
.mrp-page-heading {
  align-items: baseline;
  display: flex;
  gap: 8px;
  justify-content: space-between;
  padding: 12px 16px 8px;
}
.mrp-page-label {
  display: -webkit-box;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  font-weight: 600;
  line-clamp: 2;
  overflow: hidden;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
.mrp-page-current {
  color: var(--mrp-muted-foreground);
  flex-shrink: 0;
  font-size: 11px;
}
.mrp-empty {
  color: var(--mrp-muted-foreground);
  font-size: 12px;
  line-height: 1.7;
  margin: 0;
  padding: 4px 16px 28px;
}

.mrp-cards { display: flex; flex-direction: column; gap: 12px; padding: 0 16px 12px; }
.mrp-card {
  background: var(--mrp-card);
  border: 1px solid var(--mrp-border);
  border-radius: 8px;
  box-shadow: var(--mrp-card-shadow);
  cursor: pointer;
  padding: 16px;
  transition: background 120ms ease, border-color 120ms ease;
}
.mrp-card:hover { background: var(--mrp-card-hover); }
.mrp-card[data-selected="true"] {
  background: var(--mrp-card-selected);
  box-shadow: var(--mrp-selected-shadow);
}
.mrp-card-head {
  align-items: center;
  color: var(--mrp-muted-foreground);
  display: flex;
  font-size: 11px;
  font-weight: 600;
  gap: 6px;
  margin-bottom: 8px;
}
.mrp-card-number { font-variant-numeric: tabular-nums; margin-left: auto; }
.mrp-quote {
  background: transparent;
  border: 0;
  border-left: 2px solid var(--mrp-border);
  color: var(--mrp-muted-foreground);
  cursor: pointer;
  display: -webkit-box;
  font-size: 12px;
  font-style: italic;
  line-clamp: 2;
  line-height: 1.6;
  overflow: hidden;
  padding: 2px 0 2px 8px;
  text-align: left;
  width: 100%;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
.mrp-body {
  color: var(--mrp-foreground);
  display: -webkit-box;
  font-size: 13px;
  line-clamp: 2;
  line-height: 1.6;
  margin: 10px 0 0;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
.mrp-quote:hover { color: var(--mrp-foreground); }
.mrp-missing {
  align-items: center;
  color: var(--mrp-warning);
  display: flex;
  font-size: 11px;
  gap: 6px;
  margin: 8px 0 0;
}
.mrp-input {
  background: var(--mrp-input);
  border: 1px solid var(--mrp-border);
  border-radius: 6px;
  color: inherit;
  font: inherit;
  line-height: 1.6;
  margin-top: 12px;
  max-height: 160px;
  min-height: 64px;
  padding: 10px 12px;
  resize: vertical;
  width: 100%;
}
.mrp-input::placeholder { color: var(--mrp-muted-foreground); }
.mrp-card-foot { align-items: center; display: flex; justify-content: space-between; margin-top: 4px; }
.mrp-item-copy {
  align-items: center;
  background: transparent;
  border: 0;
  border-radius: 6px;
  color: var(--mrp-muted-foreground);
  display: inline-flex;
  font-size: 11px;
  font-weight: 600;
  gap: 5px;
  padding: 6px 8px;
}
.mrp-item-copy:hover { background: var(--mrp-accent); color: var(--mrp-foreground); }
.mrp-item-copy .mrp-check { color: var(--mrp-success); }
.mrp-deletion { color: var(--mrp-muted-foreground); font-size: 11px; margin: 8px 0 0; }

.mrp-footer {
  border-top: 1px solid var(--mrp-border);
  flex-shrink: 0;
  padding: 12px 16px;
}
.mrp-status { color: var(--mrp-muted-foreground); font-size: 12px; line-height: 1.5; margin: 0 0 8px; }
.mrp-footer-row { display: flex; gap: 8px; }
.mrp-primary {
  align-items: center;
  background: var(--mrp-primary);
  border: 1px solid var(--mrp-primary);
  border-radius: 6px;
  color: var(--mrp-primary-foreground);
  display: inline-flex;
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  gap: 8px;
  height: 44px;
  justify-content: center;
  padding: 0 16px;
}
.mrp-primary:hover { opacity: 0.9; }
.mrp-primary .mrp-check { color: var(--mrp-success); }
.mrp-primary:disabled { cursor: not-allowed; opacity: 0.5; }
.mrp-ghost {
  align-items: center;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  color: var(--mrp-muted-foreground);
  display: inline-flex;
  font-size: 13px;
  gap: 6px;
  height: 44px;
  padding: 0 12px;
}
.mrp-ghost:hover { background: var(--mrp-accent); color: var(--mrp-destructive); }
.mrp-ghost.mrp-danger { color: var(--mrp-destructive); }

.mrp-toolbar {
  background: var(--mrp-surface);
  border: 1px solid var(--mrp-border);
  border-radius: 10px;
  box-shadow: var(--mrp-panel-shadow);
  display: flex;
  gap: 2px;
  padding: 4px;
  position: fixed;
  z-index: 2147483647;
}
.mrp-toolbar button {
  background: transparent;
  border: 0;
  border-radius: 6px;
  color: var(--mrp-foreground);
  font-size: 13px;
  font-weight: 500;
  padding: 7px 10px;
}
.mrp-toolbar button:hover { background: var(--mrp-accent); }
/* Deletion sits in its own segment, so it reads as the destructive action and
   is not one drift of the pointer away from Reword. */
.mrp-toolbar-divider {
  align-self: stretch;
  border-left: 1px solid var(--mrp-border);
  margin: 4px 2px;
}
.mrp-toolbar button.mrp-toolbar-icon {
  align-items: center;
  display: flex;
  padding: 7px 9px;
}
.mrp-toolbar button.mrp-toolbar-icon:hover {
  background: var(--mrp-accent);
  color: var(--mrp-warning);
}

.mrp-composer {
  background: var(--mrp-surface);
  border: 1px solid var(--mrp-border);
  border-radius: 12px;
  box-shadow: var(--mrp-panel-shadow);
  padding: 14px;
  position: fixed;
  width: ${SELECTION_COMPOSER_SIZE.width}px;
  z-index: 2147483647;
}
.mrp-composer .mrp-input { max-height: 240px; min-height: 128px; }
.mrp-composer-title { font-size: 13px; font-weight: 600; margin: 0 0 8px; }
.mrp-composer-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 10px; }
.mrp-composer-actions .mrp-primary { flex: 0 0 auto; font-size: 13px; height: 36px; }
.mrp-composer-actions .mrp-ghost { height: 36px; }
.mrp-composer-error { color: var(--mrp-warning); font-size: 12px; margin: 8px 0 0; }

.mrp-marker {
  background: hsl(var(--mrp-marker) / 0.16);
  border: 1px solid hsl(var(--mrp-marker) / 0.7);
  border-radius: 3px;
  pointer-events: none;
  position: absolute;
  z-index: 2147483646;
}
.mrp-marker[data-selected="true"] {
  background: hsl(var(--mrp-marker) / 0.3);
  border-color: hsl(var(--mrp-marker));
}
/* Amber for a Review item still being written, matching the Markdown surface. */
.mrp-marker[data-pending="true"] {
  background: hsl(var(--mrp-pending) / 0.28);
  border-color: hsl(var(--mrp-pending));
}
.mrp-badge {
  align-items: center;
  background: hsl(var(--mrp-marker));
  border: 1px solid #fff;
  border-radius: 999px;
  box-shadow: 0 1px 3px rgb(0 0 0 / 0.35);
  color: #fff;
  cursor: pointer;
  display: flex;
  font: 600 10px/1 ui-sans-serif, system-ui, -apple-system, sans-serif;
  font-variant-numeric: tabular-nums;
  height: 18px;
  justify-content: center;
  min-width: 18px;
  padding: 0 5px;
  pointer-events: auto;
  position: absolute;
  z-index: 2147483646;
}
.mrp-badge[data-selected="true"] { box-shadow: 0 0 0 3px hsl(var(--mrp-marker) / 0.35); }
.mrp-hover-outline {
  border: 2px dashed hsl(var(--mrp-marker));
  border-radius: 3px;
  pointer-events: none;
  position: fixed;
  z-index: 2147483646;
}
`

const KIND_LABEL: Record<LocalhostAnnotation["kind"], string> = {
  comment: "Comment",
  replacement: "Text replacement",
}

interface LocalhostReviewPanelProps {
  panelRef: Ref<HTMLElement>
  position: LocalhostPoint
  dragging: boolean
  review: LocalhostReview
  pages: LocalhostReviewPage[]
  currentPageUrl: string
  missingTargetIds: ReadonlySet<string>
  displayNumbers: ReadonlyMap<string, number>
  selectedId: string | null
  pickMode: boolean
  copiedAnnotationId: string | null
  copied: boolean
  status: string | null
  onDragStart: (event: PointerEvent<HTMLElement>) => void
  onDragKeyDown: (event: KeyboardEvent<HTMLElement>) => void
  onNoteChange: (note: string) => void
  onTogglePickMode: () => void
  onSelectAnnotation: (id: string) => void
  onToggleAnnotation: (id: string) => void
  onCopyAnnotation: (id: string) => void
  onUpdateAnnotation: (id: string, text: string) => void
  onDeleteAnnotation: (id: string) => void
  onCopy: () => void
  onClear: () => void
  onClose: () => void
}

export function LocalhostReviewPanel({
  panelRef,
  position,
  dragging,
  review,
  pages,
  currentPageUrl,
  missingTargetIds,
  displayNumbers,
  selectedId,
  pickMode,
  copiedAnnotationId,
  copied,
  status,
  onDragStart,
  onDragKeyDown,
  onNoteChange,
  onTogglePickMode,
  onSelectAnnotation,
  onToggleAnnotation,
  onCopyAnnotation,
  onUpdateAnnotation,
  onDeleteAnnotation,
  onCopy,
  onClear,
  onClose,
}: LocalhostReviewPanelProps) {
  const itemCount = getLocalhostReviewItemCount(review)
  const [clearArmed, setClearArmed] = useState(false)
  const clearButtonRef = useRef<HTMLButtonElement>(null)
  const [editingNote, setEditingNote] = useState(false)
  const cardRefs = useRef(new Map<string, HTMLElement>())

  // Selecting an annotation on the page brings its card into view here.
  useEffect(() => {
    if (!selectedId) return
    const frame = requestAnimationFrame(() => {
      cardRefs.current.get(selectedId)?.scrollIntoView({ behavior: "smooth", block: "nearest" })
    })
    return () => cancelAnimationFrame(frame)
  }, [selectedId])
  useEffect(() => {
    if (!clearArmed) return
    const cancelOutside = (event: globalThis.PointerEvent) => {
      if (!event.composedPath().includes(clearButtonRef.current!)) setClearArmed(false)
    }
    const cancelOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setClearArmed(false)
    }
    const timeout = setTimeout(() => setClearArmed(false), 5_000)
    document.addEventListener("pointerdown", cancelOutside, true)
    document.addEventListener("keydown", cancelOnEscape, true)
    return () => {
      clearTimeout(timeout)
      document.removeEventListener("pointerdown", cancelOutside, true)
      document.removeEventListener("keydown", cancelOnEscape, true)
    }
  }, [clearArmed])
  useEffect(() => {
    setClearArmed(false)
  }, [review.origin, itemCount])

  return (
    <aside
      ref={panelRef}
      className="mrp-panel"
      data-dragging={dragging}
      style={{ left: position.left, top: position.top }}
      aria-label={t("Markside Review")}>
      <header className="mrp-chrome mrp-header" onPointerDown={onDragStart}>
        <button
          type="button"
          className="mrp-icon-button mrp-grip"
          aria-label={t("Move Review panel. Use the arrow keys to reposition it.")}
          onKeyDown={onDragKeyDown}>
          <GripVertical size={15} />
        </button>
        <span className="mrp-heading-row">
          <h2 className="mrp-title">{t("Review")}</h2>
          <span className="mrp-count">
            {itemCount} {itemCount === 1 ? t("item") : t("items")}
          </span>
        </span>
        <button
          type="button"
          className="mrp-exit"
          title={t("Stop reviewing this page")}
          onClick={onClose}>
          <LogOut size={12} /> {t(" Exit Review Mode")}</button>
      </header>

      <div className="mrp-scroll">
        <div className="mrp-note-field">
          {editingNote ? (
            <>
              <span className="mrp-section-label">{t("Overall feedback")}</span>
              <textarea
                className="mrp-note"
                autoFocus
                aria-label={t("Overall feedback for this Review")}
                value={review.note}
                placeholder={t("Feedback that applies to everything you reviewed")}
                onBlur={() => setEditingNote(false)}
                onChange={(event) => onNoteChange(event.target.value)}
              />
            </>
          ) : review.note.trim() ? (
            <>
              <span className="mrp-section-label">{t("Overall feedback")}</span>
              <button
                type="button"
                className="mrp-note-preview"
                aria-label={t("Edit the overall feedback")}
                onClick={() => setEditingNote(true)}>
                {review.note}
              </button>
            </>
          ) : (
            <button
              type="button"
              className="mrp-add-note"
              onClick={() => setEditingNote(true)}>
              <Plus size={14} /> {t(" Add overall feedback")}</button>
          )}
        </div>

        <div className="mrp-list">
        <div className="mrp-list-header">
          <div className="mrp-list-header-row">
            <span className="mrp-section-label">{t("Comments")}</span>
            <button
              type="button"
              className="mrp-pick"
              aria-pressed={pickMode}
              onClick={onTogglePickMode}>
              <Crosshair size={12} /> {pickMode ? t("Picking...") : t("Pick element")}
            </button>
          </div>
          {pickMode && (
            <p className="mrp-hint">{t("Click an element on the page. Escape cancels.")}</p>
          )}
        </div>

        {pages.length === 0 && (
          <p className="mrp-empty">
            {t("Select text on the page to add a comment. Use Pick element for an image, a button, or anything without selectable text.")}</p>
        )}

        {pages.map((page) => (
          <section key={page.url}>
            <div className="mrp-page-heading">
              <span className="mrp-page-label" title={page.url}>{page.url}</span>
              {page.url === currentPageUrl && <span className="mrp-page-current">{t("This page")}</span>}
            </div>
            <div className="mrp-cards">
              {page.annotations.map((annotation) => {
                const missing = page.url === currentPageUrl && missingTargetIds.has(annotation.id)
                const isDeletion =
                  annotation.kind === "replacement" && !annotation.replacement.trim()
                return (
                  <article
                    key={annotation.id}
                    ref={(element) => {
                      if (element) cardRefs.current.set(annotation.id, element)
                      else cardRefs.current.delete(annotation.id)
                    }}
                    className="mrp-card"
                    data-selected={selectedId === annotation.id}
                    onClick={(event) => {
                      // The card is a shortcut for its own controls, so a click
                      // that already landed on one is left alone.
                      if (
                        event.target instanceof Element &&
                        event.target.closest("button, textarea, input, select, a")
                      ) return
                      onToggleAnnotation(annotation.id)
                    }}>
                    <div className="mrp-card-head">
                      {annotation.kind === "comment"
                        ? <MessageSquare size={12} />
                        : isDeletion
                          ? <Trash2 size={12} />
                          : <Pencil size={12} />}
                      <span>{isDeletion ? t("Deletion") : KIND_LABEL[annotation.kind]}</span>
                      <span className="mrp-card-number">{displayNumbers.get(annotation.id)}</span>
                    </div>
                    <button
                      type="button"
                      className="mrp-quote"
                      onClick={() => onSelectAnnotation(annotation.id)}>
                      {labelLocalhostTarget(annotation.target)}
                    </button>
                    {missing && (
                      <p className="mrp-missing">
                        <AlertTriangle size={12} /> {t(" Target not found")}</p>
                    )}
                    {selectedId === annotation.id ? (
                      <>
                        {/* A deletion's empty box is its finished state, so the
                            card says so before offering the box. */}
                        {isDeletion && (
                          <p className="mrp-deletion">{t("Requests deleting the selected text.")}</p>
                        )}
                        <textarea
                          className="mrp-input"
                          autoFocus
                          aria-label={KIND_LABEL[annotation.kind]}
                          placeholder={
                            annotation.kind === "comment"
                              ? t("What should change here?")
                              : isDeletion
                                ? t("Type a replacement to change it instead of deleting it")
                                : t("The text that should appear instead")
                          }
                          value={getLocalhostAnnotationText(annotation)}
                          onFocus={() => onSelectAnnotation(annotation.id)}
                          onChange={(event) =>
                            onUpdateAnnotation(annotation.id, event.target.value)}
                        />
                        <div className="mrp-card-foot">
                          <button
                            type="button"
                            className="mrp-item-copy"
                            onClick={() => onCopyAnnotation(annotation.id)}>
                            {copiedAnnotationId === annotation.id
                              ? <><Check className="mrp-check" size={12} strokeWidth={2.5} /> {t(" Copied")}</>
                              : <><Copy size={12} /> {t(" Copy prompt")}</>}
                          </button>
                          <button
                            type="button"
                            className="mrp-icon-button mrp-danger"
                            aria-label={t("Delete {0}", [KIND_LABEL[annotation.kind]])}
                            onClick={() => onDeleteAnnotation(annotation.id)}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </>
                    ) : (
                      <p className="mrp-body">
                        {isDeletion
                          ? t("Requests deleting the selected text.")
                          : getLocalhostAnnotationText(annotation)}
                      </p>
                    )}
                  </article>
                )
              })}
            </div>
          </section>
        ))}
        </div>
      </div>

      <div className="mrp-chrome mrp-footer">
        {status && <p className="mrp-status" role="status">{status}</p>}
        <div className="mrp-footer-row">
          <button
            type="button"
            className="mrp-primary"
            disabled={itemCount === 0}
            onClick={onCopy}>
            {copied ? <Check className="mrp-check" size={14} strokeWidth={2.5} /> : <Copy size={14} />}
            {copied ? t("Review copied") : t("Copy review as prompt")}
          </button>
          {itemCount > 0 && (
            <button
              type="button"
              className={clearArmed ? "mrp-ghost mrp-danger" : "mrp-ghost"}
              ref={clearButtonRef}
              onBlur={() => setClearArmed(false)}
              onClick={() => {
                if (!clearArmed) {
                  setClearArmed(true)
                  return
                }
                setClearArmed(false)
                onClear()
              }}>
              <Trash2 size={13} />
              <span style={{ display: "grid", textAlign: "left" }}>
                <span aria-hidden="true" style={{ gridArea: "1 / 1", visibility: "hidden" }}>{t("Confirm clear")}</span>
                <span style={{ gridArea: "1 / 1" }}>{clearArmed ? t("Confirm clear") : t("Clear all")}</span>
              </span>
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}
