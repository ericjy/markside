# File Palette Design

**Status:** Implemented

> Historical design. See `docs/system-design.md` and `docs/user-guide.md` for current behavior.

**Goal:** Let users quickly find and open any file in the currently open folder by typing or pasting a filename or path into a floating command-palette overlay.

**Architecture:** Five focused units — a pure fuzzy-rank library, a file-indexing hook, the palette overlay component, a search trigger button in the left sidebar header, and keyboard shortcut wiring in the main content script.

**Tech Stack:** React, TypeScript, File System Access API, Tailwind/shadcn-ui, Lucide icons

---

## Trigger

Two entry points open the palette:

1. **Keyboard shortcut** — `Cmd+P` (Mac) / `Ctrl+P` (Windows/Linux), listened on `document` in `markside.tsx`. Only active when a directory is open (`status === "granted"`). No-ops on GitHub raw pages (no FSA directory available).
2. **Search icon button** — a `Search` icon added to the right side of the `SidebarLeft` header, next to the existing "Change" button. Calls an `onOpenPalette` prop.

---

## UI

A centered modal overlay with a semi-transparent dark backdrop covering the full viewport.

**Layout (top to bottom):**
- Text input with a `Search` icon on the left, auto-focused on open, placeholder `"Search files…"`
- Scrollable results list (max ~8 rows visible, rest scrollable)

**Each result row:**
- Filename in normal weight
- Parent directory path in dimmed text below the filename
- Highlighted when selected

**States:**
- `loading` — spinner or `"Loading…"` while the file index is being built
- `results` — filtered list; best match pre-selected
- `empty` — `"No results"` when query has no matches
- `error` — `"Could not read folder"` if the FSA scan fails

**Keyboard navigation:**
- `↑` / `↓` — move selection
- `Enter` — open selected file
- `Escape` — close palette
- Clicking a row — open that file
- Clicking the backdrop — close palette

---

## File Index (`hooks/useFileIndex.ts`)

Accepts `rootHandle: FileSystemDirectoryHandle | null` and `enabled: boolean`.

When `enabled` becomes `true`, recursively walks the entire directory tree starting from `rootHandle`, collecting every file as `{ name: string, path: string, handle: FileSystemFileHandle }`. Uses the same skip-list as `useFileTree` (`node_modules`, `.git`, `dist`, `build`, `.next`, `.plasmo`, `__pycache__`, `.DS_Store`).

Returns `{ files, loading, error }`.

The index is rebuilt each time the palette opens (i.e. each time `enabled` flips to `true`). This keeps results fresh without requiring a background sync.

---

## Fuzzy Matching (`lib/fuzzy.ts`)

Pure function, no side effects, fully unit-testable.

```ts
type FileEntry = { name: string; path: string }
type RankedEntry = FileEntry & { score: number }

function rankMatch(query: string, entry: FileEntry): number | null
function fuzzySearch(query: string, files: FileEntry[]): FileEntry[]
```

**Ranking priority (lower score = better):**
1. Filename starts with query (case-insensitive)
2. Filename contains query as substring (case-insensitive)
3. Full path matches query by character sequence (all query chars appear in order in the path)
4. No match → excluded from results

`fuzzySearch` returns entries sorted ascending by score, then alphabetically by path for ties.

**Character-sequence algorithm:**
```ts
function charSequence(query: string, target: string): boolean {
  let qi = 0
  for (const ch of target.toLowerCase()) {
    if (ch === query[qi]) qi++
    if (qi === query.length) return true
  }
  return false
}
```

---

## File Palette Component (`components/FilePalette.tsx`)

Props:
```ts
interface FilePaletteProps {
  open: boolean
  rootHandle: FileSystemDirectoryHandle | null
  rootUrl: string | null
  onFileSelect: (url: string, handle: FileSystemFileHandle) => void
  onClose: () => void
}
```

Internally:
- Calls `useFileIndex(rootHandle, open)` — index builds when palette opens
- Maintains `query: string` and `selectedIndex: number`
- Derives `results` by calling `fuzzySearch(query, files)` (empty query → show all files, sorted alphabetically)
- Resets `selectedIndex` to `0` whenever `results` changes
- On file select: constructs the file URL as `rootUrl + entry.path`, calls `onFileSelect(url, handle)`, then `onClose()`

The backdrop is a fixed full-screen `div` with `onClick={onClose}`. The palette panel sits on top with `pointer-events-auto`.

---

## Integration in `markside.tsx`

- Adds `paletteOpen: boolean` state, default `false`
- Adds a `useEffect` that listens for `keydown` on `document`; opens palette on `Cmd+P` / `Ctrl+P` when `isFileUrl && status === "granted"`
- Passes `onOpenPalette={() => setPaletteOpen(true)}` to `SidebarLeft`
- Renders `<FilePalette open={paletteOpen} rootHandle={handle} rootUrl={rootUrl} onFileSelect={handleFileSelect} onClose={() => setPaletteOpen(false)} />` inside `SidebarProvider`

`handle` and `rootUrl` come from `usePersistedDirectory`, which is already called in `SidebarLeft`. To avoid prop-drilling through `SidebarLeft` they are lifted to `markside.tsx` — `SidebarLeft` currently owns `usePersistedDirectory` internally, so this hook call moves up one level and its results are passed down as props.

---

## Changes to `SidebarLeft`

- Accepts two new props: `onOpenPalette: () => void`, and the existing `usePersistedDirectory` results become props instead of being called internally (`handle`, `rootUrl`, `status`, `openDirectory`, `reauthorize`)
- Adds a `Search` icon button to the `SidebarHeader` row (right of the folder name / "Change" button area) that calls `onOpenPalette`
- The button is only shown when `status === "granted"` (same condition as showing the file tree)

---

## Testing

- **`lib/fuzzy.test.ts`** — unit tests for `rankMatch` and `fuzzySearch`: exact match, prefix match, substring match, character-sequence match, no match, empty query, case-insensitivity, result ordering
- **`hooks/useFileIndex.ts`** — logic is a recursive FSA walk; not unit-tested (FSA API not available in jsdom). Covered by manual testing.
- **`components/FilePalette.tsx`** — UI component; not unit-tested. Covered by manual testing.
