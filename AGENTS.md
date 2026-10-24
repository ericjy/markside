# Markside — Agent Guidelines

Markside is a Chrome extension that renders and edits local Markdown files in the browser. Read `CONTEXT.md`, `docs/system-design.md`, and any relevant ADR before changing behavior.

Use the domain terms in `CONTEXT.md` consistently, including in issues and pull
requests. If a proposed change conflicts with an ADR, state the conflict rather
than silently overriding the decision.

## Commands

```bash
pnpm dev          # bundle dependencies and start the Plasmo dev server
pnpm build        # production build → build/chrome-mv3-prod
pnpm typecheck    # check TypeScript
pnpm test         # run Vitest
pnpm test:watch   # run Vitest in watch mode
pnpm webstore     # Chrome Web Store release CLI help
```

After `pnpm dev`, load `build/chrome-mv3-dev` as an unpacked extension and enable **Allow access to file URLs**.

## Chrome Web Store Releases

`docs/store-listing.md` is the canonical release process and listing source.

- **Prepare** is local and automated: update and commit the version, then run `pnpm webstore:prepare <version>`. Never bypass its clean-worktree, test, manifest, or artifact-identity checks.
- **Submit, status, and publish are manual.** There is no API integration for them — upload the prepared ZIP, check review state, and publish by hand in the [Developer Dashboard](https://chrome.google.com/webstore/devconsole). Follow the steps in `docs/store-listing.md`.

Treat “release it” as ambiguous. After publication, tag the recorded commit as `webstore-v<version>` and update the release history.

## GitHub Releases

`docs/github-release.md` documents this separate distribution channel. The
workflow runs manually from the Actions tab by default. Enabling its optional
push trigger allows version changes on `main` to create releases automatically.
GitHub and Web Store releases use separate tags and artifacts.

## Hard Constraints

### Surfaces

- `contents/markside.tsx` — content-script configuration and bootstrap
- `components/content-app.tsx` — content application state and orchestration
- `hooks/use-content-*.ts` and `components/content-*.tsx` — content behavior and UI
- `lib/localhost-review-entry.tsx` — paused localhost Review entry, outside Plasmo's content-script directory
- `background.ts` — local-file fetch relay
- `popup.tsx` — pending document Reviews, file-access readiness, and Settings link
- `options.tsx` — preferences and product guidance

### Pre-bundled dependencies

Shiki and CodeMirror are pre-bundled because Parcel cannot reliably bundle their ESM graphs. Do not import them directly; use the project wrappers. Pele, which renders Mermaid diagrams, is an ordinary dependency pinned to an exact version. When adding a language, theme, or editor dependency, update the matching bundle script and run `pnpm bundle-engine`.

### No file watching

Do not add polling or file watching. Users reload a file by navigating to or selecting it. See `docs/adr/0002-no-file-watching.md`.

### Saving

`doSave()` derives a writable file handle by traversing the stored directory handle. When no saved directory contains the file, Markside asks the user to choose its folder instead of opening a save picker. Auto Save is optional and off by default.

### File types

- Markdown: Preview, Source, and Split; Preview is the default.
- Images: image viewer.
- Other files: source editor only.
- The file tree shows all file types outside its explicit skip list.

## Code Style

- Strict TypeScript; avoid `any` unless a browser API makes it unavoidable.
- Functional React components and hooks.
- Prefer existing files and direct code over one-use abstractions.
- Add comments only when the logic is genuinely non-obvious.
- Do not add handling for impossible cases.

## Testing

Tests live in `lib/*.test.ts` and run in jsdom through Vitest. Test pure policies, parsing, rendering, scheduling, and URL behavior. Content hooks are tested through `renderHook` and the in-memory `chrome.storage` in `lib/test-harness.ts`. Do not mock the filesystem or IndexedDB; browser integrations require manual verification using `docs/manual-test.md`.

Agent Skill launchers are the exception: their native smoke tests live beside
the skill under `skills/<name>/tests/` and run on matching GitHub-hosted operating
systems. Use fake browser executables so CI exercises launch commands without
opening a GUI.

## Contributing and design notes

Use GitHub issues for public bugs and feature proposals. See
`CONTRIBUTING.md` for issue reporting, triage labels, and design records. Keep private research and
business notes outside the repository. Design specs and interview records in
`docs/changes/` provide historical context; current behavior is documented in
`docs/system-design.md` and the ADRs.

For a new feature or behavior change, follow the workflow in
`docs/changes/README.md`: interview, then intent, then spec.

The repository uses a single-context domain layout: `CONTEXT.md` contains the
glossary, and `docs/adr/` contains durable architectural decisions.
