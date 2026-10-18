# Markside

Markside is a Chrome extension for reading and editing local Markdown files.
Open a file in your browser, browse its folder, and switch between Preview,
Source, and Split view. Save edits back to the original file, or select a passage
and collect Review Comments to copy into a coding agent.

![Markside Split view with a file tree, source editor, rendered diagram, and outline](assets/screenshots/markside-split-view.png)

Markside renders code blocks, Mermaid diagrams, math, tables, frontmatter, and
GitHub-style alerts. It also opens images and edits text and code files selected
from the file tree. Auto Save is optional and off by default.

## Install

1. [Install from the Chrome Web Store](https://chromewebstore.google.com/detail/markside-%E2%80%94-markdown-viewe/ccokohfaicfjkilcakhnlckbbkhhknhj).
2. Open `chrome://extensions`, select Markside's **Details**, and enable
   **Allow access to file URLs**.
3. Open a local `.md`, `.mdx`, or `.markdown` file in Chrome.
4. Choose **Open Folder** to browse related files.

See the [user guide](docs/user-guide.md) for editing, saving, Review Comments,
keyboard shortcuts, and sharing.

## Build from source

Install Node.js using the version in `.nvmrc` and pnpm 10.28.2. The build also
needs `rsvg-convert` for the extension icon. On macOS, install it with
`brew install librsvg`; on Debian or Ubuntu, use `sudo apt-get install librsvg2-bin`.

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

## Open files from an agent

The optional Beta Agent Skill lets a coding agent open the Markdown file it just
created or referenced in Chrome:

```bash
npx skills add ericjy/markside --skill markside -g
```

Ask the agent to run `/markside` or say "open this in Markside." Hosts may use a
different invocation syntax, such as `$markside` in Codex. See the
[Agent Skill guide](docs/user-guide.md#open-from-an-agent) for setup and supported
platforms.

## Privacy and sharing

Ordinary local reading, editing, and Reviews stay in your browser. Markside has
no analytics or telemetry.

Optional snapshot sharing creates a read-only copy of saved Markdown. A Link
Snapshot encodes the content in the URL without uploading it. A Hosted Snapshot
encrypts it in your browser before uploading ciphertext, with the key kept in
the URL fragment. Anyone with the complete link can read a snapshot. See the
[sharing guide](docs/user-guide.md#share-link) and
[privacy policy](https://markside.app/privacy) for limits and expiration details.

## Contribute

Bug reports, focused fixes, and documentation improvements are welcome. Read
[CONTRIBUTING.md](CONTRIBUTING.md), run `pnpm typecheck` and `pnpm test`, and
complete the [manual Chrome checklist](docs/manual-test.md) for UI changes.

## License

[MIT](LICENSE), copyright 2026 Jing Yang.
