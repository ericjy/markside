export interface AgentReviewComment {
  id: string
  quote: string
  line: number | null
  body: string
  status: "open" | "resolved"
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
export function formatReviewComments(review: AgentReviewFile, includeResolved?: boolean): string
