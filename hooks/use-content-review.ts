import React,{ useEffect,useRef } from "react"
import { type ReviewCopyStatus } from "~components/review-panel"
import { type ReviewCopyReload } from "~hooks/use-content-reload"
import { type ContentReviewHighlights } from "~hooks/use-content-review-highlights"
import { type ContentReviewOverlay } from "~hooks/use-content-review-overlay"
import { type ContentSelection } from "~hooks/use-content-selection"
import { normalizeDiskText } from "~lib/content-file-access"
import {
  consumeOpenReviewRequest,
  watchOpenReviewRequest,
} from "~lib/open-review-request"
import {
  type ReadabilityResult
} from "~lib/readability"
import {
  findReviewHeadingFallback,
  getReviewItemCount,
  isSameReviewAnchor,
  resolveReviewPolicy,
  type ActiveReview,
  type ReviewAnchor
} from "~lib/review"
import {
  rangeFromOffsets,
  scrollReviewHeadingIntoView,
  type RenderedTextIndex
} from "~lib/review-dom"
import {
  recordReviewPromptEvent,
  type ReviewPromptEvent
} from "~lib/review-prompt"

const COPIED_STATUS_FLASH_MS = 2_500

interface UseContentReviewOptions {
  fileUrl: string
  isMdFile: boolean
  previewVisible: boolean
  review: ActiveReview | null
  updateReview: (mutate: (current: ActiveReview | null) => ActiveReview | null) => void
  reviewForMutation: (current: ActiveReview | null) => ActiveReview
  currentReviewDocument: () => RenderedTextIndex | null
  renderedTextIndexRef: React.MutableRefObject<RenderedTextIndex | null>
  highlights: Pick<ContentReviewHighlights, "resolvedReviewComments" | "resolvedImportedComments" | "reviewCommentIdAtPoint" | "importedReviewCommentIdAtPoint">
  overlay: Pick<ContentReviewOverlay, "setReviewOverlayOpen" | "closeReviewOverlay">
  selection: ContentSelection
  setSelectedReviewId: React.Dispatch<React.SetStateAction<string | null>>
  setSelectedImportedCommentId: React.Dispatch<React.SetStateAction<string | null>>
  setReviewSelectionVersion: React.Dispatch<React.SetStateAction<number>>
  setCopyReviewStatus: React.Dispatch<React.SetStateAction<ReviewCopyStatus | null>>
  setReviewCopyReload: React.Dispatch<React.SetStateAction<ReviewCopyReload | null>>
  setClipboardFallback: React.Dispatch<React.SetStateAction<string | null>>
  readabilityResultsRef: React.MutableRefObject<ReadabilityResult[]>
  saveReadabilityResults: (next: ReadabilityResult[]) => void
  diskContentRef: React.MutableRefObject<string | null>
  hasUnsavedDraftRef: React.MutableRefObject<boolean>
  setReviewPromptReady: React.Dispatch<React.SetStateAction<boolean>>
  trackReviewPromptActivity: (event: ReviewPromptEvent) => void
}

// Call after the highlights hook, which resolves comments against the rendered DOM.
export function useContentReview({
  fileUrl,
  isMdFile,
  previewVisible,
  review,
  updateReview,
  reviewForMutation,
  currentReviewDocument,
  renderedTextIndexRef,
  highlights: {
    resolvedReviewComments,
    resolvedImportedComments,
    reviewCommentIdAtPoint,
    importedReviewCommentIdAtPoint,
  },
  overlay: { setReviewOverlayOpen, closeReviewOverlay },
  selection,
  setSelectedReviewId,
  setSelectedImportedCommentId,
  setReviewSelectionVersion,
  setCopyReviewStatus,
  setReviewCopyReload,
  setClipboardFallback,
  readabilityResultsRef,
  saveReadabilityResults,
  diskContentRef,
  hasUnsavedDraftRef,
  setReviewPromptReady,
  trackReviewPromptActivity,
}: UseContentReviewOptions) {
  const { closeSelectionComposer } = selection
  const copiedStatusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => {
    if (copiedStatusTimeoutRef.current) clearTimeout(copiedStatusTimeoutRef.current)
  }, [])

  const updateReviewComment = (id: string, body: string) => {
    updateReview((current) => current ? {
      ...current,
      comments: current.comments.map((comment) =>
        comment.id === id ? { ...comment, body } : comment
      ),
      updatedAt: new Date().toISOString(),
    } : current)
  }

  const deleteReviewCommentById = (id: string) => {
    updateReview((current) => current ? {
      ...current,
      comments: current.comments.filter((comment) => comment.id !== id),
      updatedAt: new Date().toISOString(),
    } : current)
    setSelectedReviewId((selected) => selected === id ? null : selected)
    if (readabilityResultsRef.current.some((item) => item.commentId === id)) {
      saveReadabilityResults(readabilityResultsRef.current.map((item) =>
        item.commentId === id ? { ...item, commentId: undefined } : item
      ))
    }
  }

  // The popover can ask this tab to open its Review.
  useEffect(() => {
    if (!isMdFile) return
    void consumeOpenReviewRequest(fileUrl)
      .then((requested) => {
        if (requested) setReviewOverlayOpen(true)
      })
      .catch(() => undefined)
    return watchOpenReviewRequest(fileUrl, () => setReviewOverlayOpen(true))
  }, [fileUrl, isMdFile])

  const selectReviewComment = (id: string) => {
    setSelectedReviewId(id)
    setSelectedImportedCommentId(null)
    setReviewSelectionVersion((version) => version + 1)
    setReviewOverlayOpen(true)
    const comment = resolvedReviewComments.find((candidate) => candidate.id === id)
    const index = renderedTextIndexRef.current
    if (!previewVisible || !comment || comment.status !== "anchored" || !index) return
    const range = rangeFromOffsets(index, comment.range.start, comment.range.end)
    const element = range?.startContainer.parentElement
    element?.scrollIntoView({ behavior: "smooth", block: "center" })
  }

  const jumpableReviewCommentIds = new Set(
    previewVisible && renderedTextIndexRef.current
      ? resolvedReviewComments
          .filter((comment) =>
            comment.status === "unanchored" &&
            findReviewHeadingFallback(
              renderedTextIndexRef.current?.headings ?? [],
              comment.anchor.headingPath,
            ) !== null
          )
          .map((comment) => comment.id)
      : [],
  )

  const jumpToReviewSection = (id: string) => {
    selectReviewComment(id)
    const comment = resolvedReviewComments.find((candidate) => candidate.id === id)
    const index = renderedTextIndexRef.current
    if (!previewVisible || !index || !comment || comment.status !== "unanchored") return
    const heading = findReviewHeadingFallback(index.headings, comment.anchor.headingPath)
    if (heading) scrollReviewHeadingIntoView(index, heading)
  }

  const jumpableImportedCommentIds = new Set(
    previewVisible && renderedTextIndexRef.current
      ? Array.from(resolvedImportedComments.values())
          .filter((comment) =>
            comment.status === "unanchored" &&
            findReviewHeadingFallback(
              renderedTextIndexRef.current?.headings ?? [],
              comment.anchor.headingPath,
            ) !== null
          )
          .map((comment) => comment.id)
      : [],
  )

  const jumpToImportedComment = (id: string) => {
    const comment = resolvedImportedComments.get(id)
    const index = renderedTextIndexRef.current
    if (!previewVisible || !index || !comment) return
    setReviewOverlayOpen(true)
    setSelectedReviewId(null)
    setSelectedImportedCommentId(id)
    if (comment.status === "anchored") {
      const range = rangeFromOffsets(index, comment.range.start, comment.range.end)
      const element = range?.startContainer.parentElement
      element?.scrollIntoView({ behavior: "smooth", block: "center" })
      return
    }
    const heading = findReviewHeadingFallback(index.headings, comment.anchor.headingPath)
    if (heading) scrollReviewHeadingIntoView(index, heading)
  }

  const clearReview = () => {
    if (!review) return
    const documentState = currentReviewDocument()
    if (!documentState) return
    const summary = resolveReviewPolicy({
      review,
      document: documentState,
      request: { type: "summarize" },
    })
    if (summary.type !== "summarize") return
    updateReview(() => null)
    closeSelectionComposer()
    setSelectedReviewId(null)
    setCopyReviewStatus(null)
    closeReviewOverlay(true)
    if (readabilityResultsRef.current.some((item) => item.commentId)) {
      saveReadabilityResults(readabilityResultsRef.current.map((item) =>
        item.commentId ? { ...item, commentId: undefined } : item
      ))
    }
  }

  const fetchDiskTextForReview = () => new Promise<
    { state: "current" | "changed"; text: string } | { state: "failed" }
  >((resolve) => {
    try {
      chrome.runtime.sendMessage({ type: "fetch-file", url: fileUrl }, (response) => {
        if (chrome.runtime.lastError || !response || typeof response.text !== "string") {
          resolve({ state: "failed" })
          return
        }
        resolve({
          state: normalizeDiskText(response.text) === normalizeDiskText(diskContentRef.current)
            ? "current"
            : "changed",
          text: response.text,
        })
      })
    } catch {
      resolve({ state: "failed" })
    }
  })

  const copyActiveReview = async (commentId?: string, reviewOverride?: ActiveReview | null) => {
    setCopyReviewStatus(null)
    const activeReview = reviewOverride ?? review
    if (!activeReview) return false
    if (
      commentId
        ? !activeReview.comments.some(({ id }) => id === commentId)
        : getReviewItemCount(activeReview) === 0
    ) {
      return false
    }
    const documentState = currentReviewDocument()
    if (!documentState) return false
    const disk = await fetchDiskTextForReview()
    let allowUnverified = false
    let copyPolicy = resolveReviewPolicy({
      review: activeReview,
      document: documentState,
      request: {
        type: "check-copy",
        draftState: hasUnsavedDraftRef.current ? "unsaved" : "saved",
        diskState: disk.state,
        allowUnverified,
      },
    })
    if (copyPolicy.type !== "check-copy") return false
    if (copyPolicy.outcome === "blocked" && copyPolicy.reason === "verification-failed") {
      allowUnverified = window.confirm(
        `Markside could not verify the source on disk. Copy an unverified ${commentId ? "Review Comment" : "Review"} anyway?`,
      )
      if (allowUnverified) {
        copyPolicy = resolveReviewPolicy({
          review: activeReview,
          document: documentState,
          request: {
            type: "check-copy",
            draftState: "saved",
            diskState: "failed",
            allowUnverified: true,
          },
        })
      }
    }
    if (copyPolicy.outcome === "blocked") {
      if (copyPolicy.reason === "external-change") {
        setReviewCopyReload({ comment: !!commentId, loading: false, error: null })
        return false
      }
      const messages = {
        empty: "Add a Review Note or Review Comment before copying.",
        "unsaved-draft": `Save the Unsaved Draft before copying this ${commentId ? "Review Comment" : "Review"}.`,
        "verification-failed": "The source could not be verified.",
      }
      setCopyReviewStatus({
        kind: "error",
        message: messages[copyPolicy.reason],
        commentId,
      })
      return false
    }
    const exported = resolveReviewPolicy({
      review: activeReview,
      document: documentState,
      request: {
        type: "export",
        verification: copyPolicy.verification,
        commentId,
      },
    })
    if (exported.type !== "export") return false
    try {
      await navigator.clipboard.writeText(exported.markdown)
      setCopyReviewStatus(commentId ? null : { kind: "success" })
      // Only the confirmation settles back; a failure stays until it is resolved.
      if (copiedStatusTimeoutRef.current) clearTimeout(copiedStatusTimeoutRef.current)
      copiedStatusTimeoutRef.current = setTimeout(
        () => setCopyReviewStatus((current) =>
          current?.kind === "success" ? null : current),
        COPIED_STATUS_FLASH_MS,
      )
      const eligible = await recordReviewPromptEvent("review-copy").catch(() => false)
      if (eligible) setReviewPromptReady(true)
      return true
    } catch {
      setClipboardFallback(exported.markdown)
      setCopyReviewStatus({
        kind: "error",
        message: "Clipboard access failed. Copy the generated prompt from the dialog.",
        commentId,
      })
      return false
    }
  }

  const updateReviewNote = (note: string) => {
    updateReview((current) => ({
      ...reviewForMutation(current),
      note,
      updatedAt: new Date().toISOString(),
    }))
  }

  const createReviewComment = (anchor: ReviewAnchor, body: string) => {
    const existing = review?.comments.find((comment) =>
      isSameReviewAnchor(comment.anchor, anchor)
    )
    if (existing) {
      updateReviewComment(existing.id, body)
      setSelectedReviewId(existing.id)
      setReviewOverlayOpen(true)
      return { outcome: "existing" as const, commentId: existing.id, review }
    }
    const documentState = currentReviewDocument()
    if (!documentState) return null
    const createdAt = new Date().toISOString()
    const commentId = crypto.randomUUID()
    const request = {
      type: "add-comment" as const,
      id: commentId,
      body,
      createdAt,
      anchor,
    }
    const result = resolveReviewPolicy({
      review: reviewForMutation(review),
      document: documentState,
      request,
    })
    if (result.type !== "add-comment") return null
    if (result.outcome === "duplicate") {
      setSelectedReviewId(result.commentId)
      setReviewOverlayOpen(true)
    } else if (result.outcome === "added") {
      const isFirstComment = (review?.comments.length ?? 0) === 0
      updateReview((current) => {
        const rebased = resolveReviewPolicy({
          review: reviewForMutation(current),
          document: documentState,
          request,
        })
        return rebased.type === "add-comment" && rebased.outcome === "added"
          ? rebased.review
          : current
      })
      setSelectedReviewId(null)
      setReviewOverlayOpen(true)
      if (isFirstComment) trackReviewPromptActivity("review-comment")
    }
    return {
      outcome: result.outcome,
      commentId: result.outcome === "invalid" ? undefined : result.commentId,
      review: result.outcome === "added" ? result.review : review,
    }
  }

  const findDuplicateReviewComment = (anchor: ReviewAnchor) => {
    const resolvedDuplicate = resolvedReviewComments.find((comment) =>
      comment.status === "anchored" &&
      comment.range.start === anchor.start &&
      comment.range.end === anchor.end
    )
    return resolvedDuplicate ?? review?.comments.find((comment) =>
      isSameReviewAnchor(comment.anchor, anchor)
    )
  }

  const saveSelectionComposerComment = () => {
    const { selectionAction, selectionComposerBody } = selection
    if (!selectionAction || !selectionComposerBody.trim()) return
    createReviewComment(selectionAction.anchor, selectionComposerBody)
    closeSelectionComposer()
  }

  const copySelectionComposerComment = async () => {
    const { selectionAction, selectionComposerBody, setSelectionComposerCopyState } = selection
    if (!selectionAction || !selectionComposerBody.trim()) return
    const result = createReviewComment(selectionAction.anchor, selectionComposerBody)
    if (!result) return
    setSelectionComposerCopyState("copying")
    const didCopy = await copyActiveReview(result.commentId, result.review)
    if (!didCopy) {
      setSelectionComposerCopyState("idle")
      return
    }
    setSelectionComposerCopyState("copied")
    closeSelectionComposer()
  }

  const activateReviewSelection = () => {
    const { selectionAction, setSelectionAction, openSelectionComposer } = selection
    if (!selectionAction) return
    const duplicate = findDuplicateReviewComment(selectionAction.anchor)
    if (duplicate) {
      selectReviewComment(duplicate.id)
      setSelectionAction(null)
      return
    }
    openSelectionComposer()
    setSelectedReviewId(null)
    setSelectedImportedCommentId(null)
  }

  const activateQuickComment = (instruction: string) => {
    const { selectionAction, setSelectionAction } = selection
    if (!selectionAction) return
    const duplicate = findDuplicateReviewComment(selectionAction.anchor)
    if (duplicate) {
      selectReviewComment(duplicate.id)
    } else {
      createReviewComment(selectionAction.anchor, instruction)
    }
    setSelectionAction(null)
  }

  const handleReviewHighlightClick = (event: React.MouseEvent) => {
    const domSelection = window.getSelection()
    if (domSelection && !domSelection.isCollapsed) return
    const commentId = reviewCommentIdAtPoint(event.clientX, event.clientY)
    if (commentId) {
      selectReviewComment(commentId)
      return
    }
    const importedCommentId = importedReviewCommentIdAtPoint(event.clientX, event.clientY)
    if (importedCommentId) jumpToImportedComment(importedCommentId)
  }

  return {
    updateReviewNote,
    updateReviewComment,
    deleteReviewCommentById,
    copyActiveReview,
    selectReviewComment,
    jumpToReviewSection,
    jumpToImportedComment,
    jumpableReviewCommentIds,
    jumpableImportedCommentIds,
    clearReview,
    saveSelectionComposerComment,
    copySelectionComposerComment,
    activateReviewSelection,
    activateQuickComment,
    handleReviewHighlightClick,
  }
}
