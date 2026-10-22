---
date: 2026-10-20
status: proposed
intent: intent.md
---

# HTML Diagrams

> Proposed design. Nothing here is implemented yet. Current behavior is in `docs/system-design.md`.

## Goal

Let agents add free-form HTML diagrams to Markdown docs while the file stays
`.md`. Mermaid can't express the visuals agents want to draw. Prompted by
["HTML is the new markdown"](https://www.lennysnewsletter.com/p/how-i-ai-html-is-the-new-markdown).

Mermaid's look (theme, fonts, spacing) is a separate problem and can be fixed
independently.

## Current state

- Mermaid renders in Preview (`lib/mermaid.ts`, `securityLevel: "strict"`) with
  zoom, pan, and an expanded view.
- Raw HTML is already enabled: `lib/markdown.ts` sets `html: true`, and output
  passes through default DOMPurify (`hooks/use-content-preview.ts`). Inline
  `<svg>`, styled `<div>`s, and `<details>` render today; scripts are stripped.
  `docs/system-design.md` still says raw HTML is disabled.
- The Snapshot viewer, PDF Export, Reload Comparison, and text-anchored Review
  Comments (ADR-0005) all depend on the rendered DOM. Every diagram format has to
  work with each of them.

## Decisions

### Format: opt-in fence

Only ```` ```html render ```` blocks become diagrams. Plain ```` ```html ````
stays highlighted code, so existing docs that show HTML examples don't change.
A new language name was rejected because it breaks highlighting in other Markdown
tools, and rendering every `html` block would turn examples into live pages.

````md
```html render
<svg viewBox="0 0 200 80">…</svg>
```
````

### Rendering: sandboxed frame

Each block renders in a sandboxed frame with an isolated origin, sized to fit its
content. Rendering into the document directly would let diagram styles and code
reach Markside's UI. A separate HTML file would break the single-`.md` goal, and
SVG-only would rule out the HTML layouts agents produce well.

### Code policy: scripts run, network blocked

Diagram JavaScript runs inside the frame, and a content policy blocks every
network request. Static-only would rule out interactive diagrams. Allowing the
network would let a document send local content elsewhere, which breaks the
privacy constraint in `PRODUCT.md`.

### Styling: diagrams style themselves

Markside adds no theme variables or base stylesheet. Each diagram looks exactly
as its author wrote it, including in dark mode. Shared variables would become an
API that agents have to learn and Markside would have to keep stable.

### Review Comments: whole-diagram comments

A comment button on the diagram creates a Review Comment tied to the block and
its source line. Selecting text inside the frame can come later. Comment-only in
Source view was rejected because reviewers read in Preview.

A whole-diagram comment's `quote` in the Review file (ADR-0008) is
`[HTML diagram]`, and its `line` points at the opening fence. The line already
identifies the block, and a fixed label keeps agent output short. Quoting the
diagram source could flood the output, and quoting its first visible text means
reading into the frame.

### Controls: expand only

Frames get one expand button, and the diagram handles its own interaction.
Mermaid's zoom and pan would fight clicks and drags inside interactive diagrams.
Zoom can be added later if large diagrams need it.

### Reload Comparison: mark the whole diagram

A diagram whose source changed gets the addition outline and a Changed label; a
removed diagram returns as a struck-through placeholder. The block diff can't see
inside a frame, and rendering old and new versions side by side doubles the
frames for little gain.

### Where diagrams render: everywhere in v1

Preview, Split, PDF Export, and the public Snapshot viewer all render diagrams in
the first version, with the same sandbox and network block on the website.
Shipping without Snapshots would make shared docs show different content from
what the author saw.

### Editing: rebuild changed diagrams only

In Split view, on the existing deferred schedule, Markside rebuilds only frames
whose source changed. Other diagrams keep their state, such as an expanded
section or a selected tab.

### Agent guidance: separate skill

A new `skills/markside-diagram` skill loads when an agent writes a Markdown file
that needs a diagram. The `markside` skill stays unchanged, because it triggers
only when the user asks for Markside, while diagrams are needed whenever an agent
writes a doc.

### Size: no new limit

The skill tells agents to write plain HTML, CSS, and SVG without pasted
libraries. Existing Snapshot limits apply. Shipping charting libraries with
Markside or capping diagram size were rejected for v1.

## Relation to other designs

[Diagram engines beyond Mermaid](../2026-10-19-diagram-engines/spec.md) covers
declarative languages (Vega-Lite, Graphviz, PlantUML) rendered by bundled
engines. HTML diagrams are a separate path: the author writes the markup and
Markside only isolates it. Both designs touch the special-casing of `mermaid` in
`lib/markdown.ts`, `lib/shiki.ts`, and `lib/rendered-copy.ts`, so a shared
registry of rendered fences should cover both.

HTML diagrams come first. The engines design waits for demand, since a Vega-style
chart can be drawn as an HTML diagram.

## Open questions

- **Frame mechanism.** A `srcdoc` frame with `sandbox="allow-scripts"` (no
  `allow-same-origin`) gives an opaque origin, and a CSP `<meta>` tag can block
  the network. Verify that this works from the content script on `file://` pages
  and on the Snapshot site, and whether the frame inherits the embedder's CSP.
- **Sizing.** Fitting the frame to its content needs a size message from inside
  the frame. Markside has to inject that script alongside the author's code.
- **Anchoring.** Decide how a whole-diagram comment reattaches after edits, since
  ADR-0005 anchors by rendered text.
- **PDF Export.** Confirm that browser printing captures frame contents
  (ADR-0003).
