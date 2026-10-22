# Web Preview Design

**Date:** 2026-10-19
**Status:** Proposed

> Proposed design. Nothing here is implemented yet. Current behavior is in `docs/system-design.md`.

## Goal

Let a user render a Markdown file opened over `http(s)` when they ask for it, for example
`raw.githubusercontent.com/.../README.md`. Markside should not gain a standing host
permission or an install-time warning to do this.

Markside remains a local Markdown workspace. Web Preview is a read-only convenience
and adds no new way to edit, review, or share.

## Scope

v1 is **read-only Preview**:

- Rendered Markdown with frontmatter, tables, task lists, alerts, math, highlighted
  code, and Mermaid diagrams
- Outline, theme, typeface, full width, and heading numbering
- PDF Export and copying rendered content

Out of scope for v1:

- Source, Split, saving, and Auto Save
- File tree, quick switcher, and new-file actions
- Review, Reload Comparison, the agent Review loop, and Readability Check
- Snapshot sharing. The page URL can already be shared.
- Pages served as `text/markdown`, which Chrome downloads instead of displaying
- Rendering automatically on page load

## Interaction

Two entry points. Each one is a user gesture, so each triggers the `activeTab` grant.

1. **Popup.** When the active tab is `http(s)` and its path ends in `.md`, `.markdown`,
   or `.mdx`, the popup shows **Render as Markdown**.
2. **Keyboard shortcut.** A `commands` entry, suggested as ⌥⇧M. It works on any tab,
   and the injected script decides whether the page is eligible.

A page is eligible when `document.contentType` is `text/plain` and the body holds the
single `<pre>` that Chrome generates for plain text. On any other page the script
exits without changing anything. Because the page is plain text, it has no scripts of
its own that could read the rendered DOM.

After injection, the page becomes Markside Preview. A small **Web · read-only** label in
the toolbar replaces the save controls and the mode switcher.

Reloading the page or navigating the tab elsewhere shows raw text again, because the
`activeTab` grant does not persist past navigation. The user triggers it again.

### Links

- Relative images and links resolve against the page URL.
- Clicking a relative Markdown link fetches the target from the content script and
  renders it in place. The tab does not navigate, so the grant stays in effect. If the
  fetch fails (CORS, a sandboxed origin, or a non-text response), Markside falls back
  to ordinary navigation, which shows raw text.
- Wikilinks are not resolved.

## Architecture

### Permissions

| Change | Install warning |
| --- | --- |
| Add `scripting` | None |
| Add a `commands` manifest entry | None |
| Keep `activeTab` (already requested) | None |

There is no new `host_permissions` entry. The manifest content script still matches
only `file:///*`.

### Injection

The popup and a background `chrome.commands.onCommand` handler call the existing
`ensureContentScript(tabId, "markside")` in `lib/content-script-injection.ts`. That
injects the already-built `contents/markside.tsx` bundle, which the manifest's
`content_scripts` entry lists, so no separate entry point is needed.

`contents/markside.tsx` currently has no guard against running twice. The bootstrap
needs one, such as returning early if `#markside-mount` exists, so pressing the shortcut
again does nothing.

`lib/content-script-injection.ts` already calls `chrome.scripting`, but the manifest
does not yet request `scripting`. Adding it also fixes the paused localhost Review
injection path.

### Rendering

The bootstrap chooses web mode when `location.protocol` is `http:` or `https:`. It skips
the Markdown mode preference and the `consume-new-markdown-file` message, then mounts a
separate, smaller component rather than `FileRenderer`.

**Use a separate component, not a `readOnly` flag on `FileRenderer`.** `FileRenderer`
always calls `usePersistedDirectory`, `useActiveReview`, and `getFileHandle`. Each of
these opens IndexedDB, and in a content script IndexedDB belongs to the **page's
origin**. On a web page that would create a Markside database inside the website's
storage, where any other page on that origin could read it. On a sandboxed origin such
as `raw.githubusercontent.com`, IndexedDB throws.

Hooks cannot be called conditionally, so gating about a dozen hooks behind a flag is
fragile. The web component composes only these pieces:

- `useContentPreview` with mode fixed to `preview`
- `useContentPreferences`
- `useContentPdfExport`
- The outline sidebar and the toolbar parts that apply to it

Preferences come from `chrome.storage`. The web component must not use any
page-origin storage: no IndexedDB, `localStorage`, or `sessionStorage`.

### URL helpers

These helpers currently return their input unchanged unless the URL starts with
`file:///`. They need an `http(s)` branch:

- `resolveImageSrc` and `resolveDocumentLinkHref` in `lib/url.ts`
- `classifyMarksideFileUrl` in `lib/file-types.ts`, through `getLocalFileName`, so that
  `canExportPdf` and Markdown detection work

`resolveFileBreadcrumbs` assumes `file://`. The web toolbar shows the host and file name
instead.

## Risks to verify

- **Sandboxed raw hosts.** `raw.githubusercontent.com` sends
  `Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; sandbox`.
  Check the following there:
  - injected `<style>` elements apply
  - relative and remote images load, since `img-src` falls back to `'none'`
  - KaTeX fonts load
  - Mermaid and Shiki render
  - in-place link fetches work from an opaque origin

  If the page CSP blocks images, show them as links rather than broken images.
- **Other raw hosts.** `gitlab.com/.../-/raw/...` serves `text/plain` with a standard,
  non-sandboxed CSP. Verify it as a second case.
- **Local static servers.** `python -m http.server` serves `.md` as `text/markdown`, so
  Chrome downloads it. That case is out of scope, but the user guide should say so.

## Possible follow-up

**Always render on this site.** Request that one origin through
`optional_host_permissions` and register a dynamic content script for it with
`chrome.scripting.registerContentScripts`. The user approves each site, and nothing is
added at install. Build this only if users ask for it.

## Verification

Unit tests:

- Eligibility policy: URL extension for the popup, and content type plus body shape for
  injection
- `http(s)` branches of `resolveImageSrc`, `resolveDocumentLinkHref`, and
  `classifyMarksideFileUrl`
- The bootstrap guard against double injection

Manual tests, to be added to `docs/manual-test.md`:

- Raw GitHub page and GitLab raw page
- An HTML page, where pressing the shortcut does nothing
- Pressing the shortcut twice
- Relative link fetch, plus the fallback to navigation
- PDF Export
- Page reload returns to raw text

## Docs to update on implementation

- `docs/system-design.md`, Browser permissions and Loading and Rendering
- `docs/user-guide.md`
- `PRODUCT.md` feature status
- `docs/store-listing.md`, with a justification for the `scripting` permission
- `CONTEXT.md`, if "Web Preview" becomes a domain term
