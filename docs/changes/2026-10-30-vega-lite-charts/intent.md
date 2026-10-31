---
date: 2026-10-30
status: accepted
author: Eric Yang
interview: grill.md
design: spec.md
---

# Intent: Vega-Lite charts

## Problem

Markside draws Mermaid diagrams but not data charts written in Vega-Lite. The
requester in [issue #1](https://github.com/ericjy/markside/issues/1) wanted a
line chart and moved to another extension to get one.

## Proposed outcome

A `vega-lite` fence renders as a chart in Markside and in a shared Snapshot.

## Affected users and systems

People reading or writing Markdown with charts, recipients of Share Links, the
content script's rendering, the build, and the website's Snapshot viewer.

## Constraints

- Opening a document must not send requests or read other files because of a
  chart.
- Documents without a chart must not load the chart code.

## Open questions

None.
