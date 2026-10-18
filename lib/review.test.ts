import { describe, expect, it } from "vitest"

import {
  anchorForTextBlock,
  findInnermostCommentAt,
  findReviewHeadingFallback,
  getReviewItemCount,
  resolveImportedCommentAnchor,
  resolveReviewPolicy,
  REVIEW_SELECTION_LIMIT,
  type ActiveReview,
  type ReviewDocument,
} from "./review"

const review: ActiveReview = {
  schemaVersion: 1,
  sourceUrl: "file:///Users/eric/plan.md",
  sourceHash: "same-hash",
  note: "",
  updatedAt: "2026-08-09T12:00:00.000Z",
  comments: [
    {
      id: "comment-1",
      body: "Clarify the consequence.",
      createdAt: "2026-08-09T12:00:00.000Z",
      anchor: {
        exact: "The migration is safe.",
        prefix: "Context before. ",
        suffix: " Context after.",
        start: 16,
        end: 38,
        headingPath: ["Migration"],
      },
    },
  ],
}

const document: ReviewDocument = {
  sourceHash: "same-hash",
  text: "Context before. The migration is safe. Context after.",
  headings: [{ path: ["Migration"], start: 0, end: 53 }],
}

describe("resolveReviewPolicy", () => {
  it("restores an unchanged passage only after its stored position verifies", () => {
    expect(resolveReviewPolicy({ review, document, request: { type: "reattach" } }))
      .toEqual({
        type: "reattach",
        comments: [
          {
            ...review.comments[0],
            status: "anchored",
            range: { start: 16, end: 38 },
            displayNumber: 1,
          },
        ],
      })
  })

  it("reattaches a changed document only when the normalized quote is unique", () => {
    const changedDocument: ReviewDocument = {
      sourceHash: "changed-hash",
      text: "New introduction.\n\nThe migration   is safe.\n\nContext after.",
      headings: [{ path: ["Migration"], start: 0, end: 58 }],
    }

    const result = resolveReviewPolicy({
      review,
      document: changedDocument,
      request: { type: "reattach" },
    })

    expect(result.comments[0]).toMatchObject({
      status: "anchored",
      range: { start: 19, end: 43 },
    })
  })

  it("uses quote context to disambiguate repeated passages", () => {
    const changedDocument: ReviewDocument = {
      sourceHash: "changed-hash",
      text: "Other. The migration is safe. Elsewhere. Context before. The migration is safe. Context after.",
      headings: [{ path: ["Migration"], start: 40, end: 94 }],
    }

    const result = resolveReviewPolicy({
      review,
      document: changedDocument,
      request: { type: "reattach" },
    })

    expect(result.comments[0]).toMatchObject({
      status: "anchored",
      range: { start: 57, end: 79 },
    })
  })

  it("focuses the existing Review Comment for an exact duplicate anchor", () => {
    expect(resolveReviewPolicy({
      review,
      document,
      request: {
        type: "add-comment",
        id: "comment-2",
        body: "Simplify this.",
        createdAt: "2026-08-09T12:01:00.000Z",
        anchor: review.comments[0].anchor,
      },
    })).toEqual({
      type: "add-comment",
      outcome: "duplicate",
      commentId: "comment-1",
    })
  })

  it("exports a complete verified Review as agent-ready Markdown", () => {
    const result = resolveReviewPolicy({
      review: { ...review, note: "Keep the rollout reversible." },
      document,
      request: { type: "export", verification: "verified" },
    })

    expect(result).toEqual({
      type: "export",
      markdown: `Address this review of the source. Make each requested edit, and answer any questions in your response. Leave unmentioned content alone.

Source: \`/Users/eric/plan.md\`

## Overall feedback

Keep the rollout reversible.

## Comment 1

Section: \`Migration\`

Reviewed passage:

> The migration is safe.

Comment:

Clarify the consequence.
`,
    })
  })

  it("blocks Copy Review while the document has an Unsaved Draft", () => {
    expect(resolveReviewPolicy({
      review,
      document,
      request: {
        type: "check-copy",
        draftState: "unsaved",
        diskState: "current",
        allowUnverified: false,
      },
    })).toEqual({
      type: "check-copy",
      outcome: "blocked",
      reason: "unsaved-draft",
    })
  })

  it("exports stored feedback as unverified without reopening the source", () => {
    const result = resolveReviewPolicy({
      review,
      document: { sourceHash: "", text: "", headings: [] },
      request: {
        type: "export",
        verification: "unverified",
        sourceUnavailable: true,
      },
    })

    expect(result.type).toBe("export")
    if (result.type !== "export") return
    expect(result.markdown).toContain("Markside could not verify the current source")
    expect(result.markdown).toContain([
      "## Comment 1",
      "",
      "Section: `Migration`",
      "",
      "Reviewed passage:",
      "",
      "> The migration is safe.",
      "",
      "Comment:",
      "",
      "Clarify the consequence.",
    ].join("\n"))
  })

  it("exports one anchored Review Comment as a focused agent prompt", () => {
    const result = resolveReviewPolicy({
      review: { ...review, note: "Keep the rollout reversible." },
      document,
      request: {
        type: "export",
        verification: "verified",
        commentId: "comment-1",
      },
    })

    expect(result).toEqual({
      type: "export",
      markdown: `Address this review of the source. Make each requested edit, and answer any questions in your response. Leave unmentioned content alone.

Source: \`/Users/eric/plan.md\`

## Overall feedback

Keep the rollout reversible.

## Comment 1

Section: \`Migration\`

Reviewed passage:

> The migration is safe.

Comment:

Clarify the consequence.
`,
    })
  })

  it("exports an Unanchored Review Comment with a comment heading and section context", () => {
    const result = resolveReviewPolicy({
      review: {
        ...review,
        sourceHash: "old-hash",
        comments: [{
          ...review.comments[0],
          anchor: {
            ...review.comments[0].anchor,
            exact: "A passage that was removed.",
          },
        }],
      },
      document,
      request: { type: "export", verification: "verified" },
    })

    expect(result.type).toBe("export")
    if (result.type !== "export") return
    expect(result.markdown).toContain([
      "## Unanchored comment 1",
      "",
      "> Warning: Markside could not locate this passage uniquely in the current document. Verify the reviewed passage against the source before addressing the comment; do not guess its location.",
      "",
      "Section: `Migration`",
      "",
      "Reviewed passage:",
      "",
      "> A passage that was removed.",
      "",
      "Comment:",
      "",
      "Clarify the consequence.",
    ].join("\n"))
  })

  it("numbers mixed anchored and Unanchored Review Comments uniquely", () => {
    const result = resolveReviewPolicy({
      review: {
        ...review,
        sourceHash: "old-hash",
        comments: [
          review.comments[0],
          {
            ...review.comments[0],
            id: "comment-2",
            createdAt: "2026-08-09T12:01:00.000Z",
            anchor: {
              ...review.comments[0].anchor,
              exact: "A passage that was removed.",
            },
          },
        ],
      },
      document,
      request: { type: "export", verification: "verified" },
    })

    expect(result.type).toBe("export")
    if (result.type !== "export") return
    expect(result.markdown).toContain("## Comment 1")
    expect(result.markdown).toContain("## Unanchored comment 2")
  })

  it("warns when exporting one Unanchored Review Comment", () => {
    const result = resolveReviewPolicy({
      review: {
        ...review,
        sourceHash: "old-hash",
        comments: [{
          ...review.comments[0],
          anchor: {
            ...review.comments[0].anchor,
            exact: "A passage that was removed.",
          },
        }],
      },
      document,
      request: {
        type: "export",
        verification: "verified",
        commentId: "comment-1",
      },
    })

    expect(result.type).toBe("export")
    if (result.type !== "export") return
    expect(result.markdown).toContain(
      "> Warning: Markside could not locate this passage uniquely in the current document. Verify the reviewed passage against the source before addressing the comment; do not guess its location.",
    )
  })

  it("selects the shortest anchored Review Comment at an overlap", () => {
    const broadComment = {
      id: "comment-broad",
      body: "Simplify the whole paragraph.",
      createdAt: "2026-08-09T11:59:00.000Z",
      anchor: {
        exact: document.text,
        prefix: "",
        suffix: "",
        start: 0,
        end: document.text.length,
        headingPath: ["Migration"],
      },
    }
    const result = resolveReviewPolicy({
      review: { ...review, comments: [broadComment, ...review.comments] },
      document,
      request: { type: "select-at-offset", offset: 20 },
    })

    expect(result).toEqual({
      type: "select-at-offset",
      commentId: "comment-1",
    })
  })

  it("deduplicates against the current reattached range after a document change", () => {
    const changedDocument: ReviewDocument = {
      sourceHash: "changed-hash",
      text: "New introduction.\n\nThe migration   is safe.\n\nContext after.",
      headings: [{ path: ["Migration"], start: 0, end: 58 }],
    }
    const result = resolveReviewPolicy({
      review,
      document: changedDocument,
      request: {
        type: "add-comment",
        id: "comment-2",
        body: "Simplify this.",
        createdAt: "2026-08-09T12:01:00.000Z",
        anchor: {
          exact: "The migration   is safe.",
          prefix: "New introduction.\n\n",
          suffix: "\n\nContext after.",
          start: 19,
          end: 43,
          headingPath: ["Migration"],
        },
      },
    })

    expect(result).toEqual({
      type: "add-comment",
      outcome: "duplicate",
      commentId: "comment-1",
    })
  })

  it("counts a note-only Review and describes what Clear Review removes", () => {
    const result = resolveReviewPolicy({
      review: { ...review, note: "Keep the tone direct.", comments: [] },
      document,
      request: { type: "summarize" },
    })

    expect(result).toEqual({
      type: "summarize",
      itemCount: 1,
      copyable: true,
      clearDescription: "the Review Note and 0 Review Comments",
    })
  })

  it("accepts partial overlap but rejects selections over 2,000 normalized characters", () => {
    const overlap = resolveReviewPolicy({
      review,
      document,
      request: {
        type: "add-comment",
        id: "comment-overlap",
        body: "Rework this broader phrase.",
        createdAt: "2026-08-09T12:02:00.000Z",
        anchor: {
          exact: document.text.slice(0, 24),
          prefix: "",
          suffix: document.text.slice(24),
          start: 0,
          end: 24,
          headingPath: ["Migration"],
        },
      },
    })
    expect(overlap).toMatchObject({ type: "add-comment", outcome: "added" })

    const tooLong = resolveReviewPolicy({
      review,
      document,
      request: {
        type: "add-comment",
        id: "comment-long",
        body: "Clarify this.",
        createdAt: "2026-08-09T12:03:00.000Z",
        anchor: {
          exact: "x".repeat(2_001),
          prefix: "",
          suffix: "",
          start: 0,
          end: 2_001,
          headingPath: [],
        },
      },
    })
    expect(tooLong).toEqual({
      type: "add-comment",
      outcome: "invalid",
      reason: "too-long",
    })
  })

  it("leaves an ambiguous repeated quote unanchored", () => {
    const repeatedReview: ActiveReview = {
      ...review,
      sourceHash: "old-hash",
      comments: [{
        ...review.comments[0],
        anchor: {
          exact: "Repeat",
          prefix: "",
          suffix: "",
          start: 0,
          end: 6,
          headingPath: ["Examples"],
        },
      }],
    }
    const result = resolveReviewPolicy({
      review: repeatedReview,
      document: {
        sourceHash: "new-hash",
        text: "Repeat, then Repeat.",
        headings: [{ path: ["Examples"], start: 0, end: 20 }],
      },
      request: { type: "reattach" },
    })
    expect(result).toMatchObject({
      type: "reattach",
      comments: [{ status: "unanchored", range: null }],
    })
  })

  it("leaves a comment unanchored when its passage moved and only an unrelated single match remains", () => {
    const editedReview: ActiveReview = {
      ...review,
      sourceHash: "old-hash",
      comments: [{
        ...review.comments[0],
        anchor: {
          exact: "foo",
          prefix: "Alpha section says ",
          suffix: " right here.",
          start: 20,
          end: 23,
          headingPath: ["Alpha"],
        },
      }],
    }
    const editedDocument: ReviewDocument = {
      sourceHash: "new-hash",
      text: "# Alpha\n\nAlpha section talks about bar now.\n\n# Beta\n\nBeta mentions foo unrelated to before.",
      headings: [
        { path: ["Alpha"], start: 0, end: 45 },
        { path: ["Beta"], start: 45, end: 94 },
      ],
    }

    const result = resolveReviewPolicy({
      review: editedReview,
      document: editedDocument,
      request: { type: "reattach" },
    })

    expect(result).toMatchObject({
      type: "reattach",
      comments: [{ status: "unanchored", range: null }],
    })
  })

  it("orders anchored comments by document location and unanchored comments by creation time", () => {
    const result = resolveReviewPolicy({
      review: {
        ...review,
        comments: [
          {
            id: "unanchored-later",
            body: "Remove the missing passage.",
            createdAt: "2026-08-09T12:04:00.000Z",
            anchor: {
              exact: "Missing later",
              prefix: "",
              suffix: "",
              start: 80,
              end: 93,
              headingPath: ["Migration"],
            },
          },
          {
            id: "comment-later",
            body: "Be specific here.",
            createdAt: "2026-08-09T12:02:00.000Z",
            anchor: {
              exact: "Context after.",
              prefix: "The migration is safe. ",
              suffix: "",
              start: 39,
              end: 53,
              headingPath: ["Migration"],
            },
          },
          {
            id: "unanchored-earlier",
            body: "Clarify the missing passage.",
            createdAt: "2026-08-09T12:03:00.000Z",
            anchor: {
              exact: "Missing earlier",
              prefix: "",
              suffix: "",
              start: 60,
              end: 75,
              headingPath: ["Migration"],
            },
          },
          review.comments[0],
        ],
      },
      document,
      request: { type: "reattach" },
    })

    expect(result.type).toBe("reattach")
    if (result.type !== "reattach") return
    expect(result.comments.map((comment) => comment.id)).toEqual([
      "comment-1",
      "comment-later",
      "unanchored-earlier",
      "unanchored-later",
    ])
    expect(result.comments.map((comment) => comment.displayNumber)).toEqual([1, 2, 3, 4])
  })

  it("distinguishes verified, changed, and explicitly unverified copy states", () => {
    const check = (diskState: "current" | "changed" | "failed", allowUnverified: boolean) =>
      resolveReviewPolicy({
        review,
        document,
        request: { type: "check-copy", draftState: "saved", diskState, allowUnverified },
      })

    expect(check("current", false)).toEqual({
      type: "check-copy",
      outcome: "allowed",
      verification: "verified",
    })
    expect(check("changed", true)).toEqual({
      type: "check-copy",
      outcome: "blocked",
      reason: "external-change",
    })
    expect(check("failed", true)).toEqual({
      type: "check-copy",
      outcome: "allowed",
      verification: "unverified",
    })
  })

  it("folds the current note and comments into a Review Round", () => {
    const result = resolveReviewPolicy({
      review: { ...review, note: "Keep the rollout reversible." },
      document,
      request: {
        type: "create-round",
        id: "round-1",
        reviewerName: "  Alex  ",
        createdAt: "2026-08-15T09:00:00.000Z",
      },
    })

    expect(result).toEqual({
      type: "create-round",
      outcome: "created",
      round: {
        id: "round-1",
        reviewerName: "Alex",
        note: "Keep the rollout reversible.",
        comments: review.comments,
        createdAt: "2026-08-15T09:00:00.000Z",
      },
    })
  })

  it("treats a blank reviewer name as anonymous", () => {
    const result = resolveReviewPolicy({
      review,
      document,
      request: {
        type: "create-round",
        id: "round-1",
        reviewerName: "   ",
        createdAt: "2026-08-15T09:00:00.000Z",
      },
    })

    expect(result).toMatchObject({ outcome: "created", round: { reviewerName: null } })
  })

  it("refuses to fold an empty Review into a Round", () => {
    const result = resolveReviewPolicy({
      review: { ...review, note: "", comments: [] },
      document,
      request: {
        type: "create-round",
        id: "round-1",
        reviewerName: null,
        createdAt: "2026-08-15T09:00:00.000Z",
      },
    })

    expect(result).toEqual({ type: "create-round", outcome: "empty" })
  })

  it("imports Review Rounds from a Reviewed Snapshot into the Active Review", () => {
    const incoming = [{
      id: "round-imported",
      reviewerName: "Sam",
      note: "Looks solid overall.",
      comments: [],
      createdAt: "2026-08-16T10:00:00.000Z",
    }]

    const result = resolveReviewPolicy({
      review,
      document,
      request: {
        type: "import-rounds",
        rounds: incoming,
        updatedAt: "2026-08-16T10:05:00.000Z",
      },
    })

    expect(result).toEqual({
      type: "import-rounds",
      outcome: "imported",
      addedCount: 1,
      review: { ...review, importedRounds: incoming, updatedAt: "2026-08-16T10:05:00.000Z" },
    })
  })

  it("reports nothing to import for a Link Snapshot with no Review Rounds", () => {
    const result = resolveReviewPolicy({
      review,
      document,
      request: { type: "import-rounds", rounds: [], updatedAt: "2026-08-16T10:05:00.000Z" },
    })

    expect(result).toEqual({ type: "import-rounds", outcome: "empty" })
  })

  it("counts imported Review Round comments and notes toward the item count", () => {
    const withImports: ActiveReview = {
      ...review,
      note: "",
      comments: [],
      importedRounds: [{
        id: "round-imported",
        reviewerName: "Sam",
        note: "Looks solid overall.",
        comments: [{
          id: "imported-comment",
          body: "Nice catch.",
          createdAt: "2026-08-16T10:00:00.000Z",
          anchor: review.comments[0].anchor,
        }],
        createdAt: "2026-08-16T10:00:00.000Z",
      }],
    }

    expect(getReviewItemCount(withImports)).toBe(2)
  })

  it("allows copying a Review that contains only imported Review Rounds", () => {
    const withImports: ActiveReview = {
      ...review,
      note: "",
      comments: [],
      importedRounds: [{
        id: "round-imported",
        reviewerName: "Sam",
        note: "Looks solid overall.",
        comments: [],
        createdAt: "2026-08-16T10:00:00.000Z",
      }],
    }

    expect(resolveReviewPolicy({
      review: withImports,
      document,
      request: {
        type: "check-copy",
        draftState: "saved",
        diskState: "current",
        allowUnverified: false,
      },
    })).toEqual({
      type: "check-copy",
      outcome: "allowed",
      verification: "verified",
    })
  })

  it("includes imported Review Rounds ahead of the overall feedback when exporting", () => {
    const withImports: ActiveReview = {
      ...review,
      note: "Keep the rollout reversible.",
      importedRounds: [{
        id: "round-imported",
        reviewerName: "Sam",
        note: "Looks solid overall.",
        comments: [{
          id: "imported-comment",
          body: "Nice catch.",
          createdAt: "2026-08-16T10:00:00.000Z",
          anchor: review.comments[0].anchor,
        }],
        createdAt: "2026-08-16T10:00:00.000Z",
      }],
    }

    const result = resolveReviewPolicy({
      review: withImports,
      document,
      request: { type: "export", verification: "verified" },
    })

    expect(result.type).toBe("export")
    if (result.type !== "export") return
    const historySectionIndex = result.markdown.indexOf("## Review History")
    const roundIndex = result.markdown.indexOf("### Review Round 1 — Sam (2026-08-16)")
    const guidanceIndex = result.markdown.indexOf("## Overall feedback")
    expect(historySectionIndex).toBeGreaterThan(-1)
    expect(roundIndex).toBeGreaterThan(historySectionIndex)
    expect(guidanceIndex).toBeGreaterThan(roundIndex)
    expect(result.markdown).toContain("Looks solid overall.")
    expect(result.markdown).toContain("#### Comment 1\n\nSection: `Migration`")
    expect(result.markdown).toContain("Nice catch.")
  })
})

describe("findReviewHeadingFallback", () => {
  const headings = [
    { path: ["Guide"], start: 0, end: 100 },
    { path: ["Guide", "Install"], start: 20, end: 60 },
  ]

  it("returns the deepest unique stored heading", () => {
    expect(findReviewHeadingFallback(headings, ["Guide", "Install"])).toEqual({
      path: ["Guide", "Install"],
      start: 20,
      end: 60,
    })
  })

  it("falls back to a unique stored ancestor", () => {
    expect(findReviewHeadingFallback(headings, ["Guide", "Removed child"])).toEqual({
      path: ["Guide"],
      start: 0,
      end: 100,
    })
  })

  it.each([
    { name: "empty", current: headings, stored: [] },
    { name: "missing", current: headings, stored: ["Missing"] },
    {
      name: "ambiguous",
      current: [
        { path: ["Guide"], start: 0, end: 50 },
        { path: ["Guide"], start: 50, end: 100 },
      ],
      stored: ["Guide"],
    },
  ])("returns null for an $name heading path", ({ current, stored }) => {
    expect(findReviewHeadingFallback(current, stored)).toBeNull()
  })
})

describe("resolveImportedCommentAnchor", () => {
  it("anchors an imported comment whose exact quote is unique in the document", () => {
    expect(resolveImportedCommentAnchor(review.comments[0].anchor, document)).toEqual({
      status: "anchored",
      range: { start: 16, end: 38 },
    })
  })

  it("leaves an imported comment unanchored when its quote can no longer be found", () => {
    const anchor = { ...review.comments[0].anchor, exact: "This text is gone." }
    expect(resolveImportedCommentAnchor(anchor, document)).toEqual({
      status: "unanchored",
      range: null,
    })
  })
})

describe("anchorForTextBlock", () => {
  it("quotes the block with whitespace-collapsed context", () => {
    const text = "Intro\n\nSection heading\n\nBody"
    const start = text.indexOf("Section")
    expect(anchorForTextBlock(text, { start, end: start + 15 }, ["Section heading"])).toEqual({
      exact: "Section heading",
      prefix: "Intro ",
      suffix: " Body",
      start,
      end: start + 15,
      headingPath: ["Section heading"],
    })
  })

  it("stops the quote at the Review selection limit", () => {
    const text = "x".repeat(REVIEW_SELECTION_LIMIT + 50)
    const anchor = anchorForTextBlock(text, { start: 0, end: text.length }, [])
    expect(anchor.end).toBe(REVIEW_SELECTION_LIMIT)
    expect(anchor.exact).toHaveLength(REVIEW_SELECTION_LIMIT)
  })
})

describe("findInnermostCommentAt", () => {
  const comments = [
    { id: "outer", status: "anchored" as const, range: { start: 0, end: 100 } },
    { id: "inner", status: "anchored" as const, range: { start: 10, end: 20 } },
    { id: "lost", status: "unanchored" as const, range: null },
  ]

  it("prefers the narrowest anchored comment under the offset", () => {
    expect(findInnermostCommentAt(comments, 15)).toBe("inner")
    expect(findInnermostCommentAt(comments, 50)).toBe("outer")
  })

  it("includes both range ends", () => {
    expect(findInnermostCommentAt(comments, 10)).toBe("inner")
    expect(findInnermostCommentAt(comments, 20)).toBe("inner")
    expect(findInnermostCommentAt(comments, 100)).toBe("outer")
  })

  it("returns null outside every anchored comment", () => {
    expect(findInnermostCommentAt(comments, 101)).toBeNull()
    expect(findInnermostCommentAt([], 0)).toBeNull()
  })
})
