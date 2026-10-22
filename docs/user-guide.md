# Markside User Guide

Markside is a Chrome extension that renders and edits local Markdown files directly in the browser. Everyday file use stays local: no sync service and no upload. Creating a Hosted Snapshot is the explicit exception; Markside encrypts that saved copy in your browser before uploading it for sharing.

## Quick Start

1. **Install the extension** from the Chrome Web Store.
2. **Allow file URL access**: open `chrome://extensions`, find Markside, and enable **Allow access to file URLs**.
3. **Open a Markdown file** in Chrome. Three ways to do this:
   - Press `Cmd+O` (macOS) or `Ctrl+O` (Windows/Linux) to open the browser's file picker.
   - Drag a `.md` file onto a Chrome tab.
   - Set Chrome as the default app for `.md` files (see [Opening Files](#opening-files)) so double-clicking opens Markside automatically.
4. Markside renders the file. The left sidebar appears and prompts you to **Choose folder** so you can browse related files.
5. Click **Choose folder** and select the folder your file lives in, or any parent folder. The file tree populates immediately.

## Opening Files

### Open from an agent

Install the Beta `markside` Agent Skill globally with the open Agent Skills CLI:

```bash
npx skills add ericjy/markside --skill markside -g
```

The installer command requires Node.js. Opening a file with the installed skill
does not. It
uses the operating system's native shell on macOS and Linux or PowerShell on
Windows.

After an agent creates or references a Markdown file, invoke `/markside` or say
“open this in Markside.” Some hosts use another syntax, such as `$markside` in
Codex. The agent opens the single `.md`, `.mdx`, or `.markdown` file identified by
the current task. You can also provide a path explicitly. If several files are
plausible, the agent asks which one instead of opening several tabs or guessing
from modification times.

Run `/markside setup` to open Markside's Chrome Web Store page. Chrome still
requires you to approve the extension installation and enable **Allow access to
file URLs** in Markside's extension details. The skill cannot inspect which
Chrome profile has Markside installed. It uses Chrome's normal profile and opens
a new tab each time.

For a two-way Review, use `/markside review PLAN.md`. The agent opens the file
and waits until you click **Send review to agent** in Review. On the
first send from a folder, Chrome asks for access to it so your agent can receive
the review. Review names that folder below the button; select it or a parent.
Later sends use the remembered folder permission. **Copy review as prompt**
is a separate button below Send, so you can paste the Review into your agent's
chat instead. After sending, **Sent for agent to pick up** confirms that the Review file
was saved. It does not confirm that an agent has read it or start an agent.
If your agent isn't waiting, use Copy review as prompt. Editing feedback makes Send
available again. With no agent request, Review keeps its usual Copy action.
Choose **Start a review in your agent…** below the buttons to see skill installation
instructions and a command for the open file. If Markside can't yet save feedback
beside the file, the setup also lets you choose its folder. Paste the command into
your agent and switch back to Chrome: Markside finds the review when you return.
If it isn't found yet, click **Check for review** once your agent is waiting. The link is hidden while
an agent review is active.

After addressing your comments, the agent keeps waiting. Reload Markside to check
the changes, then send more feedback or resolve the addressed comments. The agent
finishes when you click **Finish review** or ask it to stop. Once the agent has
addressed everything, **Resolve all** accepts the replies while you keep
reviewing, and **Finish review** also accepts any that remain.
During an active agent review, the comment composer offers **Save & send review**
to save a comment and send the whole Review in one action. Use **Save** to keep
adding feedback first. If sending fails or you cancel folder selection, the
comment stays saved in Review so you can retry.

Agents can also interview you in Markside instead of chat: for example, run
`/grill-me /markside <topic>`, or `/grill-me <topic> in Markside` in hosts that
expand only one command. The agent writes the interview to a `.grill.md` file,
beside the file being discussed or at the repository root, and asks whether to
keep it when the interview ends. Each question is a fenced
`question` block, which appears as a card. The recommended option is labeled,
with the agent's reasoning below the options.
Click an option, or press its letter, to make it your answer; choose another to
change it, or use the **Something else…** tile below the options (or press T) to
answer in your own words or ask a question. That tile is marked selected and
shows your text in place of its hint after you save a custom answer.
Its presets let you skip the question, let the agent decide the rest with its
recommendations (recorded under Previous questions as assumed decisions you can
veto by commenting on them), or stop the interview, leaving unanswered
questions open. If the question or
its options are unclear, ask there instead; the agent rewrites the question and
keeps it current. Hovering an option highlights its column in Compare tradeoffs.
You can also select any text in the card to comment on it. Then click **Send review**
below the last card or **Send review to agent** in the Review panel,
or press Cmd/Ctrl+Shift+Enter. Until the agent replies, that bar says it is
waiting and offers **Check for reply**. Answered questions move to Previous
questions as the heading and your decision, with the full question collapsed
below. The agent records your decision and writes the next
question, and Markside shows **Changed on disk** so you can reload. Click
**Finish review** once the closing **Before you finish** section, which lists
how the agent read your own-words answers and anything it inferred or assumed,
matches your understanding.

Review mode currently requires the prototype CLI installed from this repository
and Node.js 20+. See [local agent Review setup](changes/2026-10-18-agent-review-loop/spec.md). Comments
are sent through `PLAN.md.review.json` beside the document. Add `*.review.json`
to your project's `.gitignore` to keep them out of version control.

If the command fails:

- **Raw Markdown appears:** install Markside in the Chrome profile that opened,
  enable **Allow access to file URLs**, and retry.
- **Chrome was not found:** install Google Chrome. The skill intentionally does
  not fall back to another default browser.
- **No file or several files are identified:** provide one explicit local path,
  for example `/markside docs/plan.md`.
- **Unsupported file:** use a lowercase `.md`, `.mdx`, or `.markdown` extension.

The launcher validates the local path but does not read file contents. It sends
no telemetry and performs no update checks or other network requests.

### From the browser

Press `Cmd+O` / `Ctrl+O` to open Chrome's file picker, then select any supported file. Markside intercepts the `file://` URL and renders it.

### Set Chrome as the default app

Double-clicking a `.md` file on the desktop opens it in Markside automatically.

**macOS:** Right-click the file → **Get Info** → **Open With** → choose Chrome → **Change All**.

**Windows:** Right-click the file → **Open with** → **Choose another app** → select Chrome → check **Always use this app** → **OK**.

### From the terminal

Add an alias to your `~/.zshrc` or `~/.bashrc`:

```bash
alias md='open -a "Google Chrome"'   # macOS
# md notes.md
```

On Windows (PowerShell):

```powershell
function md { start chrome $args }
# md notes.md
```

## The File Tree

The left sidebar shows the file tree for the folder you have open. To enable it, Markside needs read access to a folder on your system.

### Granting access

When you open a file, the sidebar shows a prompt:

> Browse files in the **notes** folder, or any folder above it.

Click **Choose folder**. A system dialog opens — select the folder your file belongs to, or any ancestor folder. The file tree appears immediately and persists across page reloads.

**Choosing a parent folder** is useful when you want to browse multiple sibling folders from one file tree. For example, if your file is at `projects/docs/notes.md`, choosing `projects` shows everything under it.

### Browsing different folders in different tabs

Markside remembers every folder you authorize. Open a file from one project in
one browser tab and a file from another project in a second tab, then choose
each folder once. Each tab automatically shows the saved folder containing its
current file, including after navigation, reload, or browser restart.

If multiple saved folders contain a file, Markside shows the most specific
folder. For example, when both `projects` and `projects/markside` are saved, a
file inside Markside uses the `projects/markside` sidebar.

### If you pick the wrong folder

If the folder you choose doesn't contain the current file, the sidebar explains:

> You chose **work**. Please choose **notes**, or a parent folder.
>
> Want to browse **work**? Open a file from it first (`⌘O`), then choose **work**.

Click **Choose folder** again and select the correct one. To browse a different folder entirely, first open any file from it using `Cmd+O` / `Ctrl+O` or by dragging the file into Chrome. Then press **Choose folder** to choose the folder.

### Re-authorizing after a restart

Chrome may revoke file-system access when the browser restarts. When a yellow banner appears at the top of the file tree, click **Re-authorize** to restore access without choosing the folder again.

### Navigating files

Click any file in the tree to open it. Markdown, text, and code files reload the tab at the file's `file://` URL so bookmarks, refresh, and browser back/forward work as expected. Images and other binary types open inside the current page without changing the address bar.

Press `Cmd+P` / `Ctrl+P` to open the quick switcher and search the open folder by filename or path.

### What the file tree shows

The file tree shows all files except:

```
node_modules   .git         dist    build
.next          .plasmo      __pycache__   .DS_Store
```

Expanded folders remain expanded when you navigate between files.

## Supported File Types

| File type | Behavior |
|-----------|----------|
| `.md`, `.mdx`, `.markdown` | Rendered preview; Source and Split modes available |
| `.txt`, `.log`, `.json`, `.jsonc`, `.yaml`, `.yml`, `.toml`, `.ini`, `.cfg`, `.conf`, `.csv`, `.tsv` | Source editor; address-bar navigation supported |
| `.js`, `.jsx`, `.mjs`, `.cjs`, `.ts`, `.tsx`, `.css`, `.scss`, `.less`, `.py`, `.sh`, `.bash`, `.zsh`, `.sql`, `.vue`, `.svelte`, `.astro` | Source editor; address-bar navigation supported |
| `.env`, `.gitignore`, `.editorconfig`, `Dockerfile`, `Makefile`, `LICENSE` | Source editor; address-bar navigation supported |
| Images | Displayed as an image |
| Everything else | Source editor when opened from the file tree |

## Preview

Open **Page width** in the file actions (`…`) menu, then choose **Narrow** for a shorter
reading line, **Standard** for the existing column width, or **Full width** to
use the available space. Markside remembers the choice across files and restarts.
The Page width row shows the current choice without opening the submenu.
The choice also applies to the Preview pane in Split. Source width and PDF Export keep
their independent settings and layout.

The top-right margin shows the word count and estimated reading time. The count
includes every whitespace-separated chunk of Markdown source, including syntax,
code, and frontmatter. Reading time uses 200 words per minute, rounds up, and
shows `<1 min read` below 200 words or `0 min read` for an empty file. The label
scrolls with the document and also appears in Split, where it follows unsaved
edits. It is hidden in Source-only mode and PDF exports.

Markside renders Markdown with:

- **YAML frontmatter** shown as a summary table above the document
- **Syntax highlighting** for 19 languages
- **Mermaid diagrams** rendered inline with zoom controls, panning, and an expanded view. Ordinary dragging remains available for selecting diagram text and adding Review Comments; choose **Enter Pan Mode** to drag the canvas, hold Shift while dragging as a shortcut, or use the arrow keys. Choose **Exit Pan Mode** to return to text selection. The default view balances the available content width and browser height, scaling between 75% and 350% so compact diagrams stay readable without letting tall diagrams dominate the page. Hold Control or Command while scrolling over a diagram to zoom, use **Reset** to restore its fitted view, or choose **Expand** for a viewport-filling canvas that closes with **Close** or Escape.
- **GitHub-style alerts** for Note, Important, Warning, Tip, and Caution callouts
- **Question cards** for fenced `question` blocks, with answer buttons for agent interviews
- **Wikilinks** — `[[Page Name]]` resolves to `Page Name.md`, `.mdx`, or `.markdown` in the same directory
- **Relative links** resolved from the current file's location
- **Footnotes**, heading anchors, smart typography, and auto-linked URLs

## Source and Split

Use **Source** to edit the raw Markdown in a full-featured code editor (CodeMirror).

Use **Split** to edit alongside a live preview. Drag the center divider to resize the panes. When the divider is focused, the Left and Right arrow keys adjust it in 5% increments. Each pane stays at least 320 px wide and scrolls independently.

The editor’s dedicated **Heading actions** button can promote or demote Markdown headings. With text selected, it changes headings only on the selected lines; without a selection, it changes headings throughout the document. H1 and H6 remain at their respective boundaries, and fenced code blocks are left unchanged. The **GitHub alerts** button quickly inserts Note, Tip, Important, Warning, and Caution blocks. On narrow panes, the **More formatting** menu replaces formatting buttons that no longer fit.

Markside remembers the last selected Markdown mode across page reloads.

`Ctrl+E` toggles between Preview and Source. (Chrome reserves `Cmd+E` on macOS.)

## Saving

Press `Cmd+S` / `Ctrl+S`, or click the **Save** button, to write the current draft to disk.

When the file belongs to the open folder, Markside writes it silently using the stored directory handle. If no open folder contains the file, the first save asks you to choose its folder, or a folder above it. Markside then saves the file in place, shows the folder in the sidebar, and saves files in it without asking again.

The save indicator in the toolbar:

| State | Meaning |
|-------|---------|
| *(no indicator)* | No unsaved changes |
| **Unsaved** | Changes are pending |
| **Saving…** | Write in progress |
| **Saved ✓** | Last write succeeded |
| **Save failed** | Permission lapsed or write failed — click to retry |

If the file was modified on disk after Markside loaded it, a prompt asks whether to overwrite it or reload the external version.

### Auto Save

Auto Save is off by default. Enable it in the extension options page to save automatically after 1.5 seconds without typing.

- **Auto Save off:** switching files while a draft is unsaved shows a Save / Discard / Cancel prompt. Closing or reloading the page triggers Chrome's standard unsaved-changes warning.
- **Auto Save on:** switching files flushes any pending save and navigates only after the write succeeds.

### Typeface

Choose the font for rendered Markdown in the extension options page: Sans (default), Serif, Charter, Iowan, or Avenir. These are system fonts; where one is not installed, Markside uses the closest available font. Code blocks, the Source editor, and PDF export keep their own fonts. Open tabs update immediately.

## Share Link

Click **Share** while viewing a Markdown file to create a read-only Share Link.
Markside offers two kinds. The dialog shows both options and lets you choose.

### In the Link

For small documents, the markdown stays inside the URL. Nothing is uploaded.
Markside compresses the saved filename and Markdown into the URL fragment and
copies the complete link. The fragment never reaches Markside's servers.

The URL works best for documents under approximately 4,000 characters. Longer
URLs may not paste cleanly into some chat clients, including Slack and Teams,
which refuse to send links past roughly 4,000 characters. The confirmation
dialog warns when the URL exceeds 2,000 characters, though you can still create
and copy it if you want to. Only a document whose Markdown is too large for a
recipient's browser to decode prevents creation entirely; send the Markdown
file directly in that case.

Anyone with the complete link can read its contents. In-the-link shares are not
encrypted, cannot be revoked, and never expire.

### Hosted by Markside

For larger documents, Markside encrypts the content in your browser before
uploading it. The link is short: only about 98 characters before any heading
suffix. The decryption key stays in the URL fragment and never reaches Markside's
servers, so Markside stores only ciphertext and cannot read or moderate it.

You choose how long the share link lasts: 7, 30, or 90 days. After that time
expires, the link stops working. Hosted snapshots cannot be revoked early.

### Creating and Opening

If the document has an Unsaved Draft, the confirmation action changes to **Save
and create link**. A cancelled or failed save, including an external-edit
conflict, prevents link creation. For hosted snapshots, an upload failure also
prevents link creation. The confirmation shows the Markdown word count, exact
URL character count (for the kind you selected), and any local images or
document links that will be unavailable to the recipient.

After the link is created, **Open link** loads it in a new tab so you can check
what the recipient will see before sending it. Opening a link does not upload
the markdown; the document remains in your browser.

Treat the complete URL like the document itself. It may remain in browser or
synced history, chat or email history, clipboard managers, screenshots, and
systems controlled by recipients.

### Recipients

Recipients open the link at `markside.app/s` without installing the extension.
Rendering happens in their browser. HTTPS images may be requested from their
original hosts; local images, relative document links, and wikilinks are
unavailable. The viewer can show the rendered document or Markdown source, copy
or download the Markdown, switch theme, and navigate the outline.

## Navigation and Breadcrumbs

The breadcrumb bar at the top of the page shows the full path of the current file. Click any directory segment to navigate to it. Open the **More** (`…`) menu and choose **Copy file path** to copy the decoded file path to the clipboard.

Choose **Sync URL to this file** from the same menu when the address bar is out of sync. This reloads the tab at the current file so you can bookmark it or refresh to the same file.

Relative links and `[[wikilinks]]` in Markdown always resolve from the current file's directory.

## Outline

The right sidebar shows a document outline generated from headings. It opens automatically on screens 1024 px and wider. Click any heading to scroll to it.

## Appearance

Markside follows the system light/dark preference on first load. Click the theme toggle in the toolbar to override it for the current session.

Both sidebars are resizable by dragging their edges:

| Sidebar | Minimum | Default | Maximum |
|---------|--------:|-------:|-------:|
| File tree | 180 px | 280 px | 520 px |
| Outline | 180 px | 320 px | 520 px |

Sidebar widths and visibility reset on page reload. Expanded file-tree folders persist per root folder.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+O` / `Ctrl+O` | Open a file |
| `Cmd+P` / `Ctrl+P` | Quick file switcher |
| `Cmd+S` / `Ctrl+S` | Save |
| `Cmd+B` / `Ctrl+B` | Bold selected Markdown in Source or Split |
| `Cmd+Option+1/2/3/4` / `Ctrl+Alt+1/2/3/4` | Apply Heading 1, 2, 3, or 4 in Source or Split |
| `Ctrl+E` | Toggle Preview / Source |


### Local agent review history

An agent review lasts until you resolve its comments. Addressing a comment keeps
the review open so you can check the reply or send more feedback. Starting another
review after completion keeps the earlier comments under Resolved.

Comments, their statuses, and the agent's latest replies are stored in the
`.review.json` beside the document and are available through
`markside comments <file>`. Reload Markside to see changes made by the agent.


In the copy-prompt workflow, **Clear all** clears the local review, including
comments, overall feedback, and imported review history, then closes the panel.

For an agent review, **Clear drafts** removes new unsent comments and restores edited comments and
overall feedback to their last sent version. It keeps sent feedback, replies,
completed reviews, and imported history. It does not end the review or
write to the sidecar. The button is hidden when there are no unsent changes.

Comments in an agent review show one badge: **Draft** for unsent feedback or edits,
**Sent** for the current text sent to the agent, **Addressed** when the agent has
responded, and **Resolved** after you accept it. Editing sent feedback makes it a
Draft again until you send it. These replace the Shared with agent label.

In the copy-prompt workflow, comments are **Open** or **Resolved**. Copying or
reloading does not resolve them. Use Resolve after checking the changes, or
Reopen if more work is needed. Local resolution stays in browser storage; only
comments already sent through the integration update their sidecar status.
Resolved comments are excluded from copied prompts and their passage warnings
and highlights are hidden.

If you add feedback after an agent review completes, the panel shows **Start
another review**. It opens the command dialog without changing the completed
review. Ask the agent to start that review, then reload or reopen the panel to
send the new feedback. Review complete is hidden while active feedback or drafts
remain. Starting another review does not itself launch an agent.
