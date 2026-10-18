# ADR-0003: Use the browser renderer for PDF Export

**Status:** Accepted

## Context

PDF Export must keep local Markdown private while producing a faithful, accessible document with the same rendered content users see in Markside. A direct-download implementation would require either a second PDF rendering engine or Chrome's non-optional `debugger` permission to invoke its internal PDF command.

## Decision

Markside opens Chrome's native print flow for PDF Export and supplies a print-specific document layout. It does not upload documents, request the `debugger` permission, or generate PDF bytes itself.

## Consequences

- Users select Save to PDF and the destination in Chrome's dialog.
- PDF output retains browser-rendered text, links, images, diagrams, and pagination.
- Markside must guide first-time users to disable Chrome headers and footers for a clean document.
