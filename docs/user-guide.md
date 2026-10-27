# Markside User Guide

Markside is a Chrome extension that renders and edits local Markdown files directly in the browser. Everyday file use stays local: no sync service and no upload. Creating a Hosted Snapshot is the explicit exception; Markside encrypts that saved copy in your browser before uploading it for sharing.

## Quick Start

1. **Install the extension** from the Chrome Web Store.
2. **Allow file URL access**: open `chrome://extensions`, find Markside, and enable **Allow access to file URLs**.
3. **Open a Markdown file** in Chrome. Three ways to do this:
   - Press `Cmd+O` (macOS) or `Ctrl+O` (Windows/Linux) to open the browser's file picker.
   - Drag a `.md` file onto a Chrome tab.
   - Set Chrome as the default app for `.md` files (see [Opening Files](#opening-files)) so double-clicking opens Markside automatically.
4. Markside renders the file. To browse related files, click **Show file tree** at the left of the toolbar; the sidebar prompts you to **Choose folder**.
5. Click **Choose folder** and select the folder your file lives in, or any parent folder. The file tree populates immediately.

## Opening Files

### From your coding agent

With the Markside Agent Skill installed, `/markside` opens the file your agent
just wrote. See [Work with your coding agent](#work-with-your-coding-agent) for
setup, agent Reviews, and interviews.

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

The left sidebar shows the file tree for the folder you have open. It starts collapsed; click **Show file tree** at the left of the toolbar to open it, and Markside remembers whether you leave it open. To enable it, Markside needs read access to a folder on your system.

### Granting access

When you open the file tree for a new folder, the sidebar shows a prompt:

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

Preview uses the **Standard** page width, a comfortable reading line. Open
**Page width** in the file actions (`…`) menu to choose **Extended** for a wider
column or **Full width** to use the available space. Markside remembers the choice across files and restarts.
The Page width row shows the current choice without opening the submenu.
The choice also applies to the Preview pane in Split. Source width and PDF Export keep
their independent settings and layout.

Choose **Typeface** in the same file actions menu: Sans (default), Serif,
Charter, Iowan, or Avenir. The parent row shows your current choice, and each
option uses its typeface as a preview. These are system fonts; where one is not
installed, Markside uses the closest available font. The choice persists across
files and restarts, and open tabs update immediately. Code blocks, the Source
editor, and PDF export keep their own fonts.

The top-right margin shows the word count and estimated reading time. The count
includes every whitespace-separated chunk of Markdown source, including syntax,
code, and frontmatter. Reading time uses 200 words per minute, rounds up, and
shows `<1 min read` below 200 words or `0 min read` for an empty file. The label
scrolls with the document and also appears in Split, where it follows unsaved
edits. It is hidden in Source-only mode and PDF exports.

Markside renders Markdown with:

- **YAML frontmatter** shown as a summary table above the document; values that are relative paths, such as `../guide.md`, or Markdown filenames, such as `notes.md`, link to those files
- **Syntax highlighting** for 19 languages
- **Mermaid diagrams** rendered inline with zoom controls, panning, and an expanded view. Ordinary dragging remains available for selecting diagram text and adding Review Comments; choose **Enter Pan Mode** to drag the canvas, hold Shift while dragging as a shortcut, or use the arrow keys. Choose **Exit Pan Mode** to return to text selection. Diagrams use the document font and theme colors. The default view shows a diagram at its natural size, shrinking wide or tall diagrams to fit the column and browser height. Hold Control or Command while scrolling over a diagram to zoom, use **Reset** to restore its fitted view, or choose **Expand** for a viewport-filling canvas that closes with **Close** or Escape.
- **HTML Embeds** — an image line that points at a local `.html` file, such as `![Request flow](./spec.assets/request-flow.html)`, shows that page inside the document. Its scripts run, but it cannot load anything from the network or reach the rest of the document. Embeds size themselves to their content; hover for **Comment**, which starts a Review Comment on the whole embed, and **Expand**, which fills the window until **Close** or Escape. Each shows its path below it. Shared snapshots include the embedded files. Edits to an embedded file appear when you reload the document.
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

### Zen mode

Choose **Zen mode** in the file actions (`…`) menu, or press `Cmd+.` (`Ctrl+.` on Windows and Linux), to hide the toolbar, file tree, and Outline. It works in Preview, Source, and Split, and for other file types through the shortcut. An open Review panel, the word count, the Source formatting buttons, and the Reload and Review finish bars stay available. Page width and Typeface are unchanged.

A faint bar at the top center marks where the toolbar is; it darkens as the pointer nears the top, and reaching the edge shows the toolbar over the document. It hides again when you move away. From it you can open Review, show the Outline, or switch modes without leaving Zen mode. Showing the Outline in Zen mode doesn't change whether it shows normally.

To leave, press Escape, press the shortcut again, or click **Exit Zen mode** at the left end of the toolbar. Escape first closes the Review panel, menus, dialogs, the quick file switcher, an expanded diagram, Source search, or multiple cursors. A short hint at the top right names these ways out each time Zen mode starts.

Zen mode stays on in the tab while you open other files, follow links, or reload the page. New tabs start with it off. It does not enter Chrome full screen; use Chrome's own shortcut for that.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+O` / `Ctrl+O` | Open a file |
| `Cmd+P` / `Ctrl+P` | Quick file switcher |
| `Cmd+S` / `Ctrl+S` | Save |
| `Cmd+B` / `Ctrl+B` | Bold selected Markdown in Source or Split |
| `Cmd+Option+1/2/3/4` / `Ctrl+Alt+1/2/3/4` | Apply Heading 1, 2, 3, or 4 in Source or Split |
| `Ctrl+E` | Toggle Preview / Source |
| `Cmd+.` / `Ctrl+.` | Toggle Zen mode |


## Work with your coding agent

The Beta Markside Agent Skill connects Claude Code, Codex, Cursor, and other
Agent Skills hosts to Markside:

| Ask your agent | What happens |
|----------------|--------------|
| `/markside` | Opens the Markdown file it just wrote or referenced |
| `/markside review PLAN.md` | Waits while you comment in Markside, then addresses each comment |
| `/grill-me /markside <topic>` | Interviews you through Question Cards you answer in Markside |

Some hosts use another syntax, such as `$markside` in Codex.

### Install the skill

```bash
npx skills add ericjy/markside --skill markside -g
```

Then run `/markside setup` to open Markside's Chrome Web Store page. Approve the
installation and enable **Allow access to file URLs** in Markside's extension
details.

- **Opening files** needs no Node.js. The skill uses the native shell on macOS
  and Linux, and PowerShell on Windows. Only the installer command needs Node.js.
- **Reviews and interviews** need Node.js 20+. The skill runs the
  [Markside CLI](https://www.npmjs.com/package/markside) with `npx`, or you can
  install it with `npm install --global markside`.
- The skill uses Chrome's normal profile and opens a new tab each time. It can't
  tell which profile has Markside installed.

### Open a file

Invoke `/markside` or say "open this in Markside." The agent opens the single
`.md`, `.mdx`, or `.markdown` file from the current task, or a path you give it.
If several files are plausible, it asks which one instead of guessing.

### Review with your agent

1. Run `/markside review PLAN.md`. The agent opens the file and waits.
2. Add Review Comments in Markside. In the comment composer, **Save & send
   review** saves the comment and sends the whole Review; **Save** lets you keep
   adding feedback first.
3. Click **Send review to agent**. The first time, Chrome asks for access to the
   file's folder; Review names it below the button. Select it or a parent.
4. The agent addresses each comment and replies. If you stayed in the tab,
   Markside shows **Reload** once the reply lands. Reload to check the changes.
5. Send more feedback, or resolve addressed comments. **Resolve all** accepts
   every reply while you keep reviewing.
6. Click **Finish review** when you're done. It accepts any remaining replies,
   and the agent stops waiting.

With Review closed, the compact bar above Preview shows how many saved comments
are ready and offers **Send review**. Once the agent has addressed everything,
it asks whether anything else needs changing and offers **Finish review**. You
can complete either action without opening the sidebar.

**Sent for agent to pick up** means the Review file was saved. It does not mean
an agent has read it. If no agent is waiting, use **Copy review as prompt** below
the Send button and paste it into your agent's chat. If sending fails or you
cancel folder selection, your comment stays saved so you can retry.

Comments are exchanged through `PLAN.md.review.json` beside the document. Add
`*.review.json` to your project's `.gitignore` to keep them out of version control.

#### Start a review from Markside

When no agent is waiting, choose **Start a review in your agent…** below the
Review buttons. It shows how to install the skill and a command for the open
file, and lets you choose the file's folder if Markside can't save feedback
beside it yet. Paste the command into your agent and switch back to Chrome;
Markside finds the review when you return. If it doesn't, click **Check for
review** once your agent is waiting.

#### Comment badges

| Badge | Meaning |
|-------|---------|
| **Draft** | New or edited feedback not sent yet |
| **Sent** | This version was sent to the agent |
| **Addressed** | The agent replied |
| **Resolved** | You accepted the reply |

Only you resolve comments. Editing sent feedback turns it back into a Draft
until you send it again.

#### Clearing drafts and starting over

- **Clear drafts** removes unsent comments and restores edited feedback to its
  last sent version. Sent feedback, replies, and history stay. It's hidden when
  there's nothing to clear.
- A review stays open until you finish it. Finished comments stay under
  **Resolved**, and `markside comments <file>` lists them with the agent's replies.
- Adding feedback after a review finishes shows **Start another review**, which
  gives you the command to start it in your agent.

### Answer an interview in Markside

Use a questioning skill such as `/grill-me` and ask for Markside:
`/grill-me /markside <topic>`, or `/grill-me <topic> in Markside` in hosts that
expand only one command. You can also say "continue this in Markside" partway
through an interview.

The agent writes the interview to a `.grill.md` file, beside the file being
discussed or at the repository root, and asks whether to keep it at the end.
Each question appears as a card.

- **Answer:** click an option or press its letter. Click another to change it,
  or click the selected one again to clear it. The recommended option is
  labeled, with the agent's reasoning under **Why A?** To take back an answer
  you already sent, use **Withdraw** in Review.
- **Answer in your own words:** use **Something else…** below the options, or
  press T. Its presets skip the question, let the agent decide the rest, or stop
  the interview. You can also ask for clarification there; the agent rewrites
  the question.
- **Comment:** select any text in a card to add a Review Comment.
- **Send:** click **Send review** below the last card, or press
  Cmd/Ctrl+Shift+Enter. You don't have to answer every question first. Until
  the agent replies, the bar says it's waiting and offers **Check for reply**.

After you send, answered questions move to **Previous questions** and the agent
writes the next round. Click **Reload** when Markside shows **Changed on disk**.
Each previous question is a read-only card with its recorded decision visible.
Expand **Full question** to inspect the original context, options, and recommendation.
These folding controls are generated in Preview. In Source and other Markdown
renderers, new archived questions use ordinary headings, lists, and tables;
comparison sections use a **Compare tradeoffs** Markdown heading. Older interviews
with HTML disclosures still work.
Click **Revisit question** to open a composer with the recorded answer, revise it,
then save and send the Review. Reopening restores any saved pending revision.
The recorded decision stays visible until the agent processes the revision;
archived options cannot be selected directly. Decisions the agent assumed for
you are listed there too and can be revisited in the same way.
When the closing **Before you finish** section matches your understanding,
click **Finish review**.

### Copy-prompt reviews

Without the skill, copy the Review as a prompt and paste it into your agent's
chat. Comments are **Open** or **Resolved**; copying or reloading doesn't
resolve them. Resolve after checking the changes, or Reopen if more work is
needed. Resolved comments are left out of copied prompts and lose their
highlights. **Clear all** clears the local Review, including overall feedback
and imported history, and closes the panel.

### Troubleshooting

- **Raw Markdown appears:** install Markside in the Chrome profile that opened,
  enable **Allow access to file URLs**, and retry.
- **Chrome was not found:** install Google Chrome. The skill doesn't fall back to
  another browser.
- **No file or several files are identified:** give one path, for example
  `/markside docs/plan.md`.
- **Unsupported file:** use a lowercase `.md`, `.mdx`, or `.markdown` extension.
- **The agent isn't responding:** use **Copy review as prompt** instead.

The launcher validates the local path but doesn't read file contents. It sends no
telemetry and makes no update checks or other network requests.
