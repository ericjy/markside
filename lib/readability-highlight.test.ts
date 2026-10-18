// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest"

import { findSentenceRange, plainSentenceText, sectionElements } from "./readability-highlight"

describe("readability highlight", () => {
  let root: HTMLElement
  afterEach(() => root?.remove())

  function render(html: string) {
    root = document.createElement("div")
    root.innerHTML = html
    document.body.append(root)
    return root
  }

  it("collects the blocks under a heading up to the next heading of the same or higher level", () => {
    render("<h1>Doc</h1><p>Intro.</p><h2>A</h2><p>One.</p><h3>A1</h3><p>Nested.</p><h2>B</h2><p>Two.</p>")
    const a = root.querySelector("h2") as HTMLElement
    expect(sectionElements(a).map((element) => element.textContent)).toEqual(["One.", "A1", "Nested."])
    expect(sectionElements(root.querySelector("h1") as HTMLElement).length).toBe(7)
  })

  it("renders Markdown to the text a reader sees", () => {
    expect(plainSentenceText("The **Last used** column has a [link](https://x.test) and `code`.")).toBe("The Last used column has a link and code.")
    expect(plainSentenceText("Don't &amp; won't.")).toBe("Don\u2019t & won\u2019t.")
  })

  it("finds a sentence across inline elements and collapsed whitespace", () => {
    render("<h2>Plan</h2><p>First   sentence.\n  The <strong>Last used</strong> column\nshows a timestamp. Third.</p>")
    const range = findSentenceRange(sectionElements(root.querySelector("h2") as HTMLElement), "The Last used column shows a timestamp.")
    expect(range?.toString().replace(/\s+/g, " ")).toBe("The Last used column shows a timestamp.")
  })

  it("matches curly quotes against straight quotes", () => {
    render("<h2>Plan</h2><p>It’s not a “bug”.</p>")
    const range = findSentenceRange(sectionElements(root.querySelector("h2") as HTMLElement), "It's not a \"bug\".")
    expect(range?.toString()).toBe("It’s not a “bug”.")
  })

  it("ignores the readability controls and does not match text from other sections", () => {
    render('<h2>A<span data-readability-ui>Readability · 2</span></h2><p>Alpha.</p><h2>B</h2><p>Beta.</p>')
    const a = root.querySelector("h2") as HTMLElement
    expect(findSentenceRange(sectionElements(a), "Beta.")).toBeNull()
    expect(findSentenceRange(sectionElements(a), "Readability")).toBeNull()
    expect(findSentenceRange(sectionElements(a), "Alpha.")?.toString()).toBe("Alpha.")
  })

  it("finds a sentence inside a list item", () => {
    render("<h2>A</h2><ul><li>Item one.</li><li>Item two.</li></ul><p>After.</p>")
    const elements = sectionElements(root.querySelector("h2") as HTMLElement)
    expect(findSentenceRange(elements, "Item two.")?.toString()).toBe("Item two.")
  })
})

describe("readability highlight on rendered Markdown", () => {
  it("finds source sentences after the real renderer has formatted them", async () => {
    const { md } = await import("./markdown")
    const markdown = [
      "## Steps",
      "",
      "1. Create a new key in **Settings → API keys**. Name it with today's date, such as `prod-2026-09-23`.",
      "2. See [the docs](https://example.test/docs) for \"quoted\" details -- and more.",
      "",
      "> Note: it's not a *bug*, it's a feature.",
      "",
      "Requests that fail with `401 Unauthorized` after step 3 mean a service has the old key.",
      "",
      "## Next",
      "",
      "Other text.",
    ].join("\n")
    const root = document.createElement("div")
    root.innerHTML = md.render(markdown)
    document.body.append(root)
    const heading = root.querySelector("h2") as HTMLElement
    const elements = sectionElements(heading)
    for (const sentence of [
      "Create a new key in **Settings → API keys**.",
      "Name it with today's date, such as `prod-2026-09-23`.",
      "See [the docs](https://example.test/docs) for \"quoted\" details -- and more.",
      "Note: it's not a *bug*, it's a feature.",
      "Requests that fail with `401 Unauthorized` after step 3 mean a service has the old key.",
    ]) {
      const range = findSentenceRange(elements, plainSentenceText(sentence))
      expect(range, sentence).not.toBeNull()
    }
    expect(findSentenceRange(elements, plainSentenceText("Other text."))).toBeNull()
    root.remove()
  })
})

describe("readability block tags", () => {
  it("adds one corner tag to a paragraph and removes it again", async () => {
    const { addBlockTag } = await import("./readability-highlight")
    const root = document.createElement("div")
    root.innerHTML = "<p>Some paragraph text.</p>"
    document.body.append(root)
    const paragraph = root.querySelector("p") as HTMLElement
    const remove = addBlockTag(paragraph, "Prose → List")
    addBlockTag(paragraph, "Prose → List")
    expect(paragraph.querySelectorAll("[data-readability-block-tag]")).toHaveLength(1)
    expect(paragraph.querySelector("[data-readability-ui]")?.textContent).toBe("Prose → List")
    expect(paragraph.hasAttribute("data-readability-block")).toBe(true)
    remove()
    expect(paragraph.querySelector("[data-readability-block-tag]")).toBeNull()
    expect(paragraph.hasAttribute("data-readability-block")).toBe(false)
    root.remove()
  })

  it("does not let the tag get in the way of finding the paragraph's text", async () => {
    const { addBlockTag } = await import("./readability-highlight")
    const root = document.createElement("div")
    root.innerHTML = "<h2>Plan</h2><p>Some paragraph text.</p>"
    document.body.append(root)
    addBlockTag(root.querySelector("p") as HTMLElement, "Prose → List")
    const range = findSentenceRange(sectionElements(root.querySelector("h2") as HTMLElement), "Some paragraph text.")
    expect(range?.toString()).toBe("Some paragraph text.")
    root.remove()
  })
})
