---
date: 2026-10-30
status: implemented
intent: intent.md
interview: grill.md
---

# Vega-Lite charts

| Requirement | Decided by |
| --- | --- |
| R1. A `vega-lite` fence containing a JSON spec renders as a chart in Preview and Split. Other fences, including `vega`, are unchanged. | [Q2](grill.md#q2-which-fences-render) |
| R2. Charts use inline data. A chart that asks for a URL shows an error block; Markside makes no request and reads no file for it. | [Q3](grill.md#q3-what-happens-with-dataurl) |
| R3. The chart engine loads only when a document has a `vega-lite` fence. | [Q4](grill.md#q4-how-does-the-code-load) |
| R4. The website's Snapshot viewer renders the same fence under R1 and R2. | [Q5](grill.md#q5-what-do-share-link-recipients-see) |
| R5. Charts have the diagram toolbar, zoom, pan, expand, and error block, and follow the document font and theme. | [Implementation choices](grill.md#implementation-choices) |
| R6. Chart text stays real SVG text, so Review Comments work as they do on diagrams. | [ADR-0005](../../adr/0005-anchor-review-comments-by-text.md) |

## Design

### Engine

`lib/vega-engine.ts` is the only code that imports `vega`, `vega-lite`, and
`vega-interpreter`. `scripts/bundle-vega.mjs` bundles it with esbuild to
`lib/vega-engine-bundle.js`, as ADR-0001 does for other ESM graphs.
`scripts/fix-manifest.mjs` copies that file into the build as `vega-engine.js`
and declares it a web-accessible resource.

Parcel rewrites `import()` into its own module lookup, so the import lives in
`scripts/vega-engine-loader.js`, which Parcel never sees. `fix-manifest.mjs` adds
that file before the content script and to the New Draft page. `lib/mermaid.ts`
calls it the first time a document has a chart.

The engine compiles the spec, runs it with `vega-interpreter` because MV3 blocks
`new Function`, and returns an SVG string.

### External data

Vega's loader is replaced with one that refuses everything, so this is the one
place a request could start. Vega logs a failed load and carries on with no
data, so the engine records the refusal and throws afterward. The output is
sanitized with DOMPurify's SVG profile with `a` and `image` removed.

### Block

`lib/mermaid.ts` keeps its `mermaid-*` class names, as the Pele design did, and
records a chart's language in `data-mermaid-language`. Text, axes, and grid use
the `--pele-*` variables. Series use `--chart-1` through `--chart-8`, a palette
validated for color-vision deficiency on both theme backgrounds. Vega
interpolates sequential colors itself and can't read a CSS variable, so they fade
one blue in opacity, which sinks low values into either theme's background. A
spec's own `config` overrides all of these defaults.

### Snapshot viewer

The website's `src/lib/vega-engine.ts` is a copy of the engine. Vite splits it
into a chunk that loads on demand, which the viewer's `script-src 'self'` allows.

## Constraint coverage

| Intent constraint | Design |
| --- | --- |
| No requests or file reads | Refusing loader, plus sanitized output without `a` or `image`. |
| No cost without a chart | The engine is outside the content script and imported only for a fence. |

## Areas of concern

- A spec that generates a very large dataset can stall the tab, because charts
  render on the main thread. The same is true of a very large Mermaid diagram.
  Owner: Markside.
- `lib/vega-engine.ts` exists in both repositories. Fix bugs in both. Owner:
  Markside.
