---
date: 2026-10-26
status: draft
author: Eric Yang
interview: grill.md
design: spec.md
---

# Intent: New draft from any tab

## Problem

Starting a new Markdown file in Markside needs a Markdown file already open in
Markside, an opened folder, and a name and location chosen before writing. When
the user is on any other tab, such as a Google search, and wants to jot
something down or paste Markdown, there is no quick way to start.

## Proposed outcome

From any tab, **New draft** in the popup opens a Markside tab where the user
can type or paste Markdown immediately. The user chooses where to save the draft
when saving it. Afterwards the user can keep editing there, and opens the saved
file from its folder to use the rest of Markside.

## Affected users and systems

- People who want to capture or paste Markdown while browsing.
- The popup, a new extension page for the draft, the source editor and Preview,
  saving, and the documentation of Markside's surfaces.

## Constraints

- Works from any tab, with no Markdown file open.
- The user chooses the save location for each draft; there is no fixed drafts folder.
- No new extension permission, in particular not `downloads`.
- The draft is not lost if the tab is closed before saving.
- After the first save, editing continues in the same tab and later saves need no dialog.
- The user is told that the file tree, Reviews, and relative images require reopening the saved file.

## Open questions

- Should a keyboard shortcut also open a new draft? Use after release can settle this.
- Should one draft be kept, or several? The first version keeps one.
- How should "draft" be named alongside the existing term Unsaved Draft?
