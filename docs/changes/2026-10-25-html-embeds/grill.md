# Grill: HTML embeds and the explain workflow

## Confirmed details

These details were inferred by the agent and confirmed when the reviewer finished the Review.

- Image syntax becomes an embed only when the path ends in `.html`. An embed whose file is missing or unreadable shows an error block naming the path, like a Mermaid diagram that cannot render.
- A topic explanation keeps its HTML in `<topic>.explain.assets/`, following the `<doc-name>.assets/` convention.
- After "explain X in Markside", the agent opens the doc and waits for Review Comments, the same as `/markside review`, until you finish the Review.
- Editing only an HTML file shows up after you Reload the doc; Markside does not watch embedded files.
- The Link Snapshot check no longer counts embeds as missing local images, since their HTML travels in the Snapshot.

## Question history

Q1–Q3 were settled in chat on 2026-10-25. Their records summarize that conversation rather than quoting its original wording.

### Q1. What prompted the change?

> **Your decision:** An explain workflow for Markside, prompted by [Andrej Karpathy's post](https://x.com/karpathy/status/2053872850101285137) recommending that agents answer in HTML viewed in the browser, rather than Markdown.

The post argues that visual output beats text for people, that HTML is becoming the new default after Markdown, and that people need to point at things on screen while working with an agent. The agent noted that Review Comments already provide that pointing, which a standalone HTML file viewed in the browser does not.

### Q2. What is the core experience?

> **Your decision (proposed by the agent, not contested):** Read, point, and revise on one document. The agent writes a visual explanation, the user comments where it is unclear, the agent revises it in place, and Reload Comparison shows what changed.

The narrative stays Markdown so Review Comments can anchor to its text (ADR-0005). HTML supplies the visuals Markdown cannot.

### Q3. Where does the HTML live?

> **Your decision:** In a separate file that the Markdown references by relative path, rendered in place when Markside renders the Markdown.

The options discussed were HTML inline in the `.md` (the superseded `html render` fence), a link that opens the HTML file outside Markside, and a referenced file rendered in place. A plain link was rejected because the HTML would open outside Markside, without Review Comments or Reload Comparison. Separate files keep the Markdown readable in Source view and diffs, let the agent edit visuals and text independently, and leave each HTML file viewable on its own. This reverses the superseded design's rejection of separate HTML files. Rendering reads the file through the existing local-file relay and loads it into the same sandboxed `srcdoc` frame, so Markside can still inject the network-blocking policy and the sizing script.

### Q4. What does this change cover?

> **Your decision: A.** One spec covers rendering referenced HTML files and the explain workflow. You noted it may not need a `/markside explain` command and asked for help choosing the interaction, which is now its own question.

The chat settled that HTML lives in separate files and that an explain workflow is the motivating use. The capability and the workflow could ship together or one after the other.

- **A. Embeds and the explain workflow together.** One spec covers rendering referenced HTML files and the `/markside explain` workflow that uses them. The first release delivers the whole experience, but the spec is larger.
- **B. Embeds first, explain later.** This spec covers only rendering referenced HTML files, and explain gets its own change afterward. Each spec stays small, but the motivating experience waits for a second change.
- **C. Explain first with today's rendering.** Ship explain now using Mermaid, tables, and inline SVG, and add embeds in a later change. Users get explain sooner, but its first version has no interactive visuals.

**Recommended: A.** Explain is the reason for embeds, and designing them together keeps embed decisions grounded in a real workflow.

### Q5. Do inline `html render` fences stay as a second form?

> **Your decision: A.** HTML always lives in its own file; there are no inline `html render` fences.

The superseded design put HTML inside the `.md` in an ```` ```html render ```` fence. Both forms could share one sandboxed frame and differ only in where the source comes from.

- **A. Referenced files only.** HTML always lives in its own file. There is one way to write an embed, but a tiny diagram still needs a separate file.
- **B. Both referenced files and inline fences.** Small diagrams can stay inline and large ones live in files. Authors get flexibility, but Markside and the skill document two forms.

**Recommended: A.** One form is simpler to build, explain, and review; add inline fences later if small diagrams prove awkward.

### Q6. How does the Markdown reference an HTML file?

> **Your decision: A.** An embed is written with image syntax, such as `![Request flow](./explain/request-flow.html)`.

The syntax decides what readers see in other Markdown tools, such as GitHub, and whether ordinary links to HTML files change meaning.

- **A. Image syntax: `![Request flow](./explain/request-flow.html)`.** Markdown already reads this as "embed this resource", and ordinary links stay links. Other tools show a broken image with the alt text.
- **B. A fence naming the file: ```` ```html render src="./request-flow.html" ````.** The embed is explicit and cannot be confused with an image. Other tools show the fence as a code block with no link to the file.
- **C. Wikilink embed: `![[request-flow.html]]`.** It matches Obsidian's embed convention, and Markside already resolves wikilinks. Tools without wikilink support show the literal brackets.

**Recommended: A.** It is standard Markdown, needs no new syntax, and its alt text doubles as the diagram's text description.

### Q8. How does Reload Comparison show a changed embed?

> **Your decision: B.** An embed shows as changed only when its reference line in the Markdown changes.

When the agent edits only the `.html` file, the Markdown diff is empty. The user would reload and see no marked changes.

- **A. Compare embedded file contents.** Markside keeps the previous content of each embedded file and marks an embed whose file changed with the addition outline and a Changed label. Changes are visible, but each Reload reads every embedded file.
- **B. Compare the Markdown only.** An embed shows as changed only when its reference line changes. Reload stays simple, but visual changes go unmarked.

**Recommended: A.** In the explain loop most revisions may land in the HTML, and unmarked changes defeat Reload Comparison.

### Q9. What does a Review Comment on an embed record?

> **Your decision: A.** A Review Comment on an embed records the file path as its quote, such as `[HTML: explain/request-flow.html]`.

The superseded design commented on a whole diagram and recorded the fixed quote `[HTML diagram]` with the line of its fence.

- **A. Record the file path.** The quote is `[HTML: explain/request-flow.html]` and the line points at the reference. The agent knows which file to edit without reading the Markdown.
- **B. Keep the fixed label.** The quote is `[HTML diagram]` and the line points at the reference. Output stays uniform, but the agent must look up the line to find the file.

**Recommended: A.** The path is short and tells the agent exactly what to change.

### Q10. Which relative paths may an embed reference?

> **Your decision: A.** An embed may reference any relative path, like images do, including `../` paths.

Relative image and document links already resolve against the current file, including `../` paths. Embeds run in a sandboxed frame with the network blocked.

- **A. Any relative path, like images.** `../shared/diagram.html` works. Embeds behave like every other relative reference, but an explanation can depend on files outside its folder.
- **B. The document's folder and its subfolders only.** Paths with `../` show an error. Explanations stay self-contained, but embeds follow a different rule from images.

**Recommended: A.** Matching image behavior avoids a special case, and the sandbox already prevents an embed from sending anything.

### Q11. Which decisions from the HTML diagrams interview carry over?

> **Your decision: A.** The new spec adopts the other HTML diagrams decisions unchanged.

That interview also decided: scripts run with every network request blocked; embeds style themselves with no theme variables; comments apply to the whole embed; the only control is Expand; Split rebuilds only changed embeds; and there is no new size limit, with agents told to avoid pasted libraries.

- **A. Carry all of them over.** The new spec adopts those decisions unchanged. The interview stays short, but none of them is reconsidered for separate files.
- **B. Revisit some.** Name the ones to reopen in your answer, and they become new questions. Each gets a fresh look, at the cost of a longer interview.

**Recommended: A.** None of those decisions depends on where the source lives.

### Q7. What do shared Snapshots show for an embed?

> **Your decision: A.** Both Link and Hosted Snapshots carry the referenced HTML in the envelope, and the existing size warning and limit apply.

A Snapshot is one compressed envelope, not a file. Today it holds the document's filename, its Markdown, and, when present, its Review rounds. A Link Snapshot carries the envelope in the URL; a Hosted Snapshot encrypts the same envelope and uploads it. To include embeds, Markside would add one more part: each referenced path paired with that file's HTML. The viewer then fills each embed from that part instead of reading a local file.

~~~mermaid
flowchart LR
  subgraph Envelope
    F[filename]
    M[Markdown]
    R[Review rounds]
    E["embedded files: path → HTML"]
  end
  Envelope --> L[Link Snapshot: in the URL]
  Envelope --> H[Hosted Snapshot: encrypted upload]
~~~

HTML is much larger than prose. A Link Snapshot is comfortable at about 2,000 URL characters, and chat clients break links past about 4,000, so most explanations with embeds would exceed what a link can carry and the sender would pick a Hosted Snapshot.

- **A. Add the embedded files to the envelope for both kinds.** Both kinds carry the referenced HTML, and the existing size warning and limit apply. Recipients see what the author saw, but most Link Snapshots with embeds would trigger the size warning.
- **B. Include embeds only in Hosted Snapshots.** Hosted Snapshots carry the referenced HTML; Link Snapshots show the alt text where each embed was. Links stay short, but the two kinds show different content for the same document.
- **C. Show a placeholder in both kinds.** Snapshots show the alt text where each embed was, and the envelope stays unchanged. Sharing needs no new work, but shared explanations lose their visuals.

**Recommended: A.** One rule for both kinds keeps shared content identical to the author's view, and the existing size warning already steers large documents toward a Hosted Snapshot.

#### Compare tradeoffs

| Criterion | A. Both kinds | B. Hosted only | C. Placeholder |
|---|---|---|---|
| Recipient sees the visuals | ✓ Always | △ Hosted only | ✕ Never |
| Link length | △ Usually over the warning | ✓ Unchanged | ✓ Unchanged |
| Envelope format changes | Yes | Yes | No |

### Q12. How does the user ask for an explanation?

> **Your decision: A.** The user asks in words, such as "explain X in Markside", and the `markside` skill writes the explanation, opens it, and starts the Review loop.

Q2 decided the core experience: the agent writes a visual explanation, the user comments where it is unclear, and the agent revises it in place. The existing `/markside review <file>` already runs the comment-and-revise loop on any Markdown file. The question is how the user starts it, and whether anything beyond embed guidance is needed.

~~~mermaid
flowchart LR
  Ask[User asks about something] --> Write[Agent writes .md with embeds]
  Write --> Open[Opens in Markside]
  Open --> Comment[User comments where unclear]
  Comment --> Revise[Agent revises in place]
  Revise --> Comment
~~~

- **A. Ask for it in words: "explain X in Markside".** The `markside` skill recognizes the request, as it does for "interview me in Markside", writes the explanation, opens it, and starts the Review loop. There is no command to learn, but the request has to mention Markside.
- **B. A `/markside explain <topic>` command.** The user runs a dedicated command that writes the explanation, opens it, and starts the Review loop. It is explicit and easy to document, but it is one more command, and it overlaps with asking in words.
- **C. No explain workflow, only embed guidance.** Agents learn to use embeds whenever they write a doc, and the user runs `/markside review <file>` on any doc they want to discuss. Nothing new to learn, but the user must ask for a doc and start a Review as two separate steps.

**Recommended: A.** It matches how interviews already start in Markside and puts the whole loop behind one natural request; `/markside explain` can be added later if users look for a command.

#### Compare tradeoffs

| Criterion | A. Ask in words | B. Command | C. Guidance only |
|---|---|---|---|
| Steps for the user | ✓ One request | ✓ One command | △ Ask, then start a Review |
| Something new to learn | ✓ Nothing | △ A new command | ✓ Nothing |
| Matches existing Markside patterns | ✓ Like interviews | △ New subcommand | ✓ Existing Review |

### Q13. Where does the guidance for writing embeds live?

> **Your decision: A.** Embed guidance lives only in the `markside` skill, beside the explain steps.

Q12 decided that "explain X in Markside" runs through the `markside` skill, so the explain steps live there. Agents also need to know how to write embeds: when to use one instead of Mermaid, how to name the files, and to write plain HTML, CSS, and SVG without pasted libraries. The `markside` skill only loads when the user mentions Markside.

- **A. Only in the `markside` skill.** Embed guidance sits beside the explain steps. There is one skill to install and maintain, but agents writing an ordinary doc, such as a spec, never learn about embeds.
- **B. In the `markside` skill and a separate `markside-diagram` skill.** The explain steps point to a diagram skill that also loads whenever an agent writes a Markdown doc that needs a visual. Every doc can use embeds, but there are two skills to install.

**Recommended: B.** Embeds are useful in any doc, not only explanations, and a skill that triggers on writing docs is the only way agents will reach for them unprompted.

### Q15. How does the user see which visuals changed after a revision?

> **Your decision: A.** Q8's rule stays; when the agent addresses a comment, its reply names each HTML file it changed.

Q8 decided that an embed shows as changed only when its reference line in the Markdown changes. Q2 decided that Reload Comparison shows what changed in the read, point, and revise loop. In that loop most revisions may change only an HTML file, so after Reload the user would see no marked change on the visual they commented on.

- **A. Keep Q8's rule; the agent names changed visuals in its reply.** When the agent addresses a comment, its one-line reply names each HTML file it changed. Markside stays simple, but the user learns what changed from the comment reply rather than from the document.
- **B. Revisit Q8: compare embedded file contents.** Markside keeps each embedded file's previous content and marks a changed embed with the addition outline and a Changed label. The document shows every change, but each Reload reads every embedded file.

**Recommended: A.** Comments on a visual already get a reply from the agent, so naming the changed file there costs nothing and keeps Reload Comparison unchanged.

### Q14. Where do a doc's HTML files go?

> **Your decision: A.** A doc's HTML files go in a `<doc-name>.assets/` folder beside it, such as `spec.assets/request-flow.html`.

Embeds are not only for explanations: any doc, such as a `spec.md` or a `<topic>.grill.md`, can reference HTML. The HTML should sit in the same folder as its doc and share its name, so the pair is easy to find, move, commit, or delete together. Q10 (any relative path works) means this is a convention the skill teaches, not a rule Markside enforces.

- **A. A `<doc-name>.assets/` folder beside the doc.** `spec.md` gets `spec.assets/request-flow.html`. The suffix describes any supporting file, and Typora uses the same convention for images, but the name does not say the files are HTML.
- **B. A `<doc-name>.md.explain/` folder beside the doc.** `spec.md` gets `spec.md.explain/request-flow.html`. The name ties the folder to its exact file, but "explain" is misleading for a spec or interview, and the double extension looks like a file.
- **C. Files beside the doc with its name as a prefix.** `spec.md` gets `spec.request-flow.html` in the same folder. There is no extra folder, but several visuals crowd the doc's folder.

**Recommended: A.** It names the folder after the doc without implying a purpose, and an existing editor convention makes it familiar.

#### Compare tradeoffs

| Criterion | A. `spec.assets/` | B. `spec.md.explain/` | C. `spec.request-flow.html` |
|---|---|---|---|
| Fits any kind of doc | ✓ | ✕ Says "explain" | ✓ |
| Keeps the doc's folder tidy | ✓ One folder | ✓ One folder | △ One file per visual |
| Familiar convention | ✓ Typora | ✕ New | △ |

### Q16. Where does an explanation go when the user asks to explain something?

> **Your decision: B.** Explaining an existing doc adds embeds and wording to that doc; a topic with no doc gets `<topic>.explain.md` at the repository root.

Q12 decided the user asks in words, such as "explain X in Markside". X may be an existing doc, such as `docs/spec.md`, or a topic with no doc, such as how saving works. Interviews leave the subject file unchanged and write a sibling `<doc>.grill.md`, or `<topic>.grill.md` at the repository root.

- **A. A new sibling doc, like interviews.** Explaining `docs/spec.md` writes `docs/spec.explain.md`; explaining a topic writes `<topic>.explain.md` at the repository root. The subject stays unchanged, but the explanation is one more file to delete or commit.
- **B. Add visuals to the existing doc; a new doc only for topics.** Explaining `docs/spec.md` adds embeds and wording to the spec itself; a topic still gets `<topic>.explain.md` at the root. No extra file, but explaining a doc changes it, and the user may not want that.

**Recommended: A.** Asking for an explanation should not edit the thing being explained; the user can ask to fold visuals into the doc afterward.
