# Source Editor Top Spacing

**Status:** Implemented

> Historical design. See `docs/system-design.md` and `docs/user-guide.md` for current behavior.

## Goal

Reduce the empty vertical space between the application header border and the Source editor toolbar so the file name and editing controls sit closer to the top of the content area.

## Design

- Change only the Source pane's top padding from 40px to 16px.
- Keep its existing 32px horizontal padding and 40px bottom padding.
- Apply the same spacing in Source and Split modes because both render the same Source pane.
- Leave Preview pane spacing unchanged.
- Do not change the editor toolbar, editor height behavior, split divider, or responsive layout.

## Verification

- Confirm the Source toolbar has a 16px inset below the application header.
- Confirm Source and Split modes use the same inset.
- Confirm Preview mode is visually unchanged.
- Run the production build to catch styling or TypeScript regressions.
