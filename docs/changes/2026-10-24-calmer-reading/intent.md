---
date: 2026-10-24
status: accepted
author: Eric Yang
interview: grill.md
design: spec.md
---

# Calmer reading

Markside should be at least as calm to read as Typora while staying faithful to
GitHub, since many people preview Markdown in Markside before pushing it. Today
red inline code, strong heading rules, a 64rem default width, a prominent word
count, and an open file tree add visual weight.

Make inline code neutral but still recognizable as code, lighten the H1 and H2
rules without losing the H2/H3 distinction, default Preview to a 48rem Standard
width with Extended and Full width options, quiet the word count, and start the
file tree collapsed while keeping it discoverable.

This affects everyone reading Markdown in Preview and Split. It changes prose
styles, the Page width preference, and the file tree's default. Explicit width
and file tree choices are preserved. It ships in 1.7.0.

No open questions remain.
