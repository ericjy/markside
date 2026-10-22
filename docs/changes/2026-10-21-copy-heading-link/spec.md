---
date: 2026-10-21
status: confirmed
interview: grill.md
---

# Copy a link to a heading

## Behavior

Add a Copy link button beside the existing heading # navigation link. Keep #
navigation unchanged. Copy the full current local file URL and generated heading
identifier as plain text, without changing reading position or saving the file.

Support H1 through H6 in Preview and Split, including Question Card headings
with identifiers. Exclude removed historical headings shown by Reload Comparison.

Reveal heading controls on hover or keyboard focus. Keep them visible on devices
without hover. Show brief inline success feedback and an actionable error on
failure, with screen-reader announcements.

## Link identity

Build the link from the file currently being read, including after navigation
through the file tree. Copying remains available with an Unsaved Draft and uses
the displayed heading. Unsaved headings may not exist when the file is reopened.

Use existing paths and generated heading identifiers. Moving a file, renaming
a heading, or changing duplicate headings may break earlier links.

Heading controls stay out of printed pages and copied document content. Review
Comments on headings continue to attach to heading text.
