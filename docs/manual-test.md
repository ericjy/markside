# Manual Chrome checks

Run this checklist for changes to the extension UI or browser integrations.
Use disposable local files so save and conflict checks cannot damage your work.
Record the Chrome version, operating system, commit, and any failed step in your
pull request or review response.

## Install and prepare

- [ ] Run `nvm use`, `pnpm install --frozen-lockfile`, `pnpm typecheck`,
  `pnpm test`, and `pnpm build`.
- [ ] Open `chrome://extensions`, enable Developer mode, choose **Load unpacked**,
  and select `build/chrome-mv3-prod`. Reload an existing unpacked installation.
- [ ] In Markside's Details, enable **Allow access to file URLs**. Check that
  the popup explains setup while access is off and reports readiness when on.
- [ ] Prepare a folder containing two Markdown files, a nested folder, an image,
  and a text or code file. Include headings, a relative link, an image link,
  a code block, a Mermaid diagram, and math in one Markdown file.

## Read and change modes

- [ ] Open a local `.md` file in Chrome. With fresh preferences, it opens in
  Preview. Check headings, code highlighting, diagrams, math, links, and images.
- [ ] Switch between Preview, Source, and Split. An edit survives mode changes;
  Split updates its rendered pane while typing.
- [ ] Resize the Split divider with the pointer and keyboard. Reload and check
  that the saved divider and mode return. Test independent pane width controls.
- [ ] Check the outline, heading navigation, light/dark themes, and narrow windows.
- [ ] Check Ctrl+E, Cmd/Ctrl+S, and Cmd/Ctrl+P. Save operates in Source or Split;
  the file switcher requires an opened folder.

## Save, reload, and folder permissions

- [ ] Edit a file in Source, save, and confirm the exact file changed on disk.
  Reload it and check the saved contents.
- [ ] With Auto Save off, wait after typing and confirm disk contents do not
  change. Enable Auto Save in Settings, edit, wait at least 1.5 seconds, and
  confirm the file is written. Turn Auto Save off again after the test.
- [ ] Open a file outside all previously selected folders. Edit and save. Check
  that Markside asks for its folder, then saves in place after permission is
  granted. Cancel the folder flow and confirm the Unsaved Draft remains.
- [ ] Modify a loaded file externally, then try saving an edit in Markside.
  Confirm the conflict offers Overwrite and Reload from disk. Use disposable
  files to exercise both choices.
- [ ] Reload an externally edited Markdown file and check additions/removals,
  Show changes, and Done. Verify that editing and navigation clear the comparison.
- [ ] Try navigating with an Unsaved Draft. Check Save, Discard, and Cancel.

## Reviews and extension pages

- [ ] Select text in Preview and Split Preview. Add a Review Comment, edit it,
  select a preset, and check that the preset search field receives focus.
- [ ] Add a Review Note, copy a comment and the full Review, and inspect the
  copied prompts. Reopen the file and confirm the Review persists.
- [ ] Drag and resize the Review overlay. Check its position after reloading,
  passage highlights, badges, keyboard movement, and Escape handling.
- [ ] Change reviewed text externally and confirm copying asks for a reload.
  Reload and inspect anchored and unanchored comments before copying again.
- [ ] Open the popup. Confirm pending Reviews appear with correct counts and
  selecting one opens the corresponding file and Review.
- [ ] Open Settings from the popup. Check Auto Save, typeface, and guidance.
  Check that preference changes reach already open documents.
- [ ] Open Share, inspect Link and Hosted Snapshot choices, and cancel. If you
  test creating a link, use a disposable document and inspect its rendered view.

## Folder tree and other files

- [ ] Open the test folder. Expand nested directories, switch files, and check
  the tree's expanded state after a full page navigation.
- [ ] Follow relative document links. Open tree links in another tab with
  Cmd/Ctrl-click, middle-click, and the context menu.
- [ ] Use Cmd/Ctrl+P to find a nested file. Create a Markdown file with the
  folder-header action and confirm it opens in Source in a new tab.
- [ ] Select an image in the tree and confirm the image viewer opens.
- [ ] Select a non-Markdown text or code file. Confirm Source-only editing and
  save work, with no Markdown Preview or Split controls.
- [ ] Check the page and extension consoles for uncaught errors during these flows.
