// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest"

import * as codeMirror from "./codemirror-bundle.mjs"
import {
  clearRevealedEditorLine,
  handleMarkdownHeadingShortcut,
  markdownFormattingKeymap,
  revealEditorLine,
  revealedEditorLineExtension,
  shiftMarkdownHeadings,
} from "./markdown-shortcuts"

describe("Markdown formatting shortcuts", () => {
  let view: InstanceType<typeof codeMirror.EditorView> | null = null

  afterEach(() => {
    view?.destroy()
    view = null
    document.body.replaceChildren()
  })

  it("binds Mod-b to bold the selected text", () => {
    const parent = document.createElement("div")
    document.body.append(parent)
    view = new codeMirror.EditorView({
      state: codeMirror.EditorState.create({
        doc: "important",
        selection: { anchor: 0, head: 9 },
      }),
      parent,
    })

    const bold = markdownFormattingKeymap.find(({ key }) => key === "Mod-b")

    expect(bold?.run?.(view)).toBe(true)
    expect(view.state.doc.toString()).toBe("**important**")
    expect(view.state.sliceDoc(
      view.state.selection.main.from,
      view.state.selection.main.to,
    )).toBe("important")
  })

  it("inserts and selects a bold placeholder without a selection", () => {
    const parent = document.createElement("div")
    document.body.append(parent)
    view = new codeMirror.EditorView({ parent })

    const bold = markdownFormattingKeymap.find(({ key }) => key === "Mod-b")
    bold?.run?.(view)

    expect(view.state.doc.toString()).toBe("**bold text**")
    expect(view.state.sliceDoc(
      view.state.selection.main.from,
      view.state.selection.main.to,
    )).toBe("bold text")
  })

  it.each([
    ["Digit1", "¡", "# Section"],
    ["Digit2", "™", "## Section"],
    ["Digit3", "£", "### Section"],
    ["Digit4", "¢", "#### Section"],
  ])("handles macOS %s even when Option produces %s", (code, key, expected) => {
    const parent = document.createElement("div")
    document.body.append(parent)
    view = new codeMirror.EditorView({
      state: codeMirror.EditorState.create({
        doc: "#### Section",
        selection: { anchor: 4 },
      }),
      parent,
    })

    const event = new KeyboardEvent("keydown", {
      key,
      code,
      metaKey: true,
      altKey: true,
      bubbles: true,
      cancelable: true,
    })
    expect(handleMarkdownHeadingShortcut(event, view)).toBe(true)

    expect(event.defaultPrevented).toBe(true)
    expect(view.state.doc.toString()).toBe(expected)
  })

  it("demotes every heading in the document without moving H6 past its boundary", () => {
    const parent = document.createElement("div")
    document.body.append(parent)
    view = new codeMirror.EditorView({
      state: codeMirror.EditorState.create({
        doc: "# Title\n\n## Section\n\n###### Detail\n\nParagraph",
      }),
      parent,
    })

    expect(shiftMarkdownHeadings(view, "demote")).toBe(true)
    expect(view.state.doc.toString()).toBe(
      "## Title\n\n### Section\n\n###### Detail\n\nParagraph",
    )
  })

  it("promotes every heading in the document without moving H1 past its boundary", () => {
    const parent = document.createElement("div")
    document.body.append(parent)
    view = new codeMirror.EditorView({
      state: codeMirror.EditorState.create({
        doc: "# Title\n\n## Section\n\n###### Detail\n\nParagraph",
      }),
      parent,
    })

    expect(shiftMarkdownHeadings(view, "promote")).toBe(true)
    expect(view.state.doc.toString()).toBe(
      "# Title\n\n# Section\n\n##### Detail\n\nParagraph",
    )
  })

  it("shifts only headings in the selected lines when text is selected", () => {
    const parent = document.createElement("div")
    document.body.append(parent)
    const doc = "# Before\n\n## Selected\n\n### After"
    view = new codeMirror.EditorView({
      state: codeMirror.EditorState.create({
        doc,
        selection: { anchor: 10, head: 21 },
      }),
      parent,
    })

    expect(shiftMarkdownHeadings(view, "demote")).toBe(true)
    expect(view.state.doc.toString()).toBe(
      "# Before\n\n### Selected\n\n### After",
    )
  })

  it("leaves heading-like lines inside fenced code blocks unchanged", () => {
    const parent = document.createElement("div")
    document.body.append(parent)
    view = new codeMirror.EditorView({
      state: codeMirror.EditorState.create({
        doc: [
          "# Title",
          "",
          "```md",
          "# Backtick example",
          "```",
          "",
          "~~~markdown",
          "## Tilde example",
          "~~~",
          "",
          "## Section",
        ].join("\n"),
      }),
      parent,
    })

    expect(shiftMarkdownHeadings(view, "demote")).toBe(true)
    expect(view.state.doc.toString()).toBe([
      "## Title",
      "",
      "```md",
      "# Backtick example",
      "```",
      "",
      "~~~markdown",
      "## Tilde example",
      "~~~",
      "",
      "### Section",
    ].join("\n"))
  })

  it("undoes a document-wide heading shift in one step", () => {
    const parent = document.createElement("div")
    document.body.append(parent)
    view = new codeMirror.EditorView({
      state: codeMirror.EditorState.create({
        doc: "# Title\n\n## Section",
        extensions: [codeMirror.basicSetup],
      }),
      parent,
    })

    shiftMarkdownHeadings(view, "demote")
    const undoEvent = new KeyboardEvent("keydown", {
      key: "z",
      code: "KeyZ",
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    })
    view.contentDOM.dispatchEvent(undoEvent)

    expect(undoEvent.defaultPrevented).toBe(true)
    expect(view.state.doc.toString()).toBe("# Title\n\n## Section")
  })

})

describe("revealEditorLine", () => {
  let view: InstanceType<typeof codeMirror.EditorView> | null = null

  afterEach(() => {
    view?.destroy()
    view = null
    document.body.replaceChildren()
  })

  it("moves the cursor to the start of the requested line", () => {
    const parent = document.createElement("div")
    document.body.append(parent)
    view = new codeMirror.EditorView({
      state: codeMirror.EditorState.create({
        doc: "First line\nSecond line\nThird line",
        extensions: [revealedEditorLineExtension],
      }),
      parent,
    })

    revealEditorLine(view, 2)

    expect(view.state.selection.main.head).toBe(view.state.doc.line(2).from)
    expect(view.state.selection.main.anchor).toBe(view.state.doc.line(2).from)
    expect(parent.querySelector(".cm-revealed-line")?.textContent).toBe("Second line")

    clearRevealedEditorLine(view)
    expect(parent.querySelector(".cm-revealed-line")).toBeNull()
  })

  it("clamps line numbers past the end of the document", () => {
    const parent = document.createElement("div")
    document.body.append(parent)
    view = new codeMirror.EditorView({
      state: codeMirror.EditorState.create({
        doc: "Only line",
      }),
      parent,
    })

    revealEditorLine(view, 99)

    expect(view.state.selection.main.head).toBe(view.state.doc.line(1).from)
  })
})
