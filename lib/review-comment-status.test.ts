import { describe, expect, it } from "vitest"
import { clearReviewDrafts, getReviewCommentStatus, hasReviewDrafts, prepareAgentReview, getAgentReviewDisabledReason } from "./agent-review"
import { refreshReviewFile, sendReview } from "../cli/review-file.mjs"
import { createEmptyReview, type ReviewComment } from "./review"
const comment: ReviewComment = { id: "c1", body: "Explain", createdAt: "now", anchor: { exact: "Plan", prefix: "", suffix: "", start: 0, end: 4, headingPath: [] } }
const sent = { id: "c1", body: "Explain", quote: "Plan", line: 1, status: "open" as const }

describe("Review comment statuses", () => {
  it("separates copy-prompt Open/Resolved from integration Draft/Sent/Addressed/Resolved", () => {
    expect(getReviewCommentStatus(comment)).toBe("Open")
    expect(getReviewCommentStatus({ ...comment, localStatus: "resolved" })).toBe("Resolved")
    expect(getReviewCommentStatus({ ...comment, reviewMode: "local" }, undefined, true)).toBe("Open")
    expect(getReviewCommentStatus({ ...comment, reviewMode: "agent" })).toBe("Draft")
    expect(getReviewCommentStatus(comment, sent)).toBe("Sent")
    expect(getReviewCommentStatus(comment, { ...sent, status: "addressed" })).toBe("Addressed")
    expect(getReviewCommentStatus(comment, { ...sent, status: "resolved" })).toBe("Resolved")
    expect(getReviewCommentStatus({ ...comment, body: "Edit" }, { ...sent, status: "addressed" })).toBe("Draft")
  })
  it("does not clear or send locally resolved comments as new agent feedback", () => {
    const file = sendReview(refreshReviewFile(null, "PLAN.md"), { docHash: "a".repeat(64), comments: [sent] })
    const local = { ...comment, id: "local", localStatus: "resolved" as const, reviewMode: "local" as const }
    const review = { ...createEmptyReview("file:///PLAN.md", ""), comments: [comment, local] }
    expect(hasReviewDrafts(review, file)).toBe(false)
    expect(clearReviewDrafts(review, file)?.comments).toContainEqual(local)
    expect(getAgentReviewDisabledReason(file, review)).toContain("Add or edit")
    const draft = { ...review, comments: [...review.comments, { ...comment, id: "new", reviewMode: "agent" as const }] }
    const next = prepareAgentReview(file, draft, file.docHash, () => 1)
    expect(next.comments.map(({ id }) => id)).toEqual(["c1", "new"])
  })
})
