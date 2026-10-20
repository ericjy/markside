import React,{ useEffect,useMemo,useState } from "react"
import type { AgentReviewComment } from "../cli/review-file.mjs"
import {
  findInnermostCommentAt,
  hashReviewSource,
  resolveImportedCommentAnchor,
  resolveReviewPolicy,
  type ActiveReview,
  type ResolvedAnchor,
  type ResolvedReviewComment,
  type ReviewComment
} from "~lib/review"
import {
  applyImportedReviewHighlights,
  applyReviewHighlights,
  buildRenderedTextIndex,
  clearReviewHighlights,
  computeReviewBadgeAnchors,
  renderedOffsetAtPoint,
  type RenderedTextIndex,
  type ReviewBadgeAnchor
} from "~lib/review-dom"

interface UseContentReviewHighlightsOptions {
  agentResults?: ReadonlyMap<string, AgentReviewComment>
  review: ActiveReview | null
  content: string | null
  fileUrl: string
  contentRef: React.RefObject<HTMLDivElement>
  previewScrollRef: React.RefObject<HTMLDivElement>
  previewVisible: boolean
  renderedTextIndexRef: React.MutableRefObject<RenderedTextIndex | null>
  selectedReviewId: string | null
  selectedImportedCommentId: string | null
  // Values that re-render the preview DOM, so highlights must be reapplied.
  reviewRenderVersion: number
  numberHeadings: boolean
  changesVisible: boolean
  reloadComparison: { before: string; after: string } | null
}

// Call after the preview hook: highlights are applied to the rendered DOM.
export function useContentReviewHighlights({
  review,
  agentResults,
  content,
  fileUrl,
  contentRef,
  previewScrollRef,
  previewVisible,
  renderedTextIndexRef,
  selectedReviewId,
  selectedImportedCommentId,
  reviewRenderVersion,
  numberHeadings,
  changesVisible,
  reloadComparison,
}: UseContentReviewHighlightsOptions) {
  const [resolvedReviewComments, setResolvedReviewComments] = useState<ResolvedReviewComment[]>([])
  const [resolvedImportedComments, setResolvedImportedComments] = useState<Map<string, ReviewComment & ResolvedAnchor>>(new Map())
  const [reviewBadgeAnchors, setReviewBadgeAnchors] = useState<ReviewBadgeAnchor[]>([])

  const activeReviewComments = useMemo(() => resolvedReviewComments.filter((comment) =>
    comment.localStatus !== "resolved" && (agentResults?.get(comment.id)?.status ?? "open") === "open"
  ), [resolvedReviewComments, agentResults])

  useEffect(() => {
    if (!review || !contentRef.current) {
      renderedTextIndexRef.current = null
      setResolvedReviewComments([])
      setResolvedImportedComments(new Map())
      setReviewBadgeAnchors([])
      clearReviewHighlights()
      return
    }
    const index = buildRenderedTextIndex(
      contentRef.current,
      hashReviewSource(content ?? ""),
    )
    renderedTextIndexRef.current = index
    const result = resolveReviewPolicy({
      review,
      document: index,
      request: { type: "reattach" },
    })
    if (result.type !== "reattach") return
    setResolvedReviewComments(result.comments)
    const importedMap = new Map<string, ReviewComment & ResolvedAnchor>()
    for (const round of review.importedRounds ?? []) {
      for (const comment of round.comments) {
        importedMap.set(comment.id, { ...comment, ...resolveImportedCommentAnchor(comment.anchor, index) })
      }
    }
    setResolvedImportedComments(importedMap)
    if (previewVisible && previewScrollRef.current) {
      const activeComments = result.comments.filter((comment) =>
        comment.localStatus !== "resolved" && (agentResults?.get(comment.id)?.status ?? "open") === "open"
      )
      applyReviewHighlights(index, activeComments, selectedReviewId)
      applyImportedReviewHighlights(index, Array.from(importedMap.values()), selectedImportedCommentId)
      setReviewBadgeAnchors(computeReviewBadgeAnchors(previewScrollRef.current, index, activeComments))
    } else {
      clearReviewHighlights()
      setReviewBadgeAnchors([])
    }
    return clearReviewHighlights
  }, [content, fileUrl, previewVisible, review, agentResults, reviewRenderVersion, selectedReviewId, selectedImportedCommentId, numberHeadings, changesVisible, reloadComparison])

  useEffect(() => {
    const preview = previewScrollRef.current
    if (!previewVisible || !preview) return
    const recomputeBadges = () => {
      const index = renderedTextIndexRef.current
      if (!index) return
      setReviewBadgeAnchors(computeReviewBadgeAnchors(preview, index, activeReviewComments))
    }
    const observer = new ResizeObserver(recomputeBadges)
    observer.observe(preview)
    window.addEventListener("resize", recomputeBadges)
    return () => {
      observer.disconnect()
      window.removeEventListener("resize", recomputeBadges)
    }
  }, [previewVisible, activeReviewComments])

  const offsetAtPoint = (clientX: number, clientY: number) => {
    const index = renderedTextIndexRef.current
    return index ? renderedOffsetAtPoint(index, clientX, clientY) : null
  }

  const reviewCommentIdAtPoint = (clientX: number, clientY: number) => {
    const offset = offsetAtPoint(clientX, clientY)
    return offset === null ? null : findInnermostCommentAt(activeReviewComments, offset)
  }

  const importedReviewCommentIdAtPoint = (clientX: number, clientY: number) => {
    const offset = offsetAtPoint(clientX, clientY)
    return offset === null ? null : findInnermostCommentAt(resolvedImportedComments.values(), offset)
  }

  return {
    resolvedReviewComments,
    resolvedImportedComments,
    reviewBadgeAnchors,
    reviewCommentIdAtPoint,
    importedReviewCommentIdAtPoint,
  }
}

export type ContentReviewHighlights = ReturnType<typeof useContentReviewHighlights>
