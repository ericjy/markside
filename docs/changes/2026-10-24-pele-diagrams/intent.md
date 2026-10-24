---
date: 2026-10-24
status: accepted
author: Eric Yang
interview: grill.md
design: spec.md
---

# Render Mermaid diagrams with Pele

Markside renders `mermaid` fences with the Mermaid library, a 6.4 MB bundle in
the content script that loads on every matched `file://` page. Diagrams take
over 100 ms to render and use Mermaid's own theme instead of the document's
font and colors. Pele reads the same syntax. A spike measured the content
script at 4.9 MB instead of 7.2 MB and rendered 14 sample diagrams in 32 ms
instead of 214 ms, in Markside's font and palette.

Replace Mermaid with Pele. Size, speed, and appearance are equal goals, and a
regression in any of them counts against the switch. Diagrams that Pele cannot
draw show the existing error block. Where Pele parses syntax but does not draw
it, Markside works around the gap and reports it upstream.

This affects everyone who reads Markdown with diagrams in Markside, including
Question Cards. It changes the diagram renderer, its styles, the build, and
ADR-0001. It does not add other diagram engines.

Constraints: diagrams render locally, keep real text for Review comments
(ADR-0005), and run under the extension's content security policy. Review
comments, PDF Export, and rendered copy keep working.

No open questions remain.
