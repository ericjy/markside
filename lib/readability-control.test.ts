// @vitest-environment jsdom

import { act, createElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ReadabilityHeadingControl } from "../components/readability-heading-control"
import { extractReadabilitySections, type ReadabilityResult } from "./readability"

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true

describe("Readability heading control", () => {
  let container: HTMLDivElement
  let root: Root
  const section = extractReadabilitySections("## Approach\nA clear section.\n")[0]
  const result: ReadabilityResult = {
    id: "score-1", level: section.level, path: section.path,
    samePathCount: section.samePathCount,
    sourceLine: section.sourceLine, sourceHash: section.sourceHash,
    documentHash: section.documentHash,
    scores: { directness: 1, conciseness: 2, simplicity: 3, naturalness: 2, coherence: 1, scannability: 4, formatFit: 2 },
    createdAt: "2026-09-22T00:00:00.000Z",
  }
  beforeEach(() => {
    container = document.createElement("div")
    document.body.append(container)
    root = createRoot(container)
  })
  afterEach(() => { act(() => root.unmount()); container.remove() })

  it("opens an unchecked heading without sending anything, even after consent", async () => {
    const onCheck = vi.fn().mockResolvedValue(undefined)
    act(() => root.render(createElement(ReadabilityHeadingControl, {
      section, result: null, status: null, wholeDocument: false, consentGranted: true, onConsent: vi.fn(), onCheck, onLocate: vi.fn(), onComment: vi.fn(), onRemove: vi.fn(),
    })))
    act(() => (document.body.querySelector(".readability-pill") as HTMLButtonElement).click())
    expect(document.body.querySelector("[role=dialog]")).not.toBeNull()
    expect(onCheck).not.toHaveBeenCalled()
    const send = Array.from(document.body.querySelectorAll("button")).find((button) => button.textContent === "Send section and check")!
    await act(async () => { send.click() })
    expect(onCheck).toHaveBeenCalledExactlyOnceWith(section)
  })

  it("asks for consent before the first section is sent", async () => {
    const onCheck = vi.fn().mockResolvedValue(undefined)
    const onConsent = vi.fn()
    act(() => root.render(createElement(ReadabilityHeadingControl, {
      section, result: null, status: null, wholeDocument: false, consentGranted: false, onConsent, onCheck, onLocate: vi.fn(), onComment: vi.fn(), onRemove: vi.fn(),
    })))
    act(() => (document.body.querySelector(".readability-pill") as HTMLButtonElement).click())
    expect(onCheck).not.toHaveBeenCalled()
    expect(document.body.querySelector(".readability-panel-beta")?.textContent).toBe("Beta")
    expect(document.body.querySelector(".readability-panel-provider")?.textContent).toBe("Powered by Jev, which receives this section's text.")
    const confirm = Array.from(document.body.querySelectorAll("button"))
      .find((button) => button.textContent === "Send section and check")!
    await act(async () => { confirm.click() })
    expect(onConsent).toHaveBeenCalledOnce()
    expect(onCheck).toHaveBeenCalledExactlyOnceWith(section)
  })

  it("keeps the weak-count pill visible and offers seven scores and an actionable comment", () => {
    const onComment = vi.fn()
    act(() => root.render(createElement(ReadabilityHeadingControl, {
      section, result, status: "current", wholeDocument: false, consentGranted: true, onConsent: vi.fn(), onCheck: vi.fn(), onLocate: vi.fn(), onComment, onRemove: vi.fn(),
    })))
    const pill = document.body.querySelector(".readability-pill") as HTMLElement
    expect(pill.textContent).toBe("Readability")
    expect(pill.querySelector(".readability-pill-icon")?.getAttribute("data-state")).toBe("issues")
    expect(pill.getAttribute("aria-label")).toBe("2 dimensions need work")
    act(() => (document.body.querySelector("button") as HTMLButtonElement).click())
    expect(document.body.querySelectorAll(".readability-score")).toHaveLength(7)
    expect(document.body.querySelectorAll(".readability-score.is-weak")).toHaveLength(2)
    expect(document.body.querySelectorAll(".readability-score.is-poor")).toHaveLength(0)
    expect(document.body.querySelector(".readability-score-value")?.textContent).toBe("Weak")
    expect(document.body.querySelector(".readability-panel-status")).toBeNull()
    expect(document.body.querySelector(".readability-panel-header")?.textContent).not.toContain("low score")
    const coherenceLabel = Array.from(document.body.querySelectorAll(".readability-score-label")).find((label) => label.textContent === "Coherence") as HTMLElement
    act(() => coherenceLabel.focus())
    expect(document.body.textContent).toContain("Whether ideas connect in a logical order.")
    expect(document.body.querySelector(".readability-actions > .readability-comment-action")).not.toBeNull()
    expect(document.body.querySelector(".readability-pill")?.getAttribute("aria-controls")).toBe(
      document.body.querySelector("[role=dialog]")?.id,
    )
    const comment = Array.from(document.body.querySelectorAll("button"))
      .find((button) => button.textContent === "Add section improvement comment")!
    act(() => comment.click())
    expect(onComment).toHaveBeenCalledWith(section, result)
  })

  it("closes the score panel with Escape from the heading control", () => {
    act(() => root.render(createElement(ReadabilityHeadingControl, {
      section, result, status: "current", wholeDocument: false, consentGranted: true, onConsent: vi.fn(), onCheck: vi.fn(), onLocate: vi.fn(), onComment: vi.fn(), onRemove: vi.fn(),
    })))
    const trigger = document.body.querySelector(".readability-pill") as HTMLButtonElement
    act(() => trigger.click())
    act(() => trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })))
    expect(document.body.querySelector("[role=dialog]")).toBeNull()
  })

  it("labels the sole-H1 pill and popover as covering the whole document", () => {
    const docSection = extractReadabilitySections("# Plan\nIntro.\n## Approach\nDetail.\n")[0]
    const docResult: ReadabilityResult = { ...result, level: docSection.level, path: docSection.path, samePathCount: docSection.samePathCount, sourceLine: docSection.sourceLine, sourceHash: docSection.sourceHash, documentHash: docSection.documentHash }
    act(() => root.render(createElement(ReadabilityHeadingControl, {
      section: docSection, result: docResult, status: "current", wholeDocument: true, consentGranted: true, onConsent: vi.fn(), onCheck: vi.fn(), onLocate: vi.fn(), onComment: vi.fn(), onRemove: vi.fn(),
    })))
    expect(document.body.querySelector(".readability-pill")?.textContent).toBe("Document readability")
    expect(document.body.querySelector(".readability-pill-icon")?.getAttribute("data-state")).toBe("issues")
    act(() => (document.body.querySelector("button") as HTMLButtonElement).click())
    expect(document.body.querySelector(".readability-panel-title")?.textContent).toBe("Readability Check")
    expect(document.body.querySelector(".readability-panel-scope")).toBeNull()
  })

  it("shows a tick on the pill when no dimension is low", () => {
    act(() => root.render(createElement(ReadabilityHeadingControl, {
      section, result: { ...result, scores: { directness: 3, conciseness: 3, simplicity: 3, naturalness: 3, coherence: 3, scannability: 3, formatFit: 3 } },
      status: "current", wholeDocument: false, consentGranted: true, onConsent: vi.fn(), onCheck: vi.fn(), onLocate: vi.fn(), onComment: vi.fn(), onRemove: vi.fn(),
    })))
    expect(document.body.querySelector(".readability-pill-icon")?.getAttribute("data-state")).toBe("clear")
    expect(document.body.querySelector(".readability-pill")?.getAttribute("aria-label")).toBe("No dimensions need work")
  })

  it("shows stale state without offering comment creation", () => {
    act(() => root.render(createElement(ReadabilityHeadingControl, {
      section, result, status: "outdated", wholeDocument: false, consentGranted: true, onConsent: vi.fn(), onCheck: vi.fn(), onLocate: vi.fn(), onComment: vi.fn(), onRemove: vi.fn(),
    })))
    expect(document.body.textContent).toContain("Readability · Outdated")
    act(() => (document.body.querySelector("button") as HTMLButtonElement).click())
    const comment = Array.from(document.body.querySelectorAll("button"))
      .find((button) => button.textContent === "Add section improvement comment")
    expect(comment).toBeUndefined()
    expect(document.body.querySelector(".readability-actions > .readability-recheck")?.textContent).toBe("Recheck")
  })
  describe("Find problem sentences", () => {
    const lowNaturalness: ReadabilityResult = {
      ...result,
      id: "score-2",
      scores: { directness: 3, conciseness: 3, simplicity: 3, naturalness: 0.8, coherence: 0.5, scannability: 0.4, formatFit: 3 },
    }
    const mountControl = (overrides: object) => act(() => root.render(createElement(ReadabilityHeadingControl, {
      section, result: lowNaturalness, status: "current", wholeDocument: false, consentGranted: true,
      onConsent: vi.fn(), onCheck: vi.fn(), onLocate: vi.fn().mockResolvedValue(undefined), onComment: vi.fn(), onRemove: vi.fn(),
      ...overrides,
    })))
    const open = () => act(() => (document.body.querySelector(".readability-pill") as HTMLButtonElement).click())
    const button = (text: string) => Array.from(document.body.querySelectorAll("button")).find((item) => item.textContent?.includes(text))

    it("asks for the low dimensions that have sentences, and skips layout scores", async () => {
      const onLocate = vi.fn().mockResolvedValue(undefined)
      mountControl({ onLocate })
      open()
      expect(document.body.querySelector(".readability-where-hint")).toBeNull()
      await act(async () => { button("Find problem sentences")!.click() })
      expect(onLocate).toHaveBeenCalledExactlyOnceWith(section, lowNaturalness, ["naturalness", "coherence", "scannability"])
    })

    it("also offers to find paragraphs when only layout scores are low", async () => {
      const onLocate = vi.fn().mockResolvedValue(undefined)
      mountControl({ onLocate, result: { ...lowNaturalness, scores: { ...lowNaturalness.scores, naturalness: 3, coherence: 3, formatFit: 1 } } })
      open()
      await act(async () => { button("Find problem sentences")!.click() })
      expect(onLocate).toHaveBeenCalledExactlyOnceWith(section, expect.anything(), ["scannability", "formatFit"])
    })

    it("shows a paragraph finding with what it is now and what it would read better as", () => {
      const paragraph = "You should rotate a key whenever it shows up in a log, a commit, or a chat message."
      mountControl({ result: { ...lowNaturalness, findings: [
        { sentence: paragraph, unit: "block", dimension: "formatFit", violation: "format-list", suggested: "list", why: "Parallel points read better as a list.", probability: 0.95 },
        { sentence: paragraph, unit: "block", dimension: "scannability", violation: "wall", why: "Too many points in one paragraph.", probability: 0.9 },
      ] } })
      open()
      const cards = document.body.querySelectorAll(".readability-finding")
      expect(cards).toHaveLength(1)
      expect(cards[0].querySelector(".readability-finding-kind")?.textContent).toBe("Paragraph")
      expect(Array.from(cards[0].querySelectorAll(".readability-format-chip")).map((chip) => chip.textContent)).toEqual(["Prose", "List"])
      expect(cards[0].textContent).toContain("Parallel points read better as a list.")
      expect(cards[0].textContent).toContain("Too many points in one paragraph.")
    })

    it("lists each flagged sentence once with its reasons", () => {
      const sentence = "It's not just about security, it's about trust."
      mountControl({ result: { ...lowNaturalness, findings: [
        { sentence, dimension: "naturalness", violation: "dramatic", why: "Dramatic fragment or staged emphasis.", probability: 0.9 },
        { sentence, dimension: "naturalness", violation: "argue", why: "Argues with no one: rebuts something nobody raised.", probability: 0.7 },
      ] } })
      open()
      expect(button("Find problem sentences")).toBeUndefined()
      const items = document.body.querySelectorAll(".readability-finding")
      expect(items).toHaveLength(1)
      expect(items[0].querySelector(".readability-finding-kind")?.textContent).toBe("Sentence")
      expect(items[0].querySelector(".readability-finding-quote")?.textContent).toBe(sentence)
      expect(items[0].textContent).toContain("Dramatic fragment or staged emphasis.")
      expect(items[0].textContent).toContain("Argues with no one")
    })

    it("gives Poor its own colour class, separate from Weak", () => {
      mountControl({ result: { ...lowNaturalness, scores: { ...lowNaturalness.scores, naturalness: 1.4, coherence: 0.4 } } })
      open()
      const cls = (name: string) => Array.from(document.body.querySelectorAll(".readability-score"))
        .find((item) => item.querySelector(".readability-score-label")?.textContent === name)?.className ?? ""
      expect(cls("Coherence")).toContain("is-poor")
      expect(cls("Naturalness")).toContain("is-weak")
      expect(cls("Naturalness")).not.toContain("is-poor")
    })

    it("says so when nothing stood out", () => {
      mountControl({ result: { ...lowNaturalness, findings: [] } })
      open()
      expect(document.body.textContent).toContain("No single sentence stood out")
    })

    it("shows a failure and lets the user retry", async () => {
      const onLocate = vi.fn().mockRejectedValue(new Error("Locating sentences is unavailable"))
      mountControl({ onLocate })
      open()
      await act(async () => { button("Find problem sentences")!.click() })
      expect(document.body.querySelector(".readability-error")?.textContent).toBe("Locating sentences is unavailable")
      expect(button("Find problem sentences")).toBeDefined()
    })
  })
})

describe("The single panel", () => {
  let host: HTMLDivElement
  let root: Root
  beforeEach(() => {
    // jsdom has no layout, so give ranges a size and elements a scroll method.
    Element.prototype.scrollIntoView = vi.fn()
    Range.prototype.getBoundingClientRect = () => ({ top: 100, left: 0, right: 200, bottom: 120, width: 200, height: 20, x: 0, y: 100, toJSON: () => ({}) })
    host = document.createElement("div")
    host.innerHTML = "<h2><span id=\"mount\"></span>Approach</h2><p>Alpha is first. Beta is second. Gamma is third.</p>"
    document.body.append(host)
    root = createRoot(host.querySelector("#mount") as HTMLElement)
  })
  afterEach(() => { act(() => root.unmount()); host.remove() })

  const section = extractReadabilitySections("## Approach\nAlpha is first. Beta is second. Gamma is third.\n")[0]
  const result: ReadabilityResult = {
    id: "walk", level: section.level, path: section.path, samePathCount: section.samePathCount,
    sourceLine: section.sourceLine, sourceHash: section.sourceHash, documentHash: section.documentHash,
    scores: { directness: 3, conciseness: 3, simplicity: 3, naturalness: 0.5, coherence: 0.5, scannability: 3, formatFit: 3 },
    createdAt: "2026-09-22T00:00:00.000Z",
    findings: [
      { sentence: "Gamma is third.", dimension: "naturalness", violation: "argue", why: "Rebuts a point no one raised.", probability: 0.8 },
      { sentence: "Alpha is first.", dimension: "coherence", violation: "contradict", why: "Contradicts another sentence.", probability: 0.9 },
      { sentence: "Beta is second.", dimension: "naturalness", violation: "dramatic", why: "Dramatic fragment or staged emphasis.", probability: 0.7 },
    ],
  }
  const mount = () => act(() => root.render(createElement(ReadabilityHeadingControl, {
    section, result, status: "current", wholeDocument: false, consentGranted: true,
    onConsent: vi.fn(), onCheck: vi.fn(), onLocate: vi.fn(), onComment: vi.fn(), onRemove: vi.fn(),
  })))
  const panel = () => document.querySelector(".readability-popover") as HTMLElement | null
  const click = (element: Element | null | undefined) => act(() => (element as HTMLElement).click())
  const button = (text: string) => Array.from(document.querySelectorAll("button")).find((item) => item.textContent?.includes(text)) as HTMLButtonElement | undefined
  const quote = () => document.querySelector(".readability-finding-quote")?.textContent
  const position = () => document.querySelector(".readability-where-position")?.textContent
  const row = (name: string) => Array.from(document.querySelectorAll(".readability-score"))
    .find((item) => item.querySelector(".readability-score-label")?.textContent === name) as HTMLElement
  const openPanel = () => click(host.querySelector(".readability-pill"))

  it("sits outside the page, fixed in the corner, and shows one item at a time in document order", () => {
    mount()
    openPanel()
    expect(panel()?.parentElement).toBe(document.body)
    expect(document.querySelector(".readability-where-title")?.textContent).toBe("Problems found")
    expect(document.querySelectorAll(".readability-finding")).toHaveLength(1)
    expect(quote()).toBe("Alpha is first.")
    expect(position()).toBe("1 of 3")
    expect(document.body.textContent).toContain("Contradicts another sentence.")
    expect(row("Naturalness").querySelector(".readability-score-count")?.textContent).toBe("2")
    expect(row("Scannability").querySelector(".readability-score-count")).toBeNull()
  })

  it("steps with Previous and Next, stays open, and disables each end", () => {
    mount()
    openPanel()
    expect(button("Previous")?.disabled).toBe(true)
    click(button("Next"))
    expect(quote()).toBe("Beta is second.")
    expect(position()).toBe("2 of 3")
    expect(panel()).not.toBeNull()
    click(button("Next"))
    expect(quote()).toBe("Gamma is third.")
    expect(button("Next")?.disabled).toBe(true)
    click(button("Previous"))
    expect(quote()).toBe("Beta is second.")
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled()
  })

  it("narrows to one dimension when its score is chosen, and back again", () => {
    mount()
    openPanel()
    click(row("Naturalness"))
    expect(quote()).toBe("Beta is second.")
    expect(position()).toBe("1 of 2")
    expect(document.body.textContent).toContain("Showing Naturalness only")
    click(row("Coherence"))
    expect(quote()).toBe("Alpha is first.")
    expect(position()).toBe("1 of 1")
    click(row("Coherence"))
    expect(position()).toBe("1 of 3")
    click(row("Coherence"))
    click(Array.from(document.querySelectorAll(".readability-where-filter button")).find((item) => item.textContent === "Show all"))
    expect(position()).toBe("1 of 3")
  })

  it("closes with the close button, Escape, or the pill, and not by clicking elsewhere once there are findings", () => {
    mount()
    openPanel()
    act(() => { document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })) })
    expect(panel()).not.toBeNull()
    click(button("Close") ?? document.querySelector(".readability-panel-close"))
    expect(panel()).toBeNull()

    openPanel()
    act(() => { document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })) })
    expect(panel()).toBeNull()

    openPanel()
    openPanel()
    expect(panel()).toBeNull()
  })

  it("closes when another heading's panel opens", () => {
    mount()
    openPanel()
    expect(panel()).not.toBeNull()
    act(() => { window.dispatchEvent(new CustomEvent("readability-panel-opened", { detail: "another-panel" })) })
    expect(panel()).toBeNull()
  })
})
describe("Marks follow the current item", () => {
  let host: HTMLDivElement
  let root: Root
  const first = "You should rotate a key whenever it shows up in a log, a commit, or a chat message, or when a teammate leaves."
  const second = "The client sends a request to the gateway, which checks the API key and forwards the call to the billing service."
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn()
    Range.prototype.getBoundingClientRect = () => ({ top: 100, left: 0, right: 200, bottom: 120, width: 200, height: 20, x: 0, y: 100, toJSON: () => ({}) })
    host = document.createElement("div")
    host.innerHTML = `<h2><span id="mount"></span>Plan</h2><p>${first}</p><p>${second}</p>`
    document.body.append(host)
    root = createRoot(host.querySelector("#mount") as HTMLElement)
  })
  afterEach(() => { act(() => root.unmount()); host.remove() })

  const section = extractReadabilitySections(`## Plan\n${first}\n\n${second}\n`)[0]
  const result: ReadabilityResult = {
    id: "marks", level: section.level, path: section.path, samePathCount: section.samePathCount,
    sourceLine: section.sourceLine, sourceHash: section.sourceHash, documentHash: section.documentHash,
    scores: { directness: 3, conciseness: 3, simplicity: 3, naturalness: 3, coherence: 3, scannability: 3, formatFit: 0.5 },
    createdAt: "2026-09-22T00:00:00.000Z",
    findings: [
      { sentence: first, unit: "block", dimension: "formatFit", violation: "format-list", suggested: "list", why: "Parallel points read better as a list.", probability: 0.95 },
      { sentence: second, unit: "block", dimension: "formatFit", violation: "format-diagram", suggested: "diagram", why: "A flow reads better as a diagram.", probability: 0.95 },
    ],
  }
  const mount = () => act(() => root.render(createElement(ReadabilityHeadingControl, {
    section, result, status: "current", wholeDocument: false, consentGranted: true,
    onConsent: vi.fn(), onCheck: vi.fn(), onLocate: vi.fn(), onComment: vi.fn(), onRemove: vi.fn(),
  })))
  const tags = () => Array.from(host.querySelectorAll(".readability-block-tag")).map((tag) => tag.textContent)
  const click = (element: Element | null | undefined) => act(() => (element as HTMLElement).click())
  const button = (text: string) => Array.from(document.querySelectorAll("button")).find((item) => item.textContent?.includes(text))

  it("leaves the page unmarked while the panel is closed, and clears the marks when it closes", () => {
    mount()
    expect(tags()).toEqual([])
    click(host.querySelector(".readability-pill"))
    expect(tags()).toEqual(["Prose → List"])
    click(document.querySelector(".readability-panel-close"))
    expect(tags()).toEqual([])
  })

  it("tags only the current item while the panel is open, and follows Next", () => {
    mount()
    click(host.querySelector(".readability-pill"))
    expect(tags()).toEqual(["Prose → List"])
    click(button("Next"))
    expect(tags()).toEqual(["Prose → Diagram"])
  })

  it("can show every mark while the panel is open, and go back to only the current one", () => {
    mount()
    click(host.querySelector(".readability-pill"))
    click(button("Show all marks"))
    expect(tags()).toEqual(["Prose → List", "Prose → Diagram"])
    click(button("Only this one"))
    expect(tags()).toEqual(["Prose → List"])
    click(button("Show all marks"))
    click(document.querySelector(".readability-panel-close"))
    expect(tags()).toEqual([])
  })
})

