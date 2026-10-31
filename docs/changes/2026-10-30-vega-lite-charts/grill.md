# Vega-Lite charts

The questions were asked in chat on 2026-10-30. This record separates the
user's decisions from the implementation choices made to finish the change.

## Q1. What prompted the change?

[Issue #1](https://github.com/ericjy/markside/issues/1) asked for more diagram
types. Asked which one they would use, the requester named a line chart in Vega
syntax. The user then asked what the dependency would cost and replied "do it".

## Q2. Which fences render?

> **Decision:** Only `vega-lite`. A `vega` fence stays an ordinary code block.

The assistant recommended supporting both. The user chose `vega-lite` only.

## Q3. What happens with `data.url`?

> **Decision:** Charts use inline data. A chart that asks for a URL shows an
> error. Markside makes no network request and reads no local file for it.

## Q4. How does the code load?

> **Decision:** On demand, after a spike. A document without a chart loads no
> chart code.

The spike imported a 762 KB esbuild bundle from a Chromium content script on a
`file://` page by extension URL. It rendered SVG with real text and evaluated
expressions with no CSP error. It did not go through Parcel, which later broke a
direct `import()`; the [spec](spec.md#engine) describes the loader that replaced it.

## Q5. What do Share Link recipients see?

> **Decision:** The chart. The website's Snapshot viewer changes in this work.

## Implementation choices

These were not put to the user:

- Reuse the Mermaid block's toolbar, zoom, pan, expand, and error block.
- Color charts with the theme variables diagrams already use, so a theme change
  needs no redraw.
- Remove images and links from chart output, because either could reach an
  external address.
