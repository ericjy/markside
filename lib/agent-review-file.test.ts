import { describe, expect, it } from "vitest"
import { type AgentReviewFile, parseReviewFile, refreshReviewFile, formatReviewComments, addressReviewComment, setReviewerCommentStatus, sendReview, finishReview } from "../cli/review-file.mjs"

const sent: AgentReviewFile = {
  version: 1, doc: "PLAN.md", docHash: "a".repeat(64), status: "sent",
  requestedAt: "2026-10-18T12:00:00.000Z", sentAt: "2026-10-18T12:05:00.000Z",
  comments: [{ id: "c1", quote: "Plan", line: 3, body: "Clarify", status: "open" }],
}

describe("agent Review file", () => {
  it("validates the document identity and comment contract", () => {
    expect(parseReviewFile(JSON.stringify(sent), "PLAN.md")).toEqual(sent)
    expect(() => parseReviewFile(JSON.stringify(sent), "OTHER.md")).toThrow()
    expect(() => parseReviewFile(JSON.stringify({ ...sent, version: 2 }), "PLAN.md")).toThrow()
    expect(() => parseReviewFile(JSON.stringify({ ...sent, comments: [{ ...sent.comments[0], line: -1 }] }), "PLAN.md")).toThrow()
    expect(() => parseReviewFile(JSON.stringify({ ...sent, comments: [sent.comments[0], sent.comments[0]] }), "PLAN.md")).toThrow()
  })
  it("preserves pending requests across timeout retries", () => {
    const pending = { ...sent, status: "pending" as const }
    expect(refreshReviewFile(pending, "PLAN.md").requestedAt).toBe(pending.requestedAt)
  })
  it("does not erase a send that arrived between CLI invocations", () => {
    expect(refreshReviewFile(sent, "PLAN.md")).toBe(sent)
  })
  it("starts a fresh request after resolution, keeping resolved comments and the note", () => {
    const next = refreshReviewFile({ ...sent, note: "Check scope", status: "resolved", comments: sent.comments.map((comment) => ({ ...comment, status: "resolved" })) }, "PLAN.md", "2026-10-18T13:00:00.000Z")
    expect(next).toMatchObject({ status: "pending", note: "Check scope", requestedAt: "2026-10-18T13:00:00.000Z", comments: [{ id: "c1", status: "resolved" }] })
    expect(next.sentAt).toBeUndefined()
    expect(formatReviewComments(sendReview(next, { docHash: sent.docHash, comments: next.comments }))).not.toContain("Comment c1")
  })
  it("separates agent addressing from reviewer resolution and reopening", () => {
    const addressed = addressReviewComment(sent, "c1", "Clarified the plan.")
    expect(addressed.status).toBe("sent")
    expect(addressed.comments[0]).toMatchObject({ status: "addressed", reply: "Clarified the plan." })
    expect(sent.comments[0].status).toBe("open")
    expect(parseReviewFile(JSON.stringify(addressed), "PLAN.md")).toEqual(addressed)
    const resolved = setReviewerCommentStatus(addressed, "c1", "resolved")
    expect(resolved.status).toBe("sent")
    expect(resolved.comments[0].status).toBe("resolved")
    expect(() => addressReviewComment(resolved, "c1", "Changed again")).toThrow()
    const reopened = setReviewerCommentStatus(resolved, "c1", "open")
    expect(reopened.status).toBe("pending")
    expect(reopened.comments[0]).toMatchObject({ status: "open", reply: "Clarified the plan." })
  })
  it("lets the reviewer accept sent feedback without an agent acknowledgement", () => {
    expect(setReviewerCommentStatus(sent, "c1", "resolved")).toMatchObject({ status: "sent", comments: [{ status: "resolved" }] })
  })
  it("ends a Review only when the reviewer finishes after resolving every sent comment", () => {
    expect(() => finishReview(addressReviewComment(sent, "c1", "Done"))).toThrow()
    expect(() => finishReview({ ...sent, sentAt: undefined, status: "pending", comments: [{ ...sent.comments[0], status: "resolved" }] })).toThrow()
    const resolved = setReviewerCommentStatus(sent, "c1", "resolved")
    expect(finishReview(resolved)).toMatchObject({ status: "resolved", comments: [{ status: "resolved" }] })
    expect(() => finishReview(finishReview(resolved))).toThrow()
    // Reopening and resolving again leaves a pending request the reviewer can still finish.
    expect(finishReview(setReviewerCommentStatus(setReviewerCommentStatus(resolved, "c1", "open"), "c1", "resolved")).status).toBe("resolved")
  })
  it("waits for another send after addressing and retains comment history", () => {
    const addressed = addressReviewComment(sent, "c1", "Clarified.")
    const next = refreshReviewFile(addressed, "PLAN.md", "2026-10-18T13:00:00Z")
    expect(next.status).toBe("sent")
    expect(next.comments[0]).toMatchObject({ status: "addressed", reply: "Clarified." })
    expect(next.sentAt).toBe(sent.sentAt)
  })
  it("labels addressed comments in the comments command and excludes them from agent work", () => {
    const addressed = addressReviewComment(sent, "c1", "Clarified.")
    expect(formatReviewComments(addressed, true)).toContain("[addressed]")
    expect(formatReviewComments(addressed)).not.toContain("Comment c1")
  })
  it("prints comment IDs, quotes, lines and bodies for the agent", () => {
    const prompt = formatReviewComments(sent)
    expect(prompt).toContain("Got 1 comment")
    expect(prompt).toContain("c1")
    expect(prompt).toContain("line 3")
    expect(prompt).toContain("> Plan\n\nClarify")
    expect(prompt).toContain("Clarify")
  })
})
