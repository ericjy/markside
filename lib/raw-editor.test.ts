// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest"

import * as codeMirror from "./codemirror-bundle.mjs"

describe("raw editor highlighting", () => {
  let view: InstanceType<typeof codeMirror.EditorView> | null = null

  afterEach(() => {
    view?.destroy()
    view = null
    document.body.replaceChildren()
    document.querySelector("style[data-competing-token-style]")?.remove()
  })

  function renderMarkdown(doc: string) {
    const parent = document.createElement("div")
    document.body.append(parent)
    const inlineCodeHighlighting = codeMirror.inlineCodeHighlighting ?? []
    const defaultHighlighting = codeMirror.defaultHighlighting ?? []
    const headingHighlighting = codeMirror.headingHighlighting ?? []
    const headingTheme = codeMirror.headingTheme ?? []
    view = new codeMirror.EditorView({
      state: codeMirror.EditorState.create({
        doc,
        extensions: [
          codeMirror.basicSetup,
          codeMirror.markdown(),
          headingTheme,
          defaultHighlighting,
          inlineCodeHighlighting,
          headingHighlighting,
        ],
      }),
      parent,
    })
    return parent
  }

  it("gives inline Markdown code a distinct color", () => {
    const parent = renderMarkdown("Read `docs/PRODUCT.md` first")

    const line = parent.querySelector<HTMLElement>(".cm-line")
    const code = [...parent.querySelectorAll<HTMLElement>(".cm-line span")]
      .find((element) => element.textContent === "docs/PRODUCT.md")

    expect(code).toBeDefined()
    expect(getComputedStyle(code!).color).not.toBe(getComputedStyle(line!).color)
  })

  it.each([
    ["## Start here", "Start here"],
    ["Use **strong text** here", "strong text"],
  ])("renders Markdown emphasis in bold: %s", (markdown, text) => {
    const parent = renderMarkdown(markdown)
    const emphasized = [...parent.querySelectorAll<HTMLElement>(".cm-line span")]
      .find((element) => element.textContent?.includes(text))

    expect(emphasized).toBeDefined()
    expect(getComputedStyle(emphasized!).fontWeight).toBe("bold")
    if (markdown.startsWith("#")) {
      const competingTokenStyle = document.createElement("style")
      competingTokenStyle.dataset.competingTokenStyle = ""
      competingTokenStyle.textContent = ".cm-editor .cm-markdown-mark { color: #404740; }"
      document.head.append(competingTokenStyle)
      const line = parent.querySelector<HTMLElement>(".cm-line")
      expect(getComputedStyle(emphasized!).color).not.toBe(getComputedStyle(line!).color)
      const marker = [...parent.querySelectorAll<HTMLElement>(".cm-line span")]
        .find((element) => element.textContent === "##")
      expect(marker).toBeDefined()
      expect(getComputedStyle(marker!).color).toBe(getComputedStyle(emphasized!).color)
    }
  })
})
