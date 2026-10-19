import { describe, expect, it } from "vitest"
import { type AgentReviewFile, parseReviewFile, refreshReviewFile, formatReviewComments, addressReviewComment, setReviewerCommentStatus } from "../cli/review-file.mjs"

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
    expect(refreshReviewFile(sent, "PLAN.md")).toEqual(sent)
  })
  it("starts a fresh request after resolution", () => {
    const next = refreshReviewFile({ ...sent, status: "resolved", comments: sent.comments.map((comment) => ({ ...comment, status: "resolved" })) }, "PLAN.md", "2026-10-18T13:00:00.000Z")
    expect(next.status).toBe("pending")
    expect(next.comments[0].status).toBe("resolved")
    expect(next.sentAt).toBeUndefined()
  })
  it("separates agent addressing from reviewer resolution and reopening", () => {
    const addressed = addressReviewComment(sent, "c1", "Clarified the plan.")
    expect(addressed.status).toBe("sent")
    expect(addressed.comments[0]).toMatchObject({ status: "addressed", reply: "Clarified the plan." })
    expect(sent.comments[0].status).toBe("open")
    expect(parseReviewFile(JSON.stringify(addressed), "PLAN.md")).toEqual(addressed)
    const resolved = setReviewerCommentStatus(addressed, "c1", "resolved")
    expect(resolved.status).toBe("resolved")
    expect(resolved.comments[0].status).toBe("resolved")
    expect(() => addressReviewComment(resolved, "c1", "Changed again")).toThrow()
    const reopened = setReviewerCommentStatus(resolved, "c1", "open")
    expect(reopened.status).toBe("pending")
    expect(reopened.comments[0]).toMatchObject({ status: "open", reply: "Clarified the plan." })
  })
  it("does not allow resolution before the agent addresses a comment", () => {
    expect(() => setReviewerCommentStatus(sent, "c1", "resolved")).toThrow()
  })
  it("waits for another send after addressing and retains comment history", () => {
    const addressed = addressReviewComment(sent, "c1", "Clarified.")
    const next = refreshReviewFile(addressed, "PLAN.md", "2026-10-18T13:00:00Z")
    expect(next.status).toBe("pending")
    expect(next.comments[0]).toMatchObject({ status: "addressed", reply: "Clarified." })
    expect(next.sentAt).toBeUndefined()
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
    expect(prompt).toContain("> Plan")
    expect(prompt).toContain("Clarify")
  })
})
