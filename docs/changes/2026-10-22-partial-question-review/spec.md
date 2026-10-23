---
date: 2026-10-22
status: implemented
intent: intent.md
interview: grill.md
---

# Question Card progress and partial Reviews

| Requirement | Decided by |
| --- | --- |
| R1. Show the footer after the last answerable Question Card throughout an active agent Review, including when none are answered. | [Request](grill.md#request) |
| R2. Before sending, show "2 / 3 questions answered" using the current nonblank saved answers and total answerable cards. Use "question" for a single card. | [Request](grill.md#request) |
| R3. Offer Send review with unanswered questions remaining. Follow existing send conditions, including requiring an answer, Review Comment, or Review Note. | [Request](grill.md#request) |
| R4. Clicking a selected option again clears its unsent answer. Enter and Space on the focused option do the same. Repeating a letter shortcut keeps its existing choose-and-advance behavior. | [Clear a selected answer](grill.md#clear-a-selected-answer) |

## Design and constraints

ContentView counts saved answers with the same policy used for active-card
navigation. It always supplies a footer status for an active agent Review.
The footer uses the existing handoff's disabled state and reason rather than
hiding the action. Sending and waiting retain their existing status messages
and Check for reply. Completed and local copy-prompt Reviews keep their current
behavior.

Clearing an unsent answer deletes its ordinary Review Comment, so it is omitted
from sending and copying and the answered count decreases. Other comments and
the Review Note stay intact. The existing no-deletion rule for comments already
recorded in the sidecar still applies; those answers use Withdraw in Review.
The Something else tile continues opening the composer.

| Intent constraint | Design |
| --- | --- |
| Make progress visible | R1 and R2 keep the footer visible and count saved answers. |
| Send a partial round | R3 removes the footer's completion gate. |
| Keep the Review handoff | Existing send, permission, document, and empty-Review checks remain authoritative. |

No open questions or ADR conflicts. No new file checks or timers. Component
tests cover counts, partial sends, and disabled actions; extension integration
checks are recorded in the manual test guide.
