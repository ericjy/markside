---
date: 2026-10-20
status: draft
author: Eric Yang
interview: grill.md
design: spec.md
---

# Intent: HTML diagrams in Markdown docs

> Superseded by [HTML embeds](../2026-10-25-html-embeds/spec.md).

## Problem

Markside docs can only draw diagrams with Mermaid, and Mermaid can't express
the visuals agents want to draw. People have been saying "HTML is the new
markdown" ([Lenny's Newsletter](https://www.lennysnewsletter.com/p/how-i-ai-html-is-the-new-markdown)),
but switching docs to HTML would give up `.md`.

## Proposed outcome

An agent can put a free-form HTML, CSS, and SVG diagram, including interactive
ones, inside a `.md` doc. It renders in Markside wherever the doc is shown, and
reviewers can leave Review Comments on it. Outside Markside the doc is still
ordinary Markdown.

## Affected users and systems

- Agents writing docs, guided by a new diagram skill.
- People reading and reviewing docs in Markside, and people opening shared
  Snapshots.
- Markdown rendering, Preview and Split, PDF Export, the Snapshot viewer, Review
  Comments and the Review file, and Reload Comparison.

## Constraints

- The doc stays `.md`, and existing ```` ```html ```` code examples keep
  rendering as code.
- Diagram code can't affect Markside's UI or send anything over the network
  (`PRODUCT.md` privacy).
- The first version works everywhere the doc renders, including Snapshots, so
  shared docs show what the author saw.
- No theme API for diagrams, no bundled charting libraries, and no change to the
  `markside` skill.
- Mermaid's look is a separate problem and isn't part of this change.

## Open questions

- Can diagrams be isolated with the network blocked on `file://` pages and the
  Snapshot site, and still appear in PDF Export? See the design's open
  questions.
