export interface AgentReviewComment {
  id: string
  quote: string
  line: number | null
  body: string
  status: "open" | "addressed" | "resolved"
  reply?: string
}
export interface AgentReviewFile {
  version: 1
  doc: string
  docHash: string
  status: "pending" | "sent" | "resolved"
  requestedAt: string
  sentAt?: string
  note?: string
  comments: AgentReviewComment[]
}
export function parseReviewFile(text: string, doc: string): AgentReviewFile
export function refreshReviewFile(existing: AgentReviewFile | null, doc: string, now?: string): AgentReviewFile
export function sendReview(review: AgentReviewFile, feedback: { docHash: string; note?: string; comments: AgentReviewComment[] }, sentAt?: string): AgentReviewFile
export function formatReviewComments(review: AgentReviewFile, includeAll?: boolean): string

export function addressReviewComment(review: AgentReviewFile, id: string, reply?: string): AgentReviewFile
export function setReviewerCommentStatus(review: AgentReviewFile, id: string, status: "open" | "resolved"): AgentReviewFile
export function finishReview(review: AgentReviewFile): AgentReviewFile
