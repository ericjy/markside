<div align="center">

<a href="https://markside.app"><img src="assets/icon.svg" alt="Markside logo" width="72"></a>

<h1 style="border-bottom: none;">Markside</h1>

<h3>Local Markdown workspace in Chrome</h3>

A human layer for the docs your AI agents write.

[![Rating](https://img.shields.io/chrome-web-store/rating/ccokohfaicfjkilcakhnlckbbkhhknhj?color=18181b)](https://chromewebstore.google.com/detail/markside-%E2%80%94-markdown-viewe/ccokohfaicfjkilcakhnlckbbkhhknhj)
[![CI](https://github.com/ericjy/markside/actions/workflows/ci.yml/badge.svg)](https://github.com/ericjy/markside/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-18181b)](LICENSE)

<a href="https://chromewebstore.google.com/detail/markside-%E2%80%94-markdown-viewe/ccokohfaicfjkilcakhnlckbbkhhknhj"><img src=".github/assets/install-chrome.png" alt="Install for Chrome" width="187" height="38" /></a>&nbsp;
<a href="https://markside.app"><img src=".github/assets/visit-website.png" alt="Visit website" width="158" height="38" /></a>

<p><sub><strong>WORKS WITH</strong></sub></p>

<p>
<img src=".github/assets/icons/claude.svg" alt="Claude Code" title="Claude Code" width="40" height="40" />&nbsp;&nbsp;&nbsp;
<img src=".github/assets/icons/codex.svg" alt="Codex" title="Codex" width="40" height="40" />&nbsp;&nbsp;&nbsp;
<img src=".github/assets/icons/cursor.svg" alt="Cursor" title="Cursor" width="40" height="40" />&nbsp;&nbsp;&nbsp;
<img src=".github/assets/icons/opencode.svg" alt="OpenCode" title="OpenCode" width="40" height="40" />&nbsp;&nbsp;&nbsp;
<img src=".github/assets/icons/openclaw.svg" alt="OpenClaw" title="OpenClaw" width="40" height="40" />&nbsp;&nbsp;&nbsp;
<img src=".github/assets/icons/hermesagent.svg" alt="Hermes Agent" title="Hermes Agent" width="40" height="40" />&nbsp;&nbsp;&nbsp;
<img src=".github/assets/icons/pi.svg" alt="Pi" title="Pi" width="40" height="40" />
</p>

</div>

<br/>

<a href="https://youtu.be/KkyPkU2aOfY"><img src="assets/markside-demo.gif" alt="Commenting on a rendered plan in Markside, copying the Review as a prompt, and pasting it into a coding agent" width="100%"></a>

<p align="center"><a href="https://youtu.be/KkyPkU2aOfY"><img src=".github/assets/watch-video.png" alt="Watch the overview video on YouTube (1:43)" width="260" /></a></p>

## Why Markside

You spend more time than ever reviewing Markdown your agents write: plans, specs,
research notes, and more. Reading raw Markdown in a terminal is awkward. Copying
quotes into chat is slow. Quick fixes mean opening an IDE or describing changes
to an agent. Human feedback means asking PMs to navigate a pull request. Or
pasting into Google Docs, fighting the formatting, and keeping two versions in sync.

Markside turns the browser you already have open into a Markdown workspace:

- **One workspace for every agent.** Read, review, and edit Markdown from any coding agent.
- **Read comfortably.** Rendered tables, diagrams, math, and code instead of raw syntax.
- **Review precisely.** Comment on passages like in Google Docs, then copy one agent-ready prompt.
- **Edit instantly.** Fix a sentence yourself and save it back to disk without describing the change through chat.
- **Share easily.** Send a rendered snapshot that others can read and comment on in any browser.

Everything runs locally. No account, no telemetry.

## Install

1. [Install Markside from the Chrome Web Store](https://chromewebstore.google.com/detail/markside-%E2%80%94-markdown-viewe/ccokohfaicfjkilcakhnlckbbkhhknhj).
2. Open `chrome://extensions`, select Markside's **Details**, and enable
   **Allow access to file URLs**.
3. Open a local `.md`, `.mdx`, or `.markdown` file in Chrome.
4. Choose **Open Folder** to browse related files.

See the [user guide](docs/user-guide.md) for editing, saving, Review Comments,
keyboard shortcuts, and sharing.

## Features

- **Rich Markdown:** tables, tasks, alerts, math, footnotes, wikilinks, frontmatter, and more.
- **Code and diagrams:** highlighted code with copy buttons, theme-aware Mermaid diagrams, and Vega-Lite charts.
- **Agent-ready Review:** anchored comments and an overall note, copied together or one comment at a time.
- **Preview, Source, and Split:** a CodeMirror editor beside the live preview,
  with a resizable divider.
- **Safe saving:** `Cmd+S` / `Ctrl+S` writes the original file. Auto Save is
  optional, and external changes are caught before they are overwritten.
- **Local navigation:** a persistent file tree, breadcrumbs, document outline,
  and a `Cmd+P` / `Ctrl+P` quick switcher.
- **Snapshot sharing (Beta):** read-only links that recipients open without
  installing anything.
- **More file types:** edit text and code files in Source view and open images
  directly.
- **Light and dark themes** that follow your system or your choice.

## Use with your coding agent

The optional Beta Agent Skill lets a coding agent open the Markdown file it just
created or referenced in Chrome:

```bash
npx skills add ericjy/markside --skill markside -g
```

Ask the agent to run `/markside` or say "open this in Markside." Hosts may use a
different invocation syntax, such as `$markside` in Codex. See the
[Agent Skill guide](docs/user-guide.md#work-with-your-coding-agent) for setup and supported
platforms.

With `/markside review PLAN.md`, the agent waits while you comment in Markside,
then addresses each Review Comment and replies until you finish the Review. Ask
a questioning skill to interview you in Markside, such as `/grill-me /markside
<topic>`, and you answer through Question Cards by picking an option. Both are
Beta and require Node.js 20+; the skill runs the
[Markside CLI](https://www.npmjs.com/package/markside) with `npx markside`. See the [Review loop guide](docs/user-guide.md#work-with-your-coding-agent).

## Privacy and sharing

Ordinary local reading and editing stay on your computer. Reviews stay in your
browser unless you explicitly send them to an agent through a local Review file. Markside has
no analytics or telemetry.

Optional snapshot sharing creates a read-only copy of saved Markdown. A Link
Snapshot encodes the content in the URL without uploading it. A Hosted Snapshot
encrypts it in your browser before uploading ciphertext, with the key kept in
the URL fragment. Anyone with the complete link can read a snapshot. See the
[sharing guide](docs/user-guide.md#share-link) and
[privacy policy](https://markside.app/privacy) for limits and expiration details.

## Build from source

Install Node.js using the version in `.nvmrc` and pnpm 10.28.2.

```bash
git clone https://github.com/ericjy/markside.git
cd markside
nvm use
npm install --global pnpm@10.28.2
pnpm install --frozen-lockfile
pnpm build
```

In `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**,
and select `build/chrome-mv3-prod`. Enable **Allow access to file URLs** for this
installation too.

## Develop

```bash
pnpm dev        # development build in build/chrome-mv3-dev
pnpm typecheck  # TypeScript checks
pnpm test       # Vitest suite
pnpm build      # production build
```

Load `build/chrome-mv3-dev` as an unpacked extension while developing. Reload the
extension and local file when needed. See the [development guide](docs/dev-guide.md)
and [system design](docs/system-design.md) for build details and architecture.

## Contribute

Bug reports, focused fixes, and documentation improvements are welcome. Read
[CONTRIBUTING.md](CONTRIBUTING.md), run `pnpm typecheck` and `pnpm test`, and
complete the [manual Chrome checklist](docs/manual-test.md) for UI changes.

## License

[MIT](LICENSE)
