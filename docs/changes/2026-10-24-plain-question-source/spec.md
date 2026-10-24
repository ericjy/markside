---
date: 2026-10-24
status: implemented
intent: intent.md
interview: grill.md
---

# Plain Markdown interview source

| Requirement | Decided by |
| --- | --- |
| R1. New archived questions use an ordinary numbered question heading, decision callout, and complete original question body. No Full question HTML wrapper is written. | [Q1](grill.md#q1-should-archived-questions-contain-html-disclosures-in-source) |
| R2. Markside recognizes this structure and generates the collapsed Full question section in Preview, preserving the visible heading, decision, and Revisit action. The body ends at the next heading of the same or higher level. | [Q1](grill.md#q1-should-archived-questions-contain-html-disclosures-in-source) |
| R3. New comparisons use a subordinate Compare tradeoffs Markdown heading and table. Markside renders these as initially expanded disclosures inside Question Cards. | [Q1](grill.md#q1-should-archived-questions-contain-html-disclosures-in-source) |
| R4. Keep existing HTML-wrapped archives and comparisons working. Preserve heading IDs, source lines, and authored comparison text for Review anchoring. | [Q1](grill.md#q1-should-archived-questions-contain-html-disclosures-in-source) |
| R5. Convert the current test interview to the new format without changing its decisions or restarting its Review. | [Q1](grill.md#q1-should-archived-questions-contain-html-disclosures-in-source) |

## Design and constraints

Enhance Markdown tokens during rendering. Recognize top-level numbered question
headings followed by decision callouts; keep the existing HTML archive detector
for compatibility. Generated wrappers carry no source positions. Preserve actual
comparison headings inside their rendered summary, including IDs and line maps.
The generated Full question label is UI text, excluded from Review text indexing.

The source remains complete in ordinary Markdown renderers. The Review anchor and
flat file contracts remain unchanged, consistent with ADR-0005 and ADR-0008.
This supersedes the source-wrapper requirement in the previous archived-card design.

Test question boundaries, subordinate headings, heading IDs and source lines,
custom and assumed decisions, literal code examples, legacy disclosures, and
Review text indexing. Verify collapsed and expanded cards in the browser and run
TypeScript, the test suite, and the production build.

## Validation

Rendering coverage includes plain and legacy archives, comparison-only and empty
archives, adjacent section boundaries, source lines, heading IDs, generated-label
exclusion from Review indexing, and read-only options. Browser checks cover
keyboard expansion and comparison toggling, Revisit, and narrow dark layout.
TypeScript and production build pass. The 64 test files outside Mermaid pass;
the full run has 12 failures in the independently modified Mermaid renderer tests.
