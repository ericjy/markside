---
date: 2026-10-24
status: implemented
intent: intent.md
interview: grill.md
---

# Render Mermaid diagrams with Pele

| Requirement | Decided by |
| --- | --- |
| R1. Render `mermaid` fences with Pele. Remove the Mermaid dependency, its pre-bundle script, and its `package.json` alias. | [Q3](grill.md#q3-does-mermaid-stay-in-markside-at-all) |
| R2. A fence Pele cannot render shows the existing error block with Pele's message, including the line and column. No fallback renderer runs. | [Q3](grill.md#q3-does-mermaid-stay-in-markside-at-all), [Confirmed details](grill.md#confirmed-details) |
| R3. Diagrams use the document font and Markside's palette in light and dark themes. Chart series keep Pele's own colors. | [Q1](grill.md#q1-what-prompted-the-switch-to-pele), [Confirmed details](grill.md#confirmed-details) |
| R4. Switching between light and dark changes diagram colors without redrawing, so a zoomed or panned diagram keeps its view. | [Confirmed details](grill.md#confirmed-details) |
| R5. Diagrams in a Question Card or archived question use the same palette as other diagrams. They keep their natural size and the Expand-only control. | [Q6](grill.md#q6-how-should-diagrams-look-inside-a-question-card) |
| R6. Inline diagrams are never enlarged beyond their natural size. Wide diagrams still shrink to fit, and Expanded view still fits the diagram to the screen. | [Q10](grill.md#q10-how-large-should-a-compact-diagram-appear-in-the-document) |
| R7. Edges marked with `id@{ animate: true }` or `animation: slow\|fast` show moving dashes, at 20 s per cycle for fast and 50 s for slow. They stop moving when the system's reduce-motion setting is on. | [Q4](grill.md#q4-which-gaps-did-your-checks-find), [Q5](grill.md#q5-how-should-markside-handle-mermaid-features-pele-parses-but-does-not-draw) |
| R8. Each Markside workaround for a Pele gap is marked in code and reported upstream, and is removed once Pele draws the feature. The agent asks before posting a report. | [Q5](grill.md#q5-how-should-markside-handle-mermaid-features-pele-parses-but-does-not-draw), [Confirmed details](grill.md#confirmed-details) |
| R9. Import Pele directly. ADR-0001 and the agent guidelines drop Mermaid from the pre-bundled dependencies. | [Q7](grill.md#q7-how-should-markside-include-pele-in-its-build) |
| R10. Pin Pele to an exact version, starting at 1.9.0. Each upgrade is its own commit that runs the tests and the manual diagram checks. | [Q8](grill.md#q8-how-should-markside-take-pele-updates) |
| R11. Review comments on diagram text, PDF Export, and rendered copy keep working. | [Q4](grill.md#q4-which-gaps-did-your-checks-find) |
| R12. Fences stay `mermaid`, and user-facing text still calls them Mermaid diagrams. | [Confirmed details](grill.md#confirmed-details) |
| R13. This design supersedes Mermaid's move to on-demand loading in [Diagram engines beyond Mermaid](../2026-10-19-diagram-engines/spec.md). The rest of that design stays proposed. | [Q9](grill.md#q9-what-happens-to-the-proposed-design-for-other-diagram-engines) |

## Design

### Renderer

`lib/mermaid.ts` keeps its toolbar, viewport, zoom, pan, expand, and error
block. Its `mermaid-*` class names and `data-mermaid-src` attribute stay, so
`lib/markdown.ts`, `lib/shiki.ts`, `lib/rendered-copy.ts`, Zen mode, and the
Review code need no changes.

Pele's `render()` is synchronous. Each block renders with the computed font
family of its container and a unique `idPrefix`:

```ts
render(code, { fontFamily, idPrefix: `mermaid-${++idCounter}-` }).svg
```

The Mermaid theme setup (`init`) is removed. `renderMermaidBlocks` keeps its
`dark` parameter only if a caller still needs it; theme changes no longer call
`rerenderMermaidBlocks` from `components/content-app.tsx`. Pele throws a
`PeleError` carrying a message, line, and column, which fills the existing
error block.

### Colors

Pele reads colors from CSS variables at display time. `.mermaid-block` maps
them to Markside's theme variables, so theme changes need no re-render:

| Pele variable | Markside value |
| --- | --- |
| `--pele-bg` | `--background` |
| `--pele-fg` | `--foreground` |
| `--pele-muted`, `--pele-line` | `--muted-foreground` |
| `--pele-surface` | `--muted` |
| `--pele-surface-alt` | `--accent` |
| `--pele-border` | `--muted-foreground` at 60% |
| `--pele-accent` | `--sidebar-ring` |

`--pele-series-1` through `--pele-series-8` keep Pele's defaults.

### Size

`fitViewportToDefaultScale` already limits Question Card diagrams to their
natural size, computed from the SVG `viewBox` width. Inline diagrams use the
same limit instead of `MAX_DEFAULT_SCALE` (3.5). Expanded view keeps
`MAX_EXPANDED_DEFAULT_SCALE`, and the 75% minimum for inline diagrams is
unchanged.

### Animated edges

Pele keeps explicit edge IDs as `data-id` on `g.pele-edge` but ignores
`animate` and `animation`. `readEdgeAnimations()` reads lines of the form
`id@{ … }` from the source; `animation: slow|fast` or `animate: true` enables
animation, defaulting to fast, and `animate: false` disables it. The rendered
SVG string gets `mermaid-edge-animated` and `data-animation` on the matching
edge groups. CSS animates `stroke-dashoffset` on the edge's line, not its
arrowhead, using Mermaid's 9/5 dash pattern, and turns the animation off under
`prefers-reduced-motion: reduce`. A comment marks the workaround for removal.

### Build

Remove `scripts/bundle-mermaid.mjs`, its calls in the `bundle-engine`, `dev`,
and `build` scripts, the `mermaid` dependency, and the `mermaid` alias. Add
`pele` at an exact version. Parcel bundles Pele directly; Pele uses no `eval`
or `new Function`.

### Documentation

- `docs/adr/0001-prebundle-esm-only-dependencies.md`, `CLAUDE.md`, and
  `AGENTS.md`: list Shiki and CodeMirror only, and note that Pele is imported
  directly.
- `docs/system-design.md`: replace the Mermaid enhancement, theme-change
  re-render, and Question Card neutral-theme descriptions.
- `docs/user-guide.md`: replace the 75%–350% scaling description with natural
  size.
- `docs/manual-test.md`: add checks for animated edges, a compact diagram at
  natural size, a theme switch on a zoomed diagram, and a syntax error.
- Mark the Mermaid portion of the diagram-engines spec as superseded, and add
  this spec to the change index.

## Intent constraints

| Constraint | How it is met |
| --- | --- |
| Size, speed, and appearance do not regress | Content script drops from 7.2 MB to 4.9 MB; 14 sample diagrams render in 32 ms instead of 214 ms; diagrams use the document font and palette (R3) |
| Diagrams render locally | Pele is bundled into the content script and makes no network requests |
| Real text for Review comments (ADR-0005) | Pele draws labels as SVG `<text>`; drag-selecting a label shows the Comment toolbar in the spike |
| Extension content security policy | Pele uses no `eval` or `new Function` |
| Review comments, PDF Export, and rendered copy keep working | Checked on the spike (R11) |

## Open questions

None. The intent recorded none.

## Areas of concern

| Concern | Owner |
| --- | --- |
| Pele is three weeks old and releases often. Pinning (R10) contains the risk, but syntax Pele does not yet support renders as an error block. | Eric |
| Diagrams that only Mermaid can draw, including ZenUML, stop rendering. The error block still shows their source. | Eric |
| Pele measures text with a canvas, which jsdom lacks. `lib/mermaid.test.ts` must mock `pele` for layout and toolbar tests and test `readEdgeAnimations` directly; rendering is covered by the manual test. | Implementer |
| The animated-edges workaround parses Mermaid syntax separately from Pele and may diverge from it. It is removed when Pele draws animated edges (R8). | Implementer |
