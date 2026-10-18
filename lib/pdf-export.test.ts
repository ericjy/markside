import { describe, expect, it } from "vitest"

import { canExportPdf, resolvePdfExportTitle } from "./pdf-export"

describe("PDF Export policy", () => {
  it("is available only for Markdown files", () => {
    expect(canExportPdf("file:///Users/eric/docs/notes.md")).toBe(true)
    expect(canExportPdf("file:///Users/eric/docs/notes.txt")).toBe(false)
  })

  it("uses the first H1 before frontmatter or filename", () => {
    expect(resolvePdfExportTitle(
      "---\ntitle: Frontmatter title\n---\n# Document title\n\nBody",
      "release-notes.md",
    )).toBe("Document title")
  })

  it("recognizes valid setext and indented ATX H1s", () => {
    expect(resolvePdfExportTitle(
      "---\ntitle: Frontmatter title\n---\nDocument title\n==============\n\nBody",
      "release-notes.md",
    )).toBe("Document title")

    expect(resolvePdfExportTitle(
      "   # Indented title\n\nBody",
      "release-notes.md",
    )).toBe("Indented title")
  })

  it("uses frontmatter title when the document has no H1", () => {
    expect(resolvePdfExportTitle(
      "---\ntitle: Frontmatter title\n---\n\nBody",
      "release-notes.md",
    )).toBe("Frontmatter title")
  })

  it("humanizes the filename as a final fallback", () => {
    expect(resolvePdfExportTitle("Body", "release-notes_v2.md"))
      .toBe("Release Notes V2")
  })
})
