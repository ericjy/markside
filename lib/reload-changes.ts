import { buildRenderedTextIndex, type RenderedTextIndex } from "./review-dom"

export interface TextChange {
  kind: "equal" | "added" | "removed"
  text: string
}

// Bound each table so a wholesale rewrite cannot stall the document UI.
const MAX_DIFF_CELLS = 1_000_000
// Blocks sharing less than this fraction of their characters read as unrelated,
// so they are shown as a removal followed by an addition rather than as a
// word-by-word rewrite of one block into the other.
const MIN_BLOCK_SIMILARITY = 0.3

const tokenize = (text: string) => text.match(/\s+|[\p{L}\p{N}_]+|[^\s]/gu) ?? []
// Rendered text separates blocks with a newline, so every unit keeps its own
// separator and a comparison can never straddle two blocks.
const splitBlocks = (text: string) => text.match(/[^\n]*\n/g) ?? []

function diffSequence(left: string[], right: string[]): TextChange[] {
  const changes: TextChange[] = []
  let start = 0
  while (start < left.length && start < right.length && left[start] === right[start]) start++
  let leftEnd = left.length
  let rightEnd = right.length
  while (leftEnd > start && rightEnd > start && left[leftEnd - 1] === right[rightEnd - 1]) {
    leftEnd--
    rightEnd--
  }
  for (let i = 0; i < start; i++) changes.push({ kind: "equal", text: left[i] })
  const rows = leftEnd - start + 1
  const columns = rightEnd - start + 1
  if (rows * columns > MAX_DIFF_CELLS) {
    for (let i = start; i < leftEnd; i++) changes.push({ kind: "removed", text: left[i] })
    for (let j = start; j < rightEnd; j++) changes.push({ kind: "added", text: right[j] })
  } else {
    const lengths = new Uint32Array(rows * columns)
    for (let i = rows - 2; i >= 0; i--) {
      for (let j = columns - 2; j >= 0; j--) {
        lengths[i * columns + j] = left[start + i] === right[start + j]
          ? lengths[(i + 1) * columns + j + 1] + 1
          : Math.max(lengths[(i + 1) * columns + j], lengths[i * columns + j + 1])
      }
    }
    let i = 0
    let j = 0
    while (i < rows - 1 || j < columns - 1) {
      if (i < rows - 1 && j < columns - 1 && left[start + i] === right[start + j]) {
        changes.push({ kind: "equal", text: left[start + i++] })
        j++
      } else if (i < rows - 1 && (j === columns - 1 || lengths[(i + 1) * columns + j] >= lengths[i * columns + j + 1])) {
        changes.push({ kind: "removed", text: left[start + i++] })
      } else {
        changes.push({ kind: "added", text: right[start + j++] })
      }
    }
  }
  for (let i = leftEnd; i < left.length; i++) changes.push({ kind: "equal", text: left[i] })
  return changes
}

function compareBlock(before: string, after: string): TextChange[] | null {
  const changes = diffSequence(tokenize(before), tokenize(after))
  const weigh = (text: string) => text.replace(/\s+/g, "").length
  const scale = Math.max(weigh(before), weigh(after))
  if (!scale) return changes
  let shared = 0
  for (const change of changes) if (change.kind === "equal") shared += weigh(change.text)
  return shared / scale >= MIN_BLOCK_SIMILARITY ? changes : null
}

// Both versions are compared with a trailing separator so that a final block is
// matched like any other. Removing it again keeps each version reconstructable.
function dropTrailingSeparator(changes: TextChange[]): TextChange[] {
  const lastOf = (skipped: TextChange["kind"]) => {
    for (let index = changes.length - 1; index >= 0; index--) {
      if (changes[index].kind !== skipped) return index
    }
    return -1
  }
  const beforeIndex = lastOf("added")
  const afterIndex = lastOf("removed")
  const tails: Array<[number, TextChange["kind"]]> = beforeIndex === afterIndex
    ? [[beforeIndex, "equal"]]
    : [[beforeIndex, "removed"], [afterIndex, "added"]]
  for (const [index, kind] of tails.sort(([left], [right]) => right - left)) {
    if (index < 0) continue
    const change = changes[index]
    change.text = change.text.slice(0, -1)
    // The separator survives in one version only, so an equal run has to split.
    if (change.kind === "equal" && kind !== "equal") changes.splice(index + 1, 0, { kind, text: "\n" })
  }
  const merged: TextChange[] = []
  for (const change of changes) {
    if (!change.text) continue
    const previous = merged[merged.length - 1]
    if (previous?.kind === change.kind) previous.text += change.text
    else merged.push(change)
  }
  return merged
}

export function diffReloadText(before: string, after: string): TextChange[] {
  const blocks = diffSequence(splitBlocks(before + "\n"), splitBlocks(after + "\n"))
  const changes: TextChange[] = []
  const append = (kind: TextChange["kind"], text: string) => {
    if (!text) return
    const previous = changes[changes.length - 1]
    if (previous?.kind === kind) previous.text += text
    else changes.push({ kind, text })
  }
  let index = 0
  while (index < blocks.length) {
    if (blocks[index].kind === "equal") {
      append("equal", blocks[index++].text)
      continue
    }
    const removed: string[] = []
    const added: string[] = []
    while (index < blocks.length && blocks[index].kind !== "equal") {
      const block = blocks[index++]
      ;(block.kind === "removed" ? removed : added).push(block.text)
    }
    for (let pair = 0; pair < Math.max(removed.length, added.length); pair++) {
      const rewritten = removed[pair] !== undefined && added[pair] !== undefined
        ? compareBlock(removed[pair], added[pair])
        : null
      if (rewritten) {
        for (const change of rewritten) append(change.kind, change.text)
        continue
      }
      if (removed[pair] !== undefined) append("removed", removed[pair])
      if (added[pair] !== undefined) append("added", added[pair])
    }
  }
  return dropTrailingSeparator(changes)
}

interface PlacedChange extends TextChange {
  beforeOffset: number
  afterOffset: number
}

function markAdded(index: RenderedTextIndex, start: number, end: number) {
  for (const entry of [...index.entries].reverse()) {
    const from = Math.max(start, entry.start) - entry.start
    const to = Math.min(end, entry.end) - entry.start
    if (to <= from) continue
    const selected = entry.node.splitText(from)
    selected.splitText(to - from)
    const mark = document.createElement("ins")
    mark.className = "reload-added"
    selected.replaceWith(mark)
    mark.append(selected)
  }
}

function headingPathAt(index: RenderedTextIndex, offset: number) {
  return index.headings
    .filter(({ start, end }) => offset >= start && offset < end)
    .at(-1)?.path ?? []
}

function childPath(ancestor: Element, element: Element): number[] | null {
  const path: number[] = []
  let node: Element | null = element
  while (node && node !== ancestor) {
    const parent: Element | null = node.parentElement
    if (!parent) return null
    path.unshift(Array.prototype.indexOf.call(parent.children, node))
    node = parent
  }
  return node === ancestor ? path : null
}

function resolvePath(element: Element, path: number[]): Element | null {
  let node: Element | null = element
  for (const step of path) node = node?.children[step] ?? null
  return node
}

// Keep the removed block readable as a block: a deep copy carries its list
// marker, nesting, and inline formatting, and every block inside it records the
// offset a comment on the old text needs.
function cloneRemovedBlock(element: Element, before: RenderedTextIndex): HTMLElement {
  const clone = element.cloneNode(true) as HTMLElement
  for (const span of before.blocks) {
    if (span.element !== element && !element.contains(span.element)) continue
    const path = childPath(element, span.element)
    const target = path && resolvePath(clone, path)
    if (!(target instanceof HTMLElement) || target.dataset.reloadRemoved) continue
    target.dataset.reloadRemoved = "true"
    target.dataset.beforeStart = String(span.start)
    target.dataset.headingPath = JSON.stringify(headingPathAt(before, span.start))
  }
  clone.querySelectorAll(".header-anchor").forEach((anchor) => anchor.remove())
  const mark = document.createElement("del")
  mark.append(...clone.childNodes)
  clone.append(mark)
  clone.classList.add("reload-removed-block")
  clone.dataset.reloadRemoved = "true"
  clone.removeAttribute("id")
  clone.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"))
  return clone
}

function mapToAfter(changes: PlacedChange[], beforeOffset: number) {
  const change = changes.find(({ kind, beforeOffset: start, text }) =>
    kind === "equal" && beforeOffset >= start && beforeOffset < start + text.length)
  return change ? change.afterOffset + (beforeOffset - change.beforeOffset) : null
}

// Find the element in the current document that still holds a before element's
// text, so a removed block can be placed next to the neighbour it used to have.
function counterpart(
  element: Element,
  before: RenderedTextIndex,
  after: RenderedTextIndex,
  changes: PlacedChange[],
) {
  for (const span of before.blocks) {
    if (span.element !== element && !element.contains(span.element)) continue
    const offset = mapToAfter(changes, span.start)
    if (offset === null) continue
    const match = after.blocks.find(({ start, end }) => offset >= start && offset < end)
    if (!match) continue
    let depth = 0
    for (let node: Element | null = span.element; node && node !== element; node = node.parentElement) depth++
    let target = match.element
    while (depth-- > 0 && target.parentElement) target = target.parentElement
    return target
  }
  return null
}

function insertRemovedBlocks(
  root: HTMLElement,
  beforeRoot: HTMLElement,
  source: Element,
  content: Node,
  before: RenderedTextIndex,
  after: RenderedTextIndex,
  changes: PlacedChange[],
) {
  for (let sibling = source.previousElementSibling; sibling; sibling = sibling.previousElementSibling) {
    const target = counterpart(sibling, before, after, changes)
    if (target) return target.after(content)
  }
  for (let sibling = source.nextElementSibling; sibling; sibling = sibling.nextElementSibling) {
    const target = counterpart(sibling, before, after, changes)
    if (target) return target.before(content)
  }
  const parent = source.parentElement
  if (parent && parent !== beforeRoot) {
    // Nothing around the removal survived, so fall back to the container it
    // sat in, and rebuild that container when it is gone as well.
    const host = counterpart(parent, before, after, changes)
    if (host) return host.append(content)
    const wrapper = parent.cloneNode(false) as HTMLElement
    wrapper.removeAttribute("id")
    wrapper.dataset.reloadRemoved = "true"
    wrapper.append(content)
    return insertRemovedBlocks(root, beforeRoot, parent, wrapper, before, after, changes)
  }
  root.append(content)
}

function insertRemovedText(
  root: HTMLElement,
  change: PlacedChange,
  before: RenderedTextIndex,
  after: RenderedTextIndex,
) {
  const mark = document.createElement("del")
  mark.className = "reload-removed"
  mark.dataset.reloadRemoved = "true"
  mark.dataset.beforeStart = String(change.beforeOffset)
  mark.dataset.headingPath = JSON.stringify(headingPathAt(before, change.beforeOffset))
  mark.textContent = change.text
  const entry = after.entries.find(({ end }) => end >= change.afterOffset) ?? after.entries.at(-1)
  if (entry) {
    const range = document.createRange()
    range.setStart(entry.node, Math.min(entry.node.length, Math.max(0, change.afterOffset - entry.start)))
    range.collapse(true)
    range.insertNode(mark)
  } else {
    root.append(mark)
  }
}

function markRemoved(
  root: HTMLElement,
  beforeRoot: HTMLElement,
  change: PlacedChange,
  before: RenderedTextIndex,
  after: RenderedTextIndex,
  changes: PlacedChange[],
) {
  const end = change.beforeOffset + change.text.length
  const touched = before.blocks.filter((span) => span.end > change.beforeOffset && span.start < end)
  // Whitespace between blocks belongs to the renderer, not to the document, so
  // only spans carrying text decide whether whole blocks were removed.
  const blocks = touched.filter((span) => before.text.slice(span.start, span.end).trim())
  const whole = blocks.length > 0 && blocks.every((span) =>
    span.element !== beforeRoot && span.start >= change.beforeOffset && span.end <= end)
  if (!whole) return insertRemovedText(root, change, before, after)
  const outermost: Element[] = []
  for (const { element } of blocks) {
    if (outermost.some((kept) => kept === element || kept.contains(element))) continue
    outermost.push(element)
  }
  for (let index = 0; index < outermost.length;) {
    const group = document.createDocumentFragment()
    const source = outermost[index]
    while (index < outermost.length && outermost[index].parentElement === source.parentElement) {
      group.append(cloneRemovedBlock(outermost[index++], before))
    }
    insertRemovedBlocks(root, beforeRoot, source, group, before, after, changes)
  }
}

export function showReloadChanges(root: HTMLElement, beforeRoot: HTMLElement) {
  const before = buildRenderedTextIndex(beforeRoot)
  const after = buildRenderedTextIndex(root)
  let beforeOffset = 0
  let afterOffset = 0
  const changes: PlacedChange[] = diffReloadText(before.text, after.text).map((change) => {
    const placed = { ...change, beforeOffset, afterOffset }
    if (change.kind !== "added") beforeOffset += change.text.length
    if (change.kind !== "removed") afterOffset += change.text.length
    return placed
  })
  // Work backwards to keep earlier text-node offsets valid as nodes are split.
  for (const change of [...changes].reverse()) {
    if (change.kind === "added") {
      markAdded(after, change.afterOffset, change.afterOffset + change.text.length)
    } else if (change.kind === "removed") {
      markRemoved(root, beforeRoot, change, before, after, changes)
    }
  }
}
