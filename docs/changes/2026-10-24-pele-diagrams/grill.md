# Rendering Mermaid diagrams with Pele

## Confirmed details

These details were inferred by the agent and confirmed when the reviewer finished the Review.

- Switching between light and dark changes diagram colors without redrawing, so a zoomed or panned diagram keeps its view.
- A diagram Pele cannot read shows the existing error block with Pele's message, including the line and column.
- Pie charts, XY charts, and other charts keep Pele's own series colors in light and dark themes.
- Fences stay `mermaid`, and the user guide and store listing still call them Mermaid diagrams.
- Animated edges stop moving when the system's reduce-motion setting is on.
- Markside starts on Pele 1.9.0. The agent drafts the upstream report for animated edges and asks before posting it.

## Question history

### Q1. What prompted the switch to Pele?

> **Your decision: C.** Size, speed, and appearance are equal goals; a regression in any counts against the switch.

Markside renders Mermaid fences with the Mermaid library today. The spike on
`spike/pele-mermaid` swapped in Pele, which reads the same syntax. It measured
the production content script at 4.9 MB instead of 7.2 MB, rendered 14 sample
diagrams in 32 ms instead of 214 ms, and drew them in Markside's font and
palette instead of Mermaid's purple theme. The content script loads on every
matched `file://` page, including `.json`, `.txt`, and `.log`.

- **A. Size and speed.** Every file opens with 2.3 MB less script and diagrams appear sooner. Appearance would be a side benefit, not a goal.
- **B. Appearance.** Diagrams should look like part of the document, in its font and colors. Size and speed would be side benefits.
- **C. Both, equally.** Size, speed, and appearance all matter. A regression in any of them would count against the switch.

**Recommended: C.** The spike improved all three, and treating them as goals lets the spec reject a change that wins one by losing another.

### Q2. What did your checks of the spike find?

> **Your decision: B.** Some gaps must be fixed in Markside or upstream before switching, and the spec lists them as requirements.

You checked which Mermaid features Pele parses but does not draw, PDF Export,
copying a rendered diagram, Question Card diagrams, Review comments on diagram
text, and the oversized compact diagrams. Before this round, only one gap was
known: animated edges, which the spike now draws with a Markside workaround.

- **A. Nothing blocks the switch.** The gaps found are minor or already worked around. The spec can treat Pele as a full replacement.
- **B. Gaps need fixes first.** Some Mermaid features or Markside behaviors must be fixed in Markside or upstream before switching. The spec lists them as requirements.
- **C. Something blocks a full switch.** At least one diagram type or behavior cannot work under Pele. Mermaid would have to remain for those cases.

**Recommended: B.** Animated edges show that Pele can parse syntax it does not draw, so more fixes are likely; please list what you found in your answer.

### Q3. Does Mermaid stay in Markside at all?

> **Your decision: A.** Remove Mermaid entirely; anything Pele cannot draw shows the existing error block.

Pele targets Mermaid 12.1 syntax and threw no errors on the 14 diagram types
tried, but it does not support every Mermaid feature, and ZenUML is not built
into either. An earlier design found that Parcel's on-demand chunks fail to
load on `file://` pages, so keeping Mermaid as a fallback means either loading
it with every file or solving on-demand loading first.

~~~mermaid
flowchart LR
  F[Mermaid fence] --> P{Pele renders it?}
  P -->|yes| S[SVG in Preview]
  P -->|no| E[Error block today]
~~~

- **A. Remove Mermaid entirely.** Pele renders every Mermaid fence, and anything it cannot draw shows the existing error block. Markside drops the 6.4 MB Mermaid bundle, but diagrams that Mermaid alone supports stop rendering.
- **B. Keep Mermaid as an on-demand fallback.** When Pele fails, Markside loads Mermaid and tries again. Nothing that renders today breaks, but it depends on on-demand loading that has not worked on `file://` pages yet.
- **C. Keep Mermaid bundled as a fallback.** Mermaid stays in the content script and renders whatever Pele cannot. Nothing breaks, but the size savings are lost.

**Recommended: A.** Mermaid-only diagrams are rare in agent-written documents, and the error block still shows their source; B can follow later if users report gaps.

#### Compare tradeoffs

| Criterion | A. Remove | B. On-demand fallback | C. Bundled fallback |
|---|---|---|---|
| Content script size | ✓ 4.9 MB | ✓ 4.9 MB | ✕ about 7.2 MB |
| Diagrams that render today keep rendering | △ Only what Pele supports | ✓ All | ✓ All |
| Implementation risk | ✓ Low | ? On-demand loading unproven on `file://` | ✓ Low |
| Two engines to maintain and theme | ✓ No | ✕ Yes | ✕ Yes |

### Q4. Which gaps did your checks find?

> **Your decision: A.** Only animated edges and oversized compact diagrams need fixes; everything else checked works under Pele.

Q2 (some gaps must be fixed before switching) needs the list. Two gaps were
already known from the spike: Pele does not draw animated edges, which the
spike now handles with a Markside workaround, and Markside's fit-to-width step
scales compact Pele diagrams up to 3.5×, so a small sequence diagram gets huge
text. Your checks also covered PDF Export, copying a rendered diagram,
Question Card diagrams, Review comments on diagram text, and other Mermaid
features Pele may ignore.

- **A. Only the two known gaps.** Animated edges and oversized compact diagrams are the only fixes needed. Everything else you checked works under Pele.
- **B. The known gaps plus others.** Your checks found more problems. Use the tile to list them, with the diagram or feature where each appears.

**Recommended: B.** Your answer to Q2 suggests more than the known gaps; listing them now puts each one in the spec as a requirement.

### Q5. How should Markside handle Mermaid features Pele parses but does not draw?

> **Your decision: A.** Work around gaps in Markside, report them upstream, and remove each workaround once Pele draws the feature.

Animated edges are the first example: Pele reads `e1@{ animate: true }` but
draws a plain line. The spike adds the animation in Markside by reading the
same lines from the diagram source and marking the matching edges. Pele is
three weeks old, has shipped 14 releases, and is actively maintained.

- **A. Work around in Markside and report upstream.** Markside fills each gap itself and files an issue or pull request on Pele, then removes the workaround once Pele draws the feature. Users get the feature now, at the cost of some temporary code.
- **B. Report upstream only.** Markside ships without the feature and waits for Pele to draw it. There is no duplicate code, but those diagrams look wrong until Pele catches up.
- **C. Work around in Markside only.** Markside fills gaps itself without involving Pele. Nothing waits on another project, but the workarounds may never be removable.

**Recommended: A.** Users keep what renders today, and the upstream report gives each workaround a way to be removed.

### Q6. How should diagrams look inside a Question Card?

> **Your decision: A.** Card diagrams use the same palette as other diagrams, keeping natural size and the Expand-only control.

Today a diagram in a Question Card, or in an archived question, only explains
the choice: it uses Mermaid's neutral gray theme in light mode, stays at its
natural size, and shows only the Expand control until expanded. Pele has no
named themes. The spike colors every diagram from Markside's palette through
Pele's color settings, so card diagrams already look gray, with Markside's
accent color for highlighted elements.

- **A. Same colors as other diagrams.** Card diagrams use the same palette as the rest of the document, and keep their natural size and Expand-only control. There is one look to maintain.
- **B. A quieter palette inside cards.** Markside overrides Pele's colors inside cards, for example removing the accent color. Card diagrams stay visually secondary, at the cost of a second set of colors.

**Recommended: A.** The Markside palette is already close to Mermaid's neutral theme, and the natural size and Expand-only control keep card diagrams secondary.

### Q7. How should Markside include Pele in its build?

> **Your decision: A.** Import Pele directly and drop Mermaid from ADR-0001.

ADR-0001 requires Shiki, Mermaid, and CodeMirror to be bundled separately with
esbuild, because Parcel cannot reliably bundle them, and forbids importing them
directly. In the spike, Parcel bundled Pele directly with no errors, and Pele
uses no `eval`, so it runs in the extension's content script.

- **A. Import Pele directly and update ADR-0001.** Pele is an ordinary dependency, and ADR-0001 drops Mermaid from its list. The build has one fewer separate bundle step.
- **B. Bundle Pele separately like Mermaid.** A new esbuild script produces a Pele bundle, and ADR-0001 swaps Mermaid for Pele. This matches the existing pattern but adds a build step Parcel does not need.

**Recommended: A.** ADR-0001 exists for dependencies Parcel cannot bundle, and the spike shows Pele is not one of them.

### Q8. How should Markside take Pele updates?

> **Your decision: A.** Pin an exact Pele version and upgrade deliberately with tests and manual diagram checks.

Pele shipped 14 releases in its first two and a half weeks, and its release
notes add new syntax often. A new release could change how existing diagrams
look or which ones render.

- **A. Pin an exact version and upgrade deliberately.** Each upgrade is a commit that runs the tests and the diagram checks in the manual test. Fixes arrive only when someone upgrades.
- **B. Accept minor releases automatically.** The dependency range allows any 1.x release. Fixes arrive with the next install, but so can changes in appearance.

**Recommended: A.** Diagram appearance is a goal from Q1 (size, speed, and appearance count equally), so changes to it should be reviewed.

### Q9. What happens to the proposed design for other diagram engines?

> **Your decision: A.** The Pele spec supersedes only the Mermaid part of the other-engines design, which stays proposed.

The proposed "Diagram engines beyond Mermaid" design would load each engine
only when a page needs it, and move Mermaid to that path to cut about 6 MB.
Q3 (remove Mermaid entirely) already removes Mermaid's 6.4 MB bundle, so that
part of the design is no longer needed. Its plans for Vega-Lite, Graphviz, and
PlantUML are unaffected.

- **A. The new spec replaces only its Mermaid part.** The Pele spec says it supersedes Mermaid's move to on-demand loading. The other-engines design stays proposed for future engines.
- **B. Merge Pele into that design.** The other-engines design is rewritten around Pele. There is one design for diagrams, but it mixes a decided change with unrequested engines.

**Recommended: A.** It keeps a decided change separate from engines nobody has asked for yet.

### Q10. How large should a compact diagram appear in the document?

> **Your decision: A.** Inline diagrams are never enlarged beyond natural size; wide ones still shrink to fit.

Today Markside enlarges a diagram that is narrower than the text column, up to
3.5×, until it nearly fills the column. Mermaid drew small text, so the
enlargement made labels readable. Pele draws labels at 14–16 px, close to body
text, so enlarging a small Pele diagram makes its labels several times larger
than the surrounding text. Wide diagrams are still shrunk to fit, and Expanded
view still fills the screen.

~~~mermaid
flowchart LR
  D[Diagram at natural size] --> W{Narrower than the column?}
  W -->|yes| E[Enlarged up to 3.5× today]
  W -->|no| S[Shrunk to fit]
~~~

- **A. Never enlarge inline diagrams.** A diagram narrower than the column stays at its natural size, so labels match body text. Small diagrams leave empty space beside them.
- **B. Enlarge up to a small limit.** Markside still enlarges compact diagrams, but at most about 1.5×, so labels stay close to body text. Small diagrams fill more of the column, with somewhat larger labels.

**Recommended: A.** Labels already match body text at natural size, and Expanded view remains available for a closer look.
