// Capturing and re-locating the rendered content a localhost annotation refers
// to. Text targets reuse the Review Comment quote anchoring in `lib/review.ts`.
// Element targets resolve through stable identity attributes and their rendered
// text, never through a positional CSS path. See ADR-0006.

import {
  normalizeReviewText,
  type LocalhostElementDescriptor,
  type LocalhostTarget,
} from "./localhost-review"
import { REVIEW_SELECTION_LIMIT, resolveImportedCommentAnchor, type ReviewAnchor } from "./review"
import {
  anchorFromSelection,
  buildRenderedTextIndex,
  rangeFromOffsets,
  type RenderedTextIndex,
} from "./review-dom"

const DESCRIPTOR_PATH_DEPTH = 5
const DESCRIPTOR_CLASS_LIMIT = 2
const CONTEXT_LENGTH = 80

function attribute(element: Element, name: string) {
  const value = element.getAttribute(name)
  return value && value.trim() ? value.trim() : null
}

function testIdOf(element: Element) {
  return attribute(element, "data-testid") ?? attribute(element, "data-test-id")
}

function classNamesOf(element: Element) {
  return Array.from(element.classList).filter((name) => name.length <= 40)
}

function pathSegment(element: Element) {
  const tag = element.tagName.toLowerCase()
  const id = element.id ? `#${element.id}` : ""
  const classNames = classNamesOf(element).slice(0, DESCRIPTOR_CLASS_LIMIT)
  return `${tag}${id}${classNames.length ? `.${classNames.join(".")}` : ""}`
}

export function describeElement(element: Element): LocalhostElementDescriptor {
  const path: string[] = []
  let current: Element | null = element
  while (current && path.length < DESCRIPTOR_PATH_DEPTH && current.tagName !== "HTML") {
    path.unshift(pathSegment(current))
    current = current.parentElement
  }
  return {
    tagName: element.tagName.toLowerCase(),
    id: element.id || null,
    testId: testIdOf(element),
    role: attribute(element, "role"),
    ariaLabel: attribute(element, "aria-label"),
    name: attribute(element, "name"),
    classNames: classNamesOf(element),
    ancestorPath: path.join(" > "),
  }
}

function elementOf(node: Node) {
  return node.nodeType === Node.ELEMENT_NODE
    ? node as Element
    : node.parentElement
}

export function buildLocalhostTextTarget(
  root: HTMLElement,
  selection: Selection,
): { target: LocalhostTarget; range: Range } | null {
  const captured = anchorFromSelection(root, selection)
  if (!captured) return null
  const element = elementOf(captured.range.startContainer)
  if (!element) return null
  return {
    range: captured.range,
    target: {
      kind: "text",
      anchor: captured.anchor,
      element: describeElement(element),
    },
  }
}

function elementTextRange(index: RenderedTextIndex, element: Element) {
  const contained = index.entries.filter((entry) => element.contains(entry.node))
  if (contained.length === 0) return null
  return { start: contained[0].start, end: contained[contained.length - 1].end }
}

function elementAnchor(index: RenderedTextIndex, element: Element): ReviewAnchor {
  const span = elementTextRange(index, element)
  if (!span) {
    return { exact: "", prefix: "", suffix: "", start: 0, end: 0, headingPath: [] }
  }
  const exact = index.text.slice(span.start, span.end)
  const headingPath = index.headings
    .filter((heading) => span.start >= heading.start && span.start <= heading.end)
    .sort((left, right) => right.path.length - left.path.length)[0]?.path ?? []
  return {
    exact: normalizeReviewText(exact).length > REVIEW_SELECTION_LIMIT ? "" : exact,
    prefix: index.text.slice(Math.max(0, span.start - CONTEXT_LENGTH), span.start).replace(/\s+/g, " "),
    suffix: index.text.slice(span.end, span.end + CONTEXT_LENGTH).replace(/\s+/g, " "),
    start: span.start,
    end: span.end,
    headingPath,
  }
}

export function buildLocalhostElementTarget(
  root: HTMLElement,
  element: Element,
): LocalhostTarget {
  return {
    kind: "element",
    anchor: elementAnchor(buildRenderedTextIndex(root), element),
    element: describeElement(element),
  }
}

export type LocalhostTargetResolution =
  | { status: "found"; element: Element; range: Range | null }
  | { status: "missing" }

function matchesDescriptor(
  element: Element,
  descriptor: LocalhostElementDescriptor,
  text: string,
) {
  if (descriptor.role && attribute(element, "role") !== descriptor.role) return false
  if (descriptor.ariaLabel && attribute(element, "aria-label") !== descriptor.ariaLabel) return false
  if (descriptor.name && attribute(element, "name") !== descriptor.name) return false
  if (descriptor.classNames.some((name) => !element.classList.contains(name))) return false
  if (text && normalizeReviewText(element.textContent ?? "") !== text) return false
  return true
}

function resolveElementTarget(
  root: HTMLElement,
  target: LocalhostTarget,
): LocalhostTargetResolution {
  const descriptor = target.element
  let candidates = Array.from(root.querySelectorAll(descriptor.tagName))
  if (root.tagName.toLowerCase() === descriptor.tagName) candidates = [root, ...candidates]

  if (descriptor.id) {
    const byId = candidates.filter((element) => element.id === descriptor.id)
    if (byId.length === 1) return { status: "found", element: byId[0], range: null }
    if (byId.length > 1) candidates = byId
  }
  if (descriptor.testId) {
    const byTestId = candidates.filter((element) => testIdOf(element) === descriptor.testId)
    if (byTestId.length === 1) return { status: "found", element: byTestId[0], range: null }
    if (byTestId.length > 1) candidates = byTestId
  }

  const text = normalizeReviewText(target.anchor.exact)
  const matches = candidates.filter((element) => matchesDescriptor(element, descriptor, text))
  if (matches.length === 1) return { status: "found", element: matches[0], range: null }
  return { status: "missing" }
}

export function resolveLocalhostTarget(
  root: HTMLElement,
  target: LocalhostTarget,
  renderedText?: RenderedTextIndex,
): LocalhostTargetResolution {
  if (target.kind === "element") return resolveElementTarget(root, target)
  const index = renderedText ?? buildRenderedTextIndex(root)
  const resolved = resolveImportedCommentAnchor(target.anchor, index)
  if (resolved.status !== "anchored") return { status: "missing" }
  const range = rangeFromOffsets(index, resolved.range.start, resolved.range.end)
  const element = range && elementOf(range.startContainer)
  if (!range || !element) return { status: "missing" }
  return { status: "found", element, range }
}

export function getLocalhostTargetRects(resolution: LocalhostTargetResolution) {
  if (resolution.status !== "found") return []
  const rects = resolution.range
    ? Array.from(resolution.range.getClientRects())
    : [resolution.element.getBoundingClientRect()]
  return rects.filter((rect) => rect.width > 0 && rect.height > 0)
}
