# ADR-0002: Do not watch local files

**Status:** Accepted

## Context

Polling local files adds background work, unclear conflict behavior, and surprising document replacement while a user is reading or editing. Browser file handles also have permission and lifecycle constraints that make implicit refresh unreliable.

## Decision

Markside does not poll or watch files for changes. A file is reloaded when the user navigates to it or selects it from the file tree.

Before saving, Markside detects whether the file changed since it was loaded and asks the user to overwrite or reload.

## Consequences

- External changes are never silently applied.
- Users control when content reloads.
- No polling interval, filesystem watcher, or background refresh loop should be added without superseding this ADR.

## Exception: agent Review discovery

For a local Markdown file, Markside reads its `<document>.review.json` once when
the tab regains focus. Users typically switch to their agent and back, to start a
review or after the agent replies, so this is a user action, not a background loop:
no timer runs and nothing is read while the tab is idle. It reads only the Review
file to discover reviews and update comment statuses such as Addressed. It never
reloads or replaces the document; the user still reloads to see the agent's edits.

## Exception: changed-on-disk notice

On the same focus event, Markside reads the open text file once and compares it
with the last loaded or saved text. A difference shows Changed on disk beside
Reload. The document is never replaced; the user still chooses when to reload.
Images are not checked.

## Exception: post-Send reply check

After the user clicks Send review to agent, Markside re-reads the Review file
every 2 seconds for up to 2 minutes, because a reviewer often stays in the tab
waiting for the agent. It stops at the first change, which is the agent's reply,
and then runs the changed-on-disk check once. Send starts the check, it ends on
its own, and nothing runs while the tab is idle. It never reloads or replaces
the document; the user still chooses when to reload.
