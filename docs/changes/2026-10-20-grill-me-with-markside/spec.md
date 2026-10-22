# Interviews in Markside

**Date:** 2026-10-20
**Status:** Historical interview design
**Interview:** [Full questions and decisions](grill.md)

This records the original interview design. Its syntax, controls, and lifecycle
have since evolved. Current behavior is documented in
[the Markside skill](../../../skills/markside/SKILL.md) and
[the agent Review workflow](../2026-10-18-agent-review-loop/spec.md).

## Interview flow

The questioning skill decides what to ask; the Markside skill handles asking and
answering through a local Markdown document and the existing Review handoff.
An invocation such as `/grill-me <topic> in Markside`, or a request to continue
an interview in Markside, starts that flow.

The original design asked one question at a time. The current question appears
above the answered questions. Answered questions retain their full text, options,
recommendation, and the user's decision. A sibling interview file keeps the
subject document unchanged; without a subject, the interview starts at the
repository root. Durable decisions go where the questioning skill requires.

## Question Cards and completion

The original design used explicit `[!QUESTION]` blockquotes with lettered options
and a recommendation. Answer controls create ordinary Review Comments without
changing the Review-file contract.

Finish review confirms shared understanding. The original design also chose an
action to resolve remaining Addressed comments and finish together, avoiding
separate acceptance of every interview answer.

## Reply discovery and delivery order

A bounded check after Send reads for the agent's reply and offers an explicit
Reload. It does not replace the document automatically.

The original delivery order was skill guidance, finishing improvements, bounded
reply checks, then Question Card controls. Later support for rounds is recorded
in [Question Card rounds](../2026-10-21-question-card-round/spec.md).
