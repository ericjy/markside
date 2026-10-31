---
date: 2026-10-30
status: implemented
intent: intent.md
interview: grill.md
---

# Online Markdown preview

This supersedes the conflicting interaction and permissions decisions in the [earlier proposal](../2026-10-19-web-preview/spec.md).

| Requirement | Decided by |
| --- | --- |
| Offer optional automatic preview across websites, requesting permission only when enabled. | [Q1](grill.md#q1-网上-markdown-应该怎样开启自动渲染) |
| Offer an enable action in the popup and controls in Settings; remove the permission when disabled. Hide the popup action once enabled. | [Q2](grill.md#q2-用户在哪里开启网上文件的自动渲染), [Q3](grill.md#q3-用户关闭自动渲染时网站权限应该怎样处理), and the requester's later revision |
| Enable automatic preview before previewing online files. After permission is granted from the popup, preview the current eligible page immediately. | The requester's later revision supersedes [Q4](grill.md#q4-用户没有开启自动渲染时还能预览当前文件吗) |
| Resolve relative resources against the original URL and leave the original page available on failure. | [Q5](grill.md#q5-网上文件中的相对图片和链接如何处理), [Q6](grill.md#q6-页面不符合预览条件或渲染失败时怎么办) |
| Provide read-only reading controls, PDF Export and copy, plus a raw/preview toggle. | [Q7](grill.md#q7-网上文件的预览提供哪些功能), [Q8](grill.md#q8-用户怎样查看原始-markdown) |
| Recognize HTTP(S) URLs ending in .md, .markdown or .mdx, including query strings. | [Q9](grill.md#q9-哪些网上文件名应尝试作为-markdown-预览) |
| Offer Zen mode in Preview and Source with the same controls as local files, retaining its state in the current tab without using website storage. | Requester's later request |

Automatic injection is dynamically registered after optional host permission is granted. The popup injects the script into the current page immediately after enabling it. Only browser-rendered plain-text pages are eligible; HTML repository pages are not replaced. The web renderer does not access page-origin storage or local file workflows. It sanitizes Markdown and preserves the original text for toggling. Relative links navigate normally and therefore follow the user's permission setting.

| Intent constraint | Design |
| --- | --- |
| No required access to all websites | Optional permission requested by user action. |
| Read-only web convenience | No save, editor, or Review. |
| Keep site content available | Reject ineligible pages before mutation and preserve the original text. |

Chrome permission prompts, CSP restrictions, downloads and cross-origin assets need manual verification. Engineering owns compatibility testing; unsupported downloads remain outside this version.
