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
