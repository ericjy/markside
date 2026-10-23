import { currentAgentReview, clearReviewDrafts, getReviewCommentStatus } from "~lib/agent-review"
import React,{ useEffect,useRef } from "react"
import type { AgentReviewHandoff } from "~hooks/use-content-agent-review"
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
  anchorForTextBlock,
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
  agentHandoff?: AgentReviewHandoff
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
  agentHandoff,
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
  const retiredCommentIds = new Set(agentHandoff?.completed ? agentHandoff.file?.comments.map(({ id }) => id) : [])
  const { closeSelectionComposer } = selection
  const copiedStatusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => {
    if (copiedStatusTimeoutRef.current) clearTimeout(copiedStatusTimeoutRef.current)
  }, [])

  const updateReviewComment = (id: string, body: string) => {
    updateReview((current) => current ? {
      ...current,
      comments: current.comments.map((comment) =>
        comment.id === id ? { ...comment, body, localStatus: "open" as const } : comment
      ),
      updatedAt: new Date().toISOString(),
    } : current)
  }

  const changeReviewCommentStatus = (id: string, status: "open" | "resolved") => {
    const sent = agentHandoff?.file && agentHandoff.file.comments.find((comment) => comment.id === id)
    if (sent) {
      agentHandoff?.changeStatus?.(id, status)
      return
    }
    updateReview((current) => current ? {
      ...current, comments: current.comments.map((comment) => comment.id === id ? { ...comment, localStatus: status } : comment),
      updatedAt: new Date().toISOString(),
    } : current)
  }

  const deleteReviewCommentById = (id: string) => {
    if (agentHandoff?.file && agentHandoff.file.comments.some((comment) => comment.id === id)) return
    const deleted = review?.comments.find((comment) => comment.id === id)
    if (!review || !deleted) return
    const base = review
    const index = review.comments.indexOf(deleted)
    const linkedResults = readabilityResultsRef.current.filter((item) => item.commentId === id)
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
    return () => {
      updateReview((current) => {
        // Deleting the last item removes the stored Review, so rebuild it from before the delete.
        const target = current ?? { ...base, comments: [] }
        if (target.sourceUrl !== fileUrl || target.comments.some((comment) => comment.id === id)) return current
        const comments = [...target.comments]
        comments.splice(Math.min(index, comments.length), 0, deleted)
        return { ...target, comments, updatedAt: new Date().toISOString() }
      })
      if (linkedResults.length > 0) saveReadabilityResults(readabilityResultsRef.current.map((item) =>
        !item.commentId && linkedResults.some((linked) => linked.id === item.id) ? { ...item, commentId: id } : item
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

  const clearReviewSelection = () => {
    setSelectedReviewId(null)
    setSelectedImportedCommentId(null)
  }

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
    if (agentHandoff?.sending || agentHandoff?.updatingCommentId != null) return
    const file = agentHandoff?.file
    const remaining = file ? clearReviewDrafts(review, file) : null
    const keptIds = new Set(remaining?.comments.map(({ id }) => id))
    updateReview((current) => file ? clearReviewDrafts(current, file) : null)
    closeSelectionComposer()
    setSelectedReviewId(null)
    setCopyReviewStatus(null)
    if (!file) closeReviewOverlay(true)
    if (readabilityResultsRef.current.some((item) => item.commentId && !keptIds.has(item.commentId))) {
      saveReadabilityResults(readabilityResultsRef.current.map((item) =>
        item.commentId && !keptIds.has(item.commentId) ? { ...item, commentId: undefined } : item
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
    const sourceReview = reviewOverride ?? review
    const merged = agentHandoff?.file ? currentAgentReview(sourceReview, agentHandoff.file) : sourceReview
    const activeReview = merged ? { ...merged, comments: merged.comments.filter((comment) => {
      const sent = agentHandoff?.file && agentHandoff.file.comments.find(({ id }) => id === comment.id)
      return getReviewCommentStatus(comment, sent || undefined, !!agentHandoff) !== "Resolved"
    }) } : null
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

  // Question card answers pass activate: false so choosing an option doesn't select its comment.
  const createReviewComment = (anchor: ReviewAnchor, body: string, { activate = true } = {}) => {
    const existing = review?.comments.find((comment) =>
      !retiredCommentIds.has(comment.id) && isSameReviewAnchor(comment.anchor, anchor)
    )
    if (existing && review) {
      updateReviewComment(existing.id, body)
      if (activate) setSelectedReviewId(existing.id)
      return {
        outcome: "existing" as const,
        commentId: existing.id,
        review: { ...review, comments: review.comments.map((comment) => comment.id === existing.id ? { ...comment, body, localStatus: "open" as const } : comment) },
      }
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
    const creationReview = (current: ActiveReview | null) => {
      const base = reviewForMutation(current)
      return { ...base, comments: base.comments.filter(({ id }) => !retiredCommentIds.has(id)) }
    }
    const tagComment = (next: ActiveReview, original: ActiveReview | null): ActiveReview => ({ ...next, comments: [
      ...(original?.comments.filter(({ id }) => retiredCommentIds.has(id)) ?? []),
      ...next.comments.map((comment) => comment.id === commentId ? { ...comment, reviewMode: agentHandoff ? "agent" as const : "local" as const } : comment),
    ] })
    const result = resolveReviewPolicy({
      review: creationReview(review),
      document: documentState,
      request,
    })
    if (result.type !== "add-comment") return null
    if (result.outcome === "duplicate") {
      if (activate) setSelectedReviewId(result.commentId)
    } else if (result.outcome === "added") {
      const isFirstComment = (review?.comments.length ?? 0) === 0
      updateReview((current) => {
        const rebased = resolveReviewPolicy({
          review: creationReview(current),
          document: documentState,
          request,
        })
        return rebased.type === "add-comment" && rebased.outcome === "added"
          ? tagComment(rebased.review, current)
          : current
      })
      if (activate) setSelectedReviewId(null)
      if (isFirstComment) trackReviewPromptActivity("review-comment")
    }
    return {
      outcome: result.outcome,
      commentId: result.outcome === "invalid" ? undefined : result.commentId,
      review: result.outcome === "added" ? tagComment(result.review, review) : review,
    }
  }

  const findDuplicateReviewComment = (anchor: ReviewAnchor) => {
    const resolvedDuplicate = resolvedReviewComments.find((comment) =>
      !retiredCommentIds.has(comment.id) && comment.status === "anchored" &&
      comment.range.start === anchor.start &&
      comment.range.end === anchor.end
    )
    return resolvedDuplicate ?? review?.comments.find((comment) =>
      !retiredCommentIds.has(comment.id) && isSameReviewAnchor(comment.anchor, anchor)
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

  const sendSelectionComposerComment = async () => {
    const { selectionAction, selectionComposerBody } = selection
    if (!agentHandoff || agentHandoff.completed || agentHandoff.sending || agentHandoff.updatingCommentId) return
    if (!selectionAction || !selectionComposerBody.trim()) return
    const result = createReviewComment(selectionAction.anchor, selectionComposerBody)
    if (!result?.commentId || !result.review) return
    // Start permission requests within this click, using the newly saved Review.
    const sending = agentHandoff.send(result.review)
    closeSelectionComposer()
    await sending
  }

  // The heading's text without the space left by its anchor link.
  const questionSpan = (index: RenderedTextIndex | null, target: HTMLElement) => {
    const block = index?.blocks.find(({ element }) => element === target)
    if (!index || !block) return null
    let { start, end } = block
    while (start < end && /\s/.test(index.text[start])) start++
    while (end > start && /\s/.test(index.text[end - 1])) end--
    return { start, end }
  }

  const questionBlock = (target: HTMLElement) => {
    const index = currentReviewDocument()
    const block = questionSpan(index, target)
    if (!index || !block) return null
    const headingPath = index.headings
      .filter((heading) => block.start >= heading.start && block.start <= heading.end)
      .sort((left, right) => right.path.length - left.path.length)[0]?.path ?? []
    return { index, block, anchor: anchorForTextBlock(index.text, block, headingPath) }
  }

  const questionActionsBusy = !!agentHandoff && (
    !!agentHandoff.completed || agentHandoff.sending || !!agentHandoff.finishing || agentHandoff.updatingCommentId != null
  )

  // A question card's answer is a Review Comment on its heading, sent with the rest of the Review.
  const answerQuestion = (target: HTMLElement, body: string) => {
    if (questionActionsBusy) return
    const question = questionBlock(target)
    if (question) createReviewComment(question.anchor, body, { activate: false })
  }

  const clearQuestionAnswer = (target: HTMLElement) => {
    if (questionActionsBusy) return
    const question = questionBlock(target)
    if (!question) return
    const comment = review?.comments.find((comment) =>
      !retiredCommentIds.has(comment.id) && isSameReviewAnchor(comment.anchor, question.anchor)
    )
    if (comment) deleteReviewCommentById(comment.id)
  }

  const composeQuestionAnswer = (target: HTMLElement, point: { x: number; y: number }) => {
    if (questionActionsBusy) return
    const question = questionBlock(target)
    const range = question && rangeFromOffsets(question.index, question.block.start, question.block.end)
    if (!question || !range) return
    selection.openSelectionComposerAt(question.anchor, range, point)
    setSelectedReviewId(null)
    setSelectedImportedCommentId(null)
  }

  const questionAnswer = (target: HTMLElement) => {
    const block = questionSpan(renderedTextIndexRef.current, target)
    const comment = block && resolvedReviewComments.find((candidate) =>
      !retiredCommentIds.has(candidate.id) && candidate.status === "anchored" &&
      candidate.range.start === block.start && candidate.range.end === block.end
    )
    if (!comment) return null
    const sent = agentHandoff?.file?.comments.find(({ id }) => id === comment.id)
    return getReviewCommentStatus(comment, sent, !!agentHandoff) === "Resolved" ? null : comment.body
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
    else clearReviewSelection()
  }

  return {
    updateReviewNote,
    updateReviewComment,
    changeReviewCommentStatus,
    deleteReviewCommentById,
    copyActiveReview,
    selectReviewComment,
    clearReviewSelection,
    jumpToReviewSection,
    jumpToImportedComment,
    jumpableReviewCommentIds,
    jumpableImportedCommentIds,
    clearReview,
    saveSelectionComposerComment,
    copySelectionComposerComment,
    sendSelectionComposerComment,
    activateReviewSelection,
    activateQuickComment,
    handleReviewHighlightClick,
    answerQuestion,
    clearQuestionAnswer,
    composeQuestionAnswer,
    questionAnswer,
    questionActionsBusy,
  }
}
