# Split View Design

**Status:** Implemented

> Historical design. See `docs/system-design.md` and `docs/user-guide.md` for current behavior.

## Goal

Add a live split view for Markdown files and rename Raw to Source so the
controls distinguish rendered output from the Markdown text that produces it.

## Interaction

Markdown files expose a three-option segmented control:

- **Preview** shows rendered Markdown.
- **Source** shows the CodeMirror editor.
- **Split** shows the editor on the left and rendered Markdown on the right.

The control uses eye, pencil, and split-panel icons. The active option uses the
existing accent treatment and exposes its state with `aria-pressed`. Labels are
visible at normal widths and collapse to icon-only buttons with tooltips and
accessible labels when viewport space is constrained.

Split mode is a horizontal layout with a draggable center divider and a 50/50
default. Each pane has a minimum width of roughly 320 pixels and scrolls
independently. Narrow workspaces retain the horizontal layout and may scroll
horizontally rather than silently stacking panes or closing sidebars.

The divider remains at the user's chosen position while navigating files in
the current mounted session. It resets to 50/50 after a page reload. It is
keyboard accessible as a separator: Left/Right arrows move it in 5% increments,
and assistive technology receives its current value.

The editor's Markdown toolbar remains available. Draft state updates
immediately while typing; the rendered pane updates at most once every 50 ms
using the latest draft, so continuous typing never starves Preview updates. The
existing disk autosave remains a separate 1.5-second debounce.

The existing `Ctrl+E` shortcut continues to toggle between Preview and Source.
From Split, it switches to Preview because it acts as a source-visibility
toggle. Split is selected from the segmented control. `Cmd/Ctrl+S`, autosave
status, external file conflict handling, theme switching, and full-width
behavior continue to work in both Source and Split.

The chosen mode remains active while navigating Markdown files in the current
mounted session. Non-Markdown files temporarily show Source only; returning to
a Markdown file restores the chosen Markdown mode. Mode and divider position
are not persisted across page reloads.

Preview remains read-only. Typora-style single-pane authoring would require
selection mapping and lossless Markdown round-tripping across tables, code
fences, Mermaid, frontmatter, footnotes, and MDX, so it is explicitly outside
this feature's scope.

Non-Markdown files remain editor-only. Images remain image-only.

## Implementation

Replace the `raw` boolean in `contents/markside.tsx` with a
`"preview" | "source" | "split"` mode. Small pure helpers will define whether a
mode shows the editor or preview, keeping conditional rendering and keyboard
behavior explicit.

Entering Source or Split seeds the draft from the current rendered content when
needed. Draft changes retain the existing autosave flow and schedule an
independent 50 ms throttled preview update while Split is active. Pending
preview updates are canceled on file navigation so content from the previous
file cannot leak into the next one. Leaving an editing mode for Preview applies
the latest draft immediately before hiding the editor.

The existing `RawEditor` remains the only editor instance. The existing
rendering pipeline—frontmatter, Markdown rendering, sanitization, Shiki,
Mermaid, image URL resolution, and heading extraction—continues to populate the
single preview element whether it is shown alone or in the right split pane.

The main content area changes from one shared scrolling container to
mode-specific containers:

- Preview: one vertically scrolling rendered region.
- Source: one vertically scrolling editor region.
- Split: a horizontally scrollable shell containing two independently
  vertically scrolling panes and an accessible draggable separator.

## Error and Loading States

Loading and error messages appear in whichever pane is visible. Split mode does
not duplicate editor state or save operations. Existing save failures and
external modification conflicts retain their current UI and behavior.

## Verification

Add unit coverage for the pure mode helpers and transitions. Verify:

- Preview, Source, and Split render the intended surfaces.
- Switching into an editing mode preserves or seeds the draft correctly.
- Split preview follows draft changes.
- Split preview rendering is throttled independently of autosave.
- Divider calculations enforce minimum pane widths and arrow-key adjustments.
- Mode and divider position survive in-app navigation but reset on reload.
- Switching to Preview renders the latest draft.
- Save controls and shortcuts are available in Source and Split.
- Non-Markdown and image files retain their existing behavior.

Run the full Vitest suite and the production build.
