---
date: 2026-10-25
status: draft
author: Eric Yang
interview: grill.md
design: spec.md
---

# Intent: HTML embeds and explaining in Markside

## Problem

Agents answer in Markdown, which is hard to take in for anything visual.
[Andrej Karpathy recommends](https://x.com/karpathy/status/2053872850101285137)
asking agents to answer in HTML and viewing it in the browser, and notes that
people also need to point at things on screen while working with an agent. A
standalone HTML file can be looked at but not pointed at, and Markside docs can
only draw what Mermaid, tables, and inline SVG express.

## Proposed outcome

The user says "explain X in Markside". The agent writes a visual explanation,
the user comments where it is unclear, and the agent revises it in place: read,
point, and revise on one document. The narrative stays Markdown so Review
Comments anchor to its text. Visuals are HTML files that any `.md` doc
references by relative path and Markside renders in place.

## Affected users and systems

- People asking agents to explain code, designs, or docs, and agents answering
  through the `markside` skill.
- Anyone writing or reading Markdown docs with HTML visuals in Markside, and
  people opening shared Snapshots.
- Markdown rendering, Preview and Split, PDF Export, Review Comments and the
  Review file, Reload Comparison, Link and Hosted Snapshots, and the public
  Snapshot viewer.

## Constraints

- Docs stay `.md`; HTML lives in separate files, never inline.
- Embedded code cannot affect Markside's UI or send anything over the network
  (`PRODUCT.md` privacy).
- Shared Snapshots show what the author saw.
- No file watching (ADR-0002).
- Supersedes the [HTML diagrams](../2026-10-20-html-diagrams/spec.md) design
  and keeps its decisions except where the HTML lives and how agents learn it.

## Open questions

- Can a sandboxed `srcdoc` frame with the network blocked run from the content
  script on `file://` pages and on the Snapshot site, and does browser printing
  capture it?
