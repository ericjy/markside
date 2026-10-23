---
date: 2026-10-22
status: draft
author: Eric Yang
interview: grill.md
design: spec.md
---

# Intent: Zen mode

## Problem

There is too much interface around the document while reading long docs or
agent plans, and it is hard to concentrate while writing in Source. Markside can
hide the file tree and Outline one at a time, but nothing clears the screen at
once.

## Proposed outcome

One action hides Markside's surrounding interface in any view, so the document
fills the screen for reading or writing. The tools for the task at hand, such as
an open Review panel and the notices that need attention, stay available. The
mode lasts while the user moves between files in the tab and is easy to leave.

## Affected users and systems

- People reading long docs or reviewing agent plans in Preview.
- People writing in Source or Split.
- The toolbar, file tree, Outline, file actions menu, keyboard shortcuts, Escape
  handling, and Review layout.

## Constraints

- Works in Preview, Source, and Split, and for other file types.
- Hides only Markside's interface; Chrome full screen stays separate.
- Stays on in the tab until turned off, including across reloads; new tabs
  start with it off.
- Existing preferences, such as Page width and the saved Outline choice, are
  unchanged.
- No writing aids, such as dimming text or centering the current line, in the
  first version.

## Open questions

- Does hiding the interface help enough with concentrating in Source, or will
  writing aids be needed later? Use after release can settle this.
- Does Chrome pass Cmd/Ctrl+Shift+Enter to the page on every platform? Checking
  in Chrome before implementing settles this.
