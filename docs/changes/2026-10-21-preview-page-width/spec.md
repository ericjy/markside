# Narrow Preview page width

**Date:** 2026-10-21
**Status:** Proposed. Design confirmed; not implemented.
**Interview:** [Full questions and decisions](grill.md)

## Behavior

Add a Narrow Preview width with a maximum of 48rem, normally 768px. Keep the
existing Standard maximum of 64rem and Full width with no maximum. Available
space can constrain every width further.

The file actions menu replaces the Full width checkbox with a Page width group
containing Narrow, Standard, and Full width. Exactly one option is selected.

The preference applies to Preview and the Preview pane in Split. Source keeps
its independent width preference, and PDF Export keeps its existing layout.
Narrow changes only the content width; type size and side spacing stay the same.

## Persistence and defaults

Remember the selected width locally across documents and browser restarts.
Preserve existing users' Standard or Full width choice. New installations
continue to default to Standard.
