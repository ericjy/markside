import { describe, expect, it } from "vitest"

import {
  addLocalhostAnnotation,
  createEmptyLocalhostReview,
  formatLocalhostReviewPrompt,
  getLocalhostPageLabel,
  getLocalhostPageUrl,
  getLocalhostReviewItemCount,
  getLocalhostReviewOrigin,
  groupLocalhostAnnotationsByPage,
  removeLocalhostAnnotation,
  resolveStoredLocalhostReview,
  setLocalhostReviewNote,
  updateLocalhostAnnotation,
  type LocalhostReview,
  type LocalhostTarget,
} from "./localhost-review"

function target(overrides: Partial<LocalhostTarget> = {}): LocalhostTarget {
  return {
    kind: "text",
    anchor: {
      exact: "Reduce risk",
      prefix: "Plans that ",
      suffix: " for your team",
      start: 12,
      end: 23,
      headingPath: ["Pricing", "Plans"],
    },
    element: {
      tagName: "button",
      id: null,
      testId: "cta",
      role: null,
      ariaLabel: null,
      name: null,
      classNames: ["cta"],
      ancestorPath: "main > section.pricing > button.cta",
    },
    ...overrides,
  }
}

function reviewWith(...requests: Array<Parameters<typeof addLocalhostAnnotation>[1]>) {
  return requests.reduce((review, request) => {
    const result = addLocalhostAnnotation(review, request)
    if (result.outcome !== "added") throw new Error(`unexpected ${result.outcome}`)
    return result.review
  }, createEmptyLocalhostReview("http://localhost:3000", "2026-01-01T00:00:00.000Z"))
}

const comment = {
  id: "a1",
  kind: "comment" as const,
  body: "This promises too much.",
  url: "http://localhost:3000/pricing",
  createdAt: "2026-01-01T00:01:00.000Z",
  target: target(),
}

describe("localhost review scope", () => {
  it("accepts local development origins including the port", () => {
    expect(getLocalhostReviewOrigin("http://localhost:3000/pricing")).toBe("http://localhost:3000")
    expect(getLocalhostReviewOrigin("http://127.0.0.1:8080/")).toBe("http://127.0.0.1:8080")
    expect(getLocalhostReviewOrigin("https://app.localhost:5173/x")).toBe("https://app.localhost:5173")
  })

  it("rejects deployed sites and non-web schemes", () => {
    expect(getLocalhostReviewOrigin("https://markside.app/")).toBeNull()
    expect(getLocalhostReviewOrigin("file:///Users/a/notes.md")).toBeNull()
    expect(getLocalhostReviewOrigin("chrome://extensions")).toBeNull()
    expect(getLocalhostReviewOrigin("not a url")).toBeNull()
    expect(getLocalhostReviewOrigin("https://localhost.example.com/")).toBeNull()
    // The content script cannot match the IPv6 loopback, so the popup must not offer it.
    expect(getLocalhostReviewOrigin("http://[::1]:3000/")).toBeNull()
  })

  it("treats different ports on the same host as different applications", () => {
    expect(getLocalhostReviewOrigin("http://localhost:3000/")).not.toBe(
      getLocalhostReviewOrigin("http://localhost:4000/"),
    )
  })

  it("identifies a page by path and query but not by fragment", () => {
    expect(getLocalhostPageUrl("http://localhost:3000/pricing?plan=pro#faq")).toBe(
      "http://localhost:3000/pricing?plan=pro",
    )
    expect(getLocalhostPageLabel("http://localhost:3000/pricing?plan=pro")).toBe("/pricing?plan=pro")
  })

  it("keeps the route for the copied prompt", () => {
    expect(getLocalhostPageLabel("http://localhost:3000/")).toBe("/")
    expect(getLocalhostPageLabel("http://localhost:3000/privacy")).toBe("/privacy")
  })
})

describe("adding annotations", () => {
  it("adds a Review Comment", () => {
    const result = addLocalhostAnnotation(createEmptyLocalhostReview("http://localhost:3000"), comment)
    expect(result.outcome).toBe("added")
    if (result.outcome !== "added") return
    expect(result.review.annotations).toHaveLength(1)
    expect(getLocalhostReviewItemCount(result.review)).toBe(1)
  })

  it("rejects an empty comment", () => {
    const result = addLocalhostAnnotation(
      createEmptyLocalhostReview("http://localhost:3000"),
      { ...comment, body: "   " },
    )
    expect(result).toEqual({ outcome: "invalid", reason: "empty" })
  })

  it("rejects a selection beyond the review limit", () => {
    const result = addLocalhostAnnotation(
      createEmptyLocalhostReview("http://localhost:3000"),
      { ...comment, target: target({ anchor: { ...target().anchor, exact: "x".repeat(2_001) } }) },
    )
    expect(result).toEqual({ outcome: "invalid", reason: "too-long" })
  })

  it("records a Text Replacement with the exact requested wording", () => {
    const result = addLocalhostAnnotation(createEmptyLocalhostReview("http://localhost:3000"), {
      id: "r1",
      kind: "replacement",
      replacement: "  Reduce financial risk  ",
      url: "http://localhost:3000/pricing",
      createdAt: "2026-01-01T00:02:00.000Z",
      target: target(),
    })
    expect(result.outcome).toBe("added")
    if (result.outcome !== "added") return
    const [annotation] = result.review.annotations
    expect(annotation.kind === "replacement" && annotation.replacement).toBe("Reduce financial risk")
  })

  it("keeps an empty replacement as a requested deletion", () => {
    const result = addLocalhostAnnotation(createEmptyLocalhostReview("http://localhost:3000"), {
      id: "r1",
      kind: "replacement",
      replacement: "",
      url: "http://localhost:3000/pricing",
      createdAt: "2026-01-01T00:02:00.000Z",
      target: target(),
    })
    expect(result.outcome).toBe("added")
  })

  it("rejects a replacement that matches the original text", () => {
    const result = addLocalhostAnnotation(createEmptyLocalhostReview("http://localhost:3000"), {
      id: "r1",
      kind: "replacement",
      replacement: "Reduce risk",
      url: "http://localhost:3000/pricing",
      createdAt: "2026-01-01T00:02:00.000Z",
      target: target(),
    })
    expect(result).toEqual({ outcome: "invalid", reason: "unchanged" })
  })

  it("rejects a replacement on an element with no text", () => {
    const result = addLocalhostAnnotation(createEmptyLocalhostReview("http://localhost:3000"), {
      id: "r1",
      kind: "replacement",
      replacement: "Save",
      url: "http://localhost:3000/pricing",
      createdAt: "2026-01-01T00:02:00.000Z",
      target: target({
        kind: "element",
        anchor: { exact: "", prefix: "", suffix: "", start: 0, end: 0, headingPath: [] },
      }),
    })
    expect(result).toEqual({ outcome: "invalid", reason: "no-text" })
  })

  it("reports a duplicate for the same target on the same page", () => {
    const review = reviewWith(comment)
    const result = addLocalhostAnnotation(review, { ...comment, id: "a2", body: "Again" })
    expect(result).toEqual({ outcome: "duplicate", annotationId: "a1" })
  })

  it("treats the same target on another page as a separate annotation", () => {
    const review = reviewWith(comment)
    const result = addLocalhostAnnotation(review, {
      ...comment,
      id: "a2",
      url: "http://localhost:3000/about",
    })
    expect(result.outcome).toBe("added")
  })

  it("treats a comment and a replacement on one target as separate annotations", () => {
    const review = reviewWith(comment)
    const result = addLocalhostAnnotation(review, {
      id: "r1",
      kind: "replacement",
      replacement: "Reduce financial risk",
      url: comment.url,
      createdAt: comment.createdAt,
      target: target(),
    })
    expect(result.outcome).toBe("added")
  })
})

describe("editing a Review", () => {
  it("updates and removes annotations", () => {
    const review = reviewWith(comment)
    const edited = updateLocalhostAnnotation(review, "a1", "Softer claim", "2026-01-02T00:00:00.000Z")
    expect(edited.annotations[0].kind === "comment" && edited.annotations[0].body).toBe("Softer claim")
    expect(edited.updatedAt).toBe("2026-01-02T00:00:00.000Z")
    expect(removeLocalhostAnnotation(edited, "a1").annotations).toHaveLength(0)
  })

  it("counts the Review Note as one item", () => {
    const review = setLocalhostReviewNote(createEmptyLocalhostReview("http://localhost:3000"), "Tone down")
    expect(getLocalhostReviewItemCount(review)).toBe(1)
    expect(getLocalhostReviewItemCount(setLocalhostReviewNote(review, "  "))).toBe(0)
  })
})

describe("stored reviews", () => {
  it("restores a stored Review and rejects unknown shapes", () => {
    const review = reviewWith(comment)
    expect(resolveStoredLocalhostReview(JSON.parse(JSON.stringify(review)), review.origin))
      .toEqual(review)
    expect(resolveStoredLocalhostReview({ schemaVersion: 99 }, "http://localhost:3000")).toBeNull()
    expect(resolveStoredLocalhostReview(undefined, "http://localhost:3000")).toBeNull()
  })
})

describe("grouping and export", () => {
  const multiPage: LocalhostReview = reviewWith(
    comment,
    { ...comment, id: "a2", url: "http://localhost:3000/about", body: "Wrong team count." },
    {
      ...comment,
      id: "a3",
      url: "http://localhost:3000/pricing#faq",
      body: "Missing an answer.",
      target: target({ anchor: { ...target().anchor, exact: "Common questions" } }),
    },
  )

  it("groups annotations by page, ignoring the fragment", () => {
    const pages = groupLocalhostAnnotationsByPage(multiPage.annotations)
    expect(pages.map((page) => page.label)).toEqual(["/pricing", "/about"])
    expect(pages[0].annotations).toHaveLength(2)
  })

  it("copies one prompt covering every page in the Review", () => {
    const prompt = formatLocalhostReviewPrompt(setLocalhostReviewNote(multiPage, "Keep it plain."))
    expect(prompt).not.toContain("Served at:")
    expect(prompt).toContain("## Overall feedback\n\nKeep it plain.")
    expect(prompt).toContain("## Page `http://localhost:3000/pricing`")
    expect(prompt).toContain("## Page `http://localhost:3000/about`")
    expect(prompt).toContain("### Comment 1")
    expect(prompt).toContain("### Comment 3")
    expect(prompt).toContain("Element: `main > section.pricing > button.cta`")
    expect(prompt).toContain("Nearby text:\n\n> ...Plans that [reviewed content] for your team...")
    expect(prompt).toContain("> Reduce risk")
  })

  it("copies one item on its own, with the overall feedback that frames it", () => {
    const prompt = formatLocalhostReviewPrompt(
      setLocalhostReviewNote(multiPage, "Keep it plain."),
      { annotationId: "a2" },
    )
    expect(prompt).toContain("## Overall feedback\n\nKeep it plain.")
    expect(prompt).toContain("## Page `http://localhost:3000/about`")
    expect(prompt).toContain("Wrong team count.")
    expect(prompt).not.toContain("This promises too much.")
    expect(prompt).not.toContain("## Page `http://localhost:3000/pricing`")
    expect(prompt).toContain("### Comment 1")
  })

  it("names the origin when nothing is anchored to a page", () => {
    const noteOnly = setLocalhostReviewNote(
      createEmptyLocalhostReview("http://localhost:3000"),
      "The whole thing reads as too dense.",
    )
    expect(formatLocalhostReviewPrompt(noteOnly)).toContain("Served at: `http://localhost:3000`")
  })

  it("labels replacements and deletions", () => {
    const review = reviewWith(
      {
        id: "r1",
        kind: "replacement",
        replacement: "Reduce financial risk",
        url: "http://localhost:3000/pricing",
        createdAt: "2026-01-01T00:02:00.000Z",
        target: target(),
      },
      {
        id: "r2",
        kind: "replacement",
        replacement: "",
        url: "http://localhost:3000/pricing",
        createdAt: "2026-01-01T00:03:00.000Z",
        target: target({ anchor: { ...target().anchor, exact: "Limited time only" } }),
      },
    )
    const prompt = formatLocalhostReviewPrompt(review)
    expect(prompt).toContain("### Text replacement 1")
    expect(prompt).toContain("Replace:\n\n> Reduce risk\n\nWith:\n\n> Reduce financial risk")
    expect(prompt).toContain("### Deletion 2")
    expect(prompt).toContain("Delete:\n\n> Limited time only")
  })

  it("warns about annotations whose target was not found, and describes them in full", () => {
    const prompt = formatLocalhostReviewPrompt(multiPage, { missingTargetIds: new Set(["a2"]) })
    const sections = prompt.split("### ")
    const found = sections.find((section) => section.startsWith("Comment 1"))
    const missing = sections.find((section) => section.startsWith("Comment 3"))
    expect(found).not.toContain("Warning")
    expect(found).not.toContain("Section:")
    expect(missing).toContain("could not locate this content")
    expect(missing).toContain("Section: `Pricing > Plans`")
  })

  it("describes an element target without reviewed text", () => {
    const review = reviewWith({
      ...comment,
      id: "e1",
      body: "This icon is unclear.",
      target: target({
        kind: "element",
        anchor: { exact: "", prefix: "", suffix: "", start: 0, end: 0, headingPath: [] },
        element: {
          tagName: "button",
          id: "close",
          testId: null,
          role: "button",
          ariaLabel: "Close",
          name: null,
          classNames: [],
          ancestorPath: "body > dialog > button#close",
        },
      }),
    })
    const prompt = formatLocalhostReviewPrompt(review)
    expect(prompt).toContain(
      'Element: `body > dialog > button#close` (role "button", aria-label "Close")',
    )
    expect(prompt).not.toContain("Reviewed content:")
  })
})
