import { afterEach, describe, expect, it, vi } from "vitest"
import { agentReviewUrl, reviewSendFingerprint, prepareAgentReview, getAgentReviewResults, getAgentReviewDisabledReason, getPendingReviewItemCount, canFinishAgentReview, checkForAgentReply } from "./agent-review"
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
  it("sends and finishes a Review that contains only overall feedback", () => {
    const noteOnly = { ...review, comments: [] }
    expect(getAgentReviewDisabledReason(pending, noteOnly)).toBeNull()
    expect(getAgentReviewDisabledReason(pending, { ...noteOnly, note: "  " })).toContain("Add a comment or overall feedback")
    const sent = prepareAgentReview(pending, noteOnly, "a".repeat(64), () => null)
    expect(getAgentReviewDisabledReason(sent, noteOnly)).toContain("Add or edit")
    expect(canFinishAgentReview(sent, noteOnly)).toBe(false)
    const addressed = { ...sent, noteStatus: "addressed" as const, noteReply: "Thanks." }
    expect(getAgentReviewDisabledReason(addressed, noteOnly)).toContain("Add or reopen")
    expect(getAgentReviewDisabledReason(addressed, { ...noteOnly, note: "Also check scope." })).toBeNull()
    expect(canFinishAgentReview(addressed, noteOnly)).toBe(true)
  })
  it("offers Finish only once no sent comment awaits the agent and nothing is unsent", () => {
    const sent = prepareAgentReview(pending, review, "a".repeat(64), () => 12)
    expect(canFinishAgentReview(sent, review)).toBe(false)
    const addressed = { ...sent, comments: sent.comments.map((comment) => ({ ...comment, status: "addressed" as const })) }
    expect(canFinishAgentReview(addressed, review)).toBe(true)
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
  it("counts remaining feedback as comments are resolved and reopened", () => {
    const active = {
      ...review, note: "",
      comments: Array.from({ length: 10 }, (_, index) => ({ ...review.comments[0], id: `c${index}` })),
    }
    const sent = prepareAgentReview(pending, active, "a".repeat(64), () => null)
    sent.comments.forEach((comment, index) => { comment.status = index === 0 ? "addressed" : "resolved" })
    expect(getPendingReviewItemCount(active, sent)).toBe(1)
    sent.comments[0].status = "resolved"
    expect(getPendingReviewItemCount(active, sent)).toBe(0)
    sent.comments[0].status = "open"
    expect(getPendingReviewItemCount(active, sent)).toBe(1)
    expect(active.comments).toHaveLength(10)
  })

  it("leaves out comments resolved locally or in the sidecar, and their note", () => {
    expect(getPendingReviewItemCount(review)).toBe(2)
    const resolvedLocally = { ...review, comments: [{ ...review.comments[0], localStatus: "resolved" as const }] }
    expect(getPendingReviewItemCount(resolvedLocally)).toBe(0)
    const sent = prepareAgentReview(pending, review, "a".repeat(64), () => null)
    expect(getPendingReviewItemCount(review, sent)).toBe(2)
    expect(getPendingReviewItemCount(review, { ...sent, comments: [{ ...sent.comments[0], status: "addressed" }] })).toBe(2)
    expect(getPendingReviewItemCount(review, { ...sent, status: "resolved", comments: [{ ...sent.comments[0], status: "resolved" }] })).toBe(0)
    expect(getPendingReviewItemCount({ ...review, comments: [] })).toBe(1)
    const noteOnly = { ...review, comments: [] }
    const sentNote = prepareAgentReview(pending, noteOnly, "a".repeat(64), () => null)
    expect(getPendingReviewItemCount(noteOnly, sentNote)).toBe(1)
    expect(getPendingReviewItemCount(noteOnly, { ...sentNote, status: "resolved", noteStatus: "addressed" })).toBe(0)
    expect(getPendingReviewItemCount({ ...noteOnly, note: "Edited" }, { ...sentNote, status: "resolved", noteStatus: "addressed" })).toBe(1)
  })
})

describe("post-Send agent reply check", () => {
  afterEach(() => vi.useRealTimers())

  it("re-reads on an interval and stops at the agent's reply", async () => {
    vi.useFakeTimers()
    const check = vi.fn(async () => check.mock.calls.length === 3)
    const onReply = vi.fn()
    checkForAgentReply(check, onReply, { intervalMs: 2_000, limitMs: 60_000 })
    expect(check).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(4_000)
    expect(onReply).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(2_000)
    expect(onReply).toHaveBeenCalledOnce()
    await vi.advanceTimersByTimeAsync(10_000)
    expect(check).toHaveBeenCalledTimes(3)
  })

  it("ends on its own at the limit, tolerating read failures", async () => {
    vi.useFakeTimers()
    const check = vi.fn(async () => { throw new Error("unreadable") })
    const onReply = vi.fn()
    checkForAgentReply(check, onReply, { intervalMs: 2_000, limitMs: 6_000 })
    await vi.advanceTimersByTimeAsync(60_000)
    expect(check).toHaveBeenCalledTimes(3)
    expect(onReply).not.toHaveBeenCalled()
  })

  it("stops when cancelled, even with a read in flight", async () => {
    vi.useFakeTimers()
    let finishRead: (replied: boolean) => void = () => undefined
    const check = vi.fn(() => new Promise<boolean>((resolve) => { finishRead = resolve }))
    const onReply = vi.fn()
    const cancel = checkForAgentReply(check, onReply, { intervalMs: 2_000, limitMs: 60_000 })
    await vi.advanceTimersByTimeAsync(2_000)
    cancel()
    finishRead(true)
    await vi.advanceTimersByTimeAsync(10_000)
    expect(onReply).not.toHaveBeenCalled()
    expect(check).toHaveBeenCalledOnce()
  })
})
