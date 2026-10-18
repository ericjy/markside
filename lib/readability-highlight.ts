import { md } from "./markdown"

// Highlights sentences that Readability Check flagged, using the CSS Custom
// Highlight API so the rendered document is never modified.

const FINDING_PREFIX = "readability-finding-"
const ACTIVE_HIGHLIGHT = "readability-finding-active"
const IGNORED = "[data-readability-ui], .header-anchor, script, style"

// owner -> dimension -> ranges. Each dimension has its own highlight so it can
// have its own colour.
const owners = new Map<string, Map<string, Range[]>>()
const registered = new Set<string>()
let activeTimer: ReturnType<typeof setTimeout> | undefined

function highlightRegistry() {
  const registry = (globalThis as { CSS?: { highlights?: Map<string, unknown> } }).CSS?.highlights
  return registry && typeof Highlight !== "undefined" ? registry : null
}

function syncFindingHighlights() {
  const registry = highlightRegistry()
  if (!registry) return
  const byDimension = new Map<string, Range[]>()
  for (const dimensions of owners.values()) {
    for (const [dimension, ranges] of dimensions) byDimension.set(dimension, [...(byDimension.get(dimension) ?? []), ...ranges])
  }
  for (const name of registered) registry.delete(name)
  registered.clear()
  for (const [dimension, ranges] of byDimension) {
    if (!ranges.length) continue
    const name = FINDING_PREFIX + dimension
    registry.set(name, new Highlight(...ranges))
    registered.add(name)
  }
}

export function setFindingRanges(owner: string, ranges: Map<string, Range[]>) {
  if ([...ranges.values()].some((list) => list.length)) owners.set(owner, ranges)
  else owners.delete(owner)
  syncFindingHighlights()
}

export function clearFindingRanges(owner: string) {
  owners.delete(owner)
  syncFindingHighlights()
}

// A small corner tag on a paragraph, such as "Prose → List". It is skipped by review
// anchoring and text search because it carries data-readability-ui.
export function addBlockTag(element: HTMLElement, label: string) {
  if (element.querySelector(":scope > [data-readability-block-tag]")) return () => {}
  const tag = document.createElement("span")
  tag.dataset.readabilityUi = ""
  tag.dataset.readabilityBlockTag = ""
  tag.className = "readability-block-tag"
  tag.setAttribute("aria-hidden", "true")
  tag.textContent = label
  element.dataset.readabilityBlock = ""
  element.append(tag)
  return () => {
    tag.remove()
    delete element.dataset.readabilityBlock
  }
}

// Brings a flagged sentence into view and marks it more strongly. `keepClear` is the
// height at the bottom of the window (for a pinned bar) that the sentence must stay above.
// The stronger mark fades after a moment unless `persist` is set.
export function revealRange(range: Range, { persist = false, keepClear = 0 }: { persist?: boolean; keepClear?: number } = {}) {
  const rect = range.getBoundingClientRect()
  const usable = window.innerHeight - keepClear
  // A block taller than most of the visible area is shown from its top instead of centred.
  const block = rect.height > usable * 0.6 ? "start" : "center"
  const element = range.startContainer.parentElement
  if (element) {
    // Leave room above for the sticky header, and below for the pinned bar, then let go.
    element.style.scrollMarginTop = "96px"
    if (keepClear) element.style.scrollMarginBottom = `${keepClear}px`
    element.scrollIntoView({ block, behavior: "smooth" })
    setTimeout(() => {
      element.style.removeProperty("scroll-margin-top")
      element.style.removeProperty("scroll-margin-bottom")
    }, 1_500)
  }
  const registry = highlightRegistry()
  if (!registry) return
  const highlight = new Highlight(range)
  highlight.priority = 1
  registry.set(ACTIVE_HIGHLIGHT, highlight)
  clearTimeout(activeTimer)
  if (!persist) activeTimer = setTimeout(() => registry.delete(ACTIVE_HIGHLIGHT), 2_500)
}

// Marks the current item more strongly without moving the page.
export function markActiveRange(range: Range) {
  const registry = highlightRegistry()
  if (!registry) return
  const highlight = new Highlight(range)
  highlight.priority = 1
  registry.set(ACTIVE_HIGHLIGHT, highlight)
  clearTimeout(activeTimer)
}

export function clearActiveRange() {
  clearTimeout(activeTimer)
  highlightRegistry()?.delete(ACTIVE_HIGHLIGHT)
}

// The text a sentence has once Markdown is rendered: no emphasis markers, link
// destinations, or entities.
export function plainSentenceText(sentence: string) {
  const html = md.renderInline(sentence)
  return new DOMParser().parseFromString(html, "text/html").body.textContent ?? ""
}

// The rendered blocks that belong to a heading: everything up to the next heading
// of the same or a higher level.
export function sectionElements(heading: HTMLElement): HTMLElement[] {
  const level = Number(heading.tagName[1])
  const elements: HTMLElement[] = []
  for (let node = heading.nextElementSibling; node; node = node.nextElementSibling) {
    if (/^H[1-6]$/.test(node.tagName) && Number(node.tagName[1]) <= level) break
    elements.push(node as HTMLElement)
  }
  return elements
}

const QUOTES: Record<string, string> = { "‘": "'", "’": "'", "“": '"', "”": '"', " ": " " }

interface Point { node: Text; offset: number }

// The visible text of the given elements with whitespace collapsed and quotes
// straightened, plus where each character came from.
function flatten(elements: readonly HTMLElement[]) {
  const chars: string[] = []
  const points: Point[] = []
  let pendingSpace = false
  const push = (char: string, point: Point) => {
    if (/\s/.test(char)) {
      pendingSpace = chars.length > 0
      return
    }
    if (pendingSpace) {
      chars.push(" ")
      points.push(point)
      pendingSpace = false
    }
    chars.push(QUOTES[char] ?? char)
    points.push(point)
  }
  for (const element of elements) {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => node.parentElement?.closest(IGNORED) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
    })
    for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
      for (let offset = 0; offset < node.data.length; offset += 1) push(node.data[offset], { node, offset })
    }
    pendingSpace = chars.length > 0
  }
  return { text: chars.join(""), points }
}

function normalize(text: string) {
  return Array.from(text.replace(/\s+/g, " ").trim(), (char) => QUOTES[char] ?? char).join("")
}

export function findSentenceRange(elements: readonly HTMLElement[], sentence: string): Range | null {
  const needle = normalize(sentence)
  if (!needle) return null
  const { text, points } = flatten(elements)
  const index = text.indexOf(needle)
  if (index < 0) return null
  const start = points[index]
  const end = points[index + needle.length - 1]
  const range = document.createRange()
  range.setStart(start.node, start.offset)
  range.setEnd(end.node, end.offset + 1)
  return range
}
