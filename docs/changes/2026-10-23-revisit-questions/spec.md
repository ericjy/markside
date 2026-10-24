---
date: 2026-10-23
status: implemented
intent: intent.md
interview: grill.md
---

# Revisiting previous questions

| Requirement | Decided by |
| --- | --- |
| R1. Render archived questions using the current Question Card styling, with their heading and recorded decision visible. | [Q1](grill.md#q1-how-should-previous-questions-appear) |
| R2. Full question starts collapsed and expands to show the preserved context, options, recommendation, and comparison. Mark the recorded option without making options interactive. | [Q1](grill.md#q1-how-should-previous-questions-appear) |
| R3. Revisit question opens a composer containing the recorded answer, or an existing pending revision. Saving and sending use ordinary Review Comments anchored to the heading. | [Q2](grill.md#q2-what-should-revisiting-do) |
| R4. Keep the recorded decision visible until the agent processes the revision. Exclude archived cards from active question shortcuts, progress, and unanswered-question checks. | [Q2](grill.md#q2-what-should-revisiting-do) |
| R5. The agent handles a revisit request by reconsidering the recorded decision and its dependencies, restoring the question as a current card when more input is needed. | [Q2](grill.md#q2-what-should-revisiting-do) |

## Design

Recognize the existing heading, decision callout, and Full question disclosure
written by the Markside skill. Wrap them as an archived Question Card during
Markdown rendering. Keep the original heading ID, source lines, text, and nested
disclosures. Use the current option and comparison rendering, without answer
controls or letter shortcuts. Native details supplies keyboard-accessible
expansion. Revisit question remains visible while collapsed.

The composer includes an explicit revisit instruction followed by the recorded
answer, so sending an unchanged answer still communicates that the decision
needs reconsideration. A pending Review Comment takes precedence on reopening.
Cancelling leaves the archive and saved Review unchanged. Saving changes only
the Review Comment; the agent updates the document after handoff.

## Constraints and verification

| Constraint | Implementation |
| --- | --- |
| Preserve the archive | Enhance the existing Markdown format without rewriting source. |
| Preserve the Review contract | Ordinary heading-anchored Review Comments, per ADR-0005 and ADR-0008. |
| Preserve explicit handoff | Revisit opens the composer; Save and Send retain their current meanings. |
| Keep earlier decisions readable | Heading and decision remain outside the collapsed disclosure. |

Test rendering with nested comparisons, chosen options, custom answers, and
ordinary disclosures. Test that archived cards have no answer interactions or
round counts. Exercise revisiting, cancellation, saving, and sending through
content hooks. Inspect collapsed and expanded cards at desktop and narrow widths.
