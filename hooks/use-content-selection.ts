import React,{ useEffect,useLayoutEffect,useRef,useState } from "react"
import { hashReviewSource,type ReviewAnchor } from "~lib/review"
import {
  anchorFromSelection,
  applyPendingReviewHighlight,
  clearPendingReviewHighlight,
  sourceLineForNode
} from "~lib/review-dom"
import {
  getSelectionActionPosition,
  SELECTION_COMPOSER_SIZE
} from "~lib/review-layout"
import {
  insertReviewPreset,
  type ReviewTextSelection
} from "~lib/review-presets"

const SELECTION_TOOLBAR_DELAY_MS = 300

export type SelectionAction = {
  anchor: ReviewAnchor
  range: Range
  selectionPoint: { x: number; y: number }
  toolbarPosition: { x: number; y: number }
  composerPosition: { x: number; y: number }
  sourceLine: number | null
}

interface UseContentSelectionOptions {
  fileUrl: string
  content: string | null
  isMdFile: boolean
  previewVisible: boolean
  contentRef: React.RefObject<HTMLDivElement>
  previewScrollRef: React.RefObject<HTMLDivElement>
}

function previewBox(preview: HTMLElement) {
  const rect = preview.getBoundingClientRect()
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
    scrollLeft: preview.scrollLeft,
    scrollTop: preview.scrollTop,
  }
}

export function useContentSelection({
  fileUrl,
  content,
  isMdFile,
  previewVisible,
  contentRef,
  previewScrollRef,
}: UseContentSelectionOptions) {
  const [selectionAction, setSelectionAction] = useState<SelectionAction | null>(null)
  const selectionActionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [selectionComposerOpen, setSelectionComposerOpen] = useState(false)
  const [selectionComposerBody, setSelectionComposerBody] = useState("")
  const [selectionComposerCopyState, setSelectionComposerCopyState] =
    useState<"idle" | "copying" | "copied">("idle")
  const selectionComposerSelectionRef = useRef<ReviewTextSelection>({ start: 0, end: 0 })
  const selectionComposerTextareaRef = useRef<HTMLTextAreaElement>(null)
  const [selectionPresetPickerOpen, setSelectionPresetPickerOpen] = useState(false)
  const [quickCommentMenuOpen, setQuickCommentMenuOpen] = useState(false)
  const quickCommentPointerDismissRef = useRef(false)
  const quickCommentTriggerRef = useRef<HTMLButtonElement | null>(null)
  const selectionToolbarRef = useRef<HTMLDivElement | null>(null)

  const clearSelectionActionTimeout = () => {
    if (selectionActionTimeoutRef.current === null) return
    clearTimeout(selectionActionTimeoutRef.current)
    selectionActionTimeoutRef.current = null
  }

  const closeSelectionComposer = () => {
    clearSelectionActionTimeout()
    setSelectionComposerOpen(false)
    setSelectionComposerBody("")
    setSelectionComposerCopyState("idle")
    setSelectionAction(null)
  }

  const openSelectionComposer = () => {
    setSelectionComposerBody("")
    setSelectionComposerCopyState("idle")
    selectionComposerSelectionRef.current = { start: 0, end: 0 }
    setSelectionComposerOpen(true)
  }

  const insertSelectionComposerPreset = (instruction: string) => {
    const result = insertReviewPreset(
      selectionComposerBody,
      instruction,
      selectionComposerSelectionRef.current,
    )
    selectionComposerSelectionRef.current = result.selection
    setSelectionComposerBody(result.value)
    requestAnimationFrame(() => {
      selectionComposerTextareaRef.current?.focus()
      selectionComposerTextareaRef.current?.setSelectionRange(
        result.selection.start,
        result.selection.end,
      )
    })
  }

  const selectionActionAt = (
    anchor: ReviewAnchor,
    range: Range,
    point: { x: number; y: number },
    preview: HTMLElement,
  ): SelectionAction => {
    const box = previewBox(preview)
    return {
      anchor,
      range,
      selectionPoint: {
        x: box.scrollLeft + point.x - box.left,
        y: box.scrollTop + point.y - box.top,
      },
      sourceLine: sourceLineForNode(range.startContainer),
      toolbarPosition: getSelectionActionPosition(point, box),
      composerPosition: getSelectionActionPosition(point, box, SELECTION_COMPOSER_SIZE),
    }
  }

  // Opens the comment composer for a passage chosen by a control rather than a text selection.
  const openSelectionComposerAt = (anchor: ReviewAnchor, range: Range, point: { x: number; y: number }) => {
    const preview = previewScrollRef.current
    if (!preview) return
    clearSelectionActionTimeout()
    setSelectionAction(selectionActionAt(anchor, range, point, preview))
    openSelectionComposer()
  }

  const captureReviewSelection = (event: React.MouseEvent) => {
    const preview = previewScrollRef.current
    if (!isMdFile || !previewVisible || !contentRef.current || !preview) {
      closeSelectionComposer()
      return
    }
    const selection = window.getSelection()
    if (!selection) return
    const captured = anchorFromSelection(
      contentRef.current,
      selection,
      hashReviewSource(content ?? ""),
    )
    if (!captured) {
      closeSelectionComposer()
      return
    }
    const nextSelectionAction = selectionActionAt(
      captured.anchor,
      captured.range,
      { x: event.clientX, y: event.clientY },
      preview,
    )
    setSelectionComposerOpen(false)
    setSelectionComposerBody("")
    clearSelectionActionTimeout()
    // A short delay avoids flashing the toolbar on incidental selections
    // (e.g. a click that collapses right after mouseup).
    selectionActionTimeoutRef.current = setTimeout(() => {
      selectionActionTimeoutRef.current = null
      const liveSelection = window.getSelection()
      if (!liveSelection || liveSelection.isCollapsed) return
      setSelectionAction(nextSelectionAction)
    }, SELECTION_TOOLBAR_DELAY_MS)
  }

  useLayoutEffect(() => {
    const preview = previewScrollRef.current
    const toolbar = selectionToolbarRef.current
    if (!selectionAction || selectionComposerOpen || !preview || !toolbar) return

    const updatePosition = () => {
      const box = previewBox(preview)
      const point = {
        x: box.left + selectionAction.selectionPoint.x - box.scrollLeft,
        y: box.top + selectionAction.selectionPoint.y - box.scrollTop,
      }
      const nextPosition = getSelectionActionPosition(
        point,
        box,
        { width: toolbar.offsetWidth, height: toolbar.offsetHeight },
      )
      setSelectionAction((current) => {
        if (!current || current.range !== selectionAction.range) return current
        if (
          current.toolbarPosition.x === nextPosition.x &&
          current.toolbarPosition.y === nextPosition.y
        ) return current
        return { ...current, toolbarPosition: nextPosition }
      })
    }

    updatePosition()
    const observer = new ResizeObserver(updatePosition)
    observer.observe(preview)
    observer.observe(toolbar)
    return () => observer.disconnect()
  }, [selectionAction?.range, selectionAction?.selectionPoint.x, selectionAction?.selectionPoint.y, selectionComposerOpen])

  useEffect(() => {
    setSelectionComposerOpen(false)
    setSelectionComposerBody("")
    setSelectionAction(null)
    return clearSelectionActionTimeout
  }, [fileUrl, isMdFile])

  useEffect(() => {
    if (!selectionComposerOpen || !selectionAction) return
    applyPendingReviewHighlight(selectionAction.range)
    return clearPendingReviewHighlight
  }, [selectionComposerOpen, selectionAction])

  useLayoutEffect(() => {
    if (!selectionComposerOpen) return
    window.getSelection()?.removeAllRanges()
    const textarea = selectionComposerTextareaRef.current
    if (!textarea) return
    textarea.focus()
    const cursor = textarea.value.length
    textarea.setSelectionRange(cursor, cursor)
  }, [selectionComposerOpen])

  return {
    selectionAction,
    setSelectionAction,
    selectionComposerOpen,
    selectionComposerBody,
    setSelectionComposerBody,
    selectionComposerCopyState,
    setSelectionComposerCopyState,
    selectionComposerSelectionRef,
    selectionComposerTextareaRef,
    selectionPresetPickerOpen,
    setSelectionPresetPickerOpen,
    quickCommentMenuOpen,
    setQuickCommentMenuOpen,
    quickCommentPointerDismissRef,
    quickCommentTriggerRef,
    selectionToolbarRef,
    captureReviewSelection,
    closeSelectionComposer,
    openSelectionComposer,
    openSelectionComposerAt,
    insertSelectionComposerPreset,
  }
}

export type ContentSelection = ReturnType<typeof useContentSelection>
