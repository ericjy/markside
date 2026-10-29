---
date: 2026-10-28
status: implemented
intent: intent.md
interview: grill.md
---

# Open `.md.txt` as Markdown

| Requirement | Decided by |
| --- | --- |
| When a local `.md.txt` file is open, offer **Open as Markdown** and **Keep as text**. Other text files remain unchanged. | [Q1](grill.md#q1-what-prompted-the-change), [Q2](grill.md#q2-what-should-the-prompt-do) |
| The Markdown choice opens Preview and makes Preview, Source, and Split available, preserving any unsaved text. | [Q2](grill.md#q2-what-should-the-prompt-do) |
| Keep as text dismisses the prompt and retains Source. | [Q2](grill.md#q2-what-should-the-prompt-do) |
| Neither choice renames the file; saves keep using its existing path and permissions. | [Q3](grill.md#q3-what-happens-to-the-file-on-disk) |
| The choice lasts until the file is navigated away from or the page is reloaded. | [Q4](grill.md#q4-how-long-does-the-choice-last) |

This is an explicit exception to the existing rule that non-Markdown file
types use Source only. Detection uses the decoded local filename; no content
sniffing or file watching is needed. The prompt is shown only after the file
loads, so it cannot replace an unresolved read with an empty draft. A file
opened outside the browser cannot be intercepted.

## Constraint coverage and concerns

| Intent constraint | Design |
| --- | --- |
| Ask first | Default to Source and show an optional prompt. |
| Keep the file unchanged | Use its real URL and existing save path for all writes. |
| Preserve other text behavior | Match only filenames ending in `.md.txt`. |
| No watching or permissions | Inspect the already opened filename. |

The per-open lifetime is an implementation assumption, not an explicit user
decision. Browser file access and saving need manual verification, including a
Windows file with hidden extensions.
