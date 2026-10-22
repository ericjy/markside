# Word count and reading time

Pick an option or use the tile to answer in your own words, ask, skip, let me decide the rest, or stop. You may answer any or all cards before sending.

## Summary

- Show a small, quiet word count and reading time at the top right of Preview, using its existing top margin. Show it in Split's Preview pane too; hide it in Source-only mode.
- Let the label scroll with the document. Do not add a bottom status bar or cover content.
- Count whitespace-separated chunks in the entire Markdown source, including syntax, code, and metadata.
- Use the current unsaved draft while editing in Split. External changes appear only after the existing explicit Reload.
- Estimate reading time at 200 words per minute. Round positive estimates up to whole minutes; show `<1 min read` for 1–199 words and `0 min read` for an empty file.
- Keep this limited to local Markdown. Add no settings, selection counts, export changes, snapshot changes, or file watching.

Click **Finish review** if this matches your understanding. Implementation starts after the Review is finished.

## Previous questions

### Q1. Should the count stay visible in a small status bar?

> **Your decision.** Put the numbers at the top right of the content area. A bottom status bar sacrifices too much space; avoid overlapping content.

<details>
<summary>Full question</summary>

Markside currently has a compact top toolbar and no bottom status bar. This change would apply to the open local Markdown file in Preview, Source, and Split, with no selection counts, settings, export changes, or snapshot changes.

~~~mermaid
flowchart TB
  Toolbar[Toolbar with filename and view controls] --> Document[Open document in Preview, Source, or Split]
~~~

- **A. Add a quiet bottom status bar.** Show a line such as "1,240 words · 7 min read" below the document area. It stays easy to find in every mode, but uses a little vertical space.
- **B. Put the text in the top toolbar.** Show the same information beside the filename and hide it at narrow widths. This keeps the document area unchanged, but competes with existing controls and disappears when space is tight.
- **C. Show the numbers in the existing More menu.** Add a noninteractive line to the menu. This avoids permanent screen space, but requires opening the menu to check the count.

**Recommended: A.** A small status bar keeps both numbers visible without crowding the toolbar. The cost is one short line of document height.

</details>

### Q2. Should the count measure readable prose?

> **Your decision: B.** Count whitespace-separated chunks in the entire Markdown source, including syntax, code, and metadata.

<details>
<summary>Full question</summary>

A Markdown file can contain headings, lists, tables, link destinations, frontmatter metadata, and code. Counting everything in the source is simpler, but code and invisible metadata can inflate the reading estimate.

- **A. Count prose and exclude code and metadata.** Count headings, paragraphs, lists, table text, link labels, and inline code; exclude fenced and indented code blocks, diagrams, frontmatter, comments, HTML tags, image syntax, and link destinations. This better reflects reading the document, but needs Markdown-aware text extraction and remains an estimate for mixed languages.
- **B. Count the entire Markdown source.** Count whitespace-separated chunks in the file, including code and Markdown syntax. This is the smallest implementation, but documents with code or metadata show inflated counts and languages without spaces are poorly represented.

**Recommended: A.** Reading time should describe the text someone reads. Excluding code blocks avoids pretending that code takes the same time to read as prose.

</details>

### Q3. Should both numbers follow unsaved edits?

> **Your decision: A.** Update both numbers from the current unsaved draft while editing.

<details>
<summary>Full question</summary>

Markside keeps the editor's unsaved draft separate from the loaded document. Files changed outside Markside still require the existing explicit Reload.

- **A. Update from the current draft while editing.** Recalculate locally as text changes, using a short delay if needed to keep typing smooth. The numbers describe what is on screen, but change before the file is saved.
- **B. Update only after saving or reloading.** Keep counting the last loaded or successfully saved version. The numbers stay tied to disk, but can disagree with the text currently being edited.

**Recommended: A.** The count should follow the words the user is working on. This needs no additional file reads or file watching.

</details>

### Q4. Should reading time use one fixed estimate?

> **Your decision: A.** Use 200 words per minute, round up, show <1 min read for 1–199 words and 0 min read for an empty file, with no preference.

<details>
<summary>Full question</summary>

The display needs a predictable rule for short and empty documents. Reading speed varies, so the number is an estimate rather than a personal measurement.

- **A. Use 200 words per minute with no preference.** Round positive estimates up to whole minutes, show "<1 min read" for 1–199 words, and "0 min read" for an empty document. This is easy to explain and keeps scope small, but cannot match every reader's speed.
- **B. Show only whole minutes at 200 words per minute.** Round every positive count up to at least "1 min read", and show "0 min read" for an empty document. This has fewer display cases, but a five-word note still says one minute.

**Recommended: A.** The under-one-minute label is more useful for short files. A fixed rate avoids adding a setting to a small feature.

</details>

### Q5. Should the numbers use Preview's existing top margin?

> **Your decision: A.** Show the numbers in Preview's existing top-right margin, including Split, scrolling with the document and hidden in Source-only mode.

<details>
<summary>Full question</summary>

Preview already has space above its text where a small right-aligned label can fit without covering content. Source has a formatting toolbar there instead. Split shows Preview on the left and Source on the right, so placing one label at the entire content area's top right would overlap Source controls.

~~~mermaid
flowchart TB
  Toolbar[Main toolbar] --> Preview[Preview pane with top margin]
  Toolbar --> Source[Source pane with formatting toolbar]
  Preview --> Text[Rendered Markdown]
  Source --> Editor[Editable Markdown]
~~~

- **A. Show the label in Preview's top-right margin.** Show it in Preview and the Preview pane of Split, and let it scroll away with the document; hide it in Source-only mode. This adds no dedicated bar and avoids overlap, but the count is unavailable while working only in Source.
- **B. Also fit the label into Source's formatting toolbar.** Use Preview's top-right margin when Preview is present, and the existing editor toolbar in Source-only mode. This makes the count available in every mode without a new bar, but leaves less room for formatting controls and may require the toolbar to scroll on narrow windows.

**Recommended: A.** It fits your proposed location using space that already exists and keeps this change small. Split still lets you see the count update while editing.

</details>
