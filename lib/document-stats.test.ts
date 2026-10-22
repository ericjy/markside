import { describe, expect, it } from "vitest"

import { formatDocumentStats } from "./document-stats"

describe("document statistics", () => {
  it.each(["", " \n\t\r\n "])("shows zero for empty or whitespace-only source", (source) => {
    expect(formatDocumentStats(source)).toBe("0 words · 0 min read")
  })

  it("uses a singular label for one word", () => {
    expect(formatDocumentStats("hello")).toBe("1 word · <1 min read")
  })

  it("counts raw Markdown chunks across whitespace, including syntax and metadata", () => {
    const source = "---\ntitle: Test\n---\n# Heading\n\n```js\nconst x = 1\n```\n[link](https://example.com)\t你好\u00a0world"
    expect(formatDocumentStats(source)).toBe("15 words · <1 min read")
  })

  it.each([
    [199, "199 words · <1 min read"],
    [200, "200 words · 1 min read"],
    [201, "201 words · 2 min read"],
    [400, "400 words · 2 min read"],
    [401, "401 words · 3 min read"],
    [1240, "1,240 words · 7 min read"],
  ])("formats the estimate for %i words", (words, expected) => {
    expect(formatDocumentStats(Array(words).fill("word").join(" "))).toBe(expected)
  })
})
