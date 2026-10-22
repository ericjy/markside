import { hasOpenAgentWork, sendReview } from "../cli/review-file.mjs"
import type { AgentReviewComment, AgentReviewFile } from "../cli/review-file.mjs"
import { getReviewItemCount, type ActiveReview, type ReviewComment } from "./review"

export function agentReviewUrl(fileUrl: string) {
  const url = new URL(fileUrl)
  url.hash = ""
  url.search = ""
  url.pathname += ".review.json"
  return url.href
}

/** Adds sent comments missing from the browser, e.g. after site data was cleared. */
export function currentAgentReview(review: ActiveReview | null, file: AgentReviewFile): ActiveReview | null {
  if (!review) return null
  let recovered = false
  const comments = file.comments.map((comment): ReviewComment => {
    const cached = review.comments.find(({ id }) => id === comment.id)
    if (cached) return cached
    recovered = true
    return {
      id: comment.id, body: comment.body, createdAt: file.sentAt ?? file.requestedAt,
      anchor: { exact: comment.quote, prefix: "", suffix: "", start: 0, end: comment.quote.length, headingPath: [] },
    }
  })
  comments.push(...review.comments.filter(({ id }) => !file.comments.some((comment) => comment.id === id)))
  return { ...review, comments, ...(recovered ? { sourceHash: "" } : {}) }
}

export function agentReviewIdentity(file: AgentReviewFile) {
  return `${file.requestedAt}:${file.sentAt ?? "pending"}`
}

export function reviewSendFingerprint(review: ActiveReview | AgentReviewFile | null) {
  return JSON.stringify({
    note: review?.note ?? "",
    comments: review?.comments.map((comment) => ({
      id: comment.id,
      quote: "anchor" in comment ? comment.anchor.exact : comment.quote,
      body: comment.body,
    })) ?? [],
  })
}

export function getAgentReviewResults(file: AgentReviewFile | null, review: ActiveReview | null) {
  const results = new Map<string, AgentReviewComment>()
  for (const comment of review?.comments ?? []) {
    const result = file?.comments.find((item) =>
      item.id === comment.id && item.quote === comment.anchor.exact && item.body === comment.body
    )
    if (result) results.set(comment.id, result)
  }
  return results
}

export function getAgentReviewDisabledReason(file: AgentReviewFile, review: ActiveReview | null) {
  if (file.status === "resolved") return "This Review is resolved."
  review = currentAgentReview(review, file)
  if (review) review = { ...review, comments: review.comments.filter((comment) => comment.localStatus !== "resolved" || file.comments.some(({ id }) => id === comment.id)) }
  const hasNote = !!review?.note.trim()
  if (!review || (!hasNote && !review.comments.some((comment) => comment.localStatus !== "resolved"))) {
    return "Add a comment or overall feedback before sending to the agent."
  }
  const results = getAgentReviewResults(file, review)
  const openNote = hasNote && (review.note !== (file.note ?? "") || file.noteStatus === "open")
  if (!openNote && !review.comments.some(({ id, localStatus }) => localStatus !== "resolved" && (results.get(id)?.status ?? "open") === "open")) {
    return "Add or reopen a comment to send again."
  }
  if (file.status === "sent" && reviewSendFingerprint(review) === reviewSendFingerprint(file)) {
    return "Add or edit a comment to send again."
  }
  return null
}

export function prepareAgentReview(
  pending: AgentReviewFile,
  review: ActiveReview,
  docHash: string,
  sourceLine: (comment: ReviewComment) => number | null,
  sentAt = new Date().toISOString(),
): AgentReviewFile {
  review = currentAgentReview(review, pending)!
  return sendReview(pending, {
    docHash,
    note: review.note,
    comments: review.comments.filter((comment) => comment.localStatus !== "resolved" || pending.comments.some(({ id }) => id === comment.id)).map((comment) => {
      const previous = pending.comments.find((item) =>
        item.id === comment.id && item.quote === comment.anchor.exact && item.body === comment.body
      )
      return {
        id: comment.id,
        quote: comment.anchor.exact,
        line: sourceLine(comment),
        body: comment.body,
        status: previous?.status ?? "open",
        ...(previous?.reply !== undefined ? { reply: previous.reply } : {}),
      }
    }),
  }, sentAt)
}

export function hasReviewDrafts(review: ActiveReview | null, file?: AgentReviewFile) {
  const current = file ? currentAgentReview(review, file) : review
  if (!current) return false
  if (current.note !== (file?.note ?? "")) return true
  const sent = file?.comments ?? []
  return current.comments.some((comment) => comment.localStatus !== "resolved" && (!file || comment.reviewMode !== "local") && !sent.some((item) =>
    item.id === comment.id && item.quote === comment.anchor.exact && item.body === comment.body
  ))
}

export const AGENT_REPLY_CHECK_INTERVAL_MS = 2_000
export const AGENT_REPLY_CHECK_LIMIT_MS = 120_000

/**
 * After Send, re-reads until the agent replies or the limit passes so the reviewer
 * waiting in the tab sees the reply. ADR-0002 allows this check because Send starts
 * it and it ends on its own. Returns a cancel function.
 */
export function checkForAgentReply(
  check: () => Promise<boolean>,
  onReply: () => void,
  { intervalMs = AGENT_REPLY_CHECK_INTERVAL_MS, limitMs = AGENT_REPLY_CHECK_LIMIT_MS } = {},
) {
  let cancelled = false
  let timer: ReturnType<typeof setTimeout> | undefined
  const deadline = Date.now() + limitMs
  const tick = async () => {
    const replied = await check().catch(() => false)
    if (cancelled) return
    if (replied) onReply()
    else if (Date.now() + intervalMs <= deadline) timer = setTimeout(tick, intervalMs)
  }
  timer = setTimeout(tick, intervalMs)
  return () => {
    cancelled = true
    clearTimeout(timer)
  }
}

/** Once nothing awaits the agent, the reviewer ends the Review explicitly, resolving any Addressed comments. */
export function canFinishAgentReview(file: AgentReviewFile, review: ActiveReview | null) {
  return file.status !== "resolved" && !!file.sentAt && (file.comments.length > 0 || !!file.noteStatus) &&
    !hasOpenAgentWork(file) && !hasReviewDrafts(review, file)
}

export function clearReviewDrafts(review: ActiveReview | null, file?: AgentReviewFile): ActiveReview | null {
  const current = file ? currentAgentReview(review, file) : review
  if (!current) return null
  const sent = file?.comments ?? []
  let changedQuote = false
  const comments = current.comments.flatMap((comment) => {
    const original = sent.find(({ id }) => id === comment.id)
    if (!original) return comment.localStatus === "resolved" || comment.reviewMode === "local" ? [comment] : []
    changedQuote ||= original.quote !== comment.anchor.exact
    return [{ ...comment, ...(comment.localStatus ? { localStatus: "open" as const } : {}), body: original.body, anchor: { ...comment.anchor, exact: original.quote } }]
  })
  return { ...current, comments, note: file?.note ?? "", ...(changedQuote ? { sourceHash: "" } : {}), updatedAt: new Date().toISOString() }
}


export type ReviewCommentStatus = "Open" | "Draft" | "Sent" | "Addressed" | "Resolved"

export function getReviewCommentStatus(comment: ReviewComment, sent?: AgentReviewComment, agentMode = false): ReviewCommentStatus {
  if (sent && sent.quote === comment.anchor.exact && sent.body === comment.body) {
    return sent.status === "open" ? "Sent" : sent.status === "addressed" ? "Addressed" : "Resolved"
  }
  if (!sent && comment.localStatus === "resolved") return "Resolved"
  return sent || comment.reviewMode === "agent" || (agentMode && comment.reviewMode !== "local") ? "Draft" : "Open"
}

/** Items still waiting on the reviewer or the agent; Resolved comments are history. */
export function getPendingReviewItemCount(review: ActiveReview, file?: AgentReviewFile) {
  const current = file ? currentAgentReview(review, file)! : review
  const comments = current.comments.filter((comment) =>
    getReviewCommentStatus(comment, file?.comments.find(({ id }) => id === comment.id)) !== "Resolved"
  )
  // A Review Note belongs to its comments, so it is not pending once they are all resolved,
  // nor once the reviewer finishes a note-only Review without editing the note.
  const noteResolved = file?.status === "resolved" && current.note === (file.note ?? "")
  const note = !noteResolved && (comments.length > 0 || current.comments.length === 0) ? current.note : ""
  return getReviewItemCount({ ...current, comments, note })
}
