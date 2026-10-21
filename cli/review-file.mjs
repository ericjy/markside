const isoTime = (value) => typeof value === "string" && Number.isFinite(Date.parse(value))
const hash = (value) => typeof value === "string" && /^[a-f0-9]{64}$/.test(value)

export function parseReviewFile(text, doc) {
  const value = JSON.parse(text)
  if (!value || value.version !== 1 || value.doc !== doc ||
      !["pending", "sent", "resolved"].includes(value.status) ||
      !isoTime(value.requestedAt) ||
      !(value.docHash === "" || hash(value.docHash)) ||
      (value.sentAt !== undefined && !isoTime(value.sentAt)) ||
      (value.status === "sent" && (!isoTime(value.sentAt) || !hash(value.docHash))) ||
      (value.note !== undefined && typeof value.note !== "string") ||
      (value.noteStatus !== undefined && !["open", "addressed"].includes(value.noteStatus)) ||
      (value.noteReply !== undefined && typeof value.noteReply !== "string") ||
      !Array.isArray(value.comments)) {
    throw new Error(`Invalid version 1 Review file for ${doc}`)
  }
  const ids = new Set()
  for (const comment of value.comments) {
    if (!comment || typeof comment.id !== "string" || !comment.id || ids.has(comment.id) ||
        typeof comment.quote !== "string" || typeof comment.body !== "string" ||
        !(comment.line === null || (Number.isInteger(comment.line) && comment.line > 0)) ||
        !["open", "addressed", "resolved"].includes(comment.status) ||
        (comment.reply !== undefined && typeof comment.reply !== "string")) {
      throw new Error(`Invalid Review comment for ${doc}`)
    }
    ids.add(comment.id)
  }
  return value
}

export function refreshReviewFile(existing, doc, now = new Date().toISOString()) {
  // Only reviewer acceptance ends a Review. A retry must not discard a send made while the agent wasn't running.
  if (existing && existing.status !== "resolved") return existing
  return {
    version: 1, doc, docHash: "", status: "pending", requestedAt: now,
    ...(existing?.note ? { note: existing.note } : {}),
    comments: existing?.comments ?? [],
  }
}

export const NOTE_ID = "note"

export function sendReview(review, { docHash, note = "", comments }, sentAt = new Date().toISOString()) {
  const { noteStatus, noteReply, ...rest } = review
  const kept = { ...(noteStatus ? { noteStatus } : {}), ...(noteReply !== undefined ? { noteReply } : {}) }
  const reopened = note !== (review.note ?? "") || noteStatus === "open"
  // A Review Note sent with open comments is answered through them. Sent alone, a new
  // or edited note awaits the agent's own reply; an unchanged one keeps its state.
  const noteState = !note.trim() ? {}
    : comments.some(({ status }) => status === "open") ? (reopened ? {} : kept)
    : reopened ? { noteStatus: "open" } : kept
  return { ...rest, status: "sent", sentAt, docHash, note, ...noteState, comments }
}

export const hasOpenAgentWork = (review) =>
  review.noteStatus === "open" || review.comments.some(({ status }) => status === "open")

export function addressReviewComment(review, id, reply) {
  if (id === NOTE_ID && review.noteStatus) {
    if (review.status === "pending") throw new Error("Wait for the user to send the Review before addressing comments")
    return { ...review, noteStatus: "addressed", ...(reply !== undefined ? { noteReply: reply } : {}) }
  }
  const comment = review.comments.find((item) => item.id === id)
  if (!comment) throw new Error(`Review comment not found: ${id}`)
  if (review.status === "pending") throw new Error("Wait for the user to send the Review before addressing comments")
  if (comment.status === "resolved") throw new Error("The reviewer resolved this comment. Ask them to reopen it first.")
  return {
    ...review,
    comments: review.comments.map((item) => item.id === id
      ? { ...item, status: "addressed", ...(reply !== undefined ? { reply } : {}) }
      : item),
  }
}

export function setReviewerCommentStatus(review, id, status) {
  const comment = review.comments.find((item) => item.id === id)
  if (!comment) throw new Error(`Review comment not found: ${id}`)
  if (status === "resolved" ? comment.status === "resolved" : status !== "open" || comment.status === "open") {
    throw new Error("Resolve an open or addressed comment, or reopen a resolved or addressed comment.")
  }
  const comments = review.comments.map((item) => item.id === id ? { ...item, status } : item)
  return {
    ...review, comments,
    // Resolving is not finishing: the reviewer may still add feedback, so only finishReview ends the request.
    status: status === "open" ? "pending" : review.status,
  }
}

export function resolveAddressedComments(review) {
  return { ...review, comments: review.comments.map((item) => item.status === "addressed" ? { ...item, status: "resolved" } : item) }
}

export function finishReview(review) {
  if (review.status === "resolved" || !review.sentAt ||
      !(review.comments.length || review.noteStatus) || hasOpenAgentWork(review)) {
    throw new Error("Wait for the agent to address every open comment before finishing the Review.")
  }
  // Finishing accepts the agent's remaining Addressed replies along with the Review.
  return { ...review, status: "resolved", comments: review.comments.map((item) => ({ ...item, status: "resolved" })) }
}

export function formatReviewComments(review, includeAll = false) {
  if (!includeAll && review.status === "resolved") return `Review resolved for ${review.doc}. No open comments.`
  const comments = review.comments.filter(({ status }) => includeAll || status === "open")
  const showNote = !!review.note && (includeAll || review.noteStatus !== "addressed")
  const noteLabel = review.noteStatus
    ? `Review note (ID ${NOTE_ID})${review.noteStatus !== "open" ? ` [${review.noteStatus}]` : ""}`
    : "Review note"
  return [
    `Got ${comments.length} comment${comments.length === 1 ? "" : "s"}${showNote && review.noteStatus === "open" ? " and the Review note" : ""} for ${review.doc}`,
    ...(showNote ? [[`${noteLabel}:`, review.note, ...(review.noteReply ? [`Agent reply: ${review.noteReply}`] : [])].join("\n")] : []),
    ...comments.map((comment) => [
      `Comment ${comment.id}${comment.line === null ? " (line unavailable; verify the passage in the current document)" : ` (line ${comment.line})`}${comment.status !== "open" ? ` [${comment.status}]` : ""}`,
      comment.quote.trim().split("\n").map((line) => `> ${line}`).join("\n"),
      // Without a blank line, Markdown reads the comment as part of the quote.
      "",
      comment.body,
      ...(comment.reply ? [`Agent reply: ${comment.reply}`] : []),
    ].join("\n")),
  ].join("\n\n")
}
