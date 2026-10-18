import { describe, expect, it } from "vitest"

import {
  describeDocumentReview,
  describeReviewAge,
  documentReviewEntries,
  getReviewBadgeText,
  getReviewIndexTotal,
  removeReviewIndexEntry,
  resolveReviewIndex,
  sortReviewIndex,
  upsertReviewIndexEntry,
  type ReviewIndexEntry,
} from "./review-index"

function entry(overrides: Partial<ReviewIndexEntry> = {}): ReviewIndexEntry {
  return {
    kind: "localhost",
    key: "http://localhost:4321",
    label: "localhost:4321",
    detail: "/pricing, /about",
    itemCount: 6,
    updatedAt: "2026-09-06T18:00:00.000Z",
    ...overrides,
  }
}

describe("review index", () => {
  it("replaces the entry for a Review rather than duplicating it", () => {
    const entries = upsertReviewIndexEntry([entry()], entry({ itemCount: 7 }))
    expect(entries).toHaveLength(1)
    expect(entries[0].itemCount).toBe(7)
  })

  it("drops an entry once its Review is empty", () => {
    expect(upsertReviewIndexEntry([entry()], entry({ itemCount: 0 }))).toEqual([])
  })

  it("keeps a document and a localhost Review with the same key apart", () => {
    const entries = upsertReviewIndexEntry(
      [entry()],
      entry({ kind: "document", label: "spec.md" }),
    )
    expect(entries).toHaveLength(2)
    expect(removeReviewIndexEntry(entries, "document", "http://localhost:4321")).toHaveLength(1)
  })

  it("lists the most recently updated Review first", () => {
    const older = entry({ key: "a", updatedAt: "2026-09-01T00:00:00.000Z" })
    const newer = entry({ key: "b", updatedAt: "2026-09-06T00:00:00.000Z" })
    expect(sortReviewIndex([older, newer]).map(({ key }) => key)).toEqual(["b", "a"])
  })

  it("hides saved localhost Reviews without discarding document Reviews", () => {
    const document = entry({ kind: "document", key: "file:///notes.md", label: "notes.md" })
    expect(documentReviewEntries([entry(), document])).toEqual([document])
  })

  it("ignores stored entries that are not usable", () => {
    expect(resolveReviewIndex([entry(), { kind: "other" }, null, { kind: "document" }]))
      .toEqual([entry()])
    expect(resolveReviewIndex(undefined)).toEqual([])
    expect(resolveReviewIndex([entry({ itemCount: 0 })])).toEqual([])
  })

  it("totals items across Reviews for the toolbar badge", () => {
    const entries = [entry({ itemCount: 6 }), entry({ key: "b", itemCount: 2 })]
    expect(getReviewIndexTotal(entries)).toBe(8)
    expect(getReviewBadgeText(entries)).toBe("8")
    expect(getReviewBadgeText([])).toBe("")
    expect(getReviewBadgeText([entry({ itemCount: 240 })])).toBe("99+")
  })

  it("names a document Review by filename and its directory", () => {
    expect(describeDocumentReview("/Users/a/Code/markside/docs/product-spec.md")).toEqual({
      label: "product-spec.md",
      detail: "/Users/a/Code/markside/docs",
    })
    expect(describeDocumentReview("notes.md")).toEqual({ label: "notes.md", detail: "" })
  })

  it("describes how long a Review has been waiting", () => {
    const now = Date.parse("2026-09-06T18:00:00.000Z")
    expect(describeReviewAge("2026-09-06T17:59:40.000Z", now)).toBe("just now")
    expect(describeReviewAge("2026-09-06T17:58:00.000Z", now)).toBe("2 min ago")
    expect(describeReviewAge("2026-09-06T15:00:00.000Z", now)).toBe("3 hours ago")
    expect(describeReviewAge("2026-09-05T12:00:00.000Z", now)).toBe("yesterday")
    expect(describeReviewAge("2026-09-01T12:00:00.000Z", now)).toBe("5 days ago")
    expect(describeReviewAge("2026-01-01T12:00:00.000Z", now)).toBe("2026-01-01")
  })
})
