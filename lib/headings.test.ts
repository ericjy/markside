import { describe, expect, it } from "vitest"
import {
  extractHeadings,
  groupHeadings,
  headingIdFromHash,
  resolveActiveOutlineHeading,
} from "./headings"

describe("headingIdFromHash", () => {
  it("decodes percent-encoded heading ids", () => {
    expect(headingIdFromHash("#%E8%AE%BE%E8%AE%A1-markside")).toBe("设计-markside")
  })

  it("keeps a malformed hash as written", () => {
    expect(headingIdFromHash("#100%-done")).toBe("100%-done")
  })
})

describe("resolveActiveOutlineHeading", () => {
  const headings = [
    { id: "intro", top: 120 },
    { id: "setup", top: 360 },
    { id: "usage", top: 720 },
  ]

  it("returns the first heading before the document reaches it", () => {
    expect(resolveActiveOutlineHeading(headings, 80)).toBe("intro")
  })

  it("returns the last heading at or above the reading threshold", () => {
    expect(resolveActiveOutlineHeading(headings, 360)).toBe("setup")
    expect(resolveActiveOutlineHeading(headings, 600)).toBe("setup")
  })

  it("returns null when the document has no headings", () => {
    expect(resolveActiveOutlineHeading([], 80)).toBeNull()
  })
})

describe("groupHeadings", () => {
  it("returns empty array for no headings", () => {
    expect(groupHeadings([])).toEqual([])
  })

  it("nests H2 under its preceding H1 as a subgroup", () => {
    const headings = [
      { id: "a", text: "Alpha", level: 1 },
      { id: "b", text: "Beta", level: 2 }
    ]
    const groups = groupHeadings(headings)
    expect(groups).toHaveLength(1)
    expect(groups[0].title).toBe("Alpha")
    expect(groups[0].level).toBe(1)
    expect(groups[0].subgroups).toHaveLength(1)
    expect(groups[0].subgroups[0].title).toBe("Beta")
    expect(groups[0].subgroups[0].level).toBe(2)
    expect(groups[0].items).toHaveLength(0)
  })

  it("groups H3+ items directly under H1 when no H2 precedes them", () => {
    const headings = [
      { id: "intro", text: "Intro", level: 1 },
      { id: "sub", text: "Sub-section", level: 3 }
    ]
    const groups = groupHeadings(headings)
    expect(groups).toHaveLength(1)
    expect(groups[0].title).toBe("Intro")
    expect(groups[0].id).toBe("intro")
    expect(groups[0].level).toBe(1)
    expect(groups[0].items).toEqual([{ id: "sub", title: "Sub-section", level: 3 }])
    expect(groups[0].subgroups).toHaveLength(0)
  })

  it("groups H3+ items under a standalone H2 (no parent H1)", () => {
    const headings = [
      { id: "sec", text: "Section", level: 2 },
      { id: "detail", text: "Detail", level: 4 }
    ]
    const groups = groupHeadings(headings)
    expect(groups).toHaveLength(1)
    expect(groups[0].title).toBe("Section")
    expect(groups[0].level).toBe(2)
    expect(groups[0].items).toEqual([{ id: "detail", title: "Detail", level: 4 }])
    expect(groups[0].subgroups).toHaveLength(0)
  })

  it("H2 following H1 becomes a subgroup; H3 items nest inside it", () => {
    const headings = [
      { id: "a", text: "A", level: 1 },
      { id: "a1", text: "A.1", level: 3 },
      { id: "b", text: "B", level: 2 },
      { id: "b1", text: "B.1", level: 4 }
    ]
    const groups = groupHeadings(headings)
    expect(groups).toHaveLength(1)
    expect(groups[0].title).toBe("A")
    expect(groups[0].level).toBe(1)
    expect(groups[0].items).toEqual([{ id: "a1", title: "A.1", level: 3 }])
    expect(groups[0].subgroups).toHaveLength(1)
    expect(groups[0].subgroups[0].title).toBe("B")
    expect(groups[0].subgroups[0].items).toEqual([{ id: "b1", title: "B.1", level: 4 }])
  })

  it("assigns H3+ items that appear before any H1/H2 to an anonymous group", () => {
    const headings = [
      { id: "x", text: "X", level: 3 },
      { id: "a", text: "A", level: 1 }
    ]
    const groups = groupHeadings(headings)
    expect(groups[0].id).toBe("")
    expect(groups[0].title).toBe("")
    expect(groups[0].items).toEqual([{ id: "x", title: "X", level: 3 }])
    expect(groups[1].title).toBe("A")
    expect(groups[1].level).toBe(1)
    expect(groups[1].items).toHaveLength(0)
    expect(groups[1].subgroups).toHaveLength(0)
  })

  it("a single H1 with no sub-items is returned as-is", () => {
    const headings = [{ id: "only", text: "Only", level: 1 }]
    const groups = groupHeadings(headings)
    expect(groups).toHaveLength(1)
    expect(groups[0].title).toBe("Only")
    expect(groups[0].level).toBe(1)
    expect(groups[0].items).toHaveLength(0)
    expect(groups[0].subgroups).toHaveLength(0)
  })

  it("multiple H4 items under the same parent all belong to that group", () => {
    const headings = [
      { id: "p", text: "Parent", level: 2 },
      { id: "c1", text: "Child 1", level: 4 },
      { id: "c2", text: "Child 2", level: 4 },
      { id: "c3", text: "Child 3", level: 4 }
    ]
    const groups = groupHeadings(headings)
    expect(groups).toHaveLength(1)
    expect(groups[0].items).toHaveLength(3)
  })
})

describe("extractHeadings", () => {
  it("returns empty array for empty string", () => {
    expect(extractHeadings("")).toEqual([])
  })

  it("extracts a single h1 heading with id and level", () => {
    const headings = extractHeadings("# Hello World")
    expect(headings).toHaveLength(1)
    expect(headings[0].text).toBe("Hello World")
    expect(headings[0].level).toBe(1)
    // id assertion removed — covered by the slug test
  })

  it("extracts headings at levels 1 through 4", () => {
    const headings = extractHeadings("# H1\n\n## H2\n\n### H3\n\n#### H4")
    expect(headings).toHaveLength(4)
    expect(headings.map((h) => h.level)).toEqual([1, 2, 3, 4])
  })

  it("includes inline code content in heading text", () => {
    const headings = extractHeadings("## Use `npm install`")
    expect(headings[0].text).toBe("Use npm install")
  })

  it("ignores paragraphs and other non-heading tokens", () => {
    const headings = extractHeadings("Some paragraph\n\n# Title\n\nMore text\n\n---")
    expect(headings).toHaveLength(1)
    expect(headings[0].text).toBe("Title")
  })

  it("generates slug ids from heading text", () => {
    const headings = extractHeadings("# My Section")
    expect(headings[0].id).toMatch(/^my-section$/)
  })

  it("skips headings with no text content", () => {
    const headings = extractHeadings("# \n\n## Valid")
    expect(headings).toHaveLength(1)
    expect(headings[0].text).toBe("Valid")
  })
})
