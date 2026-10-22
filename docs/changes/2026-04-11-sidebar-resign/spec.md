# Markside Sidebar Redesign

**Date:** 2026-04-11
**Status:** Implemented

> Historical design. See `docs/system-design.md` and `docs/user-guide.md` for current behavior.

## Summary

Restructure the file-renderer content script into a three-panel layout: left sidebar (file tree), main content (rendered markdown), right sidebar (outline/TOC). Eliminate the separate tab UI entirely. Rename `contents/file-renderer.tsx` to `contents/markside.tsx`.

## Layout

```
[SidebarLeft]      [SidebarInset]        [SidebarRight]
File tree          Rendered markdown     Outline / TOC
collapsible=       header + scroll       collapsible=none
offcanvas          area                  sticky, lg+ only
resizable
```

## Architecture

### New files

| File | Purpose |
|------|---------|
| `lib/db.ts` | Thin IndexedDB wrapper — open, get, set, delete one `{ handle, rootUrl }` entry |
| `hooks/usePersistedDirectory.ts` | Reads/writes directory entry via `lib/db.ts`; handles permission lifecycle |
| `components/SidebarLeft.tsx` | Left sidebar: file tree + open folder UI |

### Modified files

| File | Change |
|------|--------|
| `contents/markside.tsx` (renamed from `file-renderer.tsx`) | Thin composer; replaces inline outline sidebar with `<SidebarLeft>` and `<SidebarRight>` |
| `components/SidebarRight.tsx` | Add optional `onHeadingClick?: (id: string) => void` prop; default is `scrollIntoView` |

### Deleted files

| File | Reason |
|------|--------|
| `tabs/index.tsx` | Replaced by content script UI |
| `components/AppSidebar.tsx` | Replaced by `SidebarLeft.tsx` |
| `hooks/useDirectoryHandle.ts` | Replaced by `usePersistedDirectory.ts` |
| `hooks/useFileContent.ts` | Not needed — content comes from `chrome.runtime.sendMessage` in the renderer |

## Data Flow

### Directory persistence

`lib/db.ts` opens an IndexedDB database named `markside` with a single object store `directory`. It exports:

```ts
getDirectoryEntry(): Promise<{ handle: FileSystemDirectoryHandle; rootUrl: string } | null>
setDirectoryEntry(entry: { handle: FileSystemDirectoryHandle; rootUrl: string }): Promise<void>
clearDirectoryEntry(): Promise<void>
```

`hooks/usePersistedDirectory.ts` returns:

```ts
{
  handle: FileSystemDirectoryHandle | null
  rootUrl: string | null
  status: "idle" | "prompt" | "granted" | "loading"
  openDirectory: () => Promise<void>
  reauthorize: () => Promise<void>
}
```

On mount it calls `getDirectoryEntry()`, then `handle.queryPermission({ mode: 'read' })`:
- `"granted"` → set handle, status = `"granted"`
- `"prompt"` → set handle, status = `"prompt"` (show re-authorize banner)
- No entry → status = `"idle"` (show "Open Folder" prompt)

`openDirectory` calls `showDirectoryPicker()`, derives `rootUrl` (see below), saves both to IndexedDB, sets status = `"granted"`.

`reauthorize` calls `handle.requestPermission({ mode: 'read' })`, updates status accordingly.

### Root URL derivation

When the user picks a directory, `rootUrl` is derived from `window.location.href` and `dirHandle.name`:

1. Parse the current URL path into segments: `file:///Users/eric/docs/README.md` → `['Users', 'eric', 'docs']` (filename stripped)
2. Find the rightmost segment matching `dirHandle.name`
3. Root URL = `file:///` + matching segments joined by `/` + `/`

Example: current = `file:///Users/eric/docs/README.md`, picked name = `docs` → `rootUrl = "file:///Users/eric/docs/"`

**Known limitation:** if `dirHandle.name` appears multiple times in the path (e.g. two nested `src` directories), the deepest match is used. This is correct when the user opens the inner directory; incorrect when opening the outer one. Accepted tradeoff — uncommon in practice.

### File navigation

Clicking a file in the tree navigates via:
```ts
window.location.href = rootUrl + node.path
```

This causes a full page reload. The content script re-runs, retrieves the persisted handle from IndexedDB, and highlights the active file by comparing `rootUrl + node.path` against `window.location.href`.

### Headings → SidebarRight

`markside.tsx` already extracts headings from the rendered DOM after each content render (lines 109–120 of the original file). These are passed as `headings` prop to `SidebarRight`. The renderer passes:

```tsx
<SidebarRight
  headings={headings}
  onHeadingClick={(id) => { window.location.hash = id }}
/>
```

This keeps the URL hash in sync so heading links are shareable.

## Component Details

### `components/SidebarLeft.tsx`

Props:
```ts
interface SidebarLeftProps {
  currentFileUrl: string              // window.location.href — used to highlight active file
  onResize: (width: number) => void   // called during drag; markside.tsx sets --sidebar-width on SidebarProvider ref
}
```

Internally uses `usePersistedDirectory` and `useFileTree`. Renders:
- **`status === "idle"`**: "Open Folder" centered prompt
- **`status === "prompt"`**: file tree + re-authorize banner at top
- **`status === "granted"`**: file tree with active file highlighted

Active file detection: `rootUrl + node.path === currentFileUrl` (after normalizing trailing slashes and encoding).

Drag-to-resize handle moved here from `markside.tsx`.

### `components/SidebarRight.tsx`

Add `onHeadingClick?: (id: string) => void` prop. When provided, call it instead of `scrollIntoView`. Used by `markside.tsx` to sync the URL hash.

### `contents/markside.tsx`

Renamed from `file-renderer.tsx`. The `config` export and bootstrap function are unchanged. The `FileRenderer` component becomes a thin composer:

- Removes the inline outline `<Sidebar>` block
- Removes `onResizeStart` (moves to `SidebarLeft`)
- Passes `sidebarRef` to `<SidebarLeft>` (or manages width via CSS variable on the provider)
- Adds `<SidebarRight>` after `<SidebarInset>`
- Removes "Open in Viewer ↗" button
- Passes `onResize={(w) => sidebarRef.current?.style.setProperty("--sidebar-width", `${w}px`)}` to `<SidebarLeft>`

## Empty / Error States

| State | Left sidebar shows |
|-------|--------------------|
| No folder opened | "Open Folder" button centered |
| Permission needs re-grant | Tree + yellow banner "Re-authorize access" |
| File not in tree | Tree shown, no item highlighted |
| IndexedDB unavailable | Treat as no folder — show "Open Folder" |

## What Is Not Changing

- Content fetching via `chrome.runtime.sendMessage({ type: "fetch-file" })`
- Heading extraction from the rendered DOM
- Breadcrumb navigation in the header
- Preview / Raw toggle
- Dark mode toggle
- Drag-to-resize (moves from renderer to `SidebarLeft`)
- Favicon and style injection in bootstrap
