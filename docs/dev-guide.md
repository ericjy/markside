# Development Guide

This guide covers local setup, the development workflow, testing, and the
technical references used to build Markside.

## Set up the project

Markside requires the Node version in `.nvmrc` and the pnpm version in
`package.json`. The build uses `rsvg-convert` to generate the icon. Install
`librsvg` with Homebrew on macOS or `librsvg2-bin` with apt on Debian/Ubuntu.

Do not use Node 22: Plasmo can crash with a segmentation fault during
`pnpm build`. Use the version in `.nvmrc` instead.

```bash
nvm use
npm install --global pnpm@10.28.2
pnpm install --frozen-lockfile
pnpm dev
```

Load `build/chrome-mv3-dev` as an unpacked extension from
`chrome://extensions`, then enable **Allow access to file URLs** for Markside.

Open a local Markdown file in Chrome to use the development build. The dev
server rebuilds the extension as files change; reload the extension or page
when Chrome does not pick up a change automatically.

## Development workflow

Keep changes focused and follow the existing TypeScript and React patterns.
Before submitting a change, run:

```bash
pnpm typecheck
pnpm test
pnpm build
```

Other useful commands:

```bash
pnpm test:watch
pnpm test:coverage
pnpm bundle-engine
```

Generated Shiki, Mermaid, and CodeMirror bundles are not committed.

## Testing

Add or update unit tests for pure logic such as parsing, rendering, URL
handling, search, editor commands, and save policies. Tests live beside the
code they cover in `lib/*.test.ts`.

Browser-dependent behavior requires the [manual Chrome checklist](manual-test.md).
Check the relevant
flow in the unpacked extension, especially when changing:

- local file navigation or relative links
- directory permissions or persisted handles
- Preview, Source, or Split modes
- manual save, Auto Save, or external-change conflicts
- the popup or Settings page

### Test the Store review prompt

Run review-prompt test commands in an extension console. Open the Markside
popup, right-click inside it, choose **Inspect**, and use that DevTools Console.
The Markdown page's console does not expose `chrome.storage.local`.

To make the first prompt eligible immediately, run:

```js
const now = Date.now()

await chrome.storage.local.set({
  reviewPromptState: {
    version: 1,
    firstUsedAt: now - 21 * 60 * 1000,
    activeDays: [],
    actionTotals: { "file-open": 3, save: 2 },
    dailyActions: { day: "2000-01-01", counts: {} },
    promptsShown: 0,
    snoozedUntil: null,
    completed: false,
  },
})
```

Reload an open Markdown file. A successful file open is a natural pause, so the
content application claims the eligible prompt and opens the modal. Claiming
the prompt updates the stored state immediately. To show the first prompt
again, rerun the command above and reload the Markdown file.

To test the second and final automatic prompt, run:

```js
const now = Date.now()

await chrome.storage.local.set({
  reviewPromptState: {
    version: 1,
    firstUsedAt: now - 30 * 24 * 60 * 60 * 1000,
    activeDays: [],
    actionTotals: { "file-open": 3, save: 2 },
    dailyActions: { day: "2000-01-01", counts: {} },
    promptsShown: 1,
    snoozedUntil: now - 1,
    completed: false,
  },
})
```

Reload the Markdown file again. This state represents an expired 14-day snooze
and five new meaningful actions. Claiming this prompt completes the automatic
prompt sequence.

Inspect the current state with:

```js
await chrome.storage.local.get("reviewPromptState")
```

Remove the test state and return to a fresh installation state with:

```js
await chrome.storage.local.remove("reviewPromptState")
```

Do not add filesystem polling or automatic file watching.

## Technical references

- [System design](system-design.md)
- [Visual design](visual-design.md)
- [Pre-bundle ESM-only dependencies](adr/0001-prebundle-esm-only-dependencies.md)
- [Do not watch local files](adr/0002-no-file-watching.md)
- [Chrome Web Store release guide](store-listing.md)
