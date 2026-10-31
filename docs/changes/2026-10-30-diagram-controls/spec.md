---
date: 2026-10-30
status: implemented
intent: intent.md
interview: grill.md
---

# Quieter diagram controls

| Requirement | Decided by |
| --- | --- |
| R1. In a document, zoom and Expand float at a diagram's top right, shown on hover or keyboard focus, and take no layout space. | [Q2](grill.md#q2-which-controls-stay-in-the-document) |
| R2. Select and pan controls appear only in Expanded view. Shift-drag and the arrow keys still pan in the document. | [Q2](grill.md#q2-which-controls-stay-in-the-document) |
| R3. Closing Expanded view returns to text selection. | [Implementation choices](grill.md#implementation-choices) |
| R4. Devices without hover always show the floating controls. | [Implementation choices](grill.md#implementation-choices) |

## Design

The toolbar is positioned over `.mermaid-block` outside Expanded view, as it
already was for Question Card diagrams. It appears on `:hover` and on
`:has(:focus-visible)`, so clicking a diagram to select its text doesn't leave
the controls showing.

## Constraint coverage

| Intent constraint | Design |
| --- | --- |
| Review Comments keep working | Dragging still selects text, and R3 prevents a hidden Pan mode. |
| Keyboard and touch access | `:focus-visible` reveals the controls; R4 covers touch. |

## Areas of concern

- The floating controls can cover the top right of a diagram while hovered.
  Owner: Markside.
