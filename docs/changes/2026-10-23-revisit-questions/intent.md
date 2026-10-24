---
date: 2026-10-23
status: accepted
author: Eric Yang
interview: grill.md
design: spec.md
---

# Revisit previous interview questions

Users need an obvious way to inspect earlier questions and revise their decisions
without manually selecting text to create a Review Comment.

Render previous questions as collapsed, read-only Question Cards and add Revisit
question. Preserve the recorded decision while the user prepares a revision,
and send that revision through the existing Review workflow.

This affects Markdown rendering, Question Card actions, the comment composer,
and the interview instructions. Keep the existing archive source format and flat
Review file contract. No open questions remain from the accepted proposal.
