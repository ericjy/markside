# Grill: pending decisions since 1.6.0

Click an option (or press its letter), or click **Answer or ask a question…** to write your own answer, then click **Send review to agent**.

## Summary

- **Design doc reasons:** you'll review `2026-10-20-html-diagrams-design.md` in Markside before I commit it. (Q1)
- **Stale doc:** fix the raw-HTML line in `docs/system-design.md` in the same commit. (Q2)
- **Diagram controls:** HTML diagram frames get only an expand button. (Q3)
- **Diagram comments:** quote `[HTML diagram]`, with the line at the opening fence. (Q4)
- **Reload Comparison:** mark a changed diagram as a whole; a removed one returns as a struck-through placeholder. (Q5)
- **Order:** HTML diagrams first; diagram engines wait for demand; reply on #1 that Vega-style charts can be HTML diagrams. (Q6)
- **Web Preview:** deferred, stays Proposed. (Q7)
- **Release:** publish the `markside` CLI to npm, then release 1.7.0 with the agent Review loop as Beta. (Q8)
- **Mermaid look:** dropped unless someone asks. (Q9)

If this matches your understanding, click **Finish review**.

## Answered questions

### Q1. What happens to the reasons I wrote for rejected options in the HTML diagrams design?

The interview recorded your choices but not why you turned down the other options. I filled those reasons in myself in `docs/history/designs/2026-10-20-html-diagrams-design.md`, for example "a new language name breaks highlighting in other Markdown tools".

- **A. Review the design doc in Markside after this interview.** You comment on any reason that's wrong, and I fix it before committing. It takes a few extra minutes, but the history doc then states only reasons you agree with.
- **B. Remove the reasons and keep only the decisions.** The doc records what was chosen, not why the alternatives lost. It's quick and safe, but later readers lose the context.
- **C. Commit the doc as written.** The reasons stay as I reconstructed them. It's fastest, but the history may state reasons you never gave.

<details open>
<summary>Compare tradeoffs</summary>

| Criterion | A. Review first | B. Decisions only | C. As written |
|---|---|---|---|
| Accuracy | ✓ Confirmed by you | ✓ Nothing unverified | ? Reasons may be wrong |
| Context for later readers | ✓ Full | ✕ Lost | △ Full but unverified |
| Your time | △ A short Review | ✓ None | ✓ None |

</details>

**Recommended: A.** History docs are what later agents trust, so the reasons should be yours; a short Review is cheap.

> **Your decision: A.** You'll review the HTML diagrams design doc in Markside after this interview, and I'll fix any reason you disagree with before committing.

### Q2. Do I fix the stale raw-HTML line in the system design now?

`docs/system-design.md:493` says "Markdown rendering disables raw HTML", but `lib/markdown.ts` sets `html: true` and DOMPurify sanitizes the output. The HTML diagrams design depends on this being described correctly.

- **A. Fix it in the same commit as the design doc.** I rewrite the line to say raw HTML is enabled and sanitized by DOMPurify, with scripts stripped. It's one line, and the docs stop contradicting the code.
- **B. Fix it when HTML diagrams are implemented.** The line is rewritten once, together with the new diagram behavior. That avoids touching the doc twice, but it stays wrong until then.

**Recommended: A.** It's a one-line correction, and agents reading the system design today get the wrong picture.

> **Your decision: A.** I'll fix the raw-HTML line in `docs/system-design.md` in the same commit as the design doc.

### Q3. Which controls do HTML diagram frames get?

Mermaid diagrams have a toolbar with expand, zoom, pan and fit. HTML diagrams are free-form pages that may scroll, have tabs, or handle clicks themselves.

- **A. Expand only.** A single button opens the diagram larger, and the diagram handles its own interaction. It stays simple and doesn't fight the diagram's own scripts, but very wide diagrams can't be zoomed.
- **B. The full Mermaid toolbar.** Expand, zoom, pan and fit work the same as for Mermaid. Diagrams feel consistent, but dragging to pan can conflict with clicks and selection inside the diagram.
- **C. No controls.** The frame shows the diagram at its natural size. It's the least work, but large diagrams are cramped in a narrow column.

<details open>
<summary>Compare tradeoffs</summary>

| Criterion | A. Expand only | B. Full toolbar | C. None |
|---|---|---|---|
| Works with interactive diagrams | ✓ No conflict | △ Pan may steal drags | ✓ No conflict |
| Large diagrams | △ Bigger, no zoom | ✓ Zoom and pan | ✕ Cramped |
| Matches Mermaid | △ Partly | ✓ Same | ✕ Different |
| Build effort | ✓ Small | △ Zoom across a frame boundary | ✓ None |

</details>

**Recommended: A.** Expand covers large diagrams without fighting the diagram's own interaction; zoom can be added later if needed.

> **Your decision: A.** HTML diagram frames get only an expand button; the diagram handles its own interaction.

### Q4. What does a whole-diagram comment quote?

Every Review Comment sent to the agent carries a `quote` and a source `line` (ADR-0008). Text comments quote the selected words. A whole-diagram comment has no selected text, so it needs something else in `quote`.

- **A. A short label.** The quote is `[HTML diagram]`, and the line points at the opening fence. Agent output stays short, and the line tells the agent exactly which block, but the quote alone doesn't identify which diagram when there are several.
- **B. The diagram's source.** The quote is the full HTML inside the fence. The agent sees exactly what was commented on, but quotes can be hundreds of lines and flood the agent's output.
- **C. The diagram's first heading or text.** The quote is the first visible text in the diagram, such as its title. It reads naturally and tells diagrams apart, but some diagrams have no text, and reading it means reaching into the frame.

<details open>
<summary>Compare tradeoffs</summary>

| Criterion | A. Label | B. Source | C. First text |
|---|---|---|---|
| Agent finds the block | ✓ Via line | ✓ Via quote and line | ✓ Via line |
| Agent output size | ✓ One line | ✕ Can be very long | ✓ One line |
| Tells several diagrams apart | △ Only by line | ✓ Yes | △ Not if no text |
| Build effort | ✓ Small | ✓ Small | △ Reads into the frame |

</details>

**Recommended: A.** The source line already identifies the block precisely; a fixed label keeps agent output short and needs nothing from inside the frame.

> **Your decision: A.** A whole-diagram comment quotes `[HTML diagram]`, with its line pointing at the opening fence.

### Q5. How does Reload Comparison show a changed diagram?

Reload Comparison diffs the rendered text block by block (`lib/reload-changes.ts`). A diagram's content lives inside its frame, so the diff can't see it word by word. Markside can still tell that a diagram's source changed.

- **A. Mark the whole diagram as changed.** A changed diagram gets the green addition outline and a small Changed label; a removed one returns as a struck-through placeholder. It's clear and cheap, but you have to remember what the old version looked like.
- **B. Show the old diagram beside the new one.** The previous version renders as a removed block next to the new one, like a rewritten paragraph that shares too little text. You can compare them visually, but it runs two frames per change and doubles the space.
- **C. Ignore diagrams in comparisons.** Diagram changes aren't highlighted at all. It's no work, but an agent's diagram edits go unnoticed during review.

<details open>
<summary>Compare tradeoffs</summary>

| Criterion | A. Mark changed | B. Old beside new | C. Ignore |
|---|---|---|---|
| You notice the change | ✓ Yes | ✓ Yes | ✕ No |
| See what changed | △ Only that it did | ✓ Both versions | ✕ No |
| Space and cost | ✓ One frame | △ Two frames per change | ✓ None |
| Fits the existing diff | ✓ Block-level mark | ✓ Matches removal plus addition | — |

</details>

**Recommended: A.** It tells you which diagram the agent changed at little cost; side-by-side can come later if you find yourself needing it.

> **Your decision: A.** Reload Comparison marks a changed diagram as a whole with an outline and Changed label; a removed one returns as a struck-through placeholder.

### Q6. Which diagram work comes first?

Two Proposed designs overlap. HTML diagrams (`2026-10-20-html-diagrams-design.md`) let agents write free-form HTML, CSS and SVG. Diagram engines (`2026-10-19-diagram-engines-design.md`, issue #1) add declarative languages such as Vega-Lite and Graphviz, and lazy-load Mermaid to cut about 6 MB from every `file://` page.

- **A. HTML diagrams first; engines wait for demand.** Build HTML diagrams now, then reply on #1 that a Vega-style chart can be drawn as an HTML diagram. It ships the feature you designed, but the issue requester may still want real Vega syntax.
- **B. Engines first, starting with Vega-Lite.** Answer #1 directly and lazy-load Mermaid at the same time. It serves the one public request and shrinks the content script, but delays the visuals you wanted.
- **C. Do only the shared groundwork first.** Build the registry of rendered fences and lazy loading that both designs need, then pick a feature. It avoids rework, but nothing visible ships for a while.
- **D. HTML diagrams, and drop the engines design.** Mark the engines design Rejected and close #1 in favor of HTML diagrams. The roadmap gets simpler, but declarative languages are easier for agents to write correctly than hand-drawn SVG charts.

<details open>
<summary>Compare tradeoffs</summary>

| Criterion | A. HTML first | B. Engines first | C. Groundwork | D. HTML, drop engines |
|---|---|---|---|---|
| Ships what you designed | ✓ Next | △ Later | △ Later | ✓ Next |
| Answers issue #1 | △ Workaround | ✓ Directly | △ Later | ✕ Closes it |
| Smaller content script | △ Later | ✓ Yes, Mermaid lazy-loaded | ✓ Yes | ✕ Not planned |
| Keeps options open | ✓ Yes | ✓ Yes | ✓ Yes | ✕ No |

</details>

**Recommended: A.** It ships the visuals you asked for and may satisfy #1 too; engines stay available if the requester or others still want declarative syntax.

> **Your decision: A.** HTML diagrams come first; the engines design waits for demand, and I'll reply on #1 that Vega-style charts can be drawn as HTML diagrams.

### Q7. What happens to Web Preview?

Web Preview (`2026-10-19-web-preview-design.md`) would render a Markdown file opened over `http(s)`, such as a `raw.githubusercontent.com` README, read-only. It runs only when you ask, from the popup or a shortcut (suggested ⌥⇧M), using `activeTab` so there's no new install-time permission warning.

- **A. Defer it.** Keep the design as Proposed and revisit after HTML diagrams and the release. Focus stays on agent review, but people who want to read Markdown on the web wait.
- **B. Approve it and build it after HTML diagrams.** It's queued as the next feature. It widens Markside's audience to web readers, but it doesn't help the agent-review workflow.
- **C. Drop it.** Mark the design Rejected because Markside stays a local workspace. The roadmap gets simpler, but the design work is shelved.

<details open>
<summary>Compare tradeoffs</summary>

| Criterion | A. Defer | B. Approve, build next | C. Drop |
|---|---|---|---|
| Helps agent review | — | ✕ No | — |
| Wider audience | △ Later | ✓ Yes | ✕ No |
| Roadmap focus | ✓ Unchanged | △ Adds a feature | ✓ Simpler |
| Keeps the option | ✓ Yes | ✓ Yes | ✕ No |

</details>

**Recommended: A.** It doesn't serve the agent-review audience Markside is focused on, and nothing is lost by keeping the design until there's demand.

> **Your decision: A.** Web Preview stays Proposed and is revisited after HTML diagrams and the release.

### Q8. When does the next release ship, and with what agent-loop status?

About 56 commits of agent Review loop and interview work are on `main`, unreleased; the version is still 1.6.0. The extension's side of the loop works on its own, but agents need the `markside` CLI, which isn't on npm yet (`npm view markside` returns 404). Today users install it from a checkout of the repo, and `PRODUCT.md` calls the loop a "local prototype requiring separate CLI setup".

- **A. Release 1.7.0 now; the loop stays a prototype.** Ship the extension as it is, and leave the CLI to be installed from the checkout. Users get the improvements now, but few can actually use the loop.
- **B. Publish the CLI to npm, then release 1.7.0 with the loop as Beta.** Agents can run `npx markside`, and `PRODUCT.md` moves the loop to Beta. The loop becomes usable by anyone, but it adds an npm release and its docs before shipping.
- **C. Wait and release together with HTML diagrams.** One bigger 1.7.0 later. There's one announcement, but finished work sits unreleased for longer.

<details open>
<summary>Compare tradeoffs</summary>

| Criterion | A. Now, prototype | B. CLI on npm, Beta | C. Wait for diagrams |
|---|---|---|---|
| Time to ship | ✓ Now | △ After an npm release | ✕ After diagrams |
| Users can run the loop | ✕ Need a repo checkout | ✓ `npx markside` | △ Depends on CLI |
| Extra work | ✓ None | △ npm publish and docs | ✓ None now |
| Risk | ✓ Small release | △ New public package to maintain | △ Bigger release |

</details>

**Recommended: B.** The loop and interviews are the main things in this release, and they're only useful if agents can get the CLI; publishing it is a small step.

> **Your decision: B.** Publish the `markside` CLI to npm, then release 1.7.0 with the agent Review loop marked Beta in `PRODUCT.md`.

### Q9. What happens to the Mermaid look-and-feel fix?

In the diagrams interview you said Mermaid's problem was what it can't express, not how it looks, and that a theme fix (colors, fonts, spacing) "can still happen separately". Nothing is planned for it yet.

- **A. Drop it unless someone asks.** HTML diagrams cover the visuals you want, and Mermaid keeps its current theme. No work, but Mermaid diagrams keep their default look.
- **B. Do a small theme pass after HTML diagrams.** Match Mermaid's fonts and colors to Markside's typeface and theme. Mermaid diagrams look native, but it's another task on the list.
- **C. Do it now, before HTML diagrams.** A quick visible improvement ships in 1.7.0. Mermaid looks better sooner, but it delays the main diagram work.

**Recommended: A.** You found no real complaint about Mermaid's look, and HTML diagrams cover the visual need.

> **Your decision: A.** Mermaid keeps its current look unless someone asks for a theme fix.
