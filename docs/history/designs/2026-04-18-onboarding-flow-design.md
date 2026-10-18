# Onboarding Flow Design

**Date:** 2026-04-18  
**Status:** Implemented

> Historical design. See `docs/system-design.md` and `docs/user-guide.md` for current behavior.

## Problem

New users install Markside and have no guidance that they need to enable "Allow access to file URLs" before the extension can do anything. They try to use it, nothing works, and they don't know why.

## Solution

Make the popup permission-aware. On every open, it checks `chrome.extension.isAllowedFileSchemeAccess()` and renders one of two states: a setup card (if access not granted) or usage instructions (if ready). No install events, no persistent state, no extra tabs.

## Popup States

### State 1 — Setup needed (`hasFileAccess === false`)

```
┌─────────────────────────────────┐
│ [M] Markside                    │
├─────────────────────────────────┤
│ Enable file access              │
│                                 │
│ Markside needs permission to    │
│ open local files.               │
│                                 │
│ [Open Extension Settings →]     │
├─────────────────────────────────┤
│                       Settings  │
└─────────────────────────────────┘
```

The button opens `chrome://extensions/?id=${chrome.runtime.id}` in a new tab — directly to the extension's detail page where the toggle lives.

### State 2 — Ready (`hasFileAccess === true`)

```
┌─────────────────────────────────┐
│ [M] Markside                    │
├─────────────────────────────────┤
│ Drag any .md file to a browser  │
│ tab, or use File > Open File…   │
│ in Chrome.                      │
├─────────────────────────────────┤
│                       Settings  │
└─────────────────────────────────┘
```

### State 0 — Loading (`hasFileAccess === null`)

Render nothing between header and footer while the async check resolves. The check is fast enough that no spinner is needed.

## State Transitions

Chrome popups are destroyed and re-mounted on every open. No polling or install event needed — the user enables the toggle, returns to the browser, clicks the icon again, and the popup re-mounts in State 2 automatically.

## Implementation

### `popup.tsx`

- Add `hasFileAccess: boolean | null` state, initialized to `null`
- In `useEffect`, call `chrome.extension.isAllowedFileSchemeAccess(setHasFileAccess)`
- Replace the static instructions block with a conditional render:
  - `null` → render nothing (blank area between header and footer)
  - `false` → State 1 card
  - `true` → State 2 text

### Files changed

| File | Change |
|------|--------|
| `popup.tsx` | Add permission check + conditional render |

### Files not changed

| File | Reason |
|------|--------|
| `background.ts` | No install event needed; popup lifecycle handles transitions |
| `package.json` | No `web_accessible_resources` needed |
| `options.tsx` | Existing setup docs remain as reference |

## What was ruled out

- **Auto-open options page on install** — intrusive; users close it before reading
- **Sample file tab** — `chrome-extension://` URLs aren't intercepted by the content script, so markdown wouldn't render; workarounds (Plasmo tab page, `web_accessible_resources`) add complexity without meaningful benefit
- **"Open a Markdown File" button** — file pickers in extension popups return FSA handles, not `file://` URLs; no clean path to rendered output
- **Content script banner** — if file access isn't granted, the content script can't run on `file://` pages anyway; catches the wrong moment
