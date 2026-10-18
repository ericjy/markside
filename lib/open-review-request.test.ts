import { describe, expect, it } from "vitest"

import { OPEN_REVIEW_REQUEST_TTL_MS, shouldOpenReview } from "./open-review-request"

const url = "file:///Users/eric/Code/markside/docs/spec.md"
const now = 1_757_190_000_000

describe("open review requests", () => {
  it("opens the Review for the requested page", () => {
    expect(shouldOpenReview({ url, requestedAt: now - 500 }, url, now)).toBe(true)
  })

  it("ignores a request meant for another page", () => {
    expect(shouldOpenReview({ url, requestedAt: now }, "file:///other.md", now)).toBe(false)
  })

  it("ignores a stale request so a later page load does not pop the Review open", () => {
    expect(shouldOpenReview(
      { url, requestedAt: now - OPEN_REVIEW_REQUEST_TTL_MS - 1 },
      url,
      now,
    )).toBe(false)
  })

  it("ignores anything that is not a request", () => {
    expect(shouldOpenReview(undefined, url, now)).toBe(false)
    expect(shouldOpenReview({ url }, url, now)).toBe(false)
    expect(shouldOpenReview({ url, requestedAt: "soon" }, url, now)).toBe(false)
  })
})
