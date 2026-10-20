import { describe, expect, it } from "vitest"
import { addressReviewComment, refreshReviewFile, sendReview } from "../cli/review-file.mjs"
import { getAgentReviewDisabledReason, clearReviewDrafts, currentAgentReview, hasReviewDrafts, prepareAgentReview } from "./agent-review"
import { createEmptyReview } from "./review"

const comment = { id: "sent", body: "Clarify this", createdAt: "now", anchor: { exact: "Plan", prefix: "", suffix: "", start: 0, end: 4, headingPath: [] } }
const review = { ...createEmptyReview("file:///PLAN.md", "hash"), note: "Check scope", comments: [comment] }
const file = addressReviewComment(sendReview(refreshReviewFile(null, "PLAN.md"), {
  docHash: "a".repeat(64), note: review.note, comments: [{ id: comment.id, quote: "Plan", line: 1, body: comment.body, status: "open" }],
}), comment.id, "Done")

describe("clearing Review drafts", () => {
  it("clears unsent comments and note while retaining imported history", () => {
    const importedRounds = [{ id: "imported", reviewerName: null, note: "Earlier feedback", comments: [comment], createdAt: "now" }]
    const draft = { ...review, importedRounds }
    expect(hasReviewDrafts(draft)).toBe(true)
    const cleared = clearReviewDrafts(draft)!
    expect(cleared).toMatchObject({ note: "", comments: [], importedRounds })
    expect(hasReviewDrafts(cleared)).toBe(false)
  })

  it("does not consider unchanged sent or addressed feedback a draft", () => {
    expect(hasReviewDrafts(review, file)).toBe(false)
    expect(hasReviewDrafts(null, file)).toBe(false)
  })

  it("removes new comments and restores sent text and overall feedback without changing the sidecar", () => {
    const original = structuredClone(file)
    const draft = { ...review, note: "Changed scope", comments: [{ ...comment, body: "Edited draft" }, { ...comment, id: "new" }] }
    expect(hasReviewDrafts(draft, file)).toBe(true)
    const cleared = clearReviewDrafts(draft, file)!
    expect(cleared.comments).toEqual([comment])
    expect(cleared.note).toBe(review.note)
    expect(hasReviewDrafts(cleared, file)).toBe(false)
    expect(file).toEqual(original)
    expect(file.comments[0]).toMatchObject({ status: "addressed", reply: "Done" })
  })

  it("recovers sent feedback absent from the local draft, including when sending another comment", () => {
    const draft = { ...review, comments: [{ ...comment, id: "new" }] }
    const current = currentAgentReview(draft, file)!
    expect(current.comments.map(({ id }) => id)).toEqual(["sent", "new"])
    const next = prepareAgentReview(file, draft, file.docHash, () => 1)
    expect(next.comments.map(({ id }) => id)).toEqual(["sent", "new"])
    expect(clearReviewDrafts(draft, file)?.comments.map(({ id }) => id)).toEqual(["sent"])
  })

  it("keeps the sent order after partial cache loss and does not enable a duplicate send", () => {
    const sent = sendReview(refreshReviewFile(null, "PLAN.md"), {
      docHash: "a".repeat(64), note: review.note,
      comments: ["first", "second"].map((id) => ({ id, quote: "Plan", line: 1, body: comment.body, status: "open" as const })),
    })
    const partial = { ...review, comments: [{ ...comment, id: "second" }] }
    expect(hasReviewDrafts(partial, sent)).toBe(false)
    expect(getAgentReviewDisabledReason(sent, partial)).toBe("Add or edit a comment to send again.")
  })

  it("restores a changed quote using unique-text reattachment rather than draft positions", () => {
    const draft = { ...review, comments: [{ ...comment, anchor: { ...comment.anchor, exact: "Draft quote" } }] }
    const cleared = clearReviewDrafts(draft, file)!
    expect(cleared.comments[0].anchor.exact).toBe("Plan")
    expect(cleared.sourceHash).toBe("")
  })
})
