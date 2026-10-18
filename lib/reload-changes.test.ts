// @vitest-environment jsdom

import { describe, expect, it } from "vitest"

import { applyHeadingNumbers } from "./heading-numbering"
import { md } from "./markdown"
import { diffReloadText, showReloadChanges } from "./reload-changes"
import { createRenderedClipboardPayload } from "./rendered-copy"
import { anchorFromSelection, buildRenderedTextIndex } from "./review-dom"
import { createEmptyReview, resolveReviewPolicy, type ActiveReview } from "./review"

function render(markdown: string) {
  const root = document.createElement("div")
  root.innerHTML = md.render(markdown)
  return root
}

describe("reload comparison", () => {
  it.each([
    ["A long introduction.", "A short introduction."],
    ["", "New paragraph"],
    ["Removed paragraph", ""],
    ["unchanged", "unchanged"],
    ["First\n\nSecond\n\nThird", "First\n\nThird"],
    ["Hello 世界 🌍", "Hello 世界 🌎!"],
    ["a ".repeat(2_000), "b ".repeat(2_000)],
  ])("reconstructs both versions without losing text: %s", (before, after) => {
    const result = diffReloadText(before, after)
    expect(result.filter(({ kind }) => kind !== "added").map(({ text }) => text).join("")).toBe(before)
    expect(result.filter(({ kind }) => kind !== "removed").map(({ text }) => text).join("")).toBe(after)
  })

  it("marks only the changed word in a sentence", () => {
    expect(diffReloadText("A long introduction.", "A short introduction.")).toEqual([
      { kind: "equal", text: "A " },
      { kind: "removed", text: "long" },
      { kind: "added", text: "short" },
      { kind: "equal", text: " introduction." },
    ])
  })

  it("removes a whole list item instead of splicing words across two items", () => {
    const items = ["Item 8", "First detail", "Second detail", "Item 9", "First detail"]
    const before = [...items, "Second detail", "Item 10"].join("\n")
    const after = [...items, "Item 10"].join("\n")
    expect(diffReloadText(before, after).filter(({ kind }) => kind !== "equal"))
      .toEqual([{ kind: "removed", text: "Second detail\n" }])
  })

  it("replaces an unrelated block whole instead of stitching its words together", () => {
    expect(diffReloadText("Alpha beta gamma", "Nothing alike here")).toEqual([
      { kind: "removed", text: "Alpha beta gamma" },
      { kind: "added", text: "Nothing alike here" },
    ])
  })

  it("re-inserts a removed list item beside the sibling it followed", () => {
    const root = render("1. Item 9\n   - First detail\n2. Item 10")
    const current = buildRenderedTextIndex(root).text
    showReloadChanges(root, render("1. Item 9\n   - First detail\n   - Second detail\n2. Item 10"))
    const removed = root.querySelector<HTMLElement>("li[data-reload-removed]")!
    expect(removed.textContent).toBe("Second detail")
    expect(removed.previousElementSibling?.textContent).toBe("First detail")
    expect(removed.parentElement?.tagName).toBe("UL")
    expect(buildRenderedTextIndex(root).text).toBe(current)
  })

  it("re-inserts a removed paragraph between the paragraphs that remain", () => {
    const root = render("First paragraph.\n\nLast paragraph.")
    showReloadChanges(root, render("First paragraph.\n\nRemoved paragraph.\n\nLast paragraph."))
    const removed = root.querySelector<HTMLElement>("p[data-reload-removed]")!
    expect(removed.textContent).toBe("Removed paragraph.")
    expect(removed.previousElementSibling?.textContent).toBe("First paragraph.")
    expect(removed.nextElementSibling?.textContent).toBe("Last paragraph.")
  })

  it("rebuilds a removed nested list inside the item that kept its text", () => {
    const root = render("1. Item 1\n2. Item 2")
    showReloadChanges(root, render("1. Item 1\n   - detail a\n   - detail b\n2. Item 2"))
    const removed = root.querySelector<HTMLElement>("ul[data-reload-removed]")!
    expect(removed.closest("li")?.textContent).toContain("Item 1")
    expect(Array.from(removed.children, (item) => item.textContent)).toEqual(["detail a", "detail b"])
  })

  it("rebuilds a removed table row inside the table body", () => {
    const root = render("| a | b |\n| - | - |\n| 1 | 2 |")
    showReloadChanges(root, render("| a | b |\n| - | - |\n| 1 | 2 |\n| 3 | 4 |"))
    const removed = root.querySelector<HTMLElement>("tr[data-reload-removed]")!
    expect(removed.parentElement?.tagName).toBe("TBODY")
    expect(Array.from(removed.children, (cell) => cell.textContent)).toEqual(["3", "4"])
  })

  it("keeps a removed heading out of the current outline and numbering", () => {
    const root = render("# Title\n\n## Kept section\n\nBody.")
    const outline = buildRenderedTextIndex(root).headings
    showReloadChanges(root, render("# Title\n\n## Dropped section\n\nDropped body.\n\n## Kept section\n\nBody."))
    expect(root.querySelector("h2[data-reload-removed]")?.textContent?.trim()).toBe("Dropped section")
    expect(buildRenderedTextIndex(root).headings).toEqual(outline)
    applyHeadingNumbers(root, true)
    expect(root.querySelector<HTMLElement>("h2:not([data-reload-removed])")?.dataset.headingNumber).toBe("1")
  })

  it("anchors a comment on a removed block to its place in the old document", () => {
    const root = render("1. Item 9\n   - First detail\n2. Item 10")
    document.body.replaceChildren(root)
    const previous = render("1. Item 9\n   - First detail\n   - Second detail\n2. Item 10")
    const previousText = buildRenderedTextIndex(previous).text
    showReloadChanges(root, previous)
    const selection = window.getSelection()!
    const range = document.createRange()
    range.selectNodeContents(root.querySelector("li[data-reload-removed]")!)
    selection.removeAllRanges()
    selection.addRange(range)
    const anchor = anchorFromSelection(root, selection)?.anchor
    expect(anchor).toMatchObject({ removed: true, exact: "Second detail" })
    expect(previousText.slice(anchor!.start, anchor!.end)).toBe("Second detail")
  })

  it.each([
    ["A **long** introduction.", "A **short** introduction."],
    ["## Old title\n\nFirst paragraph.\n\nRemove this.\n\nLast paragraph.", "## New title\n\nFirst paragraph.\n\nLast paragraph."],
    ["Remove all of this.", ""],
    ["", "## Everything is new\n\nNew paragraph."],
    ["- One\n- Two\n- Three", "- First\n- Third"],
    ["Old **bold** and *italic* words.", "New **strong** and *slanted* words."],
    ["```js\nconst old = 1\n```", "```js\nconst next = 2\n```"],
  ])("keeps the current document index intact while showing edits: %s", (before, after) => {
    const root = render(after)
    const original = buildRenderedTextIndex(root)
    showReloadChanges(root, render(before))
    const marked = buildRenderedTextIndex(root)
    expect(marked.text).toBe(original.text)
    expect(marked.headings).toEqual(original.headings)
    expect(root.querySelectorAll("ins, del").length).toBeGreaterThan(0)
    const copy = createRenderedClipboardPayload(root)
    expect(copy.html).not.toContain("reload-added")
    expect(copy.html).not.toContain("reload-removed")
  })

  it("captures deleted text as historical context and current text as a normal anchor", () => {
    const root = render("A short introduction.")
    document.body.replaceChildren(root)
    showReloadChanges(root, render("A long introduction."))
    const selection = window.getSelection()!
    const removed = root.querySelector("del")!
    const range = document.createRange()
    range.selectNodeContents(removed)
    selection.removeAllRanges()
    selection.addRange(range)
    expect(anchorFromSelection(root, selection)?.anchor).toMatchObject({ removed: true, exact: "long" })
    range.selectNodeContents(root.querySelector("ins")!)
    selection.removeAllRanges()
    selection.addRange(range)
    expect(anchorFromSelection(root, selection)?.anchor).toMatchObject({ exact: "short", start: 2, end: 7 })
    expect(anchorFromSelection(root, selection)?.anchor.removed).toBeUndefined()
  })

  it("does not turn a selection mixing old and current text into a misleading quote", () => {
    const root = render("A short introduction.")
    document.body.replaceChildren(root)
    showReloadChanges(root, render("A long introduction."))
    const selection = window.getSelection()!
    const range = document.createRange()
    range.selectNodeContents(root)
    selection.removeAllRanges()
    selection.addRange(range)
    expect(anchorFromSelection(root, selection)).toBeNull()
  })
})

describe("follow-up Review", () => {
  const comment = {
    id: "old", body: "Keep this text.", createdAt: "2026-09-17",
    anchor: { removed: true as const, exact: "long", start: 2, end: 6, prefix: "", suffix: "", headingPath: [] },
  }
  const review: ActiveReview = { ...createEmptyReview("file:///test.md", "hash"), comments: [comment] }
  const documentState = { sourceHash: "hash", text: "A long introduction.", headings: [] }

  it("never attaches removed text to a surviving identical passage", () => {
    const result = resolveReviewPolicy({ review, document: documentState, request: { type: "reattach" } })
    expect(result).toMatchObject({ comments: [{ status: "unanchored" }] })
    for (const commentId of [undefined, "old"]) {
      const exported = resolveReviewPolicy({ review, document: documentState, request: { type: "export", verification: "verified", commentId } })
      expect(exported).toMatchObject({ markdown: expect.stringContaining("historical context") })
      expect(exported).toMatchObject({ markdown: expect.stringContaining("Keep this text.") })
    }
  })
})
