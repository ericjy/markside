# ADR-0001: Pre-bundle ESM-only dependencies

**Status:** Accepted

## Context

Shiki and CodeMirror expose ESM dependency graphs that Plasmo's Parcel pipeline cannot reliably bundle for a Manifest V3 content script loaded on `file://` pages.

## Decision

Bundle each dependency with esbuild into a self-contained `lib/*-bundle.mjs` artifact and alias package imports to those artifacts in `package.json`. Application code imports through the project's wrappers.

## Consequences

- Development, testing, and production builds must regenerate the bundles.
- Adding a language, theme, or editor dependency requires updating the matching bundle script.
- Generated bundles remain untracked.
- Direct imports from the upstream packages are not allowed in application code.

## Amendment (2026-10-24)

Mermaid was removed. Pele renders Mermaid diagrams instead, and Parcel bundles
it directly, so it is imported without a pre-bundle. See
[Render Mermaid diagrams with Pele](../changes/2026-10-24-pele-diagrams/spec.md).
