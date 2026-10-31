# Chrome Web Store Listing

This document is both the release runbook and the source of truth for Markside's
Chrome Web Store listing. A release has four phases:

1. **Prepare** — local tests, build, package, and artifact identity
2. **Submit** — upload and begin review with staged publishing
3. **Status** — inspect review state without changing it
4. **Publish** — release an approved staged version to users

Preparation is local and automated. Submission, status checks, and
publication happen by hand in the Developer Dashboard — there is no API
integration for them, so no Store credentials exist to protect or leak.

## Prepare (automated)

Release from `main`. Unreleased features stay in the code behind
`PLASMO_PUBLIC_*` switches in `.env` (`PLASMO_PUBLIC_LOCALHOST_REVIEW` and
`PLASMO_PUBLIC_READABILITY_CHECK`), which are off in committed configuration.
Do not strip features on a release branch; cut a branch from a
`webstore-v<version>` tag only to ship a fix to an already published version.

1. Update `version` in `package.json` to a version greater than the published
   version.
2. Commit all intended release changes. Preparation deliberately refuses a
   dirty worktree so the uploaded artifact always maps to one commit.
3. Select Node 24 with `nvm use`, then run:

   ```bash
   pnpm webstore:prepare 1.7.0
   ```

The command runs the full test suite and production build, validates the
generated MV3 manifest, creates a ZIP with `manifest.json` at its root, and
writes:

```text
build/releases/markside-1.7.0.zip
build/releases/markside-1.7.0.json
```

The JSON records the exact commit, ZIP SHA-256, version, and creation time —
carry these into the release history table once published.

Before submission, load `build/chrome-mv3-prod` as an unpacked extension, enable
**Allow access to file URLs**, and smoke-test Preview, Source, Split, file tree,
quick switcher, outline, Mermaid, themes, and saving.

## Submit, check status, and publish (manual)

Do these by hand in the
[Developer Dashboard](https://chrome.google.com/webstore/devconsole):

1. Review listing text, privacy answers, screenshots, and distribution
   settings whenever product behavior has changed.
2. Use **Upload New Package** and upload
   `build/releases/markside-<version>.zip` from the prepare step.
3. Submit with deferred (staged) publishing so approval doesn't immediately
   release the update.
4. Check review state on the Dashboard's item page. Typical reviews finish
   within a few days but can take several weeks.
5. Once approved and staged, use **Publish** to release it to users.
6. Install or update from the Web Store and repeat the production smoke test.
7. Create and push `webstore-v<version>` on the commit recorded in the
   artifact JSON.
8. Add the commit and package hash to **Release history** below.

If a problem is found during review, use **Cancel review**, prepare a corrected
package with a greater version, and resubmit. If a bad version is already live,
use the Store rollback action rather than unpublishing.

## Agent workflow

- **“Prepare Chrome Web Store release 1.7.0.”** The agent updates the version,
  checks the worktree, creates or requests the release commit, runs
  `webstore:prepare`, and reports the artifact identity. It does not upload
  anything — there is no automated path past this point.
- Submission, status checks, and publication are Dashboard actions the user
  performs themselves. The agent's role there is limited to guidance (what to
  upload, what to check, what to record afterward), not execution.

The vague prompt **“release it”** is not sufficient — establish whether the
user wants the local prepare step run, or is reporting that they've already
submitted/published by hand and need the history updated.

## Release history

Chrome Web Store item:
[Markside — Markdown Viewer and Editor](https://chromewebstore.google.com/detail/markside-%E2%80%94-markdown-viewe/ccokohfaicfjkilcakhnlckbbkhhknhj)
(`ccokohfaicfjkilcakhnlckbbkhhknhj`).

Record future publications in this tree with the Store version, publication
date, exact commit SHA, ZIP SHA-256, and release tag. The tag maps the version
to the prepared commit; the hash identifies the uploaded package. Earlier
user-facing changes are documented in `CHANGELOG.md`.

- 1.8.0 — published 2026-10-29
  - Commit: `4d73295d0226f966c5737eefba2d4c621c40f09e`
  - ZIP SHA-256: `16c0e9a1ef74b56757465b87137f7f93ede2940522bb9693068cfd78df4569eb`
  - Tag: `webstore-v1.8.0`
- 1.7.0 — published 2026-10-25
  - Commit: `cac5f7fdf64b36bf9fca05571435613e67fdc7c6`
  - ZIP SHA-256: `6443be23b9a399118e342d1c614f2877e6b386f30e1a7e8e271dd3d1db42bfcc`
  - Tag: `webstore-v1.7.0`

## Release notes and changelog

`CHANGELOG.md` is the durable, version-by-version record of user-facing changes.
Keep the pending version marked **Unreleased** until it is published, then replace
that label with the publication date.

The Chrome Web Store does not provide a separate release-notes field. Put a short
**What's new in &lt;version&gt;** update log near the end of the detailed description.
Keep it focused on the most important user-visible changes; the rest of the
description should remain evergreen.

## Submission checklist

For Web Preview, justify `scripting` as necessary to preview the active page and
register automatic preview after consent. Optional HTTP and HTTPS host access is
requested only when the user enables automatic preview of raw Markdown across
websites; turning it off removes that access. Verify the permission prompt and
the privacy disclosures against the packaged release before submission.

- [ ] Upload ZIP contains `manifest.json` at its root
- [ ] Commit SHA and ZIP SHA-256 are saved for the release history
- [ ] Store listing uses the current short and full descriptions below
- [ ] Category is **Developer Tools**
- [ ] Single purpose statement is filled in
- [ ] Privacy policy URL is `https://markside.app/privacy`
- [ ] Between one and five screenshots are uploaded at exactly 1280×800 px
- [ ] Store icon is a 128×128 PNG
- [ ] Small promotional tile is uploaded at exactly 440×280 px
- [ ] Privacy practices accurately disclose local file processing and storage
- [ ] No remote code is used
- [ ] Distribution visibility and regions are intentional
- [ ] Publisher contact email and review notifications are current

### Privacy practices guidance

Markside reads and edits user-selected local files, and stores directory and
file handles in IndexedDB. Chrome's policy treats local processing and storage
as handling user data even when the data is never transmitted. Do not declare
that Markside handles no user data.

Keep the dashboard answers and privacy policy consistent with the implementation:

- File contents, paths, folder structure, and handles are processed or stored
  locally only
- Aggregate action counts, active-day dates, and review-prompt state are stored
  in local extension storage only to schedule the optional Store review prompt
- Local file contents, paths, folder structure, and handles are not transmitted
  during ordinary local use
- When a user explicitly creates a Hosted Snapshot, the extension uploads an
  encrypted copy of the saved Markdown to Markside's storage. The decryption
  key remains in the URL fragment, so Markside stores ciphertext only.
- Review-prompt scheduling state is not transmitted to Markside, third parties,
  or remote servers
- Agent Reviews are written to a `.review.json` file beside the document on the
  user's disk, where the user's local agent reads them. Nothing is transmitted.
- Website access is optional and off by default. With Web Preview on, raw
  Markdown pages are rendered in the browser. Their text and URLs are not sent
  to Markside, and browsing history is not collected. Images in a document load
  from their original hosts.
- After uninstall, Chrome opens an optional survey at `markside.app/uninstall`
  whose URL carries only the extension version. Answers are sent only if the
  user presses Send and are stored without identifiers.
- There is no analytics, telemetry, advertising, sale of data, or human access
- There is no remotely hosted executable code

Re-audit these statements before every submission; do not copy them unchanged
if the product's behavior has changed. Markside makes no background network
requests. It sends a network request only after the user explicitly creates a
Hosted Snapshot. Registering the uninstall survey URL makes no request; Chrome
opens it only after removal. Review and feedback actions open the Chrome Web Store or the user's
email app only after the user clicks them. There is no remaining external font
import; the Options page's `'Space Mono'` reference falls back to plain
`monospace` rather than fetching from Google Fonts. Re-check this section if a
future change introduces a remote font, image, script, or automatic request.

---

## Name (75 chars max)

```
Markside: Markdown Viewer & Editor
```

Set by `displayName` in `package.json`. Keep the exact search phrase "Markdown Viewer" up front; the descriptions say that Markside opens local files.

## Short description (132 chars max)

```
Read, edit, and collaborate on Markdown with teammates and AI agents. Inline comment, outline, file tree, Mermaid, math, PDF export.
```

Set by `description` in `package.json`, so a change reaches the Store only with
the next uploaded package.

## Full description

Keep it near 300 words and about the product: say "Markdown" naturally and often,
and name third-party products only where needed. The Store treats irrelevant
keywords and third-party brand names as spam, which can lower search rank. The
full description can be edited in the Dashboard without uploading a package.

```
Open any .md file to read it beautifully rendered, edit it in place, comment inline, share it with teammate, and send your feedback to your AI agents to update the file.

Free and no account required. Learn more at https://markside.app

❗ After installing, enable "Allow access to file URLs" on the extension's details page.
❗ Markside opens local Markdown files only.

READ MARKDOWN

• GitHub-flavored Markdown with tables, task lists, footnotes, and alerts
• Syntax-highlighted code, Mermaid diagrams, and KaTeX math
• Document outline, YAML frontmatter, themes, and Zen mode

REVIEW MARKDOWN

• Select text and leave inline comments, with one-click presets such as Clarify or Verify
• Copy any comment as a prompt for your coding agent
• Send a whole review to Claude Code, Codex, or another agent with the free Markside Agent Skill, and read its replies beside each comment (Beta): npx skills add ericjy/markside --skill markside -g
• See additions and removals after the agent changes the file

EDIT MARKDOWN

• Start a New Draft from the extension popup, even when no Markdown file is open
• Preview, Source, and live Split view
• Formatting toolbar, keyboard shortcuts, and undo history
• Save to disk with Cmd+S / Ctrl+S, or turn on Auto Save
• Open a folder to browse its files and switch between them with Cmd+P / Ctrl+P

SHARE MARKDOWN

• Turn a Markdown file into a link, optionally with your comments
• Export a clean PDF

SET UP IN 30 SECONDS

1. Install Markside.
2. In extension settings, enable "Allow access to file URLs."
3. Open any .md file in Chrome. Markside renders it automatically.

WHAT'S NEW IN 1.8.0

• Start a New Draft from any tab and save it where you choose
• Embed interactive HTML visuals in Markdown and review them with your agent
• Include local images in encrypted Hosted Snapshots
```

### Search rank

Measure the listing's position before and after a listing change:

```bash
pnpm webstore:rank
pnpm webstore:rank "markdown viewer" "markdown reader"
```

Rank updates can lag a listing change by days, and results vary by region, so
change one thing at a time and compare runs made from the same place a week
apart.

---

## Category

Developer Tools

## Single purpose statement

Renders local Markdown files in Chrome with a file tree, syntax-highlighted code blocks, Mermaid diagrams, and a CodeMirror editor that saves to disk.

## Privacy policy URL

https://markside.app/privacy

## Store assets

### Store icon (128×128 PNG)

The extension build uses the tracked 512×512 `assets/icon.png`. The canonical
Store icon is the tracked `assets/store-icon-128.png`. When the logo changes,
regenerate both from the SVG with `rsvg-convert` (Homebrew `librsvg` or apt
`librsvg2-bin`):

```bash
rsvg-convert -w 512 -h 512 assets/icon.svg -o assets/icon.png
rsvg-convert -w 128 -h 128 assets/icon.svg -o assets/store-icon-128.png
```

### Screenshots (1280×800, 1–5 images)

Suggested shots:

1. Inline comments — Selected text with an open comment composer and the Review panel showing anchored comments
2. Split view — Markdown editor and live preview with the file tree visible
3. Create Share Link dialog — the optional "Include my Review" toggle visible
4. Preview mode — Mermaid diagram, GitHub-style alert, and document outline
5. Quick file switcher — fuzzy results over the local file tree

The tracked `assets/screenshots/markside-split-view.png` is documentation source
material, not a Store-ready asset. Crop or recapture every uploaded screenshot at
exactly 1280×800 px.

The illustrated alternatives `assets/screenshots/promo-*.png` are rendered from
`scripts/store-promo/cards.html`.

### Small promotional tile (440×280, required)

Lead with the search phrase, large enough to read in search results:

- Headline: "Markdown Viewer & Editor", with "for your local files" on the
  same line as "& Editor"
- Three points: "Review with teammates or AI agents", "Free, open source,
  privacy-first", and "GitHub-style, Mermaid, math, printable"
- The Markside logo and name, small, above the headline

Do not claim that files never leave the computer, because Share Links upload a
snapshot. Edit `scripts/store-promo/tile.html`, then run `pnpm store-promo` to
write `assets/store-promo-small-440x280.png`,
`assets/store-promo-marquee-1400x560.png`, and the promo screenshots.

### Marquee promotional tile (1400×560, optional)

Use the same copy as the small promotional tile, with a document and comment
illustration on the right.

## Official references

- [Publish in the Chrome Web Store](https://developer.chrome.com/docs/webstore/publish)
- [Update a Chrome Web Store item](https://developer.chrome.com/docs/webstore/update)
- [Chrome Web Store review process](https://developer.chrome.com/docs/webstore/review-process)
- [Chrome Web Store program policies](https://developer.chrome.com/docs/webstore/program-policies/policies)
- [User data policy FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq)
- [Complete the Store listing](https://developer.chrome.com/docs/webstore/cws-dashboard-listing)
- [Supply Store images](https://developer.chrome.com/webstore/images)
