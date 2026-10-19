import { describe, expect, it } from "vitest"
import { type AgentReviewFile, parseReviewFile, refreshReviewFile, formatReviewComments } from "../cli/review-file.mjs"

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
    expect(next.comments).toEqual([])
    expect(next.sentAt).toBeUndefined()
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
