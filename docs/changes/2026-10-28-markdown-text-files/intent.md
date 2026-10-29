---
date: 2026-10-28
status: accepted
interview: grill.md
design: spec.md
---

# Intent: Open `.md.txt` as Markdown

## Problem

A user opening a Markdown file whose actual name ends in `.md.txt` sees text
instead of Markdown. On Windows, hidden file extensions can make the extra
`.txt` difficult to notice.

## Proposed outcome

When Markside opens such a local file, offer to treat it as Markdown so the
user can read it without first changing its filename. The user may instead
keep it as text.

## Affected users and systems

People opening `.md.txt` files, the content application and Source editor,
Markdown rendering, and documentation.

## Constraints

- Ask before treating the file as Markdown.
- Keep its filename and save target unchanged.
- Retain the existing handling of other text files.
- Do not watch files or add permissions.

## Open questions

- How long should the choice last? The specification records the temporary
  per-open choice as an implementation assumption.
