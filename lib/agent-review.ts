import type { AgentReviewFile } from "../cli/review-file.mjs"
import type { ActiveReview, ReviewComment } from "./review"

export function agentReviewUrl(fileUrl: string) {
  const url = new URL(fileUrl)
  url.hash = ""
  url.search = ""
  url.pathname += ".review.json"
  return url.href
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

export function prepareAgentReview(
  pending: AgentReviewFile,
  review: ActiveReview,
  docHash: string,
  sourceLine: (comment: ReviewComment) => number | null,
  sentAt = new Date().toISOString(),
): AgentReviewFile {
  return {
    ...pending,
    status: "sent",
    sentAt,
    docHash,
    note: review.note,
    comments: review.comments.map((comment) => ({
      id: comment.id,
      quote: comment.anchor.exact,
      line: sourceLine(comment),
      body: comment.body,
      status: "open",
    })),
  }
}
