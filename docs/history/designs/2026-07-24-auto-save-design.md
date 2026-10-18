# Auto Save Preference Design

**Status:** Implemented

> Historical design. See `docs/system-design.md` and `docs/user-guide.md` for current behavior.

## Goal

Keep Auto Save available without silently overwriting local files for users who
expect Markside to behave as a viewer or explicitly saved editor.

## Interaction

Auto Save is a persistent extension preference and is off by default. The
extension options page exposes it as a switch. Changes to the preference apply
immediately to already-open Markside tabs.

When Auto Save is enabled, editing schedules a save after 1.5 seconds without
input. Switching files during that delay flushes the save immediately and only
navigates after the write succeeds. A permission failure or external-file
conflict leaves the user on the current file.

When Auto Save is disabled, switching files with an unsaved draft presents
Save, Discard, and Cancel actions. Save writes the draft and navigates only
after success. Discard navigates without writing. Cancel leaves both the draft
and current file unchanged.

Reloading, closing the tab, or navigating away while a draft is unsaved uses
the browser's standard unsaved-changes warning. This protection also applies
while an enabled Auto Save is still pending because browsers cannot reliably
complete asynchronous file writes during unload.

`Cmd/Ctrl+S`, the Save button, visible save status, browser permission recovery,
and external-file conflict detection remain available in both preference
states.

## Persistence

The preference is stored in `chrome.storage.local` under one Boolean key.
Missing or invalid values resolve to disabled. The `storage` extension
permission is required so the options page and content script share the value
and receive live changes.

## Verification

Unit tests cover the public pure seams:

- Missing or invalid preference values resolve to disabled.
- Clean files navigate immediately.
- An unsaved draft saves before navigation when Auto Save is enabled.
- An unsaved draft requires confirmation when Auto Save is disabled.

Browser File System Access behavior is verified through production builds and
review rather than filesystem mocks, in keeping with the repository's testing
constraints. Run the focused policy tests, full Vitest suite, and production
build.
