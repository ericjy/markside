---
date: 2026-10-26
status: implemented
intent: intent.md
interview: grill.md
guidelines:
  - ../../visual-design.md
  - ../../../CLAUDE.md
---

# New draft from any tab

## Requirements

**New draft** in the popup opens a Markside extension tab for writing Markdown
before it has a file. **Decided by** links the [interview](grill.md) question
behind each requirement, a [confirmed detail](grill.md#confirmed-details), or
marks a detail proposed in this spec that still needs confirming in Review.

| ID | Requirement | Decided by |
|---|---|---|
| R1 | The popup shows a **New draft** button on every tab, whether or not a Markdown file is open. | [Q1](grill.md#q1-where-does-the-user-start-a-new-draft) |
| R2 | **New draft** opens the draft tab, `tabs/draft.html`, as a new active tab. If a draft tab whose draft has never been saved is already open, the popup focuses it instead. | [Q3](grill.md#q3-does-the-file-exist-before-the-user-writes)<br>focusing: proposed here |
| R3 | The draft tab opens in Split when the window fits two 320 px panes, otherwise in Source, with the editor focused so typing or pasting works at once. An empty draft shows "Write or paste Markdown…" in the editor and a quiet Preview label in the Preview pane. The toolbar offers Preview, Source, and Split in the same control as a Markdown document; Split has the document's resizable divider and shares its saved position. `Ctrl+E` switches between Source and Preview. | [Confirmed details](grill.md#confirmed-details)<br>Split, and opening in Split: requested after implementation |
| R4 | Until its first save, the draft's content is stored in `chrome.storage.local` as the user types. Opening the draft tab restores it. Only one unsaved draft is kept. | [Confirmed details](grill.md#confirmed-details) |
| R5 | Before the first save, a draft with text offers **Discard**, which empties the editor and the stored draft after confirmation. | proposed here |
| R6 | Save is disabled while the draft is empty, and `Cmd/Ctrl+S` does nothing. Otherwise the first `Cmd/Ctrl+S` or **Save** opens the system save dialog. It suggests the first heading as lowercase words joined by hyphens, such as `rate-limits-rfc.md`, or `untitled.md` when there is no heading. The user may save anywhere. | [Q2](grill.md#q2-where-is-the-draft-saved), [Q4](grill.md#q4-how-does-a-saved-draft-become-a-normal-markside-document) |
| R7 | After the first save the stored draft is cleared, the tab title becomes the filename, and editing continues in the tab. Later saves write to the same file without a dialog. Reloading the tab reopens the saved file; if Chrome needs permission again, the tab offers **Reopen**, and a moved or deleted file offers **Start a new draft**. | [Q5](grill.md#q5-can-the-user-keep-editing-in-the-draft-tab-after-saving)<br>reload: requested after implementation |
| R8 | After the first save, a notice reads: "Saved as name.md · Reopen it with ⌘O to use all Markside features." It can be dismissed. | [Q4](grill.md#q4-how-does-a-saved-draft-become-a-normal-markside-document) |
| R9 | Closing or reloading the draft tab with edits not yet written to the saved file shows the browser's leave-page warning. Before the first save, no warning is shown, because R4 already keeps the content. | proposed here |
| R10 | The draft tab has no file tree, Outline, Review, Readability Check, snapshots, PDF Export, or relative images, links, and HTML Embeds. | [Confirmed details](grill.md#confirmed-details) |
| R11 | The draft tab follows the saved theme and Typeface preferences, and its header has the document toolbar's theme toggle, which changes the same saved preference. | proposed here<br>toggle: requested after implementation |
| R13 | While the draft is empty, the Preview pane offers **Insert sample**, which fills the editor with a short document from `lib/draft-sample.md` showing alerts, task lists, a table, code, math, and a Mermaid diagram. It uses nothing that needs a file location. Undo removes it. | requested after implementation |
| R14 | While an unsaved draft has content, the popup card reads **Continue draft** with the draft's first heading or first line and when it was last edited. | requested after implementation |
| R15 | On the draft tab, the popup names the tab in its context pill. Before the first save it shows only the save shortcut, without the New draft card or the ways to open a file; after saving it shows the filename and the New draft card. | requested after implementation |
| R16 | After the first save, the draft tab follows the Auto Save preference: when it is on, edits are written to the file 1.5 seconds after typing stops. Before the first save there is no file, so R4 keeps the text instead. | requested after implementation |
| R12 | No new extension permission is added. | [Q4](grill.md#q4-how-does-a-saved-draft-become-a-normal-markside-document) |

## Design

**Flow.**

```
any tab → popup → New draft
  → tabs/draft.html (Source, editor focused)
  → type or paste; content mirrored to chrome.storage.local
  → Cmd/Ctrl+S → showSaveFilePicker → write → keep FileSystemFileHandle in memory
  → notice: reopen with ⌘O for the full Markside
  → later Cmd/Ctrl+S → write to the same handle
```

**Draft page.** A Plasmo tab page, `tabs/draft.tsx`, served as
`chrome-extension://<id>/tabs/draft.html`. It reuses `RawEditor` for Source and
the Markdown pipeline (`md.render`, `sanitizeRenderedMarkdown`, and Shiki
highlighting) for Preview. It does not mount `ContentApp`: that orchestration is
keyed by a `file://` URL and the page-origin IndexedDB, neither of which exists
here.

**Popup.** `popup.tsx` adds the button. To find an open draft tab it calls
`chrome.runtime.getContexts({ contextTypes: ["TAB"], documentUrls: [draftUrl] })`,
which needs no `tabs` permission, and asks that tab whether it has been saved
before focusing it (R2).

**Storage.** `chrome.storage.local` key `newDraft` holds `{ content, updatedAt }`,
written after a short pause in typing. The page writes it only while the draft
has never been saved; the first successful save removes it.

**Saving.** `showSaveFilePicker({ suggestedName, types: [Markdown] })`, then
`createWritable()`. The first save adds `?file=<uuid>` to the tab's URL and
stores the handle under that URL in the extension's IndexedDB with
`setFileHandle`, so a reload reads the file back (R7). A cancelled dialog
changes nothing.

**Conflicts with current documentation.**

- `docs/system-design.md` says "Popup creation and the separate extension
  editor page are not part of this flow." This design adds both. The sentence
  is replaced when the change ships.
- `CLAUDE.md` says that when no saved directory contains a file, Markside asks
  for its folder instead of opening a save picker. A new draft has no file or
  directory, so its first save is an exception. `CLAUDE.md` Saving and Surfaces
  are updated to name the draft tab.
- No ADR conflicts. ADR 0002 is unaffected: the draft tab neither polls nor
  watches the saved file.

**Documentation on shipping.** `CONTEXT.md` (new term), `docs/user-guide.md`,
`docs/system-design.md` (surfaces, the Creating Markdown files section),
`docs/manual-test.md`, and `CLAUDE.md`.

## How each constraint in the intent is met

| Intent constraint | Met by |
|---|---|
| Works from any tab, with no Markdown file open | R1, R2 |
| The user chooses the save location for each draft | R6 |
| No new extension permission | R12; `getContexts` and `showSaveFilePicker` in Design |
| The draft is not lost if the tab is closed before saving | R4 |
| Editing continues after the first save without another dialog | R7 |
| The user is told which features need reopening | R8, R10 |

## Open questions from the intent

- **Should a keyboard shortcut also open a new draft?** Carried forward. A
  `chrome.commands` entry could open the same page later without a new
  permission.
- **One draft or several?** One in this version (R4). Revisit if users report
  losing a draft by starting another.
- **Naming.** Unsaved Draft already means edits not yet written to a file.
  Resolved: **New Draft**, added to `CONTEXT.md`.

## Areas of concern

1. **Extension page CSP.** Extension pages forbid inline scripts and `eval`.
   Shiki's JavaScript engine, KaTeX, and Pele must render under that policy.
   Owner: implementer, by checking a draft with code, math, and a Mermaid
   diagram in the production build; drop an engine from draft Preview if it
   cannot comply, and say so in R10. Checked in headless Chromium with the
   production build: all three render with no CSP errors.
2. **Preview enhancement coupling.** Diagram rendering and code highlighting are
   scheduled inside `useContentPreview`, which expects content-app state. Owner:
   implementer, by extracting only what the draft page needs without changing
   content-app behavior. Resolved: the unused `MarkdownRenderer` now runs the
   same steps; `useContentPreview` is unchanged.
3. **Two editors on one file.** After saving, the draft tab and a reopened
   `file://` tab can both write the file; the later save wins. Owner: user
   guide, which should say so; no code change.
4. **Save dialog filename.** macOS may append `.md` twice or hide it depending
   on the accepted types. Owner: implementer, by checking the saved name on
   macOS and Windows.
5. **Accessibility.** The notice must be announced without taking focus, and
   the Source and Preview control must be keyboard reachable. Owner:
   implementer, following `docs/visual-design.md`.
