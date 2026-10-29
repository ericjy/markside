---
date: 2026-10-28
status: implemented
intent: intent.md
interview: grill.md
---

# Choosing the Interface language

| Requirement | Decided by |
| --- | --- |
| 1. Offer a persistent Interface language preference independent of the browser. | [Q1](grill.md#q1-why-change-language-independently) |
| 2. Offer Follow browser and the six supported languages, named in their own languages. Default to Follow browser; unsupported browser languages fall back to English. | [Q2](grill.md#q2-what-should-the-choice-offer) |
| 3. Make the control available in Settings before file access is enabled. Propagate changes to open Markside surfaces without reloading the document. | [Q3](grill.md#q3-where-and-when-should-the-choice-take-effect) |
| 4. Preserve Unsaved Drafts, document and Review content, and instructions. | [Q4](grill.md#q4-what-remains-outside-the-choice) |
| 5. When the browser and Interface languages differ, identify the file-access setting in both languages. | [Q3](grill.md#q3-where-and-when-should-the-choice-take-effect) |

The preference is stored locally alongside other extension preferences. Each
surface watches changes and updates its language and Markside-generated labels.
CodeMirror language phrases are reconfigured without replacing its document.

| Constraint | Design |
| --- | --- |
| Six languages and browser default | Use the existing translation catalogs and browser-locale resolution. |
| Preserve content and Review data | Change only Markside interface strings and generated labels. Do not reload files or write Review data. |
| Browser-owned metadata | Browser extension name and description keep following the browser language. |

Native-speaker review remains a follow-up. Verify preference persistence,
changes in already-open surfaces, accessibility language attributes, Review
anchors, and Unsaved Draft preservation. Browser-owned UI and file operations
need the manual extension checklist.
