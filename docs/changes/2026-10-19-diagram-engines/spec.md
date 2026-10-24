---
date: 2026-10-19
status: proposed
---

# Diagram Engines Beyond Mermaid

> Proposed design. Nothing here is implemented yet. Current behavior is in `docs/system-design.md`.
>
> Mermaid's move to on-demand loading is superseded by
> [Render Mermaid diagrams with Pele](../2026-10-24-pele-diagrams/spec.md), which
> replaced the Mermaid bundle. The rest of this design remains proposed.

## Goal

Decide which diagram languages besides Mermaid Markside should render, and how to
add them. Requested in [issue #1](https://github.com/ericjy/markside/issues/1),
which links [markdown.org/tools/diagrams](https://markdown.org/tools/diagrams/).
The requester's concrete use case was a Vega line chart.

## Current state

- `lib/mermaid.ts` renders `pre > code.language-mermaid` blocks after the Markdown
  pass, during idle-time preview enhancement (`hooks/use-content-preview.ts`).
- Most of `lib/mermaid.ts` is engine-agnostic: toolbar, zoom, pan, fit, expand,
  and theme re-render from `data-mermaid-src`. Only `init` and `mermaid.render` are
  Mermaid-specific.
- Mermaid is a static import of a 6.4 MB pre-bundle. The production content script
  is 7.1 MB and loads on every matched `file://` page, including `.json`, `.txt`,
  and `.log`.
- `mermaid` is special-cased by name in `lib/markdown.ts` (no code-block chrome),
  `lib/shiki.ts` (no highlighting), and `lib/rendered-copy.ts` (strip
  `data-mermaid-src`).

## Findings

### Mermaid already covers most of the list

Roughly 23 of the types on markdown.org's list are Mermaid diagram types:
flowchart, sequence, class, state, ER, Gantt, timeline, mind map, journey, Git
graph, requirement, Kanban, architecture, pie, quadrant, Sankey, XY chart, block,
packet, radar, treemap, C4, and ZenUML. Simple line and bar charts work today
through `xychart-beta`:

````md
```mermaid
xychart-beta
  title "Requests"
  x-axis [Mon, Tue, Wed, Thu, Fri]
  y-axis "count" 0 --> 120
  line [30, 55, 80, 70, 110]
```
````

### Server renderers are excluded

Kroki and hosted PlantUML servers would send local file contents to a third
party. Every engine must render locally.

### Candidates

| Engine | Fence | Local renderer | Size (npm unpacked) | Verdict |
|---|---|---|---|---|
| Vega-Lite / Vega | `vega-lite`, `vega` | `vega`, `vega-lite`, `vega-interpreter` | ~10 MB combined | Yes. It has a real request and needs no WASM. |
| Graphviz | `dot`, `graphviz` | `@hpcc-js/wasm-graphviz` (WASM) | ~2 MB | Yes. Mature, and it handles large dense graphs better than Mermaid. |
| PlantUML | `plantuml`, `puml` | `@plantuml/core` (TeaVM build, Graphviz WASM) | ~7 MB | Later, on demand. |
| D2 | `d2` | `@terrastruct/d2` | ~60 MB | No. Too large. |
| WaveDrom, ABC, SMILES, Newick, BPMN, railroad, Pikchr, svgbob | various | various | small to ~7 MB | No. Too niche for an agent-review audience. |
| Visual editors on markdown.org (floor plan, circuit, and others) | — | — | — | Out of scope. They are editors, not Markdown renderers. |

Unpacked sizes include several dist formats and overstate the shipped size. The
relative order still holds.

### Engine notes

**Vega-Lite.** Vega compiles expressions with `new Function`, which MV3's
content-script CSP blocks. Vega's CSP-safe mode avoids that by parsing
expressions to an AST and evaluating them with `vega-interpreter`:
`{ ast: true, expr: expressionInterpreter }`. Charts must render to SVG, not
canvas, so text stays selectable for Review comments.

**Graphviz.** WASM needs `wasm-unsafe-eval`. MV3 allows it by default, but this
must be verified in the content script's isolated world. Graphviz has no themes,
so dark mode needs SVG post-processing, for example rewriting black fills and
strokes to `currentColor`. DOT supports `href`/`URL` attributes, so the SVG must
go through DOMPurify's SVG profile. Mermaid's `securityLevel: "strict"` does this
job today.

**PlantUML.** PlantUML published an official browser build, `@plantuml/core`, on
2026-05-26. It is compiled from Java with TeaVM and needs no server and no Java.
Its own [PlantUML for GitHub](https://github.com/plantuml/plantuml-for-github)
extension uses it. Everything except sequence diagrams is laid out by a bundled
Graphviz WASM loaded as a classic global script (`viz-global.js`), which
Markside's content script cannot load as-is. Bundling it with esbuild might work,
but this is unverified. The package is young and releases often.

### Review comments

Review comments anchor by text (ADR-0005). Every engine must produce real SVG
`<text>`, never canvas or text converted to paths. Mermaid, Graphviz, PlantUML,
and Vega's SVG renderer all qualify.

## Proposed design

### 1. Load engines on demand

Engines must not grow the content script. Each engine pre-bundle (ADR-0001)
becomes a web-accessible resource that is imported only when a page contains a
matching fence:

```ts
const { render } = await import(chrome.runtime.getURL("diagram-graphviz.js"))
```

Mermaid moves to the same path. On its own, that cuts about 6 MB from every
`file://` page load.

**Open question:** the [Mermaid design](../2026-04-12-mermaid-support/spec.md) found
that Parcel's dynamic-import chunks fail to load on `file://` pages. Importing
an esbuild bundle by extension URL is a different mechanism, but it needs a
spike before anything else. The resource must be declared for `file:///*`
matches.

### 2. Generalize the diagram block

Split `lib/mermaid.ts` into:

- **Diagram chrome:** toolbar, viewport, zoom, pan, fit, expand, and
  re-render. Rename the `mermaid-*` classes and data attributes to `diagram-*`.
- **Engine registry:** language names plus a render function.

```ts
type DiagramEngine = {
  languages: string[]
  load: () => Promise<{
    render: (source: string, dark: boolean) => Promise<string> // SVG
  }>
}
```

`lib/markdown.ts`, `lib/shiki.ts`, and `lib/rendered-copy.ts` check the registry
instead of the literal `mermaid`. Errors render the existing error block with the
engine name.

### 3. Add engines by demand

1. Vega-Lite and Vega, which have the only concrete request.
2. Graphviz or PlantUML, whichever is requested next. If PlantUML comes first,
   load Graphviz through PlantUML's bundled WASM so `dot` costs almost nothing
   extra.

Each engine adds a bundle script to `bundle-engine` and updates
`docs/system-design.md`, `docs/user-guide.md`, `docs/manual-test.md`, and the
store listing.

## Testing

- Unit: registry lookup, fence detection, error blocks, and SVG sanitizing in
  jsdom, extending `lib/mermaid.test.ts`.
- Manual: each engine on a `file://` page in light and dark themes. Check
  expand, pan, and zoom, Review comments on diagram text, PDF export, and that
  the content script size does not grow.
