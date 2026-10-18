import { StateEffect, StateField } from "@codemirror/state"
import { Decoration, EditorView, type DecorationSet } from "@codemirror/view"

const setRevealedEditorLine = StateEffect.define<number | null>({
  map: (position, changes) => position === null ? null : changes.mapPos(position),
})

const revealedEditorLineField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update: (decorations, transaction) => {
    let next = decorations.map(transaction.changes)
    for (const effect of transaction.effects) {
      if (!effect.is(setRevealedEditorLine)) continue
      next = effect.value === null
        ? Decoration.none
        : Decoration.set([
            Decoration.line({ class: "cm-revealed-line" }).range(effect.value),
          ])
    }
    return next
  },
  provide: (field) => EditorView.decorations.from(field),
})

export const revealedEditorLineExtension = [
  revealedEditorLineField,
  EditorView.baseTheme({
    ".cm-revealed-line": {
      backgroundColor: "hsl(var(--source-reveal) / 0.16)",
      borderRadius: "3px",
    },
  }),
]

export function revealEditorLineInView(view: EditorView, line: number): void {
  const clamped = Math.min(Math.max(line, 1), view.state.doc.lines)
  const { from } = view.state.doc.line(clamped)
  view.dispatch({
    selection: { anchor: from },
    effects: [
      setRevealedEditorLine.of(from),
      EditorView.scrollIntoView(from, { y: "center" }),
    ],
  })
  view.focus()
}

export function clearRevealedEditorLineInView(view: EditorView): void {
  view.dispatch({ effects: setRevealedEditorLine.of(null) })
}
