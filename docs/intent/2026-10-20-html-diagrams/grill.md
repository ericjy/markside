# Grill: nicer diagrams in Markside docs

Answer by commenting on the current question (an option letter, plus any notes), then click **Send review to agent**.

## Context

Goal: support nicer diagrams while the doc stays `.md`. Prompted by ["HTML is the new markdown"](https://www.lennysnewsletter.com/p/how-i-ai-html-is-the-new-markdown).

What already exists in the code:

- **Mermaid** renders in Preview (`lib/mermaid.ts`, `securityLevel: "strict"`), with zoom, pan and an expanded view.
- **Raw HTML is already enabled.** `lib/markdown.ts:14` sets `html: true`, and the output passes through default DOMPurify (`hooks/use-content-preview.ts:132`). Inline `<svg>`, styled `<div>`s and `<details>` render today; scripts are stripped. `docs/system-design.md:467` says raw HTML is disabled, which is out of date.
- The Snapshot viewer, PDF export, reload diffs and text-anchored Review Comments all depend on the rendered DOM, so any diagram format has to work with each of them.

## Summary

- **Goal:** let agents add free-form HTML diagrams to `.md` docs, because Mermaid can't express the visuals. A Mermaid theme fix can still happen separately.
- **Format:** fenced ```` ```html render ```` blocks; plain ```` ```html ```` stays highlighted code.
- **Rendering:** each block renders in a sandboxed frame with an isolated origin, sized to fit its content.
- **Code policy:** diagram JavaScript runs, and a content policy blocks every network request.
- **Styling:** diagrams style themselves; Markside adds no theme variables or base stylesheet.
- **Review Comments:** a comment button on the diagram creates a comment tied to the block and its source line.
- **Where it renders:** Preview, Split, PDF export and the public Snapshot viewer, all in the first version, with the same sandbox and network block on the website.
- **Editing:** in Split view, only diagrams whose source changed are rebuilt, on the existing deferred schedule.
- **Agent guidance:** a new `skills/markside-diagram` skill that loads when an agent writes a Markdown file that needs a diagram; the Markside skill stays unchanged.
- **Size:** no new limit; the skill tells agents to write plain HTML, CSS and SVG without pasted libraries, and existing Snapshot limits apply.

If this matches your understanding, click **Finish review**.

## Answered questions

### Q1. What does "nicer" mean?

- A. It looks bad (theme, fonts, spacing).
- B. It can't express the content (free-form HTML/SVG).
- C. Both.

> **Your decision: B.** Mermaid can't express the visuals you want, so the work is free-form HTML/SVG diagrams inside `.md`. A Mermaid theme fix can still happen separately.

### Q2. What form does the HTML take inside the `.md`?

- A. Render HTML directly in the document.
- B. Render HTML in a sandboxed frame.
- C. Keep the diagram in a separate HTML file.
- D. Let agents draw diagrams using SVG only.

> **Your decision: B.** Diagrams are fenced ```` ```html ```` blocks that Markside renders in an isolated, sandboxed frame with its own styles and optional JavaScript.

### Q3. How do Review Comments work on a sandboxed diagram?

- A. Comment on the whole diagram.
- B. Select text inside the diagram.
- C. Comment only in Source view.

> **Your decision: A.** A comment button on the diagram creates a comment tied to that block and its source line; selecting text inside the frame can come later.

### Q4. Which code blocks render as diagrams?

- A. Opt in with a word after the language.
- B. Use a new language name.
- C. Render every HTML block.

> **Your decision: A.** Only ```` ```html render ```` blocks become diagrams; plain ```` ```html ```` stays highlighted code.

### Q5. What may a diagram's code do?

- A. Static HTML and CSS only.
- B. Scripts run, network blocked.
- C. Scripts run, network allowed.

> **Your decision: B.** Diagram JavaScript runs in the isolated frame, and a content policy blocks every network request.

### Q6. Where must diagrams render in the first version?

- A. Preview, Split and PDF now; source elsewhere.
- B. Preview and Split only.
- C. Everywhere, including Snapshots.

> **Your decision: C.** Diagrams render in Preview, Split, PDF and the public Snapshot viewer from the first version, with the same sandbox and network-blocking policy on the website.

### Q7. Do diagrams follow Markside's theme?

- A. Provide theme variables.
- B. Diagrams style themselves.
- C. Apply a base stylesheet.

> **Your decision: B.** Markside adds no theme variables or styles; each diagram looks exactly as its author wrote it.

### Q8. When does a diagram refresh while you edit?

- A. Rebuild only the diagram whose source changed.
- B. Rebuild on demand.
- C. Rebuild every diagram on each Preview update.

> **Your decision: A.** On the existing deferred schedule, Markside rebuilds only frames whose source changed; other diagrams keep their state.

### Q9. How do agents learn to write these diagrams?

- A. Expand the Markside skill to cover diagrams.
- B. Create a separate diagram skill.
- C. Explain it only in the user guide.

> **Your decision: B.** A separate `markside-diagram` skill loads when an agent writes a Markdown file that needs a diagram; the Markside skill stays unchanged.

### Q10. What about large diagrams and charting libraries?

- A. No new limit; keep diagrams handwritten.
- B. Ship a few libraries with Markside.
- C. Cap each diagram's size.

> **Your decision: A.** No new limit; the diagram skill tells agents to write plain HTML, CSS and SVG without pasted libraries.
