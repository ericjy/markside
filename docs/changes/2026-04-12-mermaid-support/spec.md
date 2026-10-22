---
date: 2026-04-12
status: implemented
---

# Mermaid Diagram Support — Design Spec

> Historical design. See `docs/system-design.md` and `docs/user-guide.md` for current behavior.

**Goal:** Render mermaid diagram code blocks as inline SVGs in the markdown preview, with dark/light theme support and zero cost for files that contain no diagrams.

**Architecture:** Pre-bundle mermaid with esbuild (same pattern as the shiki engine workaround), import it statically, and add a post-render pass that finds `language-mermaid` code blocks, converts them to SVGs, and stores source in a `data-` attribute for cheap theme re-renders.

**Tech Stack:** mermaid v11, esbuild (pre-bundling), existing Plasmo/Parcel/React pipeline

---

## Bundling

Mermaid is an ESM-only package with complex transitive dependencies that Parcel cannot resolve reliably. The established fix is to pre-bundle with esbuild into a self-contained file.

- `scripts/bundle-mermaid.mjs` — runs esbuild on the mermaid package entry point, outputs `lib/mermaid-bundle.mjs`
- `package.json` `alias`: add `"mermaid": "./lib/mermaid-bundle.mjs"` so `import 'mermaid'` resolves to the bundle
- `package.json` `scripts`: prepend `node scripts/bundle-mermaid.mjs &&` to both `dev` and `build`
- `lib/mermaid-bundle.mjs` is gitignored (generated artifact)

**Constraint:** Dynamic `import()` creates async chunks that fail to load on `file://` pages in MV3. Mermaid is therefore a static import — always in the bundle. The "lazy" behavior is conditional execution: `renderMermaidBlocks` exits immediately if no mermaid blocks are present.

---

## Rendering Pipeline

The existing pipeline in `markside.tsx` after a content change:
1. `md.render(body)` → HTML string
2. `DOMPurify.sanitize(...)` → safe HTML set on `contentRef.current.innerHTML`
3. `highlightCodeBlocks(contentRef.current)` — shiki replaces `pre > code` blocks

Mermaid adds a fourth step:
4. `renderMermaidBlocks(contentRef.current, dark)` — replaces mermaid blocks with SVG

---

## `lib/mermaid.ts`

**`renderMermaidBlocks(container, dark)`** — called after initial content render:
1. Query `pre > code.language-mermaid` — return immediately if none found
2. Call `mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: dark ? 'dark' : 'default' })` (re-initializes on each call to pick up theme)
3. For each block:
   - Extract `code = codeEl.textContent`
   - Generate unique ID: `mermaid-<random>`
   - Call `await mermaid.render(id, code)` → `{ svg }`
   - Create `<div class="mermaid-block not-prose" data-mermaid-src="<encoded code>">` with `innerHTML = svg`
   - Replace the `pre` element with the wrapper div
   - On error: replace `pre` with a styled error div showing the error message

**`rerenderMermaidBlocks(container, dark)`** — called when dark/light theme is toggled:
1. Query `[data-mermaid-src]` — return immediately if none found
2. Re-initialize mermaid with updated theme
3. For each wrapper: re-render from `dataset.mermaidSrc`, replace `innerHTML` with new SVG
4. Errors are caught and logged (leave existing SVG in place)

`data-mermaid-src` stores the diagram source URL-encoded (`encodeURIComponent`) to safely embed arbitrary text in an HTML attribute.

---

## `lib/shiki.ts`

Add an early-continue in `highlightCodeBlocks` to skip `language-mermaid` blocks:

```typescript
if (lang === "mermaid") continue
```

Without this, shiki logs a "language not found" error for every mermaid block.

---

## `contents/markside.tsx`

**After content changes** (existing `useEffect([content])`):
```typescript
highlightCodeBlocks(contentRef.current)
renderMermaidBlocks(contentRef.current, dark)
```

**On dark toggle** (new `useEffect([dark])`):
```typescript
if (contentRef.current) {
  rerenderMermaidBlocks(contentRef.current, dark)
}
```

The dark re-render effect must guard with `content !== null` (or check `contentRef.current`) to avoid running before any content is loaded.

---

## Error Handling

Per-block errors (invalid mermaid syntax) are caught and rendered as:
```html
<div class="mermaid-error">Mermaid error: <message></div>
```

Styled with red text, matching the existing error style in the app. The `pre` is replaced so the user sees the error inline rather than raw code.

---

## Styling

- Wrapper: `mermaid-block not-prose` — `not-prose` prevents `@tailwindcss/typography` from applying prose styles to the SVG internals
- Center diagrams: `text-align: center` or `display: flex; justify-content: center` in `style.css`
- Error div: `mermaid-error` class with `color: var(--destructive)` or equivalent red

---

## Out of Scope

- Interactive mermaid diagrams (click handlers via `bindFunctions`) — static SVG only
- Mermaid diagram type filtering — all types supported via full mermaid bundle
- Zoom/pan for large diagrams
