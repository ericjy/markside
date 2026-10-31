# Quieter diagram controls

The questions were asked in chat on 2026-10-30.

## Q1. What prompted the change?

The user found that the toolbar above each diagram made diagrams look busy, and
asked whether it should appear only on hover, for Mermaid diagrams and Vega-Lite
charts alike.

## Q2. Which controls stay in the document?

> **Decision:** On hover, zoom and Expand float at the diagram's top right. The
> select and pan controls appear only in Expanded view.

The assistant recommended showing Expand alone. The user chose to keep zoom, and
accepted that the floating controls cover slightly more of the diagram.

## Implementation choices

These were not put to the user:

- The toolbar takes no space in the document, so a diagram sits closer to its text.
- Keyboard focus also reveals the controls, and touch screens always show them.
- Closing Expanded view returns to text selection, because the document has no
  control to leave Pan mode.
- Question Card diagrams keep Expand alone, as already decided.
