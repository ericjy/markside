import { describe, expect, it } from "vitest"

import { createMarkdownEdit } from "./markdown-toolbar"

describe("Markdown toolbar edits", () => {
  it.each([
    ["heading-1", "# "],
    ["heading-2", "## "],
    ["heading-3", "### "],
  ] as const)("inserts the requested heading level: %s", (action, prefix) => {
    expect(createMarkdownEdit(action, "Title", "", "").insert).toBe(`${prefix}Title`)
  })

  it("wraps selected text and keeps the text selected", () => {
    expect(createMarkdownEdit("bold", "important", "", "")).toEqual({
      insert: "**important**",
      selectionFrom: 2,
      selectionTo: 11,
    })
  })

  it("selects the URL when linking selected text", () => {
    expect(createMarkdownEdit("link", "Markside", "", "")).toEqual({
      insert: "[Markside](https://)",
      selectionFrom: 11,
      selectionTo: 19,
    })
  })

  it("prefixes every selected line in a task list", () => {
    expect(createMarkdownEdit("task-list", "First\nSecond", "", "")).toEqual({
      insert: "- [ ] First\n- [ ] Second",
      selectionFrom: 6,
      selectionTo: 24,
    })
  })

  it("puts a table on its own block between surrounding text", () => {
    const edit = createMarkdownEdit("table", "", "Before", "After")

    expect(edit.insert).toBe(
      "\n\n| Column 1 | Column 2 | Column 3 |\n| --- | --- | --- |\n| Cell | Cell | Cell |\n\n",
    )
    expect(edit.insert.slice(edit.selectionFrom, edit.selectionTo)).toBe("Column 1")
  })

  it("wraps selected text in strikethrough markers", () => {
    expect(createMarkdownEdit("strikethrough", "obsolete", "", "")).toEqual({
      insert: "~~obsolete~~",
      selectionFrom: 2,
      selectionTo: 10,
    })
  })

  it("puts selected code in a fenced block", () => {
    const edit = createMarkdownEdit("fenced-code", "const ready = true", "Before", "After")

    expect(edit.insert).toBe("\n\n```\nconst ready = true\n```\n\n")
    expect(edit.insert.slice(edit.selectionFrom, edit.selectionTo)).toBe("const ready = true")
  })

  it("uses selected text as image alt text and selects the URL", () => {
    const edit = createMarkdownEdit("image", "Screenshot", "", "")

    expect(edit.insert).toBe("![Screenshot](image-url)")
    expect(edit.insert.slice(edit.selectionFrom, edit.selectionTo)).toBe("image-url")
  })

  it("puts a horizontal rule on its own block", () => {
    expect(createMarkdownEdit("horizontal-rule", "", "Before", "After").insert)
      .toBe("\n\n---\n\n")
  })

  it("creates an inline footnote and selects its text", () => {
    const edit = createMarkdownEdit("footnote", "", "", "")

    expect(edit.insert).toBe("^[Footnote text]")
    expect(edit.insert.slice(edit.selectionFrom, edit.selectionTo)).toBe("Footnote text")
  })

  it.each([
    ["alert-note", "NOTE"],
    ["alert-tip", "TIP"],
    ["alert-important", "IMPORTANT"],
    ["alert-warning", "WARNING"],
    ["alert-caution", "CAUTION"],
  ] as const)("inserts a GitHub %s block", (action, marker) => {
    const edit = createMarkdownEdit(action, "", "", "")

    expect(edit.insert).toBe(`> [!${marker}]\n> Alert text`)
    expect(edit.insert.slice(edit.selectionFrom, edit.selectionTo)).toBe("Alert text")
  })

  it("prefixes each selected line inside a GitHub alert block", () => {
    const edit = createMarkdownEdit("alert-warning", "First\nSecond", "Before", "After")

    expect(edit.insert).toBe("\n\n> [!WARNING]\n> First\n> Second\n\n")
  })
})
