---
date: 2026-10-28
status: implemented
intent: intent.md
interview: grill.md
---

# Interface languages

| Requirement | Decided by |
| --- | --- |
| Localize the extension's interface, including controls, errors, dialogs, and accessible names. | [Q1](grill.md#q1-how-much-of-the-interface-should-be-translated) |
| Provide English, Simplified Chinese, Traditional Chinese, Korean, Japanese, and Spanish. | [Q2](grill.md#q2-which-languages-should-be-supported) |
| Follow the browser UI language, falling back to English. | [Q3](grill.md#q3-how-is-the-language-chosen) |
| Keep user content, file identity, Review data, and agent-instruction meaning unchanged. | [Q4](grill.md#q4-what-should-happen-to-document-and-agent-content) |
| Review coverage, interpolated values, fallback, accessibility, and tests. | [Q5](grill.md#q5-how-should-this-be-validated) |

Translations are local extension resources. UI text needs explicit message
boundaries, not automatic translation of arbitrary document DOM. Keep English
agent instructions stable unless a translated instruction is explicitly
reviewed against its original meaning. Language selection must not affect file
paths, Markdown rendering, or Review anchors.

| Constraint | Design |
| --- | --- |
| No document translation or transmission | Translate only Markside-owned interface strings with local resources. |
| Preserve Review and agent behavior | Localize controls without rewriting stored feedback or wire formats. |
| Browser-language selection | Use the extension UI locale with an English fallback. |
| Natural Traditional Chinese | Review terminology separately from Simplified Chinese. |

Native-speaker review remains an open follow-up; automated checks cannot prove
naturalness. Manual verification of file access and localized layout belongs in
the browser checklist.
