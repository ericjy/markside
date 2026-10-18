// @vitest-environment jsdom

import { describe, expect, it } from "vitest"

import { createRenderedClipboardPayload } from "./rendered-copy"

describe("createRenderedClipboardPayload", () => {
  it("copies rendered content without Markside controls or internal metadata", () => {
    const root = document.createElement("div")
    root.innerHTML = `
      <h1 data-source-line="1"><span class="readability-heading-label">Title<a class="header-anchor" href="#title">#</a></span><span data-readability-ui><button>Check readability</button></span></h1>
      <h1 class="pdf-export-title">Generated print title</h1>
      <p data-wikilink="Guide">Rendered <strong>content</strong>.</p>
      <div class="code-block">
        <div class="code-block-header"><span>TypeScript</span><button>Copy</button></div>
        <pre data-source-line="4"><code>const ready = true</code></pre>
      </div>
    `

    const payload = createRenderedClipboardPayload(root)

    expect(payload.html).toContain("<strong>content</strong>")
    expect(payload.html).toContain("const ready = true")
    expect(payload.html).not.toContain("header-anchor")
    expect(payload.html).not.toContain("readability-heading-label")
    expect(payload.html).not.toContain("data-readability-ui")
    expect(payload.html).not.toContain("code-block-header")
    expect(payload.html).not.toContain("Generated print title")
    expect(payload.html).not.toContain("data-source-line")
    expect(payload.html).not.toContain("data-wikilink")
    expect(payload.text).toContain("Rendered content.")
    expect(payload.text).toContain("const ready = true")
    expect(payload.text).not.toContain("TypeScript")
    expect(payload.text).not.toContain("Copy")
    expect(payload.text).not.toContain("Check readability")
  })
})
