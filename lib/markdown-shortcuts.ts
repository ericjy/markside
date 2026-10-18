import {
  Transaction,
  type ChangeSpec,
  type Text,
} from "@codemirror/state"
import type { EditorView, KeyBinding } from "@codemirror/view"

import {
  clearRevealedEditorLineInView,
  revealEditorLineInView,
  revealedEditorLineExtension,
} from "./codemirror-bundle.mjs"

import {
  createMarkdownEdit,
  type MarkdownInsert,
} from "./markdown-toolbar"

export function applyMarkdownEdit(
  view: EditorView,
  action: MarkdownInsert,
): boolean {
  const { from, to } = view.state.selection.main
  const doc = view.state.doc.toString()
  const edit = createMarkdownEdit(
    action,
    doc.slice(from, to),
    doc.slice(0, from),
    doc.slice(to),
  )

  view.dispatch({
    changes: { from, to, insert: edit.insert },
    selection: {
      anchor: from + edit.selectionFrom,
      head: from + edit.selectionTo,
    },
    annotations: Transaction.userEvent.of("input"),
    scrollIntoView: true,
  })
  view.focus()
  return true
}

export { revealedEditorLineExtension }

export function revealEditorLine(view: EditorView, line: number): void {
  revealEditorLineInView(view, line)
}

export function clearRevealedEditorLine(view: EditorView): void {
  clearRevealedEditorLineInView(view)
}

export const markdownFormattingKeymap: readonly KeyBinding[] = [
  {
    key: "Mod-b",
    run: (view) => applyMarkdownEdit(view, "bold"),
  },
]

export type HeadingShiftDirection = "promote" | "demote"

function getMarkdownHeadingShiftChanges(
  doc: Text,
  direction: HeadingShiftDirection,
  firstLineNumber = 1,
  lastLineNumber = doc.lines,
): ChangeSpec[] {
  const changes: ChangeSpec[] = []
  let fence: { character: string; length: number } | null = null
  for (let lineNumber = 1; lineNumber <= doc.lines; lineNumber++) {
    const line = doc.line(lineNumber)
    if (fence) {
      const closing = /^ {0,3}(`{3,}|~{3,})[ \t]*$/.exec(line.text)
      if (
        closing &&
        closing[1][0] === fence.character &&
        closing[1].length >= fence.length
      ) {
        fence = null
      }
      continue
    }

    const opening = /^ {0,3}(`{3,}|~{3,})/.exec(line.text)
    if (opening) {
      fence = {
        character: opening[1][0],
        length: opening[1].length,
      }
      continue
    }

    if (lineNumber < firstLineNumber || lineNumber > lastLineNumber) continue
    const match = /^( {0,3})(#{1,6})(?:[ \t]+|$)/.exec(line.text)
    if (!match) continue
    const markerFrom = line.from + match[1].length
    if (direction === "demote" && match[2].length < 6) {
      changes.push({ from: markerFrom, insert: "#" })
    }
    if (direction === "promote" && match[2].length > 1) {
      changes.push({ from: markerFrom, to: markerFrom + 1 })
    }
  }
  return changes
}

export function shiftMarkdownHeadings(
  view: EditorView,
  direction: HeadingShiftDirection,
): boolean {
  const selection = view.state.selection.main
  const firstLineNumber = selection.empty
    ? 1
    : view.state.doc.lineAt(selection.from).number
  const lastLineNumber = selection.empty
    ? view.state.doc.lines
    : view.state.doc.lineAt(selection.to - 1).number
  const changes = getMarkdownHeadingShiftChanges(
    view.state.doc,
    direction,
    firstLineNumber,
    lastLineNumber,
  )
  if (changes.length === 0) return false

  view.dispatch({
    changes,
    annotations: Transaction.userEvent.of("input"),
  })
  view.focus()
  return true
}

function applyMarkdownHeading(view: EditorView, level: number): boolean {
  const selection = view.state.selection.main
  const firstLine = view.state.doc.lineAt(selection.from)
  const lastPosition =
    selection.to > selection.from ? selection.to - 1 : selection.to
  const lastLine = view.state.doc.lineAt(lastPosition)
  const from = firstLine.from
  const to = lastLine.to
  const prefix = `${"#".repeat(level)} `
  const selectedLines = view.state.sliceDoc(from, to) || "Heading"
  const insert = selectedLines
    .split("\n")
    .map((line) => `${prefix}${line.replace(/^ {0,3}#{1,6}(?:[ \t]+|$)/, "")}`)
    .join("\n")

  view.dispatch({
    changes: { from, to, insert },
    selection: {
      anchor: from + prefix.length,
      head: from + insert.length,
    },
    annotations: Transaction.userEvent.of("input"),
    scrollIntoView: true,
  })
  view.focus()
  return true
}

export function handleMarkdownHeadingShortcut(
  event: KeyboardEvent,
  view: EditorView,
): boolean {
  if (
    !event.altKey ||
    event.shiftKey ||
    (!event.metaKey && !event.ctrlKey) ||
    event.getModifierState("AltGraph")
  ) {
    return false
  }

  const match = /^Digit([1-4])$/.exec(event.code)
  if (!match) return false
  event.preventDefault()
  return applyMarkdownHeading(view, Number(match[1]))
}
