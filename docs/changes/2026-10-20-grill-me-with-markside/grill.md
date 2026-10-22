# Grill: a better grill-me experience in Markside

**Feature under design:** improve the experience of running a grill-me style interview (one question at a time, each with a recommended answer) through Markside Review instead of in chat.

**How to answer:** comment on the current question (select text → comment), or use the Review Note. Then click **Send review to agent**. Agree with the recommendation by replying "yes" or something similarly short.

## Summary: ready to finish?

No questions are open. Here is the shared understanding as I have it:

- **Shape.** One question per round, each with options and a recommendation. The current question sits on top. Answered questions keep their full text plus a **Your decision** block. (Q1, layout)
- **Syntax.** `> [!QUESTION]` blocks with `**A.**` options and a `**Recommended: X.**` line. (Q3)
- **Answering.** Markside renders the cards with Accept recommendation, an option button for each choice, and a free-text answer, all sent as normal Review Comments with no contract change. (Q2)
- **Ending.** Finish review is your confirmation that shared understanding is reached. (Q4) When every comment is Addressed or Resolved, the button becomes **Resolve N and finish**. (Q8)
- **Agent side.** A generic ask-in-Markside section in the markside skill, triggered by "in Markside", for example `/grill-me <topic> in Markside` or mid-chat. Grill-me still decides what to ask. (Q5, Q6)
- **Location.** A sibling `<subject>.grill.md`, or `GRILL-<topic>.md` at the repo root. Durable decisions go wherever the questioning skill puts them. (Q7)
- **Freshness.** After Send, a bounded check re-reads the sidecar and shows **Agent replied: Reload**, as a third ADR-0002 exception. (Q9)
- **Order.** Ship the skill section, Resolve N and finish, and the post-Send check first. Question cards come last. (Q10)

If this matches your understanding, resolve the remaining comment and click **Finish review**. That's my go-ahead (Q4). If anything is off, comment on it instead.

## Answered questions

### Q1. What is one turn of the interview in Markside?

When a grilling session runs through Markside, what does each round trip contain?

- **A. One question per Review round.** The agent appends one question with its recommendation. You answer it, and the agent records the decision and asks the next question in the same doc. The doc grows into a decision log.
- **B. The whole decision tree up front.** The agent writes every question it can foresee. You answer them in any order in a single Review, and the agent asks follow-ups for whatever is left.
- **C. Hybrid.** The agent asks one question at a time but shows the rest of the expected tree below it, read-only, so you can see where the interview is going.

**Recommended: A.** Grill-me's value comes from resolving dependencies in order. Later questions depend on earlier answers, so a tree written up front (B) goes stale after the first answer. Option C invites you to jump ahead and makes the agent maintain a speculative tree. With A, each round costs one Send, but in exchange the doc becomes the shared-understanding artifact that chat never produces.

> **Your decision: A.** You accepted the recommendation.

### Q2. How do you answer a question?

Answering Q1 took three steps: select "Recommended: A", type an agreement, and click Send. Most grill-me answers are either "yes, take the recommendation" or a short override. What answer mechanism should the feature provide?

- **A. Keep generic Review Comments.** Nothing new. Answers are comments plus Send, as they are today. The only work is better instructions in the doc.
- **B. Answer controls on the question.** The agent writes questions in a recognizable Markdown shape (heading, options, a **Recommended** line). Markside renders **Accept recommendation**, a button for each option, and a free-text answer box. Each control creates the Review Comment and sends it in one action.
- **C. Edit the doc directly.** You type your answer under the question in Source or Split view and save. The agent reads the diff.

**Recommended: B.** Accepting a recommendation should take one click. With A, every round costs a selection, typing, and Send, which makes the interview tedious in a way chat isn't. C conflicts with Review's contract that the reviewed content stays unchanged, and the agent would have to diff prose to find your answer. B reuses the existing Review Comment and send handoff, so the CLI and the review.json contract stay the same. The only new pieces are recognizing the question shape and the controls.

> **Your decision: B.** You accepted the recommendation and asked how Markside would render the controls, which became Q3.

### Q3. How does the agent mark a question so Markside can render controls?

Markside renders Markdown with markdown-it. It already rewrites GFM alerts (`> [!NOTE]`) into styled cards with a core rule (`lib/markdown.ts:177`). Code blocks get buttons that the content script enables after render (`lib/markdown.ts:63`). A question card would follow the same pattern: a markdown-it rule turns the marked block into a card, and the content script wires its buttons to the Review composer. The decision is which source syntax the agent writes:

- **A. Alert-style blockquote.** `> [!QUESTION]` followed by the question, a list of `**A.**` options, and a `**Recommended: X.**` line, all inside the blockquote. This reuses the alert rule's approach. Other viewers show it as a plain blockquote with a visible `[!QUESTION]` tag.
- **B. Fenced block.** A ` ```markside-question ` fence containing YAML (id, prompt, options, recommended, rationale). Parsing is exact, but GitHub and every other viewer show raw YAML, and the doc stops reading like prose.
- **C. Heuristic, no marker.** Markside detects any heading followed by lettered options and a "Recommended:" line, like the questions in this doc. You need no special syntax, but plain docs may get false positives.
- **D. HTML comment marker.** `<!-- markside:question -->` precedes ordinary Markdown. The marker is invisible elsewhere and the opt-in is explicit, but the boundaries of the question are implicit.

**Recommended: A.** It is an explicit opt-in, so plans that happen to contain lettered lists won't sprout buttons (C's risk). It stays readable as prose in git diffs and on GitHub (B's cost). The blockquote gives the question clear boundaries (D's weakness), and markdown-it already has the pattern. The option letter becomes the answer value, and the comment's quote is the question heading. An agent reading review.json therefore sees `Q3 → A` with no new fields.

> **Your decision: A.** You accepted the recommendation.

### Q4. Does a grilling session need anything beyond Finish review to end?

With the other session's fix, a Review stays active until you click **Finish review**, and that click is unrelated to the doc's content. Grill-me requires the agent not to act until you confirm shared understanding. Should the feature add question-aware lifecycle on top?

- **A. Finish review is the confirmation.** No question-aware lifecycle. When the agent believes the interview is complete, it says so in its last reply and appends a summary of decisions. Clicking Finish review means "shared understanding reached, go ahead." If you click Finish while a card is unanswered, the interview stops there, just like saying "stop" in chat.
- **B. Finish review plus a guard.** While the doc contains an unanswered `[!QUESTION]` card, the panel shows "Q4 is waiting on your answer" above Finish review and jumps to the card on click. Finish still works, so the guard only warns.
- **C. A dedicated final confirmation card.** The agent ends with a `[!QUESTION]` card asking "Shared understanding reached?". Accepting it is the go-ahead, and Finish review just closes the Review.

**Recommended: A.** The other session already gave you an explicit end action, and it maps directly onto grill-me's confirmation rule. B couples the panel's lifecycle UI to doc parsing for a warning you're unlikely to need, because a pending answer card is already the most visible thing on the page (Q2). C makes you confirm twice.

> **Your decision: A.** You accepted the recommendation.

### Q5. How does the agent learn to run an interview in Markside?

Today you invoked grill-me and the markside skill together. I improvised the doc shape, and nothing told me to use `[!QUESTION]` cards. Grill-me belongs to Matt Pocock, so Markside can't change it. Where does the "ask questions in Markside" behavior live?

- **A. A generic section in the markside skill.** It covers asking questions through Markside. When the user wants another skill's questions answered in Markside (grill-me, interview-me, or "ask me in Markside"), the agent writes a doc with the current question on top and `[!QUESTION]` cards, runs the existing review loop, and records answers as described above. The other skill still decides what to ask, and Markside decides how it's asked.
- **B. A dedicated `/markside grill` mode.** One command bundles the questioning rules (one at a time, a recommendation each, look up facts yourself) with the Markside loop. It's self-contained, but it forks grill-me's instructions and drifts from them.
- **C. Documentation only.** The CLI README documents the card syntax, and users write their own prompt or skill glue.

**Recommended: A.** Grill-me stays the single source of what to ask, so the two compose instead of forking. The same section works for interview-me, idea-refine, or any one-question-at-a-time skill. With C, every user rediscovers the doc shape I improvised today, and its friction along with it.

> **Your decision: A.** You agreed and asked what the invocation looks like, which became Q6.

### Q6. What does the user type to start a grilling session in Markside?

You asked about the invocation UX. In Claude Code, only the first `/command` in a message runs as a skill, and everything after it becomes that skill's arguments. So `/grill-me /markside` would run grill-me with the literal text "/markside". This session started from plain prose ("grill me now but with markside"), and the agent loaded both skills itself.

- **A. One command plus a phrase.** `/grill-me <topic> in Markside`, or just "grill me on X in Markside". Grill-me runs normally, and the markside skill's description (Q5) triggers on "in Markside" and supplies the doc and loop. The same phrase works mid-chat: "let's continue this in Markside" moves an in-progress interview into a doc with the answered questions so far.
- **B. A Markside entry command.** `/markside ask grill-me <topic>`: the markside skill loads the named skill and drives it through Markside. It's explicit and deterministic, but it requires a skill to invoke another skill, and Codex and Cursor handle that differently from Claude Code.
- **C. Setup-time default.** A setting or project instruction such as "always ask interview questions in Markside" makes every grilling session use Markside without a phrase.

**Recommended: A.** It needs no new command and works on every host the markside skill supports. It also covers the mid-chat handoff, which B and C don't. The cost is that it relies on the agent noticing "in Markside", so the skill description must name that trigger explicitly and the evals must cover it. C can come later as a project-level instruction without any product change.

> **Your decision: A.** You accepted the recommendation.

### Q7. Where does the interview doc live?

Grill-me is often run on an existing plan ("grill me on PLAN.md"), and sometimes on an idea with no file at all. Today I put this doc in `.scratch/` only because this repo gitignores that folder, and most repos don't have one. Send writes the sidecar using folder access, so the doc's folder must be one you grant or have already granted. ADR-0008 and the review-loop doc deliberately rule out a global `~/.markside` directory.

**What grill-with-docs does (you asked):** it creates no interview doc. Its skill is a single line: run `/grilling` using `/domain-modeling`. The questioning stays in chat. Its only files are durable outputs, created lazily and updated inline as terms and decisions resolve: `CONTEXT.md` at the repo root (a glossary only) and `docs/adr/NNNN-*.md` (only when a decision is hard to reverse, surprising, and a real trade-off). There's no precedent to copy for the interview doc itself, so Markside has to choose.

- **A. A sibling interview doc.** Grilling `docs/PLAN.md` creates `docs/PLAN.grill.md`. With no subject file, the agent creates `GRILL-<topic>.md` at the repo root, next to `CONTEXT.md`, where grill-with-docs already writes. The plan stays clean during the interview. Durable decisions go where the questioning skill puts them: with grill-with-docs, that's `CONTEXT.md` and ADRs as each answer lands, and with plain grill-me, the agent offers at the end to fold decisions into the plan. The grill doc is the transcript, and you decide whether to keep or delete it.
- **B. Inside the plan doc.** The agent adds a "Questions" section to the top of `PLAN.md` and writes each decision into the plan as it lands. You get one file and decisions applied immediately, but question cards mix into the deliverable, and the agent rewrites the plan while you're reviewing it.
- **C. Outside the repo.** The agent uses the OS temp directory. Nothing touches the repo, but the first Send asks for a folder grant on a temp path, and the doc disappears.

**Recommended: A.** It keeps the plan stable: the plan changes once, at the end, when you approve, not every round mid-interview as in B. It sits in a folder you've likely already granted for the plan, so Send needs no new picker. It also keeps the decision trail as a reviewable file, the artifact chat never gives you (Q1). Whether to commit it stays your call at the end.

> **Your decision: A.** You accepted the recommendation after checking grill-with-docs.

### Q8. Should you have to resolve every answer before finishing?

In the other session's change, **Finish review** appears only when every sent comment is Resolved (`canFinishAgentReview`, `lib/agent-review.ts`). In a grilling session each answer is a comment, so a 10-question interview means resolving 10 comments, either one per round as you've done today or all at the end. For an answer, the only thing to check is whether the agent recorded your decision correctly, and the **Your decision** block in the doc already shows that.

- **A. Keep resolving each one.** No change. Resolving an answer confirms the agent recorded it correctly.
- **B. Exempt answers.** Comments created by question-card controls don't need resolving once Addressed. This requires marking them in review.json (for example `kind: "answer"`), which breaks Q2's "no contract change".
- **C. Resolve all and finish.** When every comment is Addressed or Resolved, the button reads **Resolve 3 and finish**. One click resolves the Addressed comments and ends the Review. This applies to every Review, not just grilling.

**Recommended: C.** It removes the busywork without new contract fields, keeping Q2's promise. Finishing is already an explicit, deliberate act (Q4). Because the count appears on the button, you can see that you're accepting comments you haven't opened, so it never resolves anything silently. B special-cases answers in the data model for a problem C solves generically. A keeps a step that gives grilling sessions no new information.

> **Your decision: C.** You accepted the recommendation.

### Q9. How does the next question appear after you send an answer?

Every round so far needed a manual reload. ADR-0002 forbids watching files, with two exceptions. When the tab regains focus, Markside reads the sidecar once (so Addressed replies show up) and reads the doc once (showing **Changed on disk** beside Reload). It never replaces the doc. In a grilling session, though, you usually send and then stay in the Markside tab waiting. No focus event fires, so nothing tells you the next question has arrived.

- **A. No change.** You click Reload, or switch away and back to get the Changed-on-disk notice. The skill keeps telling you to reload.
- **B. A bounded check after Send.** For a short window after you click Send (for example every 2 s for up to 2 min, stopping at the first change), Markside re-reads the sidecar. When the agent addresses your answer, it shows **Agent replied: Reload** with the existing Changed-on-disk treatment. You still click to reload. This would be a third ADR-0002 exception: started by a user action, time-limited, and never replacing the doc.
- **C. Bounded check plus auto-reload.** This is B, except Markside reloads the doc automatically when the reply lands, provided there's no Unsaved Draft.

**Recommended: B.** It closes the gap where you're staring at a stale page, and it keeps ADR-0002's core promise that external changes are never silently applied. The check starts with your click and ends on its own, the same reasoning as the focus exceptions, so there's no idle background loop. C silently replaces the content you're reading, which is exactly what ADR-0002 rules out. A leaves the slowest part of each round in place.

> **Your decision: B.** You accepted the recommendation.

### Q10. What ships first?

The decisions split into four pieces, from smallest to largest:

1. **Skill section.** The markside skill gains an ask-in-Markside section with the trigger phrase, doc location, layout, and `[!QUESTION]` syntax (Q5–Q7 and the layout notes). No extension change.
2. **Resolve N and finish** (Q8). A small panel and `finishReview` change on top of the other session's work.
3. **Bounded post-Send check** (Q9). A hook change plus an ADR-0002 exception.
4. **Question cards with answer controls** (Q2–Q3). A markdown-it rule, card styles, and controls wired to the composer and Send. This is the largest piece.

- **A. Skill first, cards last.** Ship 1–3 first. Agents write `[!QUESTION]` blocks right away, and Markside renders them as plain blockquotes (the existing alert rule only knows NOTE, TIP, IMPORTANT, WARNING, and CAUTION) until 4 lands.
- **B. Cards first.** Ship 4 first, because one-click answers are the biggest UX win, then 1–3.
- **C. Everything in one change.**

**Recommended: A.** Pieces 1–3 are small and fix the friction seen in this session: improvised layout, early end, resolve busywork, and stale page. They make grilling in Markside usable within days. Real sessions then show whether the `[!QUESTION]` shape holds up before you build UI on it. B builds the biggest piece on a syntax no agent has written yet, and C bundles a risky UI change with three safe ones.

> **Your decision: A.** You accepted the recommendation.

## Doc layout (from your comments)

- The current question sits at the top, above the answered questions.
- Answered questions keep their full question, options, and recommendation, followed by a **Your decision** block, instead of shrinking to a one-line summary.

## Friction observed during this session

- ~~**Resolving the last addressed comment ended the Review while a question was still unanswered.**~~ Another session fixed this (uncommitted). Resolving comments no longer ends the Review. The reviewer ends it explicitly with **Finish review** (`finishReview` in `cli/review-file.mjs`, `canFinishAgentReview` in `lib/agent-review.ts`).
- ~~**The fresh Review gave no visible prompt to answer.**~~ This no longer happens: the Review stays active, so the agent never has to start a fresh one mid-interview.
