import { describe, expect, it } from "vitest"
import { agentReviewUrl, reviewSendFingerprint, prepareAgentReview } from "./agent-review"
import { type AgentReviewFile } from "../cli/review-file.mjs"
import { createEmptyReview } from "./review"

const pending: AgentReviewFile = { version: 1, doc: "plan #1.md", docHash: "", status: "pending", requestedAt: "2026-10-18T12:00:00Z", comments: [] }
const review = {
  ...createEmptyReview("file:///docs/plan%20%231.md", "hash"), note: "Check scope.",
  comments: [{ id: "c1", body: "Clarify", createdAt: "now", anchor: { exact: "Selected text", prefix: "", suffix: "", start: 0, end: 13, headingPath: [] } }],
}

describe("agent Review handoff", () => {
  it("creates a sibling URL without losing encoded filename characters", () => {
    expect(agentReviewUrl(review.sourceUrl)).toBe("file:///docs/plan%20%231.md.review.json")
  })
  it("includes the note, exact quote, ID and source line", () => {
    const sent = prepareAgentReview(pending, review, "a".repeat(64), () => 12, "2026-10-18T12:05:00Z")
    expect(sent).toMatchObject({ status: "sent", requestedAt: pending.requestedAt, sentAt: "2026-10-18T12:05:00Z", note: review.note, comments: [{ id: "c1", quote: "Selected text", line: 12, body: "Clarify", status: "open" }] })
  })
  it("disables repeat sends until the user changes the Review", () => {
    const sent = prepareAgentReview(pending, review, "a".repeat(64), () => null)
    expect(reviewSendFingerprint(review)).toBe(reviewSendFingerprint(sent))
    expect(reviewSendFingerprint({ ...review, comments: [{ ...review.comments[0], body: "Updated" }] })).not.toBe(reviewSendFingerprint(sent))
  })
})
