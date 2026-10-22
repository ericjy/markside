import * as Dialog from "@radix-ui/react-dialog"
import { AlertTriangle, Bot, Check, ChevronDown, Copy, FileText, FolderOpen, MessageSquareText, Plus, RefreshCw, Send, Trash2 } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"

import { currentAgentReview, hasReviewDrafts, getReviewCommentStatus } from "~lib/agent-review"
import type { AgentReviewHandoff } from "~hooks/use-content-agent-review"
import { AgentIcon } from "~components/agent-icon"
import { ReviewPresetPicker } from "~components/review-preset-picker"
import { Button } from "~components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "~components/ui/tooltip"
import {
  getReviewItemCount,
  getReviewSourcePath,
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
const folderName = (path: string) => path.split("/").filter(Boolean).pop() ?? path
const SKILL_INSTALL_COMMAND = "npx skills add ericjy/markside --skill markside -g"
const SKILL_INSTALL_PROMPT = "Install Markside skill from https://github.com/ericjy/markside."
const INSTALL_METHODS = [
  { id: "agent", label: "Ask your agent" },
  { id: "terminal", label: "Install via terminal" },
] as const
const REVIEW_AGENTS = [
  { id: "codex", label: "Codex" },
  { id: "other", label: "Other agents" },
] as const

export type ReviewCopyStatus =
  | { kind: "success" }
  | { kind: "error"; message: string; commentId?: string }

interface ReviewPanelProps {
  onCheckUpdates?: () => Promise<boolean>
  reloadDocumentLoading?: boolean
  sourceUrl?: string
  open: boolean
  selectionVersion: number
  review: ActiveReview | null
  comments: ResolvedReviewComment[]
  selectedId: string | null
  persistenceError: boolean
  agentHandoff?: AgentReviewHandoff
  onCheckAgentSession?: () => void
  agentSessionCheckStatus?: "idle" | "checking" | "not-found"
  /** True until this document's stored Review and agent Review file have both loaded. */
  reviewLoading?: boolean
  /** Present while no saved folder can store this document's feedback. */
  reviewFolder?: { path: string; choose: () => Promise<boolean> } | null
  /** True while the document shows a question card; answered questions then stay out of the way. */
  interview?: boolean
  /** The file changed on disk since it was loaded, so the agent's edits are not on screen yet. */
  diskChanged?: boolean
  /** A question card in the document has no answer yet. */
  questionsOpen?: boolean
  copyStatus: ReviewCopyStatus | null
  jumpableCommentIds: ReadonlySet<string>
  resolvedImportedComments: ReadonlyMap<string, ReviewComment & ResolvedAnchor>
  jumpableImportedCommentIds: ReadonlySet<string>
  selectedImportedCommentId: string | null
  onNoteChange: (note: string) => void
  onUpdateComment: (id: string, body: string) => void
  onChangeCommentStatus?: (id: string, status: "open" | "resolved") => void
  onDeleteComment: (id: string) => (() => void) | void
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
  sourceUrl,
  open,
  selectionVersion,
  review: fullReview,
  comments: allComments,
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
  onChangeCommentStatus,  onDeleteComment,
  onCheckUpdates,
  reloadDocumentLoading = false,
  onCheckAgentSession,
  agentSessionCheckStatus = "idle",
  reviewLoading = false,
  reviewFolder,
  interview = false,
  diskChanged = false,
  questionsOpen = false,
  onSelectComment,
  onJumpToSection,
  onJumpToImportedComment,
  onCopy,
  onCopyComment,
  onClear,
}: ReviewPanelProps) {
  const review = agentHandoff?.file ? currentAgentReview(fullReview, agentHandoff.file) : fullReview
  const historyFile = agentHandoff?.file
  const storedComments = useMemo(() => historyFile ? historyFile.comments.filter(({ id }) => !allComments.some((comment) => comment.id === id)) : [], [historyFile, allComments])
  const storedIds = new Set(storedComments.map(({ id }) => id))
  const comments = useMemo<ResolvedReviewComment[]>(() => [
    ...allComments,
    ...storedComments.map((comment): ResolvedReviewComment => ({
      id: comment.id, body: comment.body, createdAt: historyFile!.sentAt ?? historyFile!.requestedAt,
      anchor: { exact: comment.quote, prefix: "", suffix: "", start: 0, end: comment.quote.length, headingPath: [] },
      displayNumber: 0, status: "unanchored", range: null,
    })),
  ].map((comment, index) => ({ ...comment, displayNumber: index + 1 })), [allComments, storedComments, historyFile])
  const hasDrafts = hasReviewDrafts(fullReview, historyFile)
  const needsNewReview = !!historyFile && historyFile.status === "resolved"
  const clearLabel = historyFile ? "Clear drafts" : "Clear all"
  const [copyingCommentId, setCopyingCommentId] = useState<string | null>(null)
  const [copiedCommentId, setCopiedCommentId] = useState<string | null>(null)
  const [expandedCommentId, setExpandedCommentId] = useState<string | null>(null)
  const [openPresetTarget, setOpenPresetTarget] = useState<string | null>(null)
  const [clearArmed, setClearArmed] = useState(false)
  const [undoDelete, setUndoDelete] = useState<(() => void) | null>(null)
  const clearButtonRef = useRef<HTMLButtonElement>(null)
  const [updateCheck, setUpdateCheck] = useState<"idle" | "checking" | "updated" | "unchanged" | "error">("idle")
  const updateCheckVersion = useRef(0)
  useEffect(() => {
    updateCheckVersion.current += 1
    setUpdateCheck("idle")
    return () => { updateCheckVersion.current += 1 }
  }, [sourceUrl])
  useEffect(() => {
    if (updateCheck !== "unchanged" && updateCheck !== "updated") return
    const timeout = setTimeout(() => setUpdateCheck("idle"), 3000)
    return () => clearTimeout(timeout)
  }, [updateCheck])
  const checkUpdates = async () => {
    if (!onCheckUpdates || updateCheck === "checking") return
    const version = ++updateCheckVersion.current
    setUpdateCheck("checking")
    try {
      const changed = await onCheckUpdates()
      if (version === updateCheckVersion.current) setUpdateCheck(changed ? "updated" : "unchanged")
    } catch {
      if (version === updateCheckVersion.current) setUpdateCheck("error")
    }
  }
  const sendHelpRef = useRef<HTMLButtonElement>(null)
  const [editingNote, setEditingNote] = useState(false)
  const [sendHelpOpen, setSendHelpOpen] = useState(false)
  const [folderStatus, setFolderStatus] = useState<"idle" | "choosing" | "chosen">("idle")
  const [showNotFound, setShowNotFound] = useState(false)
  useEffect(() => {
    if (agentSessionCheckStatus !== "not-found") return
    setShowNotFound(true)
    const timeout = setTimeout(() => setShowNotFound(false), 3_000)
    return () => clearTimeout(timeout)
  }, [agentSessionCheckStatus])
  const [commandCopyStatus, setCommandCopyStatus] = useState<"idle" | "copied" | "error">("idle")
  const [installCopyStatus, setInstallCopyStatus] = useState<"idle" | "copied" | "error">("idle")
  const [installMethod, setInstallMethod] = useState<(typeof INSTALL_METHODS)[number]["id"]>("agent")
  const installText = installMethod === "agent" ? SKILL_INSTALL_PROMPT : SKILL_INSTALL_COMMAND
  const installLabel = installMethod === "agent" ? "prompt" : "command"
  const [reviewAgent, setReviewAgent] = useState<(typeof REVIEW_AGENTS)[number]["id"]>("codex")
  const copiedCommentTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const commentsScrollRef = useRef<HTMLDivElement>(null)
  const resolvedCommentsRef = useRef<HTMLDetailsElement>(null)
  const addressedCommentsRef = useRef<HTMLDetailsElement>(null)
  const commentElementRefs = useRef(new Map<string, HTMLElement>())
  const commentTextareaRefs = useRef(new Map<string, HTMLTextAreaElement>())
  const commentSelectionRefs = useRef(new Map<string, ReviewTextSelection>())
  const seenCommentBodies = useRef<Map<string, string> | null>(null)
  // Typing in a card changes its body on every keystroke; only outside changes announce themselves.
  const panelEditRef = useRef<{ id: string; body: string } | null>(null)
  const updateComment = (id: string, body: string) => {
    panelEditRef.current = { id, body }
    onUpdateComment(id, body)
  }
  const enteringTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [enteringCommentId, setEnteringCommentId] = useState<string | null>(null)
  useEffect(() => {
    const seen = seenCommentBodies.current
    seenCommentBodies.current = new Map(comments.map(({ id, body }) => [id, body]))
    if (!seen) return
    const arrived = comments.filter(({ id }) => !seen.has(id))
    const changed = comments.filter(({ id, body }) => seen.has(id) && seen.get(id) !== body &&
      !(panelEditRef.current?.id === id && panelEditRef.current.body === body))
    const announced = arrived.length === 1 ? arrived[0] : arrived.length === 0 && changed.length === 1 ? changed[0] : null
    if (!announced) return
    // Restart the animation when the same card changes again before it ends.
    if (announced.id === enteringCommentId) {
      commentElementRefs.current.get(announced.id)?.getAnimations?.().forEach((animation) => { animation.currentTime = 0 })
    }
    setEnteringCommentId(announced.id)
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
      const group = comment.closest("details")
      if (group === resolvedCommentsRef.current || group?.open === false && group === addressedCommentsRef.current) return
      if (group) group.open = true
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
      const group = comment.closest("details")
      if (group) group.open = true
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
  const activeAgentHandoff = agentHandoff?.completed ? undefined : agentHandoff
  const canFinish = !!activeAgentHandoff?.canFinish
  // Finishing before seeing the agent's edits, or with questions still unanswered, ends the Review too early.
  const finishOffered = canFinish && !diskChanged && !questionsOpen
  const addressedCount = activeAgentHandoff?.file?.comments.filter(({ status }) => status === "addressed").length ?? 0
  const statusWriting = !!activeAgentHandoff && (!!activeAgentHandoff.finishing || !!activeAgentHandoff.resolvingAll || activeAgentHandoff.updatingCommentId != null)
  const showSentStatus = !!activeAgentHandoff?.sent && !activeAgentHandoff.sending && !canFinish
  const showAgentDisabledHelp = comments.length > 0 && !canFinish && !activeAgentHandoff?.sent && !!activeAgentHandoff?.disabledReason
  const showAgentFolderHelp = !!activeAgentHandoff?.folderToChoose && !activeAgentHandoff.disabledReason
  const reviewSourceUrl = sourceUrl ?? activeAgentHandoff?.sourceUrl ?? review?.sourceUrl
  const showStartReview = needsNewReview || (!activeAgentHandoff && !!reviewSourceUrl?.startsWith("file:"))
  const showAgentAction = !!activeAgentHandoff
  const reviewCommand = `${reviewAgent === "codex" ? "$" : "/"}markside review ${reviewSourceUrl ? JSON.stringify(getReviewSourcePath(reviewSourceUrl)) : "<file>"} --no-open`
  const copyHelpCommand = async (text: string, target: "install" | "review") => {
    const setStatus = target === "install" ? setInstallCopyStatus : setCommandCopyStatus
    try {
      await navigator.clipboard.writeText(text)
      setStatus("copied")
    } catch {
      setStatus("error")
    }
  }
  const itemCount = review ? getReviewItemCount(review) : storedComments.length
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
    updateComment(comment.id, result.value)
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

  const commentResult = (comment: ResolvedReviewComment) => agentHandoff?.results?.get(comment.id) ?? (historyFile && historyFile.comments.find((item) => item.id === comment.id && item.body === comment.body && item.quote === comment.anchor.exact))
  const sentComment = (comment: ResolvedReviewComment) => historyFile ? historyFile.comments.find(({ id }) => id === comment.id) : agentHandoff?.results?.get(comment.id)
  const commentStatus = (comment: ResolvedReviewComment) => getReviewCommentStatus(comment, sentComment(comment), !!agentHandoff)
  const resolvedComments = comments.filter((comment) => commentStatus(comment) === "Resolved")
  const addressedComments = comments.filter((comment) => commentStatus(comment) === "Addressed")
  const currentComments = comments.filter((comment) => commentStatus(comment) !== "Resolved" && commentStatus(comment) !== "Addressed")
  const copyableCount = review ? getReviewItemCount({ ...review, comments: review.comments.filter((comment) => getReviewCommentStatus(comment, historyFile ? historyFile.comments.find(({ id }) => id === comment.id) : agentHandoff?.results?.get(comment.id), !!agentHandoff) !== "Resolved") }) : storedComments.filter((comment) => comment.status !== "resolved").length
  const renderComment = (comment: ResolvedReviewComment) => {
    const result = commentResult(comment)
    const integrationBacked = historyFile
      ? historyFile.comments.some(({ id }) => id === comment.id)
      : !!result
    const status = commentStatus(comment)
    const addressed = status === "Addressed"
    const resolved = status === "Resolved"
    const finished = addressed || resolved
    const changeStatus = onChangeCommentStatus ?? agentHandoff?.changeStatus
    const selected = selectedId === comment.id
    const collapsed = expandedCommentId !== comment.id
    const detailsId = `review-comment-${comment.id}-details`
    const editing = !collapsed && !finished && !storedIds.has(comment.id)
    // Sent is the agent's turn: closing it early is a quiet Withdraw, shown only once expanded.
    const canWithdraw = !!changeStatus && status === "Sent" && !collapsed
    const canResolve = !!changeStatus && !resolved && status !== "Draft" && status !== "Sent"
    const commentActions = (!integrationBacked && !resolved || changeStatus && finished || canWithdraw || canResolve) ? (
      <>
        {!integrationBacked && !resolved && <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Delete Review Comment"
              disabled={agentHandoff?.sending || agentHandoff?.updatingCommentId != null}
              className="h-9 w-9 text-muted-foreground hover:text-destructive"
              onClick={() => {
                const undo = onDeleteComment(comment.id)
                setUndoDelete(() => undo ?? null)
              }}><Trash2 size={14} /></Button>
          </TooltipTrigger>
          <TooltipContent side="top">Delete comment</TooltipContent>
        </Tooltip>}
        {changeStatus && finished && <Button variant="ghost" size="sm" aria-label={`Reopen comment ${comment.displayNumber}`}
          disabled={agentHandoff?.sending || agentHandoff?.updatingCommentId != null}
          onClick={() => changeStatus(comment.id, "open")}>Reopen</Button>}
        {canWithdraw && <Button variant="ghost" size="sm" aria-label={`Withdraw comment ${comment.displayNumber}`}
          title="Close this comment without waiting for your agent"
          className="text-muted-foreground"
          disabled={agentHandoff?.sending || agentHandoff?.updatingCommentId != null}
          onClick={() => changeStatus(comment.id, "resolved")}>Withdraw</Button>}
        {/* A labeled dark Resolve only when it's the reviewer's turn: the agent says Addressed. */}
        {canResolve && (addressed ? <Button size="sm" aria-label={`Resolve comment ${comment.displayNumber}`}
          disabled={agentHandoff?.sending || agentHandoff?.updatingCommentId != null}
          onClick={() => changeStatus(comment.id, "resolved")}>Resolve</Button> : <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={`Resolve comment ${comment.displayNumber}`}
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
              disabled={agentHandoff?.sending || agentHandoff?.updatingCommentId != null}
              onClick={() => changeStatus(comment.id, "resolved")}><Check size={14} /></Button>
          </TooltipTrigger>
          <TooltipContent side="top">Resolve comment</TooltipContent>
        </Tooltip>)}
      </>
    ) : null
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
          if (collapsed && !storedIds.has(comment.id)) onSelectComment(comment.id)
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
            if (collapsed && !storedIds.has(comment.id)) onSelectComment(comment.id)
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
        <div className="mt-2 flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium ${resolved ? "text-green-700 dark:text-green-300" : "text-muted-foreground"}`}>
            {finished && <Check size={12} aria-hidden="true" />}{status}
          </span>
        </div>
        {comment.anchor.removed && (
          <p className="mt-2 pl-1 text-[11px] text-muted-foreground">Comment on removed text</p>
        )}
        {comment.status === "unanchored" && !comment.anchor.removed && !finished && !storedIds.has(comment.id) && (
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
        {collapsed || finished || storedIds.has(comment.id) ? (
          <p id={detailsId} className={`mt-2 pl-1 text-sm leading-relaxed text-foreground ${collapsed ? "line-clamp-2" : ""}`}>
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
                updateComment(comment.id, event.currentTarget.value)
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
                        className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground outline outline-2 outline-offset-1 outline-transparent hover:bg-accent hover:text-foreground focus-visible:outline-ring active:bg-accent/80 disabled:cursor-not-allowed disabled:opacity-50">
                        {copiedCommentId === comment.id ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      {copiedCommentId === comment.id ? "Copied" : "Copy comment as prompt"}
                    </TooltipContent>
                  </Tooltip>
                )}
                {commentActions}
              </div>
            </div>
          </div>
        )}
        {result?.reply && (
          <div className="review-agent-reply mt-4 rounded-r-md border-l-2 px-3 py-3">
            <p className="review-agent-reply-label flex items-center gap-2 text-[11px] font-semibold tracking-[0.02em]">
              <MessageSquareText size={14} strokeWidth={1.75} className="shrink-0" aria-hidden="true" />
              Agent reply
            </p>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-[1.65]">{result.reply}</p>
          </div>
        )}
        {!editing && commentActions && <div className="mt-3 flex items-center justify-end gap-2">{commentActions}</div>}
        {copyError?.commentId === comment.id && (
          <div className="mt-3">{copyErrorNotice}</div>
        )}
      </article>
    )
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

      {historyFile?.status === "resolved" && currentComments.length === 0 && addressedComments.length === 0 && !hasDrafts && <p className="px-4 pt-3 text-xs text-muted-foreground">
        Review complete
      </p>}
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
            {historyFile?.noteReply && historyFile.note === review.note && (
              <div className="review-agent-reply mt-3 rounded-r-md border-l-2 px-3 py-3">
                <p className="review-agent-reply-label flex items-center gap-2 text-[11px] font-semibold tracking-[0.02em]">
                  <MessageSquareText size={14} strokeWidth={1.75} className="shrink-0" aria-hidden="true" />
                  Agent reply
                </p>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-[1.65]">{historyFile.noteReply}</p>
              </div>
            )}
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
      {undoDelete && <div role="status" className="mx-4 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        Comment deleted.
        <Button variant="ghost" size="sm" onClick={() => { undoDelete(); setUndoDelete(null) }}>Undo</Button>
      </div>}
      {currentComments.length > 0 && (
        <details open className="group/comments mx-4 my-3">
          <summary className="flex cursor-pointer list-none items-center justify-between py-3 text-sm font-semibold tracking-tight outline outline-2 outline-offset-1 outline-transparent focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2">
              Active
              <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-normal tabular-nums text-muted-foreground">{currentComments.length}</span>
            </span>
            <ChevronDown size={14} aria-hidden="true" className="shrink-0 -rotate-90 text-muted-foreground group-open/comments:rotate-0" />
          </summary>
          <div className="space-y-3 pb-3">{currentComments.map(renderComment)}</div>
        </details>
      )}
      {currentComments.length === 0 && addressedComments.length === 0 && resolvedComments.length === 0 && storedComments.length === 0 && (
        <p className="px-4 pb-8 pt-3 text-xs leading-relaxed text-muted-foreground">
          No comments. Select text in Preview to add comment.
        </p>
      )}
      {addressedComments.length > 0 && (
        <details ref={addressedCommentsRef} open={!interview} className="group/comments mx-4 my-3">
          <summary className="flex cursor-pointer list-none items-center justify-between py-3 text-sm font-semibold tracking-tight outline outline-2 outline-offset-1 outline-transparent focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2">
              Addressed
              <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-normal tabular-nums text-muted-foreground">{addressedComments.length}</span>
            </span>
            <ChevronDown size={14} aria-hidden="true" className="shrink-0 -rotate-90 text-muted-foreground group-open/comments:rotate-0" />
          </summary>
          <div className="space-y-3 pb-3">{addressedComments.map(renderComment)}</div>
        </details>
      )}
      {resolvedComments.length > 0 && (
        <details ref={resolvedCommentsRef} className="group/comments mx-4 my-3">
          <summary className="flex cursor-pointer list-none items-center justify-between py-3 text-sm font-semibold tracking-tight outline outline-2 outline-offset-1 outline-transparent focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2">
              Resolved
              <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-normal tabular-nums text-muted-foreground">{resolvedComments.length}</span>
            </span>
            <ChevronDown size={14} aria-hidden="true" className="shrink-0 -rotate-90 text-muted-foreground group-open/comments:rotate-0" />
          </summary>
          <div className="space-y-3 pb-3">{resolvedComments.map(renderComment)}</div>
        </details>
      )}

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

      {/* Hidden rather than omitted so the actions don't flash Copy-first before Send. */}
      <div className={`review-chrome shrink-0 border-t px-4 py-3 ${reviewLoading ? "invisible" : ""}`}>
        {copyError && !inlineCopyError && (
          <div className="mb-2">{copyErrorNotice}</div>
        )}
        {agentHandoff?.error && <p role="alert" className="mb-2 text-xs text-destructive">{agentHandoff.error}</p>}
        {(activeAgentHandoff || reviewSourceUrl?.startsWith("file:")) && (
          <>
            {showAgentDisabledHelp && (
              <p id="agent-review-send-help" className="mb-3 text-xs leading-relaxed text-muted-foreground">
                {activeAgentHandoff?.disabledReason}
              </p>
            )}
            <Dialog.Root open={sendHelpOpen} onOpenChange={(nextOpen) => {
              setSendHelpOpen(nextOpen)
              setFolderStatus("idle")
              setCommandCopyStatus("idle")
              setInstallCopyStatus("idle")
            }}>
              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50" style={{ zIndex: 100000 }} />
                <Dialog.Content
                  onCloseAutoFocus={(event) => {
                    event.preventDefault()
                    sendHelpRef.current?.focus()
                  }}
                  onKeyDown={(event) => event.stopPropagation()}
                  className="fixed left-1/2 top-1/2 max-h-[calc(100vh-2rem)] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border bg-background p-5 text-foreground shadow-xl"
                  style={{ zIndex: 100001 }}>
                  <Dialog.Title className="text-base font-semibold">Agent integration (Beta)</Dialog.Title>
                  <Dialog.Description className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Ask your agent to start a review in Markside, then send your feedback back directly to the agent without copying and pasting a prompt.
                  </Dialog.Description>
                  <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h3 className="text-sm font-medium">1. Install the skill</h3>
                    <p className="text-xs text-muted-foreground">Skip if already installed.</p>
                  </div>
                  <div role="tablist" aria-label="Installation method" className="mt-2 flex border-b"
                    onKeyDown={(event) => {
                      const index = INSTALL_METHODS.findIndex(({ id }) => id === installMethod)
                      const next = event.key === "ArrowRight" ? (index + 1) % INSTALL_METHODS.length
                        : event.key === "ArrowLeft" ? (index + INSTALL_METHODS.length - 1) % INSTALL_METHODS.length
                        : event.key === "Home" ? 0 : event.key === "End" ? INSTALL_METHODS.length - 1 : null
                      if (next === null) return
                      event.preventDefault()
                      setInstallMethod(INSTALL_METHODS[next].id)
                      setInstallCopyStatus("idle")
                      event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next].focus()
                    }}>
                    {INSTALL_METHODS.map(({ id, label }) => (
                      <button key={id} type="button" role="tab" id={`skill-install-tab-${id}`}
                        aria-selected={installMethod === id} aria-controls="skill-install-panel" tabIndex={installMethod === id ? 0 : -1}
                        className={`-mb-px flex flex-1 items-center justify-center border-b-2 px-2 py-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${installMethod === id ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                        onClick={() => { setInstallMethod(id); setInstallCopyStatus("idle") }}>{label}</button>
                    ))}
                  </div>
                  <div role="tabpanel" id="skill-install-panel" aria-labelledby={`skill-install-tab-${installMethod}`}>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{installMethod === "agent" ? "Paste this into your agent's chat." : "Run this in your terminal."}</p>
                  <div className="relative mt-2">
                    <textarea readOnly value={installText} rows={1} wrap="off" aria-label={`Skill installation ${installLabel}`}
                      onFocus={(event) => event.currentTarget.select()}
                      className="block h-12 w-full resize-none overflow-x-auto whitespace-pre rounded-md border bg-muted p-3 pr-12 font-mono text-xs leading-relaxed focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring" />
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="absolute right-2 top-2 h-7 w-7 text-muted-foreground" aria-label={`Copy install ${installLabel}`} onClick={() => void copyHelpCommand(installText, "install")}>
                          {installCopyStatus === "copied" ? <Check size={14} /> : <Copy size={14} />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent style={{ zIndex: 100002 }}>{installCopyStatus === "copied" ? "Copied" : `Copy install ${installLabel}`}</TooltipContent>
                    </Tooltip>
                  </div>
                  {installCopyStatus === "copied" && <span role="status" className="sr-only">Install {installLabel} copied</span>}
                  {installCopyStatus === "error" && <p role="alert" className="mt-2 text-xs text-destructive">Couldn't copy. Select the {installLabel} above and copy it.</p>}
                  </div>
                  <h3 className="mt-5 text-sm font-medium">2. Start a review</h3>
                  <div role="tablist" aria-label="Your agent" className="mt-2 flex border-b"
                    onKeyDown={(event) => {
                      const index = REVIEW_AGENTS.findIndex(({ id }) => id === reviewAgent)
                      const next = event.key === "ArrowRight" ? (index + 1) % REVIEW_AGENTS.length
                        : event.key === "ArrowLeft" ? (index + REVIEW_AGENTS.length - 1) % REVIEW_AGENTS.length
                        : event.key === "Home" ? 0
                        : event.key === "End" ? REVIEW_AGENTS.length - 1 : null
                      if (next === null) return
                      event.preventDefault()
                      setReviewAgent(REVIEW_AGENTS[next].id)
                      setCommandCopyStatus("idle")
                      event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next].focus()
                    }}>
                    {REVIEW_AGENTS.map(({ id, label }) => (
                      <button key={id} type="button" role="tab" id={`agent-review-tab-${id}`}
                        aria-selected={reviewAgent === id} aria-controls="agent-review-command-panel"
                        tabIndex={reviewAgent === id ? 0 : -1}
                        className={`-mb-px flex flex-1 items-center justify-center gap-2 border-b-2 px-2 py-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${reviewAgent === id ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                        onClick={() => {
                          setReviewAgent(id)
                          setCommandCopyStatus("idle")
                        }}>
                        {id === "codex" ? <AgentIcon agent="codex" /> : (
                          <span className="flex items-center gap-1.5" aria-hidden="true">
                            <AgentIcon agent="claude" />
                            <AgentIcon agent="cursor" />
                          </span>
                        )}
                        {label}
                      </button>
                    ))}
                  </div>
                  <div role="tabpanel" id="agent-review-command-panel" aria-labelledby={`agent-review-tab-${reviewAgent}`}>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Paste this into your agent's chat. Markside finds the review when you return to this tab.</p>
                    <div className="relative mt-4">
                      <textarea readOnly value={reviewCommand} rows={1} aria-label="Review command for your agent"
                        onFocus={(event) => event.currentTarget.select()}
                        className="block min-h-12 w-full resize-none rounded-md border bg-muted p-3 pr-12 [field-sizing:content] font-mono text-xs leading-relaxed focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring" />
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="absolute right-2 top-2 h-7 w-7 text-muted-foreground" aria-label="Copy review command" onClick={() => void copyHelpCommand(reviewCommand, "review")}>
                            {commandCopyStatus === "copied" ? <Check size={14} /> : <Copy size={14} />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent style={{ zIndex: 100002 }}>{commandCopyStatus === "copied" ? "Copied" : "Copy review command"}</TooltipContent>
                      </Tooltip>
                    </div>
                    {commandCopyStatus === "copied" && <span role="status" className="sr-only">Review command copied. Ready to paste into your agent's chat.</span>}
                    {commandCopyStatus === "error" && <p role="alert" className="mt-2 text-xs text-destructive">Couldn't copy. Select the command above and copy it.</p>}
                  </div>
                  {(reviewFolder || folderStatus !== "idle") && <>
                    <h3 className="mt-5 text-sm font-medium">3. Allow folder access</h3>
                    {reviewFolder ? <>
                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                        So your agent can receive your review, Chrome asks once for access to{" "}
                        <span title={reviewFolder.path} className="font-medium text-foreground">{folderName(reviewFolder.path)}</span>.
                      </p>
                      {folderStatus === "chosen" && <p role="alert" className="mt-2 text-xs text-destructive">That folder doesn't contain this file. Choose {folderName(reviewFolder.path)} or a folder above it.</p>}
                      <Button variant="outline" className="mt-3" disabled={folderStatus === "choosing"} onClick={async () => {
                        setFolderStatus("choosing")
                        setFolderStatus(await reviewFolder.choose() ? "chosen" : "idle")
                      }}>
                        <FolderOpen size={14} />Choose folder
                      </Button>
                    </> : (
                      <p role="status" className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground"><Check size={14} />Your agent can receive reviews for this file.</p>
                    )}
                  </>}
                  <div className="mt-5 flex justify-end">
                    <Dialog.Close asChild><Button>Done</Button></Dialog.Close>
                  </div>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          </>
        )}
        {activeAgentHandoff && !canFinish && (
          activeAgentHandoff.sent && !activeAgentHandoff.sending ? (
            <p role="status" className="flex items-center gap-2 py-1 text-sm">
              <Check size={16} className="shrink-0 text-green-700 dark:text-green-300" aria-hidden="true" />
              <span className="min-w-0">
                <span className="font-medium text-green-700 dark:text-green-300">Review sent</span>
                <span className="text-muted-foreground"> · Waiting for the agent’s reply</span>
              </span>
            </p>
          ) : (
            <Button className="h-11 w-full whitespace-nowrap px-3 disabled:bg-primary disabled:text-primary-foreground/60 disabled:opacity-100" disabled={activeAgentHandoff.disabled} onClick={() => void activeAgentHandoff.send()} aria-busy={activeAgentHandoff.sending}
              aria-describedby={showAgentDisabledHelp ? "agent-review-send-help" : showAgentFolderHelp ? "agent-review-folder-help" : undefined}>
              <Send size={14} />
              {activeAgentHandoff.sending ? "Sending review…" : "Send review to agent"}
            </Button>
          )
        )}
        {showAgentFolderHelp && (
          <p id="agent-review-folder-help" className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Chrome will ask once for access to{" "}
            <span title={activeAgentHandoff.folderToChoose} className="font-medium text-foreground">{folderName(activeAgentHandoff.folderToChoose!)}</span>{" "}
            so your agent can receive your review.
          </p>
        )}
        {canFinish && (
          <p className="mb-2 text-xs leading-relaxed text-muted-foreground">
            {diskChanged ? "Your agent updated the document. Reload to see its changes."
              : questionsOpen ? "Answer the next questions in the document."
              : "Your agent is waiting. Add more comments or finish."}
          </p>
        )}
        <div className={`review-footer-actions flex flex-wrap items-center gap-2 ${showAgentAction && !canFinish ? "mt-2" : ""}`}>
          {/* Secondary, so it doesn't invite ending the Review before the reviewer has added everything. */}
          {activeAgentHandoff && finishOffered && addressedCount > 0 && (
            <Button variant="outline" className="h-11 whitespace-nowrap px-3 text-xs" disabled={statusWriting}
              onClick={activeAgentHandoff.resolveAll} aria-busy={activeAgentHandoff.resolvingAll}>
              {activeAgentHandoff.resolvingAll ? "Resolving…" : "Resolve all"}
            </Button>
          )}
          {activeAgentHandoff && finishOffered && (
            <Button variant="outline" className="h-11 whitespace-nowrap px-3 text-xs" disabled={statusWriting}
              onClick={activeAgentHandoff.finish} aria-busy={activeAgentHandoff.finishing}>
              {activeAgentHandoff.finishing ? "Finishing review…" : "Finish review"}
            </Button>
          )}
          {showSentStatus && (
            <Button variant="outline" size="sm" className="h-11 px-3 text-xs" onClick={() => void checkUpdates()}
              disabled={!onCheckUpdates || updateCheck === "checking" || reloadDocumentLoading}
              aria-busy={updateCheck === "checking"}>
              <RefreshCw size={14} aria-hidden="true" className={updateCheck === "checking" ? "animate-spin" : ""} />
              <span className="grid">
                <span aria-hidden="true" className="invisible" style={{ gridArea: "1 / 1" }}>Check for reply</span>
                <span aria-live="polite" style={{ gridArea: "1 / 1" }}>
                  {updateCheck === "checking" ? "Checking…" : updateCheck === "unchanged" ? "No reply yet" : updateCheck === "updated" ? "Updates found" : "Check for reply"}
                </span>
              </span>
            </Button>
          )}
          {/* Remount on a variant change so transition-colors doesn't fade the dark primary background out. */}
          {/* Icon-only beside Resolve all and Finish so all three fit one row in a narrow docked panel. */}
          {copyableCount > 0 && canFinish && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0 text-muted-foreground hover:text-foreground" aria-label={copied ? "Review copied for this file" : "Copy review as prompt"} onClick={onCopy}>
                  {copied
                    ? <Check size={14} strokeWidth={2.5} className="text-[hsl(132_60%_46%)] dark:text-[hsl(130_78%_29%)]" />
                    : <Copy size={14} />}
                </Button>
              </TooltipTrigger>
              <TooltipContent style={{ zIndex: 100002 }}>{copied ? "Review copied for this file" : "Copy review as prompt"}</TooltipContent>
            </Tooltip>
          )}
          {copyableCount > 0 && !canFinish && <Button key={showAgentAction ? "secondary" : "primary"} variant={showAgentAction ? "ghost" : "default"} className={`h-11 min-w-max whitespace-nowrap ${showAgentAction ? "shrink-0 px-2 text-xs text-muted-foreground hover:text-foreground" : "flex-1"}`} aria-label={copied ? "Review copied for this file" : "Copy review as prompt"} onClick={onCopy}>
            {copied
              ? <Check size={14} strokeWidth={2.5} className="text-[hsl(132_60%_46%)] dark:text-[hsl(130_78%_29%)]" />
              : <Copy size={14} />} {copied ? "Review copied for this file" : showSentStatus ? "Copy as prompt" : "Copy review as prompt"}
          </Button>}
          {(historyFile ? hasDrafts : itemCount > 0) && (
            <Button
              ref={clearButtonRef}
              title={historyFile ? "Discard unsent changes. Sent feedback and previous reviews are kept." : "Clear this local review."}
              disabled={agentHandoff?.sending || agentHandoff?.updatingCommentId != null}
              className={`h-11 shrink-0 whitespace-nowrap px-4 ${showAgentAction ? "ml-auto text-xs" : ""} ${clearArmed ? "text-red-700 hover:text-red-700 dark:text-red-300 dark:hover:text-red-300" : "text-muted-foreground"}`}
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
                  <Trash2 size={14} />{clearLabel}
                </span>
                <span className="flex items-center justify-center gap-1.5" style={{ gridArea: "1 / 1" }}>
                  <Trash2 size={14} />{clearArmed ? "Confirm" : clearLabel}
                </span>
              </span>
            </Button>
          )}
        </div>
        {showSentStatus && updateCheck === "error" && (
          <p role="status" className="mt-2 text-xs text-muted-foreground">Couldn’t check. Try again.</p>
        )}
        {showSentStatus && (
          <p className="mt-3 text-left text-xs leading-relaxed text-muted-foreground">
            Agent not responding?{" "}
            <button ref={sendHelpRef} type="button" aria-haspopup="dialog" onClick={() => setSendHelpOpen(true)}
              className="rounded-sm text-left underline underline-offset-2 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
              Start a review in your agent
            </button>
          </p>
        )}
        {showStartReview && (
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs leading-relaxed text-muted-foreground">
            <button ref={sendHelpRef} type="button" aria-haspopup="dialog" onClick={() => setSendHelpOpen(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-md px-2 text-left text-foreground transition-colors hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
              <Bot size={14} aria-hidden="true" className="shrink-0" />
              {needsNewReview ? "Start another review" : "Start a review in your agent…"}
            </button>
            <button type="button" disabled={agentSessionCheckStatus === "checking"} aria-busy={agentSessionCheckStatus === "checking"} onClick={onCheckAgentSession}
              className="inline-flex h-9 items-center gap-1.5 rounded-md px-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
              <RefreshCw size={14} aria-hidden="true" className={`shrink-0 ${agentSessionCheckStatus === "checking" ? "animate-spin" : ""}`} />
              {/* Every label occupies the same cell so the width never changes and the row never rewraps. */}
              <span className="grid text-left">
                {["Check for review", "No review yet", "Checking…"].map((label) => (
                  <span key={label} aria-hidden="true" className="invisible" style={{ gridArea: "1 / 1" }}>{label}</span>
                ))}
                <span role="status" style={{ gridArea: "1 / 1" }}>{agentSessionCheckStatus === "checking" ? "Checking…" : showNotFound ? "No review yet" : "Check for review"}</span>
              </span>
            </button>
          </div>
        )}
        {activeAgentHandoff && copied && <p role="status" className="mt-2 text-xs text-muted-foreground">Review copied for this file</p>}
      </div>
    </div>
  )
}
