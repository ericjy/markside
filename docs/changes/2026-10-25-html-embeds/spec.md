---
date: 2026-10-25
status: proposed
intent: intent.md
interview: grill.md
---

# HTML embeds and explaining in Markside

> Proposed design. Nothing here is implemented yet. Current behavior is in `docs/system-design.md`.
> This design supersedes [HTML diagrams](../2026-10-20-html-diagrams/spec.md).

## Requirements

A Markdown doc references an HTML file with image syntax, and Markside renders
that file in place. The `markside` skill uses this to write explanations the
user can comment on and the agent revises. **Decided by** links the
[interview](grill.md) question behind each requirement, or a detail proposed by
the agent and confirmed when the interview finished. The interview keeps the
reasons and the rejected options.

| ID | Requirement | Decided by |
|---|---|---|
| R1 | Image syntax whose path ends in `.html`, such as `![Request flow](./spec.assets/request-flow.html)`, renders the referenced file in place in Preview and Split. Other image syntax is unchanged. | [Q3](grill.md#q3-where-does-the-html-live), [Q6](grill.md#q6-how-does-the-markdown-reference-an-html-file), [confirmed detail](grill.md#confirmed-details) |
| R2 | HTML always lives in its own file. There is no inline `html render` fence, and ```` ```html ```` blocks stay highlighted code. | [Q5](grill.md#q5-do-inline-html-render-fences-stay-as-a-second-form) |
| R3 | An embed may reference any relative path, including `../`, resolved against the doc like a relative image. | [Q10](grill.md#q10-which-relative-paths-may-an-embed-reference) |
| R4 | Each embed renders in a sandboxed frame with an isolated origin, sized to fit its content. Its scripts run, and every network request is blocked. | [Q11](grill.md#q11-which-decisions-from-the-html-diagrams-interview-carry-over) |
| R5 | Embeds style themselves. Markside adds no theme variables or base stylesheet. | [Q11](grill.md#q11-which-decisions-from-the-html-diagrams-interview-carry-over) |
| R6 | An embed's only Markside control is Expand. The embed handles its own interaction. | [Q11](grill.md#q11-which-decisions-from-the-html-diagrams-interview-carry-over) |
| R7 | An embed whose file is missing or unreadable shows an error block naming the path, like a Mermaid diagram that cannot render. | [confirmed detail](grill.md#confirmed-details) |
| R8 | A comment button on an embed creates a Review Comment on the whole embed. In the Review file its `quote` is `[HTML: <path as written>]` and its `line` is the reference's line. | [Q9](grill.md#q9-what-does-a-review-comment-on-an-embed-record), [Q11](grill.md#q11-which-decisions-from-the-html-diagrams-interview-carry-over) |
| R9 | Reload Comparison marks an embed as changed only when its reference line changes. Markside neither watches nor compares embedded files; an edit to one appears when the user reloads the doc. | [Q8](grill.md#q8-how-does-reload-comparison-show-a-changed-embed), [confirmed detail](grill.md#confirmed-details) |
| R10 | In Split, on the existing deferred schedule, Markside rebuilds only embeds whose reference changed. Others keep their state. | [Q11](grill.md#q11-which-decisions-from-the-html-diagrams-interview-carry-over) |
| R11 | Embeds render in PDF Export. | [Q11](grill.md#q11-which-decisions-from-the-html-diagrams-interview-carry-over) |
| R12 | Link and Hosted Snapshots carry each embedded file's HTML in the envelope, keyed by the path as written. The existing size warning and 256 KiB limit apply. The Snapshot viewer renders embeds with the same sandbox and network block. | [Q7](grill.md#q7-what-do-shared-snapshots-show-for-an-embed) |
| R13 | The Snapshot resource check does not count embeds as missing local images. | [confirmed detail](grill.md#confirmed-details) |
| R14 | "Explain X in Markside" runs through the `markside` skill. When X is an existing doc, the agent adds embeds and wording to it; otherwise it writes `<topic>.explain.md` at the repository root. The agent then opens the doc and runs the Review loop until the user finishes the Review. | [Q12](grill.md#q12-how-does-the-user-ask-for-an-explanation), [Q16](grill.md#q16-where-does-an-explanation-go-when-the-user-asks-to-explain-something), [confirmed detail](grill.md#confirmed-details) |
| R15 | The `markside` skill teaches embeds: HTML goes in a `<doc-name>.assets/` folder beside the doc (`<topic>.explain.assets/` for a topic explanation), written as plain HTML, CSS, and SVG without pasted libraries. There is no separate diagram skill. | [Q13](grill.md#q13-where-does-the-guidance-for-writing-embeds-live), [Q14](grill.md#q14-where-do-a-docs-html-files-go), [Q11](grill.md#q11-which-decisions-from-the-html-diagrams-interview-carry-over), [confirmed detail](grill.md#confirmed-details) |
| R16 | When the agent addresses a Review Comment, its reply names each HTML file it changed. | [Q15](grill.md#q15-how-does-the-user-see-which-visuals-changed-after-a-revision) |

## Design

**Rendering the reference.** The image rule in `lib/markdown.ts` checks the
`src`. A path ending in `.html` emits a placeholder,
`<div class="html-embed" data-embed-src="…" data-source-line="…">`, with the alt
text inside as a fallback, instead of an `<img>`. Preview's DOMPurify call in
`hooks/use-content-preview.ts` adds `data-embed-src` to its preserved
attributes, beside `data-wikilink` and `data-source-line`.

**Loading the file.** After sanitizing, Preview resolves each `data-embed-src`
against the file URL with the same logic as `resolveImageSrc` in `lib/url.ts`,
then reads it through the background `fetch-file` relay. This runs on the
deferred schedule that enhances Mermaid. Failures replace the placeholder with
the existing error block and the path (R7).

**The frame.** Markside builds a `srcdoc` from the file's HTML and prepends two
things: a CSP `<meta>` allowing only inline scripts, inline styles, and `data:`
images and fonts, and a small script that posts the content height to the
parent. The frame has `sandbox="allow-scripts"` without `allow-same-origin`, so
its origin is opaque (R4). Loading the file with `src="file://…"` instead would
leave no way to inject the policy. Expand reuses the existing expanded view (R6).
Rebuilding in Split compares each placeholder's `data-embed-src` with the
previous render (R10).

**Review Comments.** The embed's comment button creates a whole-embed comment
whose quote is `[HTML: <data-embed-src>]` and whose line is the placeholder's
`data-source-line` (R8). The path makes the quote unique unless the same file is
embedded twice; see Open questions.

**Reload Comparison.** The block diff already compares Markdown source. An
embed's reference line is its block, so the existing addition outline and
Changed label apply without reading embedded files (R9).

**Snapshots.** `hooks/use-content-snapshots.ts` collects each embed's path as
written and reads its HTML through the relay before building the envelope.
`lib/link-snapshot.ts` adds an optional `e` key, an object from path to HTML,
which `parseEnvelope` accepts beside `f`, `m`, and `r`. Size checks run on the
whole envelope, so the existing warning and limit cover embeds (R12).
`lib/link-snapshot-resources.ts` skips image tokens whose path ends in `.html`
(R13). The public viewer, in the separate website repository, fills
`data-embed-src` placeholders from `e` and builds the same frame.

**The skill.** `skills/markside/SKILL.md` gains an **Explain in Markside**
section beside **Ask questions in Markside**. It covers recognizing the request,
choosing the target doc (R14), writing embeds and their folder (R15), opening
the doc, running the Review workflow, and naming changed HTML files in replies
(R16). It says when an embed is worth it over Mermaid or a table: when a visual
needs layout, interaction, or shapes Mermaid cannot draw.

**Docs to update when this ships.**

- `docs/system-design.md`: rendering, the frame policy, Snapshots, and the
  outdated note that raw HTML is disabled.
- `CONTEXT.md`: add **HTML Embed**.
- `docs/manual-test.md`: embeds on `file://`, a missing file, a network request
  blocked inside an embed, PDF Export, Link and Hosted Snapshots, and a
  whole-embed Review Comment.
- `docs/changes/README.md`: mark this design implemented.

## How each constraint in the intent is met

| Intent constraint | Met by |
|---|---|
| Docs stay `.md`; HTML lives in separate files | R1, R2 |
| Embedded code cannot affect Markside's UI or reach the network | R4; the frame in Design |
| Shared Snapshots show what the author saw | R12 |
| No file watching | R9 |
| Supersedes HTML diagrams and keeps its other decisions | R4–R6, R10, R11, R15 |

## Open questions from the intent

- **Frame mechanism.** Carried forward. Verify that a `srcdoc` frame with
  `sandbox="allow-scripts"` and a CSP `<meta>` blocks the network from the
  content script on `file://` pages and on the Snapshot site, and whether the
  frame inherits the embedder's CSP.
- **PDF Export.** Carried forward. Confirm that Chrome's print flow captures
  `srcdoc` frame contents (ADR-0003).

## Further open questions

- **Duplicate embeds.** If one doc embeds the same file twice, both share the
  quote `[HTML: <path>]`. Decide whether the second becomes an Unanchored
  Review Comment or the quote gains an occurrence suffix.
- **Sizing script.** Markside injects the height script into the author's HTML.
  Decide how it behaves when the author's code also changes the height
  continuously, such as during an animation.

## Areas of concern

| Concern | Owner |
|---|---|
| Older Snapshot viewers reject an envelope with an unknown key. Deploy the viewer that accepts `e` before the extension that writes it. | Eric Yang |
| ADR-0007 rejected envelope changes, but only as a way to shrink links. Adding `e` carries new content, which that decision did not cover; record this in the system design. | Eric Yang |
| Explaining an existing doc edits it (R14). If the user has an Unsaved Draft of that doc, the existing Reload and save conflict flow must handle the agent's change. | Eric Yang |
| Most explanations with embeds exceed the comfortable Link Snapshot size and preselect a Hosted Snapshot. | Eric Yang |
