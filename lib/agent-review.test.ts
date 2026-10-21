import { describe, expect, it } from "vitest"
import { agentReviewUrl, reviewSendFingerprint, prepareAgentReview, getAgentReviewResults, getAgentReviewDisabledReason, getPendingReviewItemCount, canFinishAgentReview } from "./agent-review"
import { type AgentReviewFile } from "../cli/review-file.mjs"
import { createEmptyReview } from "./review"

const pending: AgentReviewFile = { version: 1, doc: "plan #1.md", docHash: "", status: "pending", requestedAt: "2026-10-18T12:00:00Z", comments: [] }
const review = {
  ...createEmptyReview("file:///docs/plan%20%231.md", "hash"), note: "Check scope.",
  comments: [{ id: "c1", body: "Clarify", createdAt: "now", anchor: { exact: "Selected text", prefix: "", suffix: "", start: 0, end: 13, headingPath: [] } }],
}

describe("agent Review handoff", () => {
  it("allows sending newly saved feedback even when the previous Review was empty or unchanged", () => {
    expect(getAgentReviewDisabledReason(pending, null)).toContain("Add a comment")
    expect(getAgentReviewDisabledReason(pending, review)).toBeNull()
    const sent = prepareAgentReview(pending, review, "hash", () => null)
    expect(getAgentReviewDisabledReason(sent, review)).toContain("Add or edit")
    const changed = { ...review, comments: [...review.comments, { ...review.comments[0], id: "c2", body: "New feedback" }] }
    expect(getAgentReviewDisabledReason(sent, changed)).toBeNull()
    expect(getAgentReviewDisabledReason({ ...sent, status: "resolved" }, changed)).toContain("resolved")
  })
  it("offers Finish only once every sent comment is resolved and nothing is unsent", () => {
    const sent = prepareAgentReview(pending, review, "a".repeat(64), () => 12)
    expect(canFinishAgentReview(sent, review)).toBe(false)
    const resolved = { ...sent, comments: sent.comments.map((comment) => ({ ...comment, status: "resolved" as const })) }
    expect(canFinishAgentReview(resolved, review)).toBe(true)
    const draft = { ...review, comments: [...review.comments, { ...review.comments[0], id: "c2", body: "More feedback" }] }
    expect(canFinishAgentReview(resolved, draft)).toBe(false)
    expect(canFinishAgentReview({ ...resolved, status: "resolved" }, review)).toBe(false)
    // A fresh request carries earlier resolved comments as history but has nothing to finish.
    expect(canFinishAgentReview({ ...resolved, status: "pending", sentAt: undefined }, review)).toBe(false)
  })
  it("creates a sibling URL without losing encoded filename characters", () => {
    expect(agentReviewUrl(review.sourceUrl)).toBe("file:///docs/plan%20%231.md.review.json")
  })
  it("includes the note, exact quote, ID and source line", () => {
    const sent = prepareAgentReview(pending, review, "a".repeat(64), () => 12, "2026-10-18T12:05:00Z")
    expect(sent).toMatchObject({ status: "sent", requestedAt: pending.requestedAt, sentAt: "2026-10-18T12:05:00Z", note: review.note, comments: [{ id: "c1", quote: "Selected text", line: 12, body: "Clarify", status: "open" }] })
  })
  it("retains resolved comments and replies unless the user revises them", () => {
    const sent = prepareAgentReview(pending, review, "a".repeat(64), () => 12)
    sent.comments[0].status = "resolved"
    sent.comments[0].reply = "Clarified."
    expect(prepareAgentReview(sent, review, sent.docHash, () => 12).comments[0]).toMatchObject({ status: "resolved", reply: "Clarified." })
    const changed = { ...review, comments: [{ ...review.comments[0], body: "Still unclear" }] }
    expect(prepareAgentReview(sent, changed, sent.docHash, () => 12).comments[0]).toMatchObject({ status: "open", body: "Still unclear" })
    expect(prepareAgentReview(sent, changed, sent.docHash, () => 12).comments[0].reply).toBeUndefined()
  })
  it("exposes resolved results even after the entire Review is resolved", () => {
    const resolved = prepareAgentReview(pending, review, "a".repeat(64), () => 12)
    resolved.status = "resolved"
    resolved.comments[0].status = "resolved"
    resolved.comments[0].reply = "Clarified."
    expect(getAgentReviewResults(resolved, review).get("c1")).toMatchObject({ status: "resolved", reply: "Clarified." })
  })
  it("does not attach an old resolution to a revised comment", () => {
    const sent = prepareAgentReview(pending, review, "a".repeat(64), () => 12)
    sent.comments[0].status = "resolved"
    const changed = { ...review, comments: [{ ...review.comments[0], body: "Another question" }] }
    expect(getAgentReviewResults(sent, changed).size).toBe(0)
    expect(getAgentReviewResults(null, review).size).toBe(0)
  })
  it("disables repeat sends until the user changes the Review", () => {
    const sent = prepareAgentReview(pending, review, "a".repeat(64), () => null)
    expect(reviewSendFingerprint(review)).toBe(reviewSendFingerprint(sent))
    expect(reviewSendFingerprint({ ...review, comments: [{ ...review.comments[0], body: "Updated" }] })).not.toBe(reviewSendFingerprint(sent))
  })
})

describe("pending Review item count", () => {
  it("leaves out comments resolved locally or in the sidecar, and their note", () => {
    expect(getPendingReviewItemCount(review)).toBe(2)
    const resolvedLocally = { ...review, comments: [{ ...review.comments[0], localStatus: "resolved" as const }] }
    expect(getPendingReviewItemCount(resolvedLocally)).toBe(0)
    const sent = prepareAgentReview(pending, review, "a".repeat(64), () => null)
    expect(getPendingReviewItemCount(review, sent)).toBe(2)
    expect(getPendingReviewItemCount(review, { ...sent, comments: [{ ...sent.comments[0], status: "addressed" }] })).toBe(2)
    expect(getPendingReviewItemCount(review, { ...sent, status: "resolved", comments: [{ ...sent.comments[0], status: "resolved" }] })).toBe(0)
    expect(getPendingReviewItemCount({ ...review, comments: [] })).toBe(1)
  })
})
