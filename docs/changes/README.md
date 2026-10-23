# Changes

Each change lives in `docs/changes/YYYY-MM-DD-topic/`:

- `spec.md` records the design.
- `grill.md` preserves the interview, when one exists.
- `grill.review.json` preserves its completed Review, when one exists.
- `intent.md` preserves the original problem and intended outcome, when one exists.
- `spec.review.json` preserves a completed Review of the specification, when one exists.

Compared with common documents:

| File | Closest familiar document | Difference |
|---|---|---|
| `grill.md` | Meeting notes or a decision log | Keeps every option, recommendation, and answer |
| `intent.md` | A one-page problem brief | Records why a change is wanted; GitHub issues track the work |
| `spec.md` | A PRD and design doc in one | Has no market context or rollout plan; links each requirement to its decision |

## Workflow

Use this flow for a new feature or behavior change. Small fixes that change no
decided behavior go straight to code.

1. **Interview → `grill.md`.** Start by asking what prompted the change: the
   problem, who has it, and any evidence. Then ask the design questions. Run it
   in Markside to answer with Question Cards.
2. **`grill.md` → `intent.md`.** Write the problem, proposed outcome, affected
   users and systems, constraints, and open questions in the requester's words.
   Use only what the interview established, and list anything missing as an
   open question.
3. **`intent.md` and `grill.md` → `spec.md`.** Write numbered requirements in a
   table whose **Decided by** column links each one to its interview question,
   such as `grill.md#q5-what-stays-on-screen-in-the-mode`. Add the design, a
   table showing how each intent constraint is met, the intent's open questions
   answered or carried forward, and areas of concern with owners. Keep the
   reasons in `grill.md` rather than repeating them.
4. **Optional Review.** Review `spec.md` in Markside before committing.
5. **Commit.** Commit `intent.md` and `spec.md` together with their interview.
   Markside saves Reviews as `<file>.review.json`; rename them to
   `grill.review.json` and `spec.review.json` without changing their contents.
   Add the spec to the index below with its status.
6. **Implement.** When the change ships, set the spec's status to `implemented`
   and record current behavior in the user guide, system design, and
   `CONTEXT.md`.

## Frontmatter

`spec.md` and `intent.md` start with YAML frontmatter before the title.
`intent`, `interview`, and `design` name files in the same folder; omit each
one when its file does not exist.

```yaml
---
date: 2026-10-22        # the day the spec was first written
status: proposed        # proposed, confirmed, implemented, or historical
intent: intent.md
interview: grill.md
guidelines:             # project guidelines the design applied, when any
  - ../../visual-design.md
---
```

```yaml
---
date: 2026-10-22        # the day the intent was first written
status: draft           # draft, accepted, or rejected
author: Eric Yang
interview: grill.md
design: spec.md
---
```

## Index

Review JSON files are archived unchanged, including their original document names.
Interview records also retain historical paths and decisions. Current behavior is
documented in the user guide, system design, and relevant skills.

Unless marked otherwise, designs below are **Implemented**. Historical filenames
and code examples may no longer match the current source tree.

- [Sidebar redesign](2026-04-11-sidebar-resign/spec.md)
- [Mermaid support](2026-04-12-mermaid-support/spec.md)
- [File palette](2026-04-18-file-palette/spec.md)
- [Onboarding flow](2026-04-18-onboarding-flow/spec.md)
- [Source editor spacing](2026-07-23-source-editor-spacing/spec.md)
- [Split view](2026-07-23-split-view/spec.md)
- [Auto Save preference](2026-07-24-auto-save/spec.md)
- [Local agent Review loop](2026-10-18-agent-review-loop/spec.md)
- [Web Preview](2026-10-19-web-preview/spec.md) (Proposed)
- [Diagram engines beyond Mermaid](2026-10-19-diagram-engines/spec.md) (Proposed)
- [HTML diagrams](2026-10-20-html-diagrams/spec.md) (Proposed)
- [Interviews in Markside](2026-10-20-grill-me-with-markside/spec.md) (Historical interview design)
- [Pending decisions after 1.6.0](2026-10-20-pending-decisions/spec.md) (Historical interview decisions)
- [Copy a link to a heading](2026-10-21-copy-heading-link/spec.md) (Confirmed design)
- [Question Card rounds](2026-10-21-question-card-round/spec.md) (Historical interview design)
- [Narrow Preview page width](2026-10-21-preview-page-width/spec.md)
- [Typeface in the file menu](2026-10-22-typeface-menu/spec.md)
- [Zen mode](2026-10-22-focus-mode/spec.md)
