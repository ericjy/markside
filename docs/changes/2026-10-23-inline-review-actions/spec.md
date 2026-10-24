---
date: 2026-10-23
status: implemented
intent: intent.md
interview: grill.md
---
# Inline Review actions

| Requirement | Decided by |
| --- | --- |
| Keep the banner as one compact row, with its action beside its message; allow wrapping on narrow windows. | [Q1](grill.md#q1-keep-a-banner-or-open-the-review-sidebar) |
| Hide it while Review is open. Preserve the existing Finish review conditions and waiting message with continued-commenting guidance. | [Q1](grill.md#q1-keep-a-banner-or-open-the-review-sidebar), [Q2](grill.md#q2-can-the-reviewer-still-comment-and-send-with-the-sidebar-closed) |
| With saved unsent Review Comments, show the draft count and Send review. Support an unsent Review Note too. | [Q2](grill.md#q2-can-the-reviewer-still-comment-and-send-with-the-sidebar-closed) |
| Reuse the existing send handler and disabled conditions, show failures for retry, and preserve the sidebar state. | [Q2](grill.md#q2-can-the-reviewer-still-comment-and-send-with-the-sidebar-closed) |
| Use a subtle neutral background and bottom border below the toolbar, with a 28px button, 12px button text, and a roughly 44px row before wrapping. | [Q3](grill.md#q3-how-should-the-row-look) |

The content application passes its Active Review to the existing banner. The banner uses the existing draft and comment-status policies and handoff actions. Sending remains available with unanswered questions, consistent with partial Reviews. Disk changes hide both actions until Reload. Completed Reviews hide the banner. The flat Review file contract in ADR-0008 is unchanged.

| Intent constraint | Implementation |
| --- | --- |
| Compact and nearby action | Wrapping flex row with a fixed gap and reduced vertical padding |
| Send without opening Review | Draft count, Send review, and existing handoff handler |
| Preserve lifecycle rules | Existing send-disabled and canFinish policies |

No open questions remain. Browser integration verification belongs to the implementing agent and the manual checks in docs/manual-test.md.
