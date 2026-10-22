---
date: 2026-10-21
status: implemented
interview: grill.md
---

# Narrow Preview page width

## Behavior

Add a Narrow Preview width with a maximum of 48rem, normally 768px. Keep the
existing Standard maximum of 64rem and Full width with no maximum. Available
space can constrain every width further.

The file actions menu has one Page width row showing the current choice and a
submenu arrow. Its submenu contains Narrow, Standard, and Full width, with
exactly one option selected.

The preference applies to Preview and the Preview pane in Split. Source keeps
its independent width preference, and PDF Export keeps its existing layout.
Narrow changes only the content width; type size and side spacing stay the same.

## Persistence and defaults

Remember the selected width locally across documents and browser restarts.
Preserve existing users' Standard or Full width choice. New installations
continue to default to Standard.
