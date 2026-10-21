# ADR-0008: Keep the agent Review file flat

**Status:** Accepted

## Context

The agent Review loop exchanges comments through `<document>.review.json`. A
branch-only version 2 added sessions, immutable send rounds, a status event log,
archived sessions, and a `--round` guard on `markside address`. None of it was
visible in the panel: users saw only current comments and their statuses. It
doubled the file contract's code and its failure modes.

We also evaluated MRSF, the sidecar format used by Sidemark. Its anchors are
Markdown source text with line and column. Markside selects rendered text, and
markdown-it maps only block lines, with typographer quotes, removed markup, and
diagrams changing the text. Producing reliable MRSF anchors would serve other
tools, not Markside users, who already get a quote and a source line that agents
use successfully.

## Decision

Keep version 1: one flat `comments` list holding each comment's latest `quote`,
`line`, `body`, `status`, and `reply`, plus the file's `status`, `requestedAt`,
`sentAt`, `docHash`, and `note`.

- Each Send replaces the list with the comments being sent. Withdrawn drafts drop
  out; resolved comments stay.
- Only the reviewer ends a Review, by choosing Finish review once every sent
  comment is Addressed or Resolved and nothing is unsent. Finishing resolves the
  Addressed ones. Resolving alone keeps the agent
  waiting, so the reviewer can clear addressed comments and keep giving feedback.
  A fresh `review` keeps the resolved comments and note, so earlier feedback
  stays under Resolved.
- Retries and `review --continue` never reset the file. Addressed-only feedback
  keeps the agent waiting.
- The reviewer may resolve Sent feedback (Withdraw) as well as Addressed feedback.
  The agent cannot resolve. Local copy-prompt comments keep Open/Resolved in
  IndexedDB and are never written to the file.
- Comments in the file but missing from browser storage are restored to it.

Not adopted: MRSF compatibility, reply threads, send history, and stale-answer
guards. A reviewer who wants more from the agent edits the comment and sends it
again; the agent receives the latest text.

## Consequences

- Only the latest reply and text of each comment are kept.
- If the reviewer edits and resends a comment while the agent is still working on
  the previous text, the agent's `address` applies to the new text. Use one agent
  per document.
- Writes remain atomic replacement, not cross-process transactions.
- A reviewer who never finishes leaves the agent waiting until they tell it to
  proceed.
- Revisit reply threads if reviewers need to answer the agent rather than revise
  their comment. Revisit MRSF if users ask to open Markside reviews in other
  tools; an export would likely be enough.
