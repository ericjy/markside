# Markside System Design

## Extension Surfaces

| Surface | File | Purpose |
| --- | --- | --- |
| Content script | `contents/markside.tsx` | Registers supported local URLs and bootstraps the Markside UI |
| Content application | `components/content-app.tsx` | Coordinates document state and composes the content UI |
| Paused entry | `lib/localhost-review-entry.tsx` | Localhost Review code, not registered in any build |
| Background worker | `background.ts` | Relays local-file reads and tab navigation requested by the content script, and registers the uninstall survey URL |
| Popup | `popup.tsx` | Lists pending document Reviews, reports file-access readiness, and links to Settings |
| Options page | `options.tsx` | Stores extension preferences and explains supported behavior |

The content application keeps the document state shared by every feature
(content, draft, mode, and the disk refs) and composes `hooks/use-content-*`
hooks that own the rest:

| Hook | Owns |
| --- | --- |
| `use-content-file-loading` | File reads, navigation, and wikilink resolution |
| `use-content-save` | Saving, Auto Save, and the unsaved-draft warning |
| `use-content-reload` | Reload from disk, reload changes, and Review copy reloads |
| `use-content-preview` | Rendering and mode changes |
| `use-content-review-highlights` | Resolving Review Comments against the rendered preview |
| `use-content-agent-review` | Local Review-file discovery and explicit send to a waiting agent |
| `use-content-review` | Review Comment creation, editing, selection, and copying |
| `use-content-review-overlay` | Review overlay open state, size, docking, and position |
| `use-content-selection` | The selection toolbar and comment composer |
| `use-content-readability` | Readability Check results and consent |
| `use-content-snapshots` | Link and hosted snapshots, and Review import |
| `use-content-split-pane` | Split divider and sidebar state around Split |
| `use-content-pdf-export` | PDF export and copying the rendered preview |
| `use-content-review-prompt` | Review prompt activity and the prompt dialog |
| `use-content-preferences` | Theme, heading numbering, and typeface |
| `use-content-shortcuts` | Keyboard handling |

Hooks whose effects read the rendered preview are called after
`use-content-preview`, because React runs a component's effects in call order;
`lib/content-hooks.test.ts` guards that order. `content-toolbar`,
`content-view`, `content-dialogs`, and `content-review-overlay` render the UI.

`content-view` shows document statistics outside the rendered Markdown, in
Preview's existing top-right margin. `lib/document-stats.ts` counts raw
whitespace-separated source chunks and estimates reading time at 200 words per
minute. Split counts the current draft rather than the delayed rendered content.
The label scrolls with Preview and is hidden in Source-only mode and print.

The content script is the product's primary surface. It matches local Markdown
and the supported source-text extensions and special filenames defined in
`lib/file-types.ts`. Selecting another supported text file with a known absolute
path asks the background worker to navigate the tab to its `file://` URL, which
remounts the content application after a full page reload. Files whose full path
cannot be inferred, images, and unsupported file types are loaded into the
mounted application without a full page reload.

Chrome URL globs are case-sensitive. Runtime support therefore uses the exact
extension and special-filename casing registered in the manifest;
case variants remain in the mounted application instead of navigating to a page
where the content script would not initialize.

## Loading and Rendering

```text
file:// Markdown page
→ content script reads the initial document or requests the file through background.ts
→ parseFrontmatter(source)
→ markdown-it renders the body
→ DOMPurify sanitizes the HTML
→ relative image and document links are resolved against the current file
→ Shiki enhances code blocks
→ Pele renders Mermaid diagram blocks
→ headings are extracted for the outline
→ question cards receive answer controls
```

Heading IDs match GitHub's, using `github-slugger` on the heading text before
typographer replacements, so `#anchor` links written for GitHub work in
Markside. Duplicate headings receive `-1`, `-2`, and so on. Non-ASCII
characters stay as written, so the location hash is decoded before Markside
scrolls to a heading on load.

A fenced `question` block renders as a Question Card whose options are its
answer controls. Its body is parsed as Markdown before inline parsing and heading
IDs, with source lines mapped back to the document. Legacy `> [!QUESTION]`
blocks remain supported. The question-answer rule marks each `**A. …**` list item as a
radio option, shows its letter as a key without changing the rendered text, and
labels option X with small uppercase **RECOMMENDED** text above its title and
marks the `**Recommended: X.**` paragraph that explains it. That
paragraph's label renders as **Why X?**; the Markdown source stays unchanged.
Leading ✓, △, ✕, and ? symbols in Question Card table cells receive colored
spans without changing cell text, so copying and Review anchors stay intact.
Comparison disclosures sit below a hairline under a small muted label, and
each Question Card table is wrapped in a white panel with fixed column widths,
muted criteria, and its header letters drawn as keys like the options', while
the cell text stays unchanged for anchoring and copying. The
interview skill writes a subordinate `Compare tradeoffs` Markdown heading and
table. Rendering makes that section an initially expanded disclosure, preserving
the actual heading, its ID, and its source line inside the summary. Existing
HTML comparisons retain their authored open state. The
preview then wires the options: clicking one (unless the click ends a text selection or lands on a
Review Comment), pressing Enter on it, or pressing its letter while its card is
active creates, or changes, one ordinary Review Comment on the card's
heading with the option letter as its body. One card at a time is active: the
card last clicked or focused into, otherwise the first unanswered one. Letter
keys do nothing while the active card is off screen. When a
round shows several answerable cards, the active card's border deepens, only it shows its keyboard hint (the
others keep the hint's space hidden, so nothing reflows), and other
cards' unchosen letter keys are muted until hovered or focused; scrolling
moves activity once the active card neither is fully visible nor crosses a
line a third of the way down the preview, to the card on that line, else the
visible card nearest it. A letter answer moves activity to the next unanswered
card, smoothly scrolling it fully into view when it is not, instantly under
reduced motion. The chosen option is marked in
place, so that comment's heading highlight is hidden. Clicking a selected option
again, or pressing Enter or Space on it, deletes its unsent answer comment and
leaves the question unanswered. Repeating a letter shortcut does not clear an
answer. Sent answer comments retain their history and use Withdraw in Review.
Choosing never sends;
the reviewer sends the Review, or presses Cmd/Ctrl+Shift+Enter anywhere
outside a text field, so a misclick costs nothing. During an agent Review a bar
just after the last answerable card, outside it, covers the whole round: it shows
the answered count, such as **2 / 3 questions answered**, and **Send review** even
while cards remain unanswered. The button follows the Review's existing send
conditions, so an empty Review cannot be sent. After sending it says the agent's next question will
appear there, with **Check for reply** running the same check as the Review
panel. A comparison column whose header starts with an option letter, such as
`B. …`, is tagged with that letter; the hovered or focused option, else the
chosen one, colors its column header, and hovering also fades the other options' columns. A separate Something else… tile, with a muted hint line listing what it can do, is mounted
after the option list, before any comparison or recommendation. It, or T while its card is active
unless an option uses that letter, opens the comment composer on the heading, whose quick presets are Clarify, Simplify, Skip,
Delegate, and Stop. The interview presets are not in the general preset
catalog. Clarify on a card asks the agent to rewrite the question and allows a
diagram, table, or example, since the rewrite stays in the interview doc. Simplify
asks the agent to use the simplest reasonable approach for the current scope,
record the decision, and move on, revisiting only if a concrete need arises.
The general comment catalog retains Example and its original Simplify instruction.
The tile is marked selected, with the saved text clamped to two lines
in place of the hint, only when the saved answer is nonempty and does not match an
option letter. Keyboard hints appear at the top right, wrapping below the Question label
on narrow screens. These mounts are excluded from Review anchoring, copying, and
print. The sidecar format is unchanged.

Archived questions use an ordinary numbered question heading, decision callout,
and full Markdown body ending at the next heading of the same or higher level.
Markside renders them as Question Cards, generating a collapsed Full question
section around the body while keeping the heading and decision visible. The
generated label is excluded from Review text indexing. Source remains readable
in other Markdown renderers. Existing HTML-wrapped archives remain supported;
legacy nested comparisons retain their authored open state. Options use the current
card styling and mark the recorded choice, but have no answer handlers or
radio roles. Archived cards take no part in letter shortcuts, active-card
tracking, round counts, or unanswered-question finish checks. Revisit question
opens the ordinary heading-anchored composer with an explicit revisit instruction
and the recorded answer, or restores an existing pending revision. Saving and
sending follow the existing Review flow; the source decision stays unchanged
until the agent handles the revision. Heading comments on archived cards retain
their Review highlight so pending revisions remain discoverable.

Choosing or changing an answer, saving a Review Comment, sending a Review, and
discovering an agent request or reply preserve whether the Review panel is open.
The Review toolbar entry retains its pending-item count; Addressed replies give
the badge a green treatment and a reply-count label, while an agent Review error
shows an error badge and its message. These are pending-review indicators, not
unread tracking. Opening Review or selecting a passage's comment explicitly
opens the panel; its existing per-document open preference still restores on load.
With the panel closed, a compact sticky row at the top of Preview centers its
action beside its message. Its neutral tinted background and bottom border separate it
from the document; its button is 28px tall with 12px text. Saved unsent Review Comments show their draft count and Send
review; an unsent Review Note can be sent there too. Sending uses the panel's
existing handler and disabled conditions, including support for partial question
rounds. Otherwise, when the same finish conditions as the panel allow it and no
question is unanswered, it says “Anything else to change? Comment on it, or finish.”
and offers Finish review. Both actions stay hidden while the document has changed
on disk or the Review is complete. Failures appear in place for retry. Narrow
windows can wrap the row.

Mermaid diagrams are rendered by Pele, which lays out labels in the document font
and draws them as SVG text. Rendered diagrams keep zoom, pan, and reset controls
in a toolbar above an isolated viewport. Diagram colors come from CSS variables
mapped to Markside's palette, so theme changes need no re-render. A typeface
change replaces only the SVG inside the viewport so its current view remains
stable. Inline diagrams start at their natural size or smaller; wide diagrams
shrink to fit the column. Pele ignores Mermaid's animated edges, so Markside
reads `id@{ animate … }` lines from the source and animates the matching edges
itself, except under reduced motion. A diagram Pele cannot render shows an
error block with Pele's message and, for syntax errors, its line and column. Expanded view temporarily moves the diagram to a
viewport-filling overlay and restores its inline position and view state on exit.
Print and PDF Export ignore the screen's pan, zoom, and viewport height, sizing
each inline SVG to the document column with its aspect ratio preserved.
Inside a Question Card, or a `<details>` whose summary is "Full question" (an
archived question), a diagram only explains the choice: it shows only the
Expand control, on hover or focus, until expanded.
A blockquote starting with **Your decision**, **Assumed decision**,
**Deferred**, or **Open**, the decision line the markside skill writes under an
archived question, renders as a callout rather than a quotation: teal for the
reviewer's decision, amber for the agent's assumed one, and gray otherwise.

The file actions (`…`) menu includes a **Page width** row showing the current
choice. Its submenu provides mutually exclusive **Narrow** (48rem),
**Standard** (64rem), and **Full width** (no maximum)
choices for Preview, including Split Preview. Available space can constrain each
width further; type size and side spacing stay unchanged. The choice persists in
`chrome.storage.local` as `previewWidth`. If no valid choice exists, Markside
uses the legacy `previewFullWidth` boolean, preserving existing users' choices;
new installations default to Standard. PDF Export keeps its separate layout.

The same menu includes a **Typeface** submenu, moved from Options. Its parent
row shows the current choice; the submenu lists Sans, Serif, Charter, Iowan,
and Avenir, each displayed in its own font stack. It retains the existing
`typeface` preference and updates open documents through `chrome.storage.onChanged`.
`use-content-preferences` supplies both the selected value and the Preview font
variable. Typeface affects Preview and Split Preview; code, Source, and PDF
Export retain their independent fonts.

The menu also includes **Number headings**, stored in `chrome.storage.local`
and off by default. Heading numbering applies to Preview, Split Preview, Outline, and PDF Export.
A sole opening H1 stays unnumbered as the title; nested sections use decimal
numbers, compressing skipped heading levels. If any heading already has an
explicit numeric section prefix, the entire document keeps its authored labels.
Generated labels hang in Preview’s permanent five-rem left margin, including in
full-width and Split views. Heading text aligns with body text, and toggling
numbering never changes the content width. They use CSS content backed by heading
attributes, leaving source,
heading IDs, and Review text anchors unchanged. Link Snapshots carry source only,
so this local display preference is not included.

Readability Check is unreleased and off unless `PLASMO_PUBLIC_READABILITY_CHECK=true`
(see `.env`). When it is on, Markdown Preview and Split Preview add
**Show readability buttons** to the same menu.
It defaults to on and persists across files. Turning it off hides heading controls
without deleting locally saved scores or Review Comments. The first readability
check opens a consent prompt; the selected section, including nested subsections,
is sent to Markside's service and its AI provider only after the user confirms.
Consent persists for later one-click checks.

Split Preview uses the same rendering pipeline. Lightweight Markdown rendering is scheduled during typing, while Shiki and Mermaid enhancement is deferred so editing remains responsive.

## Folder and File Navigation

`usePersistedDirectory` owns the selected `FileSystemDirectoryHandle`, its
inferred `file://` root, and the permission lifecycle. IndexedDB stores a
catalog of directory handles keyed by root URL. On each page load, Markside
selects the longest saved root that contains the current file URL, allowing
different tabs to browse different folders without per-tab state.

The File System Access API exposes a directory's name but not its absolute path. `deriveRootUrl()` can infer the full root only when the directory name appears in the current URL. The folder picker rejects path-incomplete roots and asks the user to open a file from that folder directly to establish the full path.

Chrome treats local files as opaque origins, so the History API cannot update the address bar from one `file://` path to another. Address-bar synchronization therefore uses `chrome.tabs.update()` in the background worker and necessarily performs a full page reload.

`useFileTree` reads directories lazily and excludes large or generated folders.
File entries are native links, allowing Chrome's context menu, Command/Ctrl-click,
and middle-click to open them in another tab. Ordinary clicks retain Markside's
existing navigation and Unsaved Draft handling. Each path segment is URL-encoded
so filenames containing spaces, `#`, or `?` identify the correct file.
Expanded directory paths are stored in `chrome.storage.local`, scoped to the
opened root URL, and rehydrated after full-page file navigation. Opening a file
expands and persists its ancestor folders, unless one is excluded, and scrolls
the sidebar just enough to show its row. `useFileIndex`
recursively indexes the same allowed tree when the quick file switcher opens.

## Editing and Saving

Markdown files support Preview, Source, and Split. Non-Markdown text files use Source only; images use the image viewer.

Source defaults to full width for all text files, including Markdown. Its width
control is in the Source options menu alongside Word wrap and Copy. Preview defaults to column width and has its
own Page width submenu in the file actions menu, present only when Preview is shown.
Both choices persist independently across reloads and files, including in Split
mode. The Split divider persists separately: releasing a drag, or a keyboard
adjustment, stores the position for the next load.

```text
editor change
→ update the Unsaved Draft
→ schedule Split Preview rendering
→ if Auto Save is enabled, schedule a disk write after 1.5 seconds
```

Manual save and Auto Save both use `tryHandleFromDirectory()` to traverse the
saved directory handle whose root most specifically contains the target file.
For a file outside every saved directory, Markside asks the user to choose
its folder with read-write access, saves that directory, and retries the save.
It does not use `showSaveFilePicker()`, which could write a copy elsewhere.

Before writing, Markside compares the file's current modification time with the last loaded version. A mismatch presents an overwrite/reload conflict instead of silently replacing external work.

Auto Save is stored in `chrome.storage.local`, defaults to off, and updates open content-script tabs through `chrome.storage.onChanged`.

### Reload comparisons

The document toolbar exposes Reload directly. For Markdown, an explicit reload
compares the last loaded or saved source with the newly read file and opens the
changes in Preview. The existing Unsaved Draft confirmation still applies.
Reload results are discarded if the user navigated elsewhere or edited the draft
while the read was in progress.

Returning focus to the tab reads an open text file once and compares it with
the last loaded or saved text. A difference shows Changed on disk beside Reload
until a reload, a save that replaces that text, or file navigation. The check
never replaces the document, and a result is discarded if the file was saved,
reloaded, or navigated away from while the read was in progress. See
[ADR-0002](adr/0002-no-file-watching.md).

`lib/reload-changes.ts` compares the two rendered documents block by block and
only then word by word inside a block that was rewritten, so an edit is never
spliced across a paragraph or list item. Blocks that share too little text are
shown as a removal followed by an addition instead of a word comparison. The
current document is decorated with green additions and red struck-through
removals; a removed block returns as a copy of the original element, complete
with its list marker or table row, placed next to the neighbour it used to have.
A floating bar centered at the bottom of the document area carries the controls: a Show changes checkbox toggles clean reading, and Done closes the
comparison. Show changes starts checked unless the document contains a
question card before or after the reload, since an interview's reloads mostly
move questions around, including the one that replaces them with its summary. Its menu repeats Done and adds Done and clear comments, which
also clears the entire Review. During an agent Review it reads Done and clear
drafts and, like the panel's Clear drafts, removes only unsent changes and
appears only when there are some. A reload without a comparison to show reports
No changes on disk, or Reloaded from disk for a file type that has no
comparison, beside Reload for a moment. Source-only changes, such as link
destinations, have no dedicated indicator in this version. Code and
Mermaid definitions remain plain code while changes are shown. Normal syntax
highlighting and diagram rendering resume in clean reading.

A newly added comment is not selected: its passage highlight and badge already
mark it, so the panel only plays a brief entrance on its card, scrolling the
card into view when it falls outside the list.
Clicking empty space in the comment list, or document text outside a passage
highlight, clears the selection.

Removed text is excluded from the current document's Review text index, rendered
clipboard output, and printing. Selecting a removed passage creates a Review
Comment whose anchor carries `removed: true`. Such comments remain unanchored,
even if an identical passage survives elsewhere, and copied prompts describe the
quote as historical context. Select current or removed text separately.

The panel's full clear action clears the entire Review.

Comparison state lives only in the mounted page. Another explicit reload
replaces the comparison, even when it finds no changes. Editing clears the
comparison; Done, file navigation, and browser refresh clear it as well.
There is no file watching, polling, or persistent version history.

### Creating Markdown files

**New Markdown file** is an icon beside Find file in the folder header, available
once a folder is opened.
A filename dialog shows the opened root folder as the destination, regardless
of which document is currently open. Names cannot contain
path separators. The input starts with `Untitled.md`, with only `Untitled` selected.
The filename must end in `.md`; Markside does not append the extension. Existing files or directories
with the chosen name are rejected.

The explicit Create action requests write permission on the opened directory
and creates an empty file directly in that directory. Creation
never opens a writable stream, so an external process creating the same filename
concurrently cannot have its contents truncated. The tree refreshes after this
explicit action; there is no filesystem watcher or polling.

The background worker opens a normal `file://` tab. A tab-scoped, one-time request
starts it in Source mode with editor focus, without changing the saved view
preference. The original tab and its Unsaved Draft remain untouched. Popup
creation and the separate extension editor page are not part of this flow.

## Snapshots

Markdown files expose a Share action. Two kinds of snapshot are available, and
the sender chooses between them on every share. Both create a read-only copy
that a recipient can open in a browser without installing the extension. Size
decides which one is preselected.

A **Link Snapshot** carries the document entirely inside the link. `lib/link-snapshot.ts`
serializes the saved basename and Markdown as compact JSON, compresses it with
raw DEFLATE, and encodes the result as unpadded Base64URL in an `x1` URL
fragment. The extension does not send the fragment over the network. When the
constructed URL is at most 2,000 characters, it is preselected. Between 2,000
and roughly 4,000 characters, where chat clients begin to refuse to send
links, creation still succeeds but the confirmation dialog warns the sender.
Creation is only blocked when the decompressed envelope exceeds the 256 KiB the
viewer's decoder will accept.

A **Hosted Snapshot** encrypts the document in the sender's browser with
AES-256-GCM, stores the ciphertext on Vercel Blob, and carries only the
identifier and decryption key in the link. The key stays in the URL fragment,
which the browser never sends to the server, so Markside receives and stores
ciphertext only. When the Link Snapshot URL exceeds 2,000 characters, the
Hosted Snapshot is preselected. The sender can always select the other kind.
Hosted snapshots expire on a sender-chosen 7, 30, or 90 day schedule.

Unsaved drafts must be written successfully before the URL is copied. The
existing save conflict and permission policies remain authoritative. `lib/link-snapshot-resources.ts`
reports local images and document links that the standalone viewer cannot
resolve.

The public `/s` viewer is maintained in the separate website repository. It
decodes and renders entirely in the browser, limits decompressed output to 256
KiB, sanitizes rendered HTML, and treats local resources as unavailable. Link
Snapshots are decoded in the page, and Hosted Snapshots are decrypted after
fetching from `/api/snapshots/<id>`. See [ADR-0004](adr/0004-carry-link-snapshots-in-url-fragments.md)
for Link Snapshots and [ADR-0007](adr/0007-host-encrypted-snapshots.md) for
Hosted Snapshots.

## Key State

| State | Purpose |
| --- | --- |
| `fileUrl` | Currently loaded local file |
| `content` | Last loaded or rendered source |
| `draft` | Current Unsaved Draft |
| `mode` | `"preview"`, `"source"`, or `"split"`; the last selection is restored from `chrome.storage.local` |
| `splitPercent` | Preview-pane percentage; a dragged or keyboard-adjusted split is stored in `chrome.storage.local` and restored before the first paint |
| `autoSaveEnabledRef` | Current Auto Save preference |
| `saveState` | Idle, unsaved, saving, saved, or failed |
| `conflict` | Whether the disk version changed externally |
| `dark`, `previewWidth`, and `sourceFullWidth` | Current theme and independent pane width choices; both width choices persist in `chrome.storage.local`; legacy `previewFullWidth` is a fallback for Preview |
| `leftOpen` and `outlineOpen` | Sidebar visibility; explicit file-tree and Outline choices are stored in `chrome.storage.local` and restored before the first paint, though narrow windows still start with Outline closed. Split's temporary sidebar closures do not change these preferences |
| `zenMode` and `zenOutlineOpen` | Zen mode, kept per tab in `sessionStorage` so it survives reloads and links but not new tabs; hides the file tree and Outline with CSS while leaving `leftOpen`, `outlineOpen`, and their saved preference unchanged. The toolbar becomes a transparent overlay revealed from the top edge or by keyboard focus, a 20 px spacer keeps the document clear of it, and `zenOutlineOpen` shows the Outline inside Zen mode. Its Escape listener records in the capture phase whether a dialog, menu, Review panel, file switcher, expanded diagram, or form field was open, and leaves Zen mode in the bubble phase only if none was and no handler prevented the default |
| `sidebarWidth` and `rightSidebarWidth` | Sidebar widths |
| `reviewOverlaySize` | Session-only compact, standard, or wide Review width; compact is the default |
| `reviewOverlayPosition` | Per-file Review position stored in `chrome.storage.local`; restored after reload and clamped to the current document area |
| `reviewOverlayOpen` | Per-file Review visibility stored in `chrome.storage.local`; an open panel reappears after reload |
| Expanded file-tree paths | Open directories for each persisted root folder |

## Review Layout

Copying a local document Review or a single Review Comment checks the file on
disk first. If it changed, copying stops and a dialog offers **Cancel** or
**Reload file**. Reloading preserves the Active Review and closes the dialog
without copying. The user can inspect the refreshed text before choosing Copy
again, which checks the file and uses the refreshed text anchors.
Reload failures stay in the dialog for retry; an Unsaved Draft still blocks
copying and is never discarded by this action.

Review opens as a compact floating overlay by default. Its header offers **Dock
Review right** and **Float Review**. Docked Review fills the height below the
toolbar at the far right, reserving its width for Preview, Source, and Split.
Outline remains independently toggleable and sits between Preview and Review
when both are open. Review's layout and docked width persist across files in
`chrome.storage.local` (`reviewLayout` and `reviewDockWidth`). The docked width
starts at 384 px and can be resized from 360–600 px using its left divider or
that divider's arrow keys, Home, and End.

A `ResizeObserver` measures the actual `SidebarInset`. If the chosen Review width
and visible desktop Outline would leave less than 640 px for the document,
Review temporarily floats without changing the saved docking preference. The
floating header can be dragged within `SidebarInset`, or moved with the grip's
arrow keys. Floating positions are saved per file and clamped to the inset.
Docking preserves the floating position for a later return to Float.

Refs mirror values used by keyboard handlers and scheduled work so those callbacks do not read stale React closures.

## Localhost Review

Localhost Review is paused. Its entry is kept at `lib/localhost-review-entry.tsx`,
outside Plasmo's `contents/` directory, so no build registers it or requests
localhost access, and the popup hides its controls unless the build sets
`PLASMO_PUBLIC_LOCALHOST_REVIEW=true`. Shipping it again means moving the entry
back into `contents/`, restoring the `scripting` permission, and setting that
flag. The rest of this section describes the feature as designed.

When registered, the entry matches `localhost`, `*.localhost`, and
`127.0.0.1` on http and https, at any port. Chrome match patterns cannot express
the IPv6 loopback, so `lib/localhost-review.ts` rejects it too and the popup
never offers a Review the content script could not serve.

The script adds nothing to the page until the user chooses **Review this page**
in the popup, which sets a per-origin panel flag in `chrome.storage.local`. The
script watches that flag and mounts the surface when it turns on, so the panel
also opens on the next page the user visits within the same application; closing
the panel clears the flag and unmounts everything, leaving the stored Review
untouched.

While mounted, the whole surface — panel, selection toolbar, composer, and
target markers — lives in a shadow root on a single host element appended to
`documentElement`. It carries its own copy of the `--review-*` tokens from
`style.css` and plain CSS, because the shadow root cannot see the content
application's Tailwind build. Markside adds no styles or attributes to the
application's own DOM and never mutates its text.

The panel is the same floating card as the Markdown Review overlay: inset from
the top-right corner, rounded, shadowed, and capped at 70% of the viewport
height. Unlike the Markdown surface, it cannot reserve document width to stay
clear of content — reflowing the reviewed application is not allowed — so the
card is repositionable instead. Dragging its header moves it, the grip button
moves it with the arrow keys, and the position is stored per origin under
`localhostReviewPanelPosition:<origin>`. `lib/localhost-review-layout.ts` holds
that geometry: it clamps the panel back into view when the window changes, and
places the selection toolbar and composer clear of wherever the panel currently
sits rather than of a reserved edge.

One Active Review covers one origin, including port. Each annotation records the
page URL it was captured on, with the fragment removed, and the panel groups
annotations by page. Reviews live in `chrome.storage.local` under
`localhostReview:<origin>` rather than in the application's own storage, so they
survive tab closure and browser restarts until the user clears them. Copying
does not clear a Review.

Selecting text offers Comment, Replace, and Reword, with Delete text as an
icon-only button in its own trailing segment. Reword seeds an editable Review
Comment asking the coding agent to suggest alternative wordings; Markside neither
calls AI nor generates wording. Deleting is its own intent rather than an empty
replacement: it commits straight from the toolbar, since the selection is the
whole input, while the replacement composer requires text. **Pick element**
consumes exactly one click in the capture phase so the application control does
not activate, then opens a comment box; later clicks reach the application
normally.

Targets resolve by identity rather than DOM position; unresolved and ambiguous
targets stay in the panel marked "Target not found" and are copied with a
warning. See [ADR-0006](adr/0006-resolve-localhost-targets-by-identity.md).
While the composer is open, the content being annotated carries an amber pending
highlight with no badge, matching the Markdown surface's pending Review Comment
highlight. Opening the composer takes focus, which clears the browser's own
selection, so without it the user loses sight of what they are commenting on.

Each marker carries a numbered badge at its corner that selects the annotation
and scrolls the panel to its card, closing the loop with the card's own
scroll-to-target click. The badge is the only part of the overlay that takes
pointer events: a marker sits on top of the very content it annotates, which is
often a control, so making the marker itself clickable would stop the
application's own button from being pressed.

Markers carry document coordinates and are positioned absolutely, so the browser
scrolls them with the content and the window scroll costs no work. Repositioning
runs only for a scroll inside the application's own scrolling container or a
window resize; positioning them against the viewport instead made them lag the
page by a frame and visibly bounce.

Markers and target resolution refresh from a debounced `MutationObserver` that
also detects client-side route changes. The observer does nothing beyond
re-reading the page.

## Pending Reviews in the popover

The popover lists every Active Review waiting to be handed to an agent, and the
toolbar badge carries the total item count. While localhost Review is paused,
both show document Reviews only; stored localhost entries are filtered out
without being deleted.

Reviews live in two places and only one of them is reachable from the popover: a
localhost Review is in extension storage, while a document Review is in the
IndexedDB of the *page* origin the content script runs on. So each change mirrors
a small entry — kind, key, label, pending item count, updated-at — into
`chrome.storage.local` under `reviewIndex`. Reviewed content is never mirrored.
Resolved comments are not pending, and a document Review whose comments are all
resolved leaves the index. Agent comment status lives in the sidecar, so the
content app writes document entries once both the Review and its sidecar have
loaded; `lib/localhost-review-storage.ts` writes the localhost ones; `background.ts` repaints the badge whenever that key
changes.

A file moved or deleted outside Markside leaves its entry behind. The popover
fetches each document entry's file URL when it opens, and again on Open, and
marks one it cannot read as moved or deleted instead of navigating to Chrome's
file-not-found page. Dismiss drops only the index entry; the Review stays in
IndexedDB and returns to the index if the file is opened at that path again.

A content script only runs on pages loaded after the extension was installed or
reloaded, so the tab in front of the user may have none. Rather than telling them
to reload the page, the popover injects the script with `chrome.scripting` — the
`activeTab` grant covers the host — and each content script guards its own
bootstrap so injecting one that is already running does nothing.

On a local development origin the popover switches Review Mode on and off. That
is a mode, not a panel: with it on, selecting text offers Comment, Replace,
Reword and Delete text, Pick element becomes available, and saved annotations are
marked on the page; with it off the page behaves normally again. The lasting
per-origin flag holds that state, and the popover reads it back so one button
carries both directions.

A rendered Markdown file needs no such switch — selecting text in Preview offers
Add comment whether or not the Review panel is open — so the popover offers no
button there. Opening a pending document Review instead leaves a one-shot request
under `openReviewRequest`, which `contents/markside.tsx` consumes to show its
Review overlay on arrival. The request carries the file URL and a timestamp and
expires after a minute, so it never opens the Review on a page the user has since
navigated to.

The list takes the user to a Review rather than acting on it: copying and
clearing stay in the panel, where the items are visible. That also keeps the two
kinds of entry alike, since only the localhost half is readable from the popover
and an asymmetry there would show up as one card carrying buttons the other
lacks, for reasons a user cannot see.

## Chrome Web Store review prompt

Markside keeps aggregate review-prompt scheduling state in
`chrome.storage.local`. It records the first-use time, active-day dates,
meaningful-action counts by category, per-day caps, prompt count, and snooze
state. It does not store document contents or paths in this state, and it does
not transmit the state.

The first prompt becomes eligible after three active days, or after five
meaningful actions across at least two categories and 20 minutes of use. An
action category contributes at most three times per day. Adding the first
Review Comment can qualify the user, but cannot open the prompt because the
user is mid-task. The content application waits for a completed save, copy,
export, or later file open before claiming and displaying the modal.

Claiming the first prompt starts a 14-day snooze and resets its action count.
The one permitted follow-up requires both the elapsed snooze and five new
meaningful actions. Claiming that second prompt disables further automatic
prompts. Choosing the Store action at any time also disables automatic prompts.
The popup and Options page keep a permanent Store review action available. The
modal and Options page also link to `hello@zhuge.app` for direct feedback.
Opening that email link does not complete the automatic review-prompt sequence.

## Durable Constraints

### Pre-bundled ESM dependencies

Shiki and CodeMirror are pre-bundled with esbuild and aliased through `package.json` because Plasmo's Parcel pipeline cannot reliably bundle their ESM dependency graphs for this extension.

Never import those packages directly. Use the project wrappers and update the matching bundle script when adding a language, theme, or editor dependency. Pele, which renders Mermaid diagrams, is bundled by Parcel directly and pinned to an exact version. See [ADR-0001](adr/0001-prebundle-esm-only-dependencies.md).

### No file watching

Markside does not poll the filesystem or automatically reload external changes. Users navigate to or select a file when they want to reload it. Returning to the tab checks the open file once and may show Changed on disk. After Send review to agent, a bounded check re-reads the Review file for up to 2 minutes and checks the document once when the agent replies. See [ADR-0002](adr/0002-no-file-watching.md).

### Rendering safety

Markdown rendering allows raw HTML, such as inline SVG and `<details>`. DOMPurify sanitizes the generated HTML, stripping scripts and event handlers, and explicitly preserves the `data-wikilink` and `data-source-line` attributes used for local navigation and source mapping.

### Browser permissions

The popup reads the active tab's URL through `activeTab`, which Chrome grants
when the user opens the popup, so Markside holds no standing host permission for
localhost pages.

Directory selection and permission requests require a user gesture. Auto Save may query permission but cannot trigger a permission prompt; users recover with an explicit save action.

### Generated manifest patch

Plasmo only extracts inline string literals from content-script configuration,
so `contents/markside.tsx` keeps one valid broad `file:///*` match and the
supported filename `include_globs` inline even though runtime classification
lives in `lib/file-types.ts`.

Chrome MV3 rejects `file://` patterns in `web_accessible_resources`.
`scripts/fix-manifest.mjs` removes them from the generated manifest after a
production build and watches for regenerated manifests during development.

### Plasmo development overlay

Plasmo's content-script development overlay requires a default export.
`contents/markside.tsx` exports a null-rendering placeholder component for that
contract; the application continues to mount through the content script's
existing bootstrap code.

## Local agent Review handoff

The optional `cli/` npm package creates `<document>.review.json` beside a local
Markdown document, opens Chrome, and waits for an explicit send. The extension
checks for the file at document load, explicit Reload, Review-panel open, tab focus, and Check for review, and offers **Send review to agent** for an active request. It uses the existing stored folder
handles and read-write folder picker. Document contents are verified against
disk before sending; only the Review file is written. The action is always
Send review to agent. When folder selection is needed, one line below it names
the folder Chrome will ask for, with the full path on hover. The line frames
access as delivery to the agent: comments are already saved locally in IndexedDB.
A matching saved or newly selected sidebar folder hides the line.
Copy review as prompt is a quiet, borderless secondary action below the full-width
Send button, aligned left. Clear aligns right on the same row when space allows. Once the
current feedback is sent, one status line, a green Review sent followed by a muted
Waiting for the agent’s reply, replaces the primary button until feedback changes. **Check for reply**
reads the agent sidecar and
document once, refreshes replies, and briefly shows No reply yet or Updates
found inside the check button. Read failures offer a retry. If the document changed, a bottom-centered document bar offers **Reload**
using the existing Reload action and Unsaved Draft confirmation; checking never
replaces document content. Inline Agent not responding? guidance includes a
Start a review in your agent link that opens the existing setup dialog. Copy as prompt
remains available. Check for reply and Copy as prompt share one row at the
360px minimum sidebar width and wrap naturally when space is insufficient. The sent status confirms a local write, not agent receipt; no agent
process is started. Editing feedback restores Send.
For an active request, the comment composer keeps Save & copy prompt, and its Save
is a split button whose menu offers Save & send review; Cmd/Ctrl+Shift+Enter also
saves and sends. Save & send review sends the newly saved whole Review directly, including prior comments
and overall feedback, without waiting for a React render. Folder permission is
requested within the click. A cancelled or failed send leaves the comment saved
in the Review panel for retry. Without an active request, the composer retains
Save & copy prompt and Save.

The version 1/2 contract and parser live in `cli/review-file.mjs` and are shared
by the CLI and extension. Node uses temp-file rename; Chrome commits its staged
writable stream on close. Watching and a one-second fallback poll exist only
inside the waiting CLI and end on send, timeout, or interrupt. ADR-0002 still
applies to the extension. See [the contract and setup](changes/2026-10-18-agent-review-loop/spec.md).

Agent Review Comments have three states: Open, Addressed, and Resolved. The
agent uses the CLI `address` command to report its work and reply; only the user
can Resolve or Reopen in the panel. Addressed cards move into their own Addressed
group, open for checking. While the document shows a question card, that group
starts collapsed, so answered interview questions need no per-answer Resolve;
Finish review resolves them. Resolved cards move into a collapsed Resolved group. Reopening returns a comment
to Open and the request to pending, requiring an explicit send before agent work
continues. The CLI rejects agent resolution.

Unsent Draft and local Open comments offer an individual Delete action with Undo.
Drafts do not offer Resolve. Comments already recorded in the current sidecar
cannot be deleted; Resolve and Reopen preserve their shared history. Undo restores
the deleted comment's identity and position without replacing newer comments.

Results match the comment ID, original quote, and body; revising the comment
hides a previous result. Addressed and Resolved comments hide passage warnings,
Preview highlights, missing-passage markers, and passage hit testing, including
after resizing. A successful explicit Reload refreshes results even when source
text is unchanged. No timer or filesystem watcher is used.


The sidecar keeps one flat comment list with each comment's latest status and
reply. A normal retry or continuation preserves the request. Addressing and
resolving keep the agent waiting; the reviewer's Finish review ends the request,
because resolving is also how reviewers tidy up before more feedback. Only then does a fresh review
start another, keeping resolved comments as history. Each send replaces the list
with the comments being sent. The panel withholds Finish review and Resolve all
while the document has changed on disk, asking the reviewer to Reload and see
the agent's edits first, and while a Question Card in the document is unanswered,
asking them to answer it, so finishing cannot end an interview early. See [ADR-0008](adr/0008-flat-agent-review-file.md).

Comments loaded from the sidecar use the same Active, Addressed, and Resolved cards as local
comments, including comments missing from browser storage. Resolved starts
collapsed and includes comments from earlier requests.
Sent feedback is authoritative in the sidecar; local drafts can override content
until sending. Without a sidecar, Clear all retains the original behavior: it
clears the local Active Review and closes the panel. With a sidecar, Clear drafts
removes unsent additions, restores edited sent
feedback, preserves imported history, and keeps the panel open. It never mutates
the sidecar or ends the request.


Comment badges separate local Open/Resolved from agent Draft/Sent/Addressed/Resolved.
`ReviewComment.localStatus` and `reviewMode` are optional IndexedDB metadata;
missing local status means Open. Sent state, agent responses, and acceptance of
sent comments stay authoritative in the sidecar. Manual Resolve dispatches by
comment ID ownership: current sent comments use the existing permission-checked
sidecar status write; unsent local comments update IndexedDB only. Addressed feedback
shows a primary Resolve; Open copy-prompt comments show a quiet checkmark Resolve
icon, because nothing has acted on them yet. Sent feedback is the agent's turn: once expanded, it offers a quiet
Withdraw that closes it without waiting for the agent; collapsed, it has no action.
Unsent edits of a sent comment must be sent or discarded before acceptance.
New locally resolved comments are excluded from sending and copying, retain their
status on reload, and have no passage warnings/highlights. Reopen restores Open.
Clear drafts retains local Open/Resolved copy-prompt comments and removes only
integration drafts; Clear all remains the copy-prompt action.

The primary button always changes Review state; setup instructions are never primary.
A local file without an agent review makes Copy review as prompt primary when active feedback exists,
hiding it when there is nothing to copy, with a Start a review in your agent… link below that
opens the setup dialog. An active agent review makes Send primary, demotes Copy,
and hides the link. Once every sent comment is Addressed or Resolved and nothing
is unsent, Send gives way to secondary buttons with no primary action, so the
panel doesn't invite ending the Review while the reviewer may still add
comments. A note says the reviewer can keep commenting and the agent waits until
they finish. Resolve all, shown while Addressed comments remain, resolves them
and keeps the Review active; Finish review marks the sidecar resolved, resolving
any Addressed comments in the same write; and Copy shrinks to an icon so all
three fit one row. New feedback restores Send. A completed review shows Copy only when active feedback exists and offers a Start
another review with your agent… link, with or without new drafts; Clear drafts
appears only when drafts exist. The sidecar remains resolved until the agent starts the next review.
When no saved folder contains the document, the dialog adds a folder step that
opens the read-write picker directly from its button, so the first send needs no
picker. The panel's folder line remains for reviews the agent opens directly,
which never show the dialog.
The link opens the existing command dialog; the agent's next normal
review command starts the new request. Review complete is displayed only with no
active comments or unsent changes. No watcher or polling is added to discover the
new request (see ADR-0002): explicit Reload, Review-panel reopen, a Check for agent
review link, and returning focus to the tab each read the sidecar once.
Commands copied from this dialog include --no-open because the file is already
open. Done only closes the dialog. Returning to the tab reads the sidecar silently, so the
existing tab discovers a new request or the agent's Addressed replies without
reloading the document or changing whether the panel is open. A silent read keeps
any unseen send error. Check for review does the same
on demand and briefly shows No review yet when nothing is found. Direct skill invocations still open Chrome
unless --no-open is supplied.
