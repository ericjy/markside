# Changelog

Notable user-facing changes to Markside are recorded here. Each released
version is tagged with the channel(s) it actually shipped on — Chrome Web
Store and GitHub Releases run independently and can diverge; see
`docs/github-release.md`.

## Unreleased

### Added

- Markside's interface is available in English, Simplified Chinese, Traditional Chinese, Japanese, Korean, and Spanish. It follows the browser language by default; choose a different Interface language in Settings.
- Open a `.md.txt` file as Markdown to use Preview, Source, and Split. The file keeps its name, and you can keep it as text instead.
- Draw charts with `vega-lite` code blocks in Preview, Split, and shared Snapshots. Charts use data written in the document and never load anything from elsewhere.
- Preview raw Markdown from GitHub, GitLab, Bitbucket, and other websites. Turn it on from the popup or Settings to grant website access; turning it off removes that access. Previews are read-only and offer Outline, Source, Zen mode, copy, and PDF Export.

### Improved

- New draft moved to a compact link beside Settings in the popup.

## 1.8.0 — 2026-10-29 (Chrome Web Store)

### Added

- Start a New Draft from the extension popup on any tab. Write in Source or Split, then choose where to save it; the draft stays available if you close its tab before saving.
- Embed local HTML files in Markdown to show interactive visuals in Preview and Split. Expand an HTML Embed, comment on it, and include it in Snapshots and PDF Export.
- Ask the Markside Agent Skill to explain a topic or document with interactive visuals, then review the explanation in Markside.

### Improved

- Hosted Snapshots can include local images, encrypted with the document. Markside identifies unreadable images and offers compression when a Snapshot is too large.
- Dark mode separates the document's appearance from the surrounding interface.

### Fixed

- Import Review accepts a reviewer's Hosted Snapshot link, not only a Link Snapshot.

## 1.7.0 — 2026-10-25 (Chrome Web Store)

### Added

- Review with your coding agent (Beta). Run `/markside review PLAN.md` with the Markside Agent Skill, add comments, and click **Send review to agent**. The agent addresses each comment and replies; you check the changes, then Resolve, Reopen, or send more feedback until you click **Finish review**. Requires Node.js 20+ and the `markside` CLI from npm.
- Answer agent interviews in Markside (Beta). Ask a questioning skill such as `/grill-me` to interview you in Markside, and each question appears as a card: pick an option, answer in your own words, skip, let the agent decide the rest, or stop. Answer some or all cards before sending.
- Zen mode hides the toolbar, file tree, and Outline. Press Cmd+. / Ctrl+. or choose it in the file menu.
- Preview shows the word count and reading time.
- One-click preset buttons above the comment composer.
- File paths in YAML frontmatter render as links.
- Revisit an answered interview question from its read-only card and send a revised answer.
- With the Review sidebar closed, a bar above the document sends your comments or finishes the Review.

### Improved

- Calmer reading: Preview defaults to a narrower Standard page width, with Extended and Full width in the file menu. Inline code is neutral instead of red, heading rules are lighter, the word count is quieter, and the file tree starts collapsed.
- Mermaid diagrams render faster, in the document's font and colors, and the extension is smaller.
- Answered interview questions are saved as plain Markdown that reads well in any editor.
- The extension is now named "Markside: Markdown Viewer & Editor".
- Review opens as a sidebar you can dock beside the document, and stays open across reloads.
- Typeface and page width moved into the file menu.
- The opened file is revealed in the file tree.
- Heading anchors match GitHub's, so `#links` written for GitHub work in Markside.
- **Number headings** shows **Already numbered** when a document numbers its own headings, instead of appearing to do nothing.
- Images in Markdown stay inline, as on GitHub.
- Hidden Outline and file tree stay hidden across reloads.
- The popup marks pending Reviews whose file was moved or deleted, and counts only unresolved comments.
- Returning to a tab shows **Changed on disk** when the file changed, without replacing what you see.

### Fixed

- Printed Mermaid diagrams fit the page column.
- Clicking empty space clears a Review Comment selection.
- Selected quotes no longer carry surrounding whitespace.
- Reopening a question's composer restores the answer you saved.

## 1.6.0 — 2026-10-12 (Chrome Web Store)

### Added

- Choose the typeface for rendered Markdown in Settings: Sans, Serif, Charter, Iowan, or Avenir. Open tabs update immediately.
- Uninstalling Markside opens a short optional survey on markside.app. Answers are stored without identifiers, and nothing is sent unless you press Send.

### Improved

- Settings opens on first install when file access is off and walks you through turning on **Allow access to file URLs** with a short demo.
- Settings is laid out as grouped rows, and the popup lists the ways to open a Markdown file, including asking a coding agent.
- GitHub alerts render as rounded panels.
- The extension is now named "Markside: Local Markdown Viewer & Editor".

### Fixed

- Printing or exporting a PDF with the outline open no longer covers the page in gray.

## 1.5.0 — 2026-10-10 (Chrome Web Store)

### Added

- Render math in Preview with KaTeX: inline `$…$`, display `$$…$$`, and ```` ```math ```` blocks. Dollar amounts such as `$5` stay plain text.

### Improved

- The first save of a file outside any saved folder asks you to choose that file's folder instead of opening Save As. Markside copies the folder path so you can paste it into the picker.
- Reload refreshes local images that changed on disk.
- Reload still reads the file when its saved file handle has lost permission.

## 1.4.0 — 2026-09-23 (Chrome Web Store)

### Added

- Hosted Snapshots create short Share Links for large Markdown documents. Markside encrypts the saved copy in your browser before upload and stores ciphertext only. Hosted Snapshots expire after 30 days.
- Reload a Markdown file and see the diff (additions and removals) in Preview. You can comment on removed passages before copying the Review.
- Create a new Markdown file in the opened folder and start editing it in a new tab.
- Optionally number Markdown headings in Preview, Split, Outline, and PDF Export.
- Save a Review Comment and copy its prompt in one action.

### Improved

- Preview and Source remember their separate Full width settings across reloads and files; the Split divider position is also restored.
- Move the local Markdown Review panel by dragging its header or using the grip's arrow keys. Its position is saved per file.
- Mermaid diagrams open closer to the content width, with controls above the diagram.
- Review controls make it easier to copy one comment, clear a Review, and finish inspecting reloaded changes.

### Fixed

- Select and Pan tooltips now appear beneath their Mermaid controls.
- An open local Markdown Review panel stays open after a page reload.

## 1.3.0 — 2026-09-06 (Chrome Web Store)

### Added

- Zoom in and out of Mermaid diagrams, pan across them, and reset the view.
- Expand a Mermaid diagram to fill the browser viewport.
- Switch between selecting diagram text and dragging to pan with separate Select and Pan controls.
- The document outline highlights your current section as you scroll.
- Optional Chrome Web Store review prompts after repeated use, with permanent review actions in the popup and Settings. Scheduling stays on the device.
- Send feedback by email directly from the review prompt or Settings.
- View the extension version and build identity in the sidebar.

### Improved

- Source opens at full width for every text file, including Markdown. Its width, word wrap, and copy actions now live in one Source options menu.
- Preview has its own full-width toggle in the page toolbar, shown only when Preview is visible, so Preview and Source keep independent widths in Split view.
- The code editor toolbar shows the current filename, with more space above the code.
- The file tree uses narrower scrollbars.
- Outline entries use tighter spacing and a visible marker for the current section.
- Adjusted body text colors in light and dark themes and reduced H1/H2 heading weight.
- Collapsible sections have bordered containers, padded headers, and arrows that show whether they are open.
- Note, Tip, and Warning callouts have tinted backgrounds and more padding around their contents.
- Task checkboxes have stronger outlines and green checkmarks for completed items in both themes.
- Frontmatter rows take less space, with labels and values aligned vertically in the middle.
- The setup popup shows a visual example of Chrome's "Allow access to file URLs" toggle.
- Importing a review is now a labeled Import button in the Review header instead of an icon in the footer.

### Fixed

- Expanding a Mermaid diagram now sizes it to the expanded view instead of measuring the diagram mid-animation.
- The Select and Pan diagram controls render as a segmented toggle that clearly shows which mode is active.
- Expanding deeply nested folders no longer compresses file tree rows.
- Text selected for a pending review comment stays highlighted after switching away from and back to the tab.
- Reviews containing only imported comments can now be copied.
- New comment editors receive keyboard focus so you can start typing immediately.

## 1.2.0 — 2026-08-21 (Chrome Web Store)

### Added

- Reviewed Snapshots: a Link Snapshot can now carry an ordered history of Review Rounds, so a recipient can add their own feedback and share it back as a new link — no server involved. Sharing your review is an explicit opt-in in the Share dialog.
- Quick comment button on the selection toolbar for instantly saving a preset comment without opening the composer.
- Copy prompt button in the comment composer, saving the comment and copying its agent-ready prompt in one action.
- Copy button on the Link Snapshot backup URL.

### Improved

- Imported Review History comments now look and behave like your own live comments — individual cards you can click to scroll to and select, shown in a distinct highlight color from your own comments.
- The Add comment toolbar waits briefly after a selection before appearing, so incidental selections don't flash it.
- Create Share Link dialog copy adapts when the link includes review comments.
- GitHub-style heading border and heading size hierarchy (H3–H6) restored.

### Fixed

- Mermaid diagrams that fail to parse no longer leave a stray error graphic elsewhere on the page.

## 1.1.1 — 2026-08-18 (GitHub Release)

### Added

- Local Markdown review workflow: comment on selected text, compose comments inline at the selection, and pick from expanded quick-comment presets.
- Review comments are numbered and marked at their location in Preview, with section navigation for comments whose anchor can't be found.
- Link Snapshot sharing (beta), with a warning instead of a hard block for oversized snapshots.
- A cross-platform Markside Agent Skill for opening Markdown files, with native launch tests on macOS, Linux, and Windows.

### Improved

- Review overlay adapts across viewport widths — floating at wider layouts, docking below extra-large breakpoints — with tighter spacing and clearer highlight styling.
- Review persistence is isolated per file and safe against stale writes.
- Split view pane sizing and review selection positioning.
- Markdown files open in a new Chrome tab.
- README and review export prompt wording tightened for clarity.

## 1.1.0 — 2026-08-09 (Chrome Web Store)

### Added

- Live Split view with independently scrollable, resizable editor and preview panes.
- Clean PDF export through Chrome's Save to PDF workflow, including CJK text support.
- A persistent catalog of opened folders that selects the most specific saved folder for each local file.
- GitHub-style Note, Tip, Important, Warning, and Caution alerts.
- Optional Auto Save, disabled by default.
- Editing toolbar shortcuts for common Markdown formatting.
- In-place reload from disk, with unsaved-draft protection and support for files outside saved folders.

### Improved

- File navigation across Markdown, source-text, code, and image files.
- File tree ordering and icons that surface dotfiles and familiar repository documents.
- Responsive mode controls, file actions, editor gutters, scrollbars, and print layout.
- Clearer tooltips and icons for reloading, copying paths, printing or saving PDFs, and syncing the address-bar URL.
- Long code blocks wrap cleanly while preserving syntax highlighting and one-click copy.
- Theme preference persists across browser sessions.
- Folder-access guidance is more readable and visually distinct from the document beneath it.
- Reauthorizing folder access repopulates the file tree immediately without a page refresh.
- Sidebar state and scroll-position restoration across local file navigation.
- Conflict handling when a file changes on disk before it is saved.

## 1.0.0 — 2026-05-07 (Chrome Web Store)

Initial Chrome Web Store release. Reconstructed from commit history — the
exact published commit was never recorded; see the Release history note in
`docs/store-listing.md`.

### Added

- Instant rendering of local Markdown files opened as `file://` URLs, with a resizable file-tree sidebar and persisted folder access.
- Preview and Raw editing modes (Ctrl+E to toggle), with a CodeMirror-based raw editor, manual (Cmd+S) and debounced autosave, and conflict detection against external file changes.
- Automatically generated right-side outline with heading levels and click-to-scroll navigation.
- Cmd+P quick file search across the open folder.
- Syntax-highlighted code blocks (Shiki) with one-click copy, plus a raw/source view for non-Markdown files.
- Mermaid diagram rendering with light/dark theme support.
- YAML frontmatter display and styled tables.
- Task lists, footnotes, wikilinks (`[[note]]` / `[[note|label]]`), and inline HTML passthrough.
- Breadcrumb path navigation with copy-file-path, and a Pin to URL button to sync the address bar to the rendered file.
- File type icons in the file tree; image files render inline instead of as raw binary.
- Full-width toggle and print-friendly styles.
- Light/dark theme toggle.
- Popup and options page guiding first-time "Allow access to file URLs" setup.
