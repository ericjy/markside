---
date: 2026-10-21
status: historical
interview: grill.md
---

# Question Card rounds

This specification summarizes the original interview. Later changes to interview
rules are documented in [the Markside skill](../../../skills/markside/SKILL.md)
and [the agent Review workflow](../2026-10-18-agent-review-loop/spec.md).

## Question flow

The questioning skill decides whether to ask one question or a round. Markside
shows each question as a separate Question Card, with no additional round cap.
One Current questions section holds the cards, numbered continuously without
round headings.

A partial send archives answered questions verbatim in question-number order,
keeps unanswered questions, and appends questions unblocked by the answers.
There is no button to accept all remaining recommendations.

## Keyboard interaction

Letter keys answer the active card, then advance to the next unanswered card.
The active card is the first unanswered card or the one last clicked or focused.
Only the active card shows its keyboard hints and accent outline. Advancement
scrolls the next card into view only when needed. After every card is answered,
letters can still change the active card's answer.

Cmd/Ctrl+Shift+Enter sends an active Review from anywhere on the page, including
when several Question Cards are present.

## Interview controls and record

The original interview chose per-card Skip, Fewer questions, and Stop controls.
Skip defers its question. Fewer questions rechecks every unanswered question in
the current round. The original Stop decision placed unanswered recommendations
under Assumed defaults for confirmation. These are historical decisions; consult
the current skill for subsequent changes to those controls and Stop behavior.

Unclear questions are rewritten in place. Assumed defaults can be challenged
before finishing. The interview remains the record of the options, tradeoffs,
and decisions.

## Scope

The original change covered the Markside skill, Question Card keyboard behavior,
and agent Review documentation. Skill and extension changes could ship
independently. Single-question skills use the same flow with one card.
