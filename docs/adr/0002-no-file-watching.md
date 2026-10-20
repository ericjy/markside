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
