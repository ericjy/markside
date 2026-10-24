---
date: 2026-10-24
status: implemented
intent: intent.md
interview: grill.md
guidelines:
  - ../../visual-design.md
---

# Calmer reading

| Requirement | Decided by |
| --- | --- |
| R1. Inline code uses the foreground color in monospace on the muted background, with small padding and rounded corners, in light and dark themes. | [Q1](grill.md#q1-how-should-inline-code-look) |
| R2. H1 and H2 keep their bottom rules at half the border contrast. H2 keeps its larger size and rule; H3 has neither. | [Q2](grill.md#q2-should-headings-keep-their-rules) |
| R3. Page width offers Standard (48rem, default), Extended (64rem), and Full width (no maximum). | [Q3](grill.md#q3-what-should-the-page-widths-be) |
| R4. Saved choices keep their widths: Narrow becomes Standard, Standard becomes Extended, and Full width and the legacy full-width flag stay Full width. | [Q3](grill.md#q3-what-should-the-page-widths-be) |
| R5. The word count stays in the top-right margin at a smaller size and lower contrast. | [Q4](grill.md#q4-how-should-the-word-count-appear) |
| R6. The file tree starts collapsed without a saved choice. The toolbar toggle names its action, Show file tree or Hide file tree, in its tooltip and accessible label. | [Q5](grill.md#q5-should-the-file-tree-start-open) |

## Design and constraints

Prose styles change in `style.css` only; PDF Export keeps its own rules. The
width preference moves to a new `previewPageWidth` key whose values are
`standard`, `extended`, and `full`. Reading falls back to the old `previewWidth`
key, mapping `narrow` to `standard` and `standard` to `extended`, then to the
legacy `previewFullWidth` boolean. A new key avoids reading an old `standard`
as the new, narrower Standard. The old keys are left in place.

The file tree default changes in `getLeftOpenPreference`. Saved `leftOpen`
values still win.

| Intent constraint | Implementation |
| --- | --- |
| Inline code recognizable as code | Monospace on a tinted background |
| GitHub fidelity | Heading rules kept, only lighter |
| Existing choices preserved | Width mapping and saved `leftOpen` |
| File tree discoverable | Labeled toolbar toggle in its usual place |

## Areas of concern

- With the file tree collapsed, its folder access prompt is out of sight until
  the user opens the tree. Saving still asks for the folder when needed.
  Owner: Eric Yang.
