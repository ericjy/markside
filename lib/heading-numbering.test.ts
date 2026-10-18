// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { applyHeadingNumbers, headingNumbers } from "./heading-numbering"
import { buildRenderedTextIndex } from "./review-dom"

const headings = (levels: number[]) => levels.map((level, index) => ({ id: `h${index}`, text: `Heading ${index}`, level }))

describe("heading numbering", () => {
  it("omits a sole opening H1 and resets subsection counters", () => {
    expect(headingNumbers(headings([1, 2, 3, 3, 2, 3]))).toEqual(["", "1", "1.1", "1.2", "2", "2.1"])
  })
  it("numbers multiple H1s and compresses skipped levels without zeros", () => {
    expect(headingNumbers(headings([1, 3, 1, 2, 6]))).toEqual(["1", "1.1", "2", "2.1", "2.1.1"])
    expect(headingNumbers(headings([3, 4, 2, 3]))).toEqual(["1", "1.1", "2", "2.1"])
    expect(headingNumbers([])).toEqual([])
  })
  it("preserves manually numbered documents but allows years in titles", () => {
    for (const text of ["1. Intro", "1) Intro", "1.2 Intro", "1.2. Intro"]) {
      expect(headingNumbers([{ id: "a", level: 2, text }, ...headings([2])])).toEqual(["", ""])
    }
    expect(headingNumbers([{ id: "a", level: 2, text: "2026 roadmap" }])).toEqual(["1"])
  })
  it("toggles labels without changing rendered text, review anchors, or heading links", () => {
    const root = document.createElement("div")
    root.innerHTML = '<h1 id="title">Title</h1><h2 id="intro">Intro<a class="header-anchor" href="#intro"></a></h2><p>Hello</p><h6 id="detail">Detail</h6>'
    const before = buildRenderedTextIndex(root)
    applyHeadingNumbers(root, true)
    expect(root.querySelector("h2")?.getAttribute("data-heading-number")).toBe("1")
    expect(root.querySelector("h6")?.getAttribute("data-heading-number")).toBe("1.1")
    expect(buildRenderedTextIndex(root)).toEqual(before)
    expect(root.querySelector("a")?.getAttribute("href")).toBe("#intro")
    applyHeadingNumbers(root, false)
    expect(root.querySelector("[data-heading-number]")).toBeNull()
    expect(buildRenderedTextIndex(root)).toEqual(before)
  })
})
