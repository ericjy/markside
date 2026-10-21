import {
  findReviewHeadingFallback,
  REVIEW_SELECTION_LIMIT,
  type ResolvedAnchor,
  type ResolvedReviewComment,
  type ReviewAnchor,
  type ReviewComment,
  type ReviewDocument,
  type ReviewHeadingSpan,
} from "./review"
import { getReviewBadgeOffset } from "./review-layout"

const REVIEW_BADGE_HEADING_GUTTER = 6

interface TextEntry {
  node: Text
  start: number
  end: number
}

export interface BlockSpan {
  element: Element
  start: number
  end: number
}

export interface RenderedTextIndex extends ReviewDocument {
  entries: TextEntry[]
  blocks: BlockSpan[]
}

const BLOCK_SELECTOR = "p,h1,h2,h3,h4,h5,h6,li,pre,blockquote,td,th,figcaption"

function blockFor(node: Text, root: HTMLElement) {
  const parent = node.parentElement?.closest(BLOCK_SELECTOR)
  return parent && root.contains(parent) ? parent : root
}

export function buildRenderedTextIndex(
  root: HTMLElement,
  sourceHash = "",
): RenderedTextIndex {
  const entries: TextEntry[] = []
  const blocks: BlockSpan[] = []
  const parts: string[] = []
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let length = 0
  let previousBlock: Element | null = null
  let node = walker.nextNode() as Text | null
  while (node) {
    const excluded = node.parentElement?.closest(
      "script,style,[aria-hidden=true],[data-reload-removed],[data-readability-ui],.question-card-actions,.code-block-header,.header-anchor,.pdf-export-title",
    )
    // Modal dialogs hide the preview's ancestors from assistive technology,
    // but do not remove its document text from Review anchoring.
    if (node.data && !(excluded && excluded !== root && root.contains(excluded))) {
      const block = blockFor(node, root)
      if (previousBlock && block !== previousBlock) {
        parts.push("\n")
        length += 1
      }
      const start = length
      parts.push(node.data)
      length += node.data.length
      entries.push({ node, start, end: length })
      const current = blocks[blocks.length - 1]
      if (current && block === previousBlock) current.end = length
      else blocks.push({ element: block, start, end: length })
      previousBlock = block
    }
    node = walker.nextNode() as Text | null
  }

  const text = parts.join("")
  return {
    sourceHash,
    text,
    entries,
    blocks,
    headings: buildHeadingSpans(root, entries, text.length),
  }
}

function buildHeadingSpans(
  root: HTMLElement,
  entries: TextEntry[],
  textLength: number,
): ReviewHeadingSpan[] {
  const headings = Array.from(root.querySelectorAll<HTMLElement>("h1,h2,h3,h4,h5,h6"))
    .filter((heading) => !heading.closest("[data-reload-removed]"))
  const stack: Array<{ level: number; title: string }> = []
  const starts = headings.map((heading) => {
    const level = Number(heading.tagName.slice(1))
    while (stack.length && stack[stack.length - 1].level >= level) stack.pop()
    const title = entries.filter(({ node }) => heading.contains(node))
      .map(({ node }) => node.data).join("").replace(/\s+/g, " ").trim() || "Untitled"
    stack.push({ level, title })
    const entry = entries.find((candidate) => heading.contains(candidate.node))
    return { level, path: stack.map((item) => item.title), start: entry?.start ?? 0 }
  })
  return starts.map((heading, index) => {
    const next = starts.slice(index + 1).find((candidate) => candidate.level <= heading.level)
    return { path: heading.path, start: heading.start, end: next?.start ?? textLength }
  })
}

function boundaryOffset(index: RenderedTextIndex, node: Node, offset: number) {
  if (node.nodeType === Node.TEXT_NODE) {
    const entry = index.entries.find((candidate) => candidate.node === node)
    return entry ? entry.start + Math.min(offset, entry.node.data.length) : null
  }
  const element = node as Element
  const child = element.childNodes[offset] ?? null
  if (child) {
    const entry = index.entries.find((candidate) => child === candidate.node || child.contains(candidate.node))
    if (entry) return entry.start
  }
  const contained = index.entries.filter((candidate) => element.contains(candidate.node))
  return contained.length ? contained[contained.length - 1].end : null
}

export function anchorFromSelection(
  root: HTMLElement,
  selection: Selection,
  sourceHash = "",
): { anchor: ReviewAnchor; range: Range; index: RenderedTextIndex } | null {
  if (selection.rangeCount !== 1 || selection.isCollapsed) return null
  const range = selection.getRangeAt(0)
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return null
  const index = buildRenderedTextIndex(root, sourceHash)
  const startElement = range.startContainer.nodeType === Node.ELEMENT_NODE
    ? range.startContainer as Element
    : range.startContainer.parentElement
  const removed = startElement?.closest<HTMLElement>("[data-reload-removed]")
  if (removed && removed.contains(range.endContainer)) {
    const selected = range.toString()
    const exact = selected.trim()
    if (!exact || exact.replace(/\s+/g, " ").length > REVIEW_SELECTION_LIMIT) return null
    const prefix = document.createRange()
    prefix.selectNodeContents(removed)
    prefix.setEnd(range.startContainer, range.startOffset)
    const start = Number(removed.dataset.beforeStart) + prefix.toString().length + selected.length - selected.trimStart().length
    return {
      anchor: {
        removed: true,
        exact,
        start,
        end: start + exact.length,
        prefix: "",
        suffix: "",
        headingPath: JSON.parse(removed.dataset.headingPath ?? "[]") as string[],
      },
      range: range.cloneRange(),
      index,
    }
  }
  if (Array.from(root.querySelectorAll("[data-reload-removed]")).some((node) => range.intersectsNode(node))) return null
  let start = boundaryOffset(index, range.startContainer, range.startOffset)
  let end = boundaryOffset(index, range.endContainer, range.endOffset)
  if (start === null || end === null || end <= start) return null
  // Triple-click and drag selections often include the line breaks after a block.
  while (start < end && /\s/.test(index.text[start])) start++
  while (end > start && /\s/.test(index.text[end - 1])) end--
  const exact = index.text.slice(start, end)
  const normalizedLength = exact.replace(/\s+/g, " ").trim().length
  if (normalizedLength === 0 || normalizedLength > REVIEW_SELECTION_LIMIT) return null
  const headingPath = index.headings
    .filter((heading) => start >= heading.start && start <= heading.end)
    .sort((left, right) => right.path.length - left.path.length)[0]?.path ?? []
  return {
    anchor: {
      exact,
      prefix: index.text.slice(Math.max(0, start - 80), start).replace(/\s+/g, " "),
      suffix: index.text.slice(end, end + 80).replace(/\s+/g, " "),
      start,
      end,
      headingPath,
    },
    range: range.cloneRange(),
    index,
  }
}

export function rangeFromOffsets(
  index: RenderedTextIndex,
  start: number,
  end: number,
) {
  const startEntry = index.entries.find((entry) => start >= entry.start && start <= entry.end)
  const endEntry = [...index.entries].reverse().find((entry) => end >= entry.start && end <= entry.end)
  if (!startEntry || !endEntry) return null
  const range = document.createRange()
  range.setStart(startEntry.node, Math.max(0, start - startEntry.start))
  range.setEnd(endEntry.node, Math.min(endEntry.node.data.length, end - endEntry.start))
  return range
}

export function scrollReviewHeadingIntoView(
  index: RenderedTextIndex,
  heading: ReviewHeadingSpan,
) {
  const range = rangeFromOffsets(index, heading.start, heading.start)
  const element = range?.startContainer.parentElement
  if (!element) return false
  element.scrollIntoView({ behavior: "smooth", block: "center" })
  return true
}

function getHighlightApi() {
  const registry = (CSS as unknown as {
    highlights?: { set(name: string, value: unknown): void; delete(name: string): void }
  }).highlights
  const HighlightConstructor = (globalThis as unknown as {
    Highlight?: new (...ranges: Range[]) => unknown
  }).Highlight
  if (!registry || !HighlightConstructor) return null
  return { registry, HighlightConstructor }
}

export function applyReviewHighlights(
  index: RenderedTextIndex,
  comments: ResolvedReviewComment[],
  selectedId: string | null,
) {
  const api = getHighlightApi()
  if (!api) return
  const { registry, HighlightConstructor } = api
  const ordinary: Range[] = []
  const selected: Range[] = []
  for (const comment of comments) {
    if (comment.status !== "anchored") continue
    const range = rangeFromOffsets(index, comment.range.start, comment.range.end)
    if (!range) continue
    if (comment.id === selectedId) selected.push(range)
    else ordinary.push(range)
  }
  registry.delete("markside-review")
  registry.delete("markside-review-selected")
  if (ordinary.length) registry.set("markside-review", new HighlightConstructor(...ordinary))
  if (selected.length) registry.set("markside-review-selected", new HighlightConstructor(...selected))
}

export function applyImportedReviewHighlights(
  index: RenderedTextIndex,
  comments: Array<ReviewComment & ResolvedAnchor>,
  selectedId: string | null,
) {
  const api = getHighlightApi()
  if (!api) return
  const { registry, HighlightConstructor } = api
  const ordinary: Range[] = []
  const selected: Range[] = []
  for (const comment of comments) {
    if (comment.status !== "anchored") continue
    const range = rangeFromOffsets(index, comment.range.start, comment.range.end)
    if (!range) continue
    if (comment.id === selectedId) selected.push(range)
    else ordinary.push(range)
  }
  registry.delete("markside-review-imported")
  registry.delete("markside-review-imported-selected")
  if (ordinary.length) registry.set("markside-review-imported", new HighlightConstructor(...ordinary))
  if (selected.length) registry.set("markside-review-imported-selected", new HighlightConstructor(...selected))
}

export function applyPendingReviewHighlight(range: Range) {
  const registry = (CSS as unknown as {
    highlights?: { set(name: string, value: unknown): void }
  }).highlights
  const HighlightConstructor = (globalThis as unknown as {
    Highlight?: new (...ranges: Range[]) => unknown
  }).Highlight
  if (!registry || !HighlightConstructor) return
  registry.set("markside-review-pending", new HighlightConstructor(range))
}

export function clearPendingReviewHighlight() {
  const registry = (CSS as unknown as {
    highlights?: { delete(name: string): void }
  }).highlights
  registry?.delete("markside-review-pending")
}

export interface ReviewBadgeAnchor {
  id: string
  displayNumber: number
  top: number
  left: number
}

export function computeReviewBadgeAnchors(
  container: HTMLElement,
  index: RenderedTextIndex,
  comments: ResolvedReviewComment[],
): ReviewBadgeAnchor[] {
  const containerBox = container.getBoundingClientRect()
  const containerRect = {
    left: containerBox.left,
    top: containerBox.top,
    width: containerBox.width,
    height: containerBox.height,
    scrollLeft: container.scrollLeft,
    scrollTop: container.scrollTop,
  }
  const anchors: ReviewBadgeAnchor[] = []
  for (const comment of comments) {
    if (comment.status === "anchored") continue
    const heading = findReviewHeadingFallback(index.headings, comment.anchor.headingPath)
    if (!heading) continue
    const headingStart = rangeFromOffsets(index, heading.start, heading.start)
    const element = headingStart?.startContainer.parentElement
    if (!element) continue
    const headingRange = document.createRange()
    headingRange.selectNodeContents(element)
    const headingRects = headingRange.getClientRects()
    const rect = headingRects.length > 0 ? headingRects[0] : null
    if (!rect) continue
    anchors.push({
      id: comment.id,
      displayNumber: comment.displayNumber,
      ...getReviewBadgeOffset(
        { x: rect.left - REVIEW_BADGE_HEADING_GUTTER, y: (rect.top + rect.bottom) / 2 },
        containerRect,
      ),
    })
  }
  return anchors
}

export function sourceLineForNode(node: Node): number | null {
  const element = node.nodeType === Node.ELEMENT_NODE
    ? node as Element
    : node.parentElement
  const raw = element?.closest("[data-source-line]")?.getAttribute("data-source-line")
  return raw ? Number(raw) : null
}

export function clearReviewHighlights() {
  const registry = (CSS as unknown as {
    highlights?: { delete(name: string): void }
  }).highlights
  registry?.delete("markside-review")
  registry?.delete("markside-review-selected")
  registry?.delete("markside-review-imported")
  registry?.delete("markside-review-imported-selected")
}

export function renderedOffsetAtPoint(
  index: RenderedTextIndex,
  clientX: number,
  clientY: number,
) {
  const documentWithCaret = document as Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null
    caretRangeFromPoint?: (x: number, y: number) => Range | null
  }
  const position = documentWithCaret.caretPositionFromPoint?.(clientX, clientY)
  if (position) return boundaryOffset(index, position.offsetNode, position.offset)
  const range = documentWithCaret.caretRangeFromPoint?.(clientX, clientY)
  return range ? boundaryOffset(index, range.startContainer, range.startOffset) : null
}
