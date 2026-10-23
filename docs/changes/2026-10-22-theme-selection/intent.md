---
date: 2026-10-22
status: accepted
author: Eric Yang
interview: grill.md
design: spec.md
---

# Theme selection

## Problem

Readers can toggle Markside between light and dark, but cannot choose a visual
style for reading. Eric asked to let users select a theme and chose a catalog
of several named light and dark palettes during the interview.

## Proposed outcome

Replace the toolbar toggle with a theme menu offering System, Light, Dark,
Paper, Solarized Light, Nord, and Dracula. Show small color samples and the
selected choice. Selecting a theme applies it across the document workspace,
saves it for later, and updates other open Markside document tabs.

System follows the existing Light and Dark appearances. A named theme stays
fixed until the reader chooses something else.

## Affected users and systems

Readers of local Markdown, other text files, and images use the same selected
workspace appearance. The change covers the toolbar, file tree, Outline,
Review controls, Preview, Source, code blocks, Mermaid, and image-viewer
backgrounds.

## Constraints

- Offer six named themes in the first release, with System as an additional choice.
- Coordinate code and diagram colors with the selected palette.
- Preserve existing Light and Dark appearances and saved choices.
- Apply only when selected; show samples without hover previews.
- Keep Typeface, Page width, and layout choices when changing theme.
- Keep Settings, the popup, PDF Export, and the separate Snapshot viewer on their existing appearance policies.
- Keep authored diagram colors and image pixels unchanged.

## Open questions

No product-scope questions remain from the interview. Exact new palette tokens
and their contrast checks are implementation work. The interview did not
establish how frequently readers need theme selection or provide usage evidence.
