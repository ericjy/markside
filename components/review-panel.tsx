import { AlertTriangle, Check, ChevronDown, Copy, FileText, Plus, Send, Trash2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import type { AgentReviewHandoff } from "~hooks/use-content-agent-review"
import { ReviewPresetPicker } from "~components/review-preset-picker"
import { Button } from "~components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "~components/ui/tooltip"
import {
  getReviewItemCount,
  type ActiveReview,
  type ResolvedAnchor,
  type ResolvedReviewComment,
  type ReviewComment,
} from "~lib/review"
import {
  insertReviewPreset,
  type ReviewTextSelection,
} from "~lib/review-presets"

// Matches the review-card-enter animation in style.css.
const REVIEW_CARD_ENTER_MS = 900

export type ReviewCopyStatus =
  | { kind: "success" }
  | { kind: "error"; message: string; commentId?: string }

interface ReviewPanelProps {
  open: boolean
  selectionVersion: number
  review: ActiveReview | null
  comments: ResolvedReviewComment[]
  selectedId: string | null
  persistenceError: boolean
  agentHandoff?: AgentReviewHandoff
  copyStatus: ReviewCopyStatus | null
  jumpableCommentIds: ReadonlySet<string>
  resolvedImportedComments: ReadonlyMap<string, ReviewComment & ResolvedAnchor>
  jumpableImportedCommentIds: ReadonlySet<string>
  selectedImportedCommentId: string | null
  onNoteChange: (note: string) => void
  onUpdateComment: (id: string, body: string) => void
  onDeleteComment: (id: string) => void
  onSelectComment: (id: string) => void
  onJumpToSection: (id: string) => void
  onJumpToImportedComment: (id: string) => void
  onCopy: () => void
  onCopyComment: (id: string) => Promise<boolean>
  onClear: () => void
}

function getTextSelection(textarea: HTMLTextAreaElement): ReviewTextSelection {
  return {
    start: textarea.selectionStart,
    end: textarea.selectionEnd,
  }
}

export function ReviewPanel({
  open,
  selectionVersion,
  review,
  comments,
  selectedId,
  persistenceError,
  copyStatus,
  agentHandoff,
  jumpableCommentIds,
  resolvedImportedComments,
  jumpableImportedCommentIds,
  selectedImportedCommentId,
  onNoteChange,
  onUpdateComment,
  onDeleteComment,
  onSelectComment,
  onJumpToSection,
  onJumpToImportedComment,
  onCopy,
  onCopyComment,
  onClear,
}: ReviewPanelProps) {
  const [copyingCommentId, setCopyingCommentId] = useState<string | null>(null)
  const [copiedCommentId, setCopiedCommentId] = useState<string | null>(null)
  const [expandedCommentId, setExpandedCommentId] = useState<string | null>(null)
  const [openPresetTarget, setOpenPresetTarget] = useState<string | null>(null)
  const [clearArmed, setClearArmed] = useState(false)
  const clearButtonRef = useRef<HTMLButtonElement>(null)
  const [editingNote, setEditingNote] = useState(false)
  const copiedCommentTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const commentsScrollRef = useRef<HTMLDivElement>(null)
  const commentElementRefs = useRef(new Map<string, HTMLElement>())
  const commentTextareaRefs = useRef(new Map<string, HTMLTextAreaElement>())
  const commentSelectionRefs = useRef(new Map<string, ReviewTextSelection>())
  const seenCommentIds = useRef<Set<string> | null>(null)
  const enteringTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [enteringCommentId, setEnteringCommentId] = useState<string | null>(null)
  useEffect(() => {
    const ids = new Set(comments.map(({ id }) => id))
    const seen = seenCommentIds.current
    seenCommentIds.current = ids
    if (!seen) return
    const arrived = comments.filter(({ id }) => !seen.has(id))
    if (arrived.length !== 1) return
    setEnteringCommentId(arrived[0].id)
    if (enteringTimeoutRef.current) clearTimeout(enteringTimeoutRef.current)
    enteringTimeoutRef.current = setTimeout(() => {
      enteringTimeoutRef.current = null
      setEnteringCommentId(null)
    }, REVIEW_CARD_ENTER_MS)
  }, [comments])
  useEffect(() => {
    if (!open || !enteringCommentId) return
    const frame = requestAnimationFrame(() => {
      const container = commentsScrollRef.current
      const comment = commentElementRefs.current.get(enteringCommentId)
      if (!container || !comment) return
      const containerRect = container.getBoundingClientRect()
      const commentRect = comment.getBoundingClientRect()
      if (commentRect.top >= containerRect.top && commentRect.bottom <= containerRect.bottom) return
      container.scrollTo({
        top: container.scrollTop + commentRect.top - containerRect.top - 12,
        behavior: "smooth",
      })
    })
    return () => cancelAnimationFrame(frame)
  }, [open, enteringCommentId])
  useEffect(() => {
    setExpandedCommentId(selectedId)
  }, [selectedId, selectionVersion])
  useEffect(() => {
    if (!open || !selectedId) return
    const frame = requestAnimationFrame(() => {
      const container = commentsScrollRef.current
      const comment = commentElementRefs.current.get(selectedId)
      if (!container || !comment) return
      const containerRect = container.getBoundingClientRect()
      const commentRect = comment.getBoundingClientRect()
      container.scrollTo({
        top: container.scrollTop + commentRect.top - containerRect.top - 12,
        behavior: "smooth",
      })
    })
    return () => cancelAnimationFrame(frame)
  }, [open, selectedId, selectionVersion])
  useEffect(() => () => {
    if (enteringTimeoutRef.current) clearTimeout(enteringTimeoutRef.current)
    if (copiedCommentTimeoutRef.current) clearTimeout(copiedCommentTimeoutRef.current)
  }, [])
  const itemCount = review ? getReviewItemCount(review) : 0
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
  }, [open, review?.sourceUrl, itemCount])
  const importedRounds = review?.importedRounds ?? []
  const copied = copyStatus?.kind === "success"
  const copyError = copyStatus?.kind === "error" ? copyStatus : null
  const inlineCopyError = copyError?.commentId && comments.some(({ id }) => id === copyError.commentId)
  const copyErrorNotice = copyError && (
    <div role="alert" className="rounded-md border border-red-700/20 bg-red-700/5 px-3 py-2 text-xs leading-relaxed text-red-700 dark:border-red-300/20 dark:bg-red-300/5 dark:text-red-300">
      <p className="flex items-start gap-2">
        <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
        <span><strong>Not copied.</strong> {copyError.message}</span>
      </p>
    </div>
  )
  const restoreSelection = (
    textarea: HTMLTextAreaElement | null | undefined,
    selection: ReviewTextSelection,
  ) => {
    requestAnimationFrame(() => {
      textarea?.focus()
      textarea?.setSelectionRange(selection.start, selection.end)
    })
  }
  const insertIntoComment = (comment: ResolvedReviewComment, instruction: string) => {
    const selection = commentSelectionRefs.current.get(comment.id) ?? {
      start: comment.body.length,
      end: comment.body.length,
    }
    const result = insertReviewPreset(comment.body, instruction, selection)
    commentSelectionRefs.current.set(comment.id, result.selection)
    onUpdateComment(comment.id, result.value)
    restoreSelection(commentTextareaRefs.current.get(comment.id), result.selection)
  }
  const copyComment = async (id: string) => {
    setCopyingCommentId(id)
    setCopiedCommentId(null)
    const didCopy = await onCopyComment(id)
    setCopyingCommentId(null)
    if (!didCopy) return
    setCopiedCommentId(id)
    if (copiedCommentTimeoutRef.current) clearTimeout(copiedCommentTimeoutRef.current)
    copiedCommentTimeoutRef.current = setTimeout(() => setCopiedCommentId(null), 2_500)
  }
  const toggleComment = (id: string) => {
    setExpandedCommentId((current) => current === id ? null : id)
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        ref={commentsScrollRef}
        className="min-h-0 flex-1 overflow-y-auto">
      {persistenceError && (
        <div role="alert" className="border-b bg-amber-500/10 px-4 py-3 text-xs text-amber-800 dark:text-amber-200">
          <span className="flex items-center gap-2 font-semibold"><AlertTriangle size={14} /> Review not saved</span>
          <p className="mt-1 pl-5 leading-relaxed">Keep this tab open or copy the review before leaving.</p>
        </div>
      )}

      <div className="px-4 pb-3 pt-5">
        {editingNote ? (
          <>
            <span className="mb-2 block text-sm font-semibold tracking-tight">Overall feedback</span>
            <textarea
              autoFocus
              aria-label="Overall feedback"
              value={review?.note ?? ""}
              onBlur={() => setEditingNote(false)}
              onChange={(event) => onNoteChange(event.target.value)}
              placeholder="Feedback that applies to the whole document"
              className="review-input min-h-28 w-full resize-y rounded-md border px-3 py-2.5 text-sm font-normal leading-relaxed outline outline-2 outline-offset-1 outline-transparent placeholder:text-muted-foreground focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          </>
        ) : review?.note.trim() ? (
          <>
            <span className="mb-2 block text-sm font-semibold tracking-tight">Overall feedback</span>
            <button
              type="button"
              aria-label="Edit the overall feedback"
              onClick={() => setEditingNote(true)}
              className="line-clamp-3 block w-full rounded-md px-1 py-1 text-left text-sm leading-relaxed outline outline-2 outline-offset-1 outline-transparent hover:bg-accent focus-visible:outline-ring">
              {review.note}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setEditingNote(true)}
            className="flex w-full items-center gap-2 rounded-md border border-dashed px-3 py-2.5 text-sm text-muted-foreground outline outline-2 outline-offset-1 outline-transparent hover:bg-accent hover:text-foreground focus-visible:outline-ring">
            <Plus size={14} /> Add overall feedback
          </button>
        )}
      </div>

      <div className="mx-4 my-2 border-t" aria-hidden="true" />
      <section className="pt-3">
        <div className="flex w-full items-center justify-between px-4 pb-3">
          <span className="text-sm font-semibold tracking-tight">Comments</span>
          <span className="text-xs tabular-nums text-muted-foreground">{comments.length}</span>
        </div>
        <div>
        {comments.length === 0 && (
          <div className="px-4 pb-8 pt-2 text-xs leading-relaxed text-muted-foreground">
            No comments. Select text in Preview to add comment.
          </div>
        )}
        {comments.length > 0 && (
          <div className="space-y-3 px-4 py-3">
            {comments.map((comment) => {
              const selected = selectedId === comment.id
              const collapsed = expandedCommentId !== comment.id
              const detailsId = `review-comment-${comment.id}-details`
              return (
                <article
                  ref={(element) => {
                    if (element) commentElementRefs.current.set(comment.id, element)
                    else commentElementRefs.current.delete(comment.id)
                  }}
                  key={comment.id}
                  aria-current={selected ? "true" : undefined}
                  onClick={(event) => {
                    if (event.target instanceof Element && event.target.closest("button, textarea, input, select, a, [role='menuitem']")) return
                    toggleComment(comment.id)
                    if (collapsed) onSelectComment(comment.id)
                  }}
                  className={`${selected ? "review-card-selected" : "review-card"} cursor-pointer rounded-lg border px-4 py-4 shadow-sm transition-colors ${
                    enteringCommentId === comment.id ? "review-card-entering" : ""
                  }`}>
                  <button
                    type="button"
                    aria-label={collapsed ? "Expand Review Comment" : "Collapse Review Comment"}
                    aria-expanded={!collapsed}
                    aria-controls={detailsId}
                    onClick={() => {
                      toggleComment(comment.id)
                      if (collapsed) onSelectComment(comment.id)
                    }}
                    className="flex w-full items-stretch rounded-md p-1 text-left text-muted-foreground outline outline-2 outline-offset-1 outline-transparent hover:text-foreground focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50">
                      <span className="flex min-w-0 flex-1 items-start">
                        <span className="min-w-0 flex-1">
                          <span className="line-clamp-2 border-l-2 border-border py-0.5 pl-2 text-xs italic leading-relaxed text-muted-foreground">
                            {comment.anchor.exact}
                          </span>
                        </span>
                      </span>
                  </button>
                  {comment.anchor.removed && (
                    <p className="mt-2 pl-1 text-[11px] text-muted-foreground">Comment on removed text</p>
                  )}
                  {comment.status === "unanchored" && !comment.anchor.removed && (
                    jumpableCommentIds.has(comment.id) ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          onJumpToSection(comment.id)
                        }}
                        className="mt-2 flex w-full items-center gap-2 rounded-sm px-1 py-1 text-left text-[11px] font-medium text-blue-700 outline outline-2 outline-offset-1 outline-transparent hover:bg-accent focus-visible:outline-ring active:bg-accent/80 dark:text-blue-300">
                        <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />
                        <span>Passage no longer found. Jump to section</span>
                      </button>
                    ) : (
                      <p className="mt-2 flex items-center gap-2 pl-1 text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">
                        <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />
                        Passage no longer found.
                      </p>
                    )
                  )}
                  {collapsed ? (
                    <p id={detailsId} className="mt-2 line-clamp-2 pl-1 text-sm leading-relaxed text-foreground">
                      {comment.body}
                    </p>
                  ) : (
                    <div id={detailsId}>
                      <textarea
                        ref={(element) => {
                          if (element) commentTextareaRefs.current.set(comment.id, element)
                          else commentTextareaRefs.current.delete(comment.id)
                        }}
                        aria-label="Review Comment"
                        rows={2}
                        value={comment.body}
                        onFocus={(event) => {
                          onSelectComment(comment.id)
                          commentSelectionRefs.current.set(
                            comment.id,
                            getTextSelection(event.currentTarget),
                          )
                        }}
                        onSelect={(event) => commentSelectionRefs.current.set(
                          comment.id,
                          getTextSelection(event.currentTarget),
                        )}
                        onChange={(event) => {
                          commentSelectionRefs.current.set(
                            comment.id,
                            getTextSelection(event.currentTarget),
                          )
                          onUpdateComment(comment.id, event.currentTarget.value)
                        }}
                        className="review-input mt-3 min-h-16 max-h-40 w-full resize-y rounded-md border px-3 py-2.5 text-sm leading-relaxed outline outline-2 outline-offset-1 outline-transparent [field-sizing:content] placeholder:text-muted-foreground focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50"
                      />
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <ReviewPresetPicker
                          open={openPresetTarget === comment.id}
                          onOpenChange={(next) => setOpenPresetTarget(next ? comment.id : null)}
                          trigger={(
                            <button
                              type="button"
                              className="flex h-9 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-muted-foreground outline outline-2 outline-offset-1 outline-transparent hover:bg-accent hover:text-foreground focus-visible:outline-ring active:bg-accent/80">
                              Presets <ChevronDown size={13} />
                            </button>
                          )}
                          onSelect={(preset) => insertIntoComment(comment, preset.instruction)}
                        />
                        <div className="flex items-center gap-1">
                          {selected && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  aria-label={copiedCommentId === comment.id ? "Comment copied as prompt" : "Copy comment as prompt"}
                                  disabled={copyingCommentId !== null}
                                  onClick={() => void copyComment(comment.id)}
                                  className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground outline outline-2 outline-offset-1 outline-transparent hover:bg-accent hover:text-foreground focus-visible:outline-ring active:bg-accent/80 disabled:cursor-not-allowed disabled:opacity-50">
                                  {copiedCommentId === comment.id ? <Check size={14} /> : <Copy size={14} />}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                {copiedCommentId === comment.id ? "Copied" : "Copy comment as prompt"}
                              </TooltipContent>
                            </Tooltip>
                          )}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                aria-label="Delete Review Comment"
                                onClick={() => onDeleteComment(comment.id)}
                                className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground outline outline-2 outline-offset-1 outline-transparent hover:bg-destructive/10 hover:text-destructive focus-visible:outline-ring active:bg-destructive/15 disabled:cursor-not-allowed disabled:opacity-50">
                                <Trash2 size={14} />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top">Delete comment</TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    </div>
                  )}
                  {copyError?.commentId === comment.id && (
                    <div className="mt-3">{copyErrorNotice}</div>
                  )}
                </article>
              )
            })}
          </div>
        )}
        </div>
      </section>

      {importedRounds.length > 0 && (
        <>
          <div className="mx-4 my-2 border-t" aria-hidden="true" />
          <section className="pb-3 pt-1">
            <div className="flex w-full items-center justify-between px-4 pb-3">
              <span className="text-sm font-semibold tracking-tight">Review History</span>
              <span className="text-xs tabular-nums text-muted-foreground">
                {importedRounds.length}
              </span>
            </div>
            <div className="space-y-5 px-4">
              {importedRounds.map((round, index) => (
                <div key={round.id}>
                  <div className="flex items-baseline justify-between gap-2 px-1">
                    <span className="text-sm font-semibold text-foreground">Round {index + 1}</span>
                    <span className="text-xs text-muted-foreground">
                      by {round.reviewerName || "Reviewer"} on {round.createdAt.slice(0, 10)}
                    </span>
                  </div>
                  {round.note.trim() && (
                    <div className="review-card mt-2 flex flex-col gap-1.5 rounded-lg border px-4 py-3 shadow-sm">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                        <FileText size={13} className="shrink-0 text-amber-500 dark:text-amber-400" aria-hidden="true" />
                        Overall feedback
                      </div>
                      <p className="text-sm leading-relaxed text-foreground">{round.note}</p>
                    </div>
                  )}
                  {round.comments.length > 0 && (
                    <div className="mt-3 space-y-3">
                      {round.comments.map((comment) => {
                        const resolved = resolvedImportedComments.get(comment.id)
                        const jumpable = resolved?.status === "anchored" ||
                          jumpableImportedCommentIds.has(comment.id)
                        const selected = selectedImportedCommentId === comment.id
                        const cardClassName = selected
                          ? "review-card-selected rounded-lg border px-4 py-4 shadow-sm transition-colors"
                          : "review-card rounded-lg border px-4 py-4 shadow-sm transition-colors"
                        return (
                          <button
                            key={comment.id}
                            type="button"
                            disabled={!jumpable}
                            aria-current={selected ? "true" : undefined}
                            onClick={() => onJumpToImportedComment(comment.id)}
                            className={`block w-full text-left outline outline-2 outline-offset-1 outline-transparent focus-visible:outline-ring disabled:cursor-default disabled:pointer-events-none ${cardClassName}`}>
                            <span className="line-clamp-2 block border-l-2 border-border py-0.5 pl-2 text-xs italic leading-relaxed text-muted-foreground">
                              {comment.anchor.exact}
                            </span>
                            <p className="mt-2 text-sm leading-relaxed text-foreground">{comment.body}</p>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </>
      )}
      </div>

      <div className="review-chrome shrink-0 border-t px-4 py-3">
        {copyError && !inlineCopyError && (
          <div className="mb-2">{copyErrorNotice}</div>
        )}
        {agentHandoff?.sentAt && (
          <p role="status" className="mb-2 text-xs text-muted-foreground">
            Sent to agent at {new Date(agentHandoff.sentAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
          </p>
        )}
        {agentHandoff?.error && <p role="alert" className="mb-2 text-xs text-destructive">{agentHandoff.error}</p>}
        <div className={agentHandoff ? "flex flex-col gap-2" : "flex gap-2"}>
          {agentHandoff ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex min-w-0 flex-1" tabIndex={agentHandoff.disabled ? 0 : undefined}>
                  <Button className="h-11 flex-1" disabled={agentHandoff.disabled} onClick={agentHandoff.send} aria-busy={agentHandoff.sending}>
                    <Send size={14} />{agentHandoff.sending ? "Sending comments…" : "Send comments to agent"}
                  </Button>
                </span>
              </TooltipTrigger>
              {agentHandoff.disabledReason && <TooltipContent>{agentHandoff.disabledReason}</TooltipContent>}
            </Tooltip>
          ) : <Button className="h-11 flex-1" disabled={itemCount === 0} onClick={onCopy}>
            {copied
              ? <Check size={14} strokeWidth={2.5} className="text-[hsl(132_60%_46%)] dark:text-[hsl(130_78%_29%)]" />
              : <Copy size={14} />} {copied ? "Review copied for this file" : "Copy review as prompt"}
          </Button>}
          {itemCount > 0 && (
            <Button
              ref={clearButtonRef}
              className={`${agentHandoff ? "h-8 self-end" : "h-11"} px-3 ${clearArmed ? "text-red-700 hover:text-red-700 dark:text-red-300 dark:hover:text-red-300" : "text-muted-foreground"}`}
              variant="ghost"
              onBlur={() => setClearArmed(false)}
              onClick={() => {
                if (!clearArmed) {
                  setClearArmed(true)
                  return
                }
                setClearArmed(false)
                onClear()
              }}>
              <span style={{ display: "grid" }}>
                <span aria-hidden="true" className="flex items-center gap-1.5" style={{ gridArea: "1 / 1", visibility: "hidden" }}>
                  <Trash2 size={13} />Confirm clear
                </span>
                <span className="flex items-center justify-center gap-1.5" style={{ gridArea: "1 / 1" }}>
                  <Trash2 size={13} />{clearArmed ? "Confirm clear" : "Clear all"}
                </span>
              </span>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
