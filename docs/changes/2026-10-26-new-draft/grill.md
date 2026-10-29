# New draft from any tab

Status: Implemented.

The interview ran in chat on 2026-10-26, not in Markside, so there is no
Review file. Questions are reconstructed from that conversation; each records
the options discussed, the agent's recommendation, and the user's answer.

## Confirmed details

These details were proposed by the agent and confirmed when the user approved
the design.

- The draft tab opens with the editor focused, so typing or pasting works at once. It can switch to Preview.
- The draft's content is kept while unsaved, so closing the tab by accident does not lose it.
- The first save suggests a filename from the first heading, or `Untitled.md` when there is none.
- After the first save the draft tab stays editable, and `Cmd/Ctrl+S` writes to the same file without asking again.
- After the first save a notice says the file must be opened from its folder to use the file tree, Reviews, and relative images.
- The first version has no Review, file tree, or relative assets in the draft tab, and keeps only one draft rather than a list.

## Question history

### Q1. Where does the user start a new draft?

> **Your decision:** From any tab, with no Markdown file open, using **New draft** in the popup.

<details>
<summary>Full question</summary>

Markside already has **New Markdown file** beside Find file in the file tree
header. It creates an empty file in the opened root folder and opens it in
Source. That only helps when a Markdown file is already open in Markside.

The user's situation: "I'm on a Google tab; no specific Markdown file is open."

- **A. Improve the in-page entry.** Create from the Find file palette, default to the current file's folder, add a shortcut. Fast inside Markside, useless from a Google tab.
- **B. Popup button.** One click on the toolbar icon from any tab.
- **C. Global keyboard shortcut** through `chrome.commands`. Works from any tab, but needs a page to run in and a key the user must learn.

**Recommended: B, optionally with C.** The popup is reachable from every tab and needs no new permission.

</details>

### Q2. Where is the draft saved?

> **Your decision:** The user chooses a location for each draft, not one shared drafts folder.

<details>
<summary>Full question</summary>

- **A. One drafts folder.** Chosen once, either by pasting a path in Settings or with **Use for new drafts** in the file tree header. Fastest, but every draft lands in the same place.
- **B. Choose per draft from recent locations.** The popup lists the folders of recently opened files that sit inside an opened folder, plus **Other folder…**.
- **C. Choose per draft with the system save dialog.** Any location, at save time.

**Recommended: A.** The agent recommended a single drafts folder for speed.
The user rejected it: "I want users to choose where this draft is stored, not
one shared drafts folder."

</details>

### Q3. Does the file exist before the user writes?

> **Your decision:** No. **New draft** opens a Markside extension tab where the user can paste or type at once; the location is chosen when saving.

<details>
<summary>Full question</summary>

Markside's content script runs on `file://` pages, so the earlier proposals
created an empty file first and opened it.

- **A. Create first, then open the file.** Requires choosing a location before writing. The popup cannot show a folder picker, because it closes when the system dialog opens, and it cannot read folder access granted in `file://` pages.
- **B. Write first in an extension tab, choose the location on save.** Matches how people start a draft. The tab is not a `file://` page, so some features are missing until the file is reopened.

The user proposed B: "Why not click New draft, open a new tab that is a
Markside extension tab, where you can paste Markdown directly?"

**Recommended: B.** The agent agreed, noting that the separate extension editor
page had been excluded in `docs/system-design.md` and that this design reverses
that exclusion.

</details>

### Q4. How does a saved draft become a normal Markside document?

> **Your decision: B.** Save with the system save dialog and tell the user to reopen the saved file for the other features. Do not use `chrome.downloads`.

<details>
<summary>Full question</summary>

The File System Access API returns a handle with only a filename, never an
absolute path, even for a file the page just wrote. Without a path the draft
tab cannot navigate to the file's `file://` URL.

- **A. Save through `chrome.downloads` with `saveAs`.** The download record includes the absolute path, so the tab can open the saved file as a normal document. Requires the `downloads` permission, which shows an install warning and makes Chrome disable the extension for existing users until they accept it; the save also appears in Chrome's download bubble.
- **B. Save with `showSaveFilePicker` and tell the user to reopen the file.** No new permission. The draft tab keeps working as an editor, but the file tree, Reviews, and relative assets require opening the file with `Cmd+O` or from its folder.
- **C. Save only to recent locations.** The background opens the folder's `file://` page, where the content script writes the file with existing folder access and navigates to it. Limited to folders Markside already knows.

**Recommended: A.** The user rejected it: "Don't use downloads. Tell users they
need to reopen the saved file to use the other features?" The agent agreed B
was the simplest.

</details>

### Q5. Can the user keep editing in the draft tab after saving?

> **Your decision: A.** Yes; `Cmd/Ctrl+S` keeps writing to the same file.

<details>
<summary>Full question</summary>

- **A. Keep editing.** The tab holds the file handle, so later saves need no dialog. Editing the same file in the draft tab and a reopened `file://` tab lets the later save overwrite the earlier one, which is already true for any two tabs on one file.
- **B. Lock the tab after saving.** Avoids two editors for one file, but forces a reopen after every first save.

**Recommended: A.** Locking interrupts writing; the overwrite risk is not new.

</details>
