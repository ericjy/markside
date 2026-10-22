# Grill: Question Card rounds

Click an option (or press its letter), or use **Answer in your own words, ask, skip, or stop…** to answer in your own words, ask a question, skip, ask for fewer questions, or stop. Then click **Send review to agent**. Rounds may have several cards; answer any or all of them before sending.

## Summary

Decisions:

- **Q1.** Markside follows the questioning skill's rhythm: one card for a single question, several cards for a round. No cap.
- **Q2.** One `## Current questions` section holds every round's cards, numbered straight through all rounds, with no round labels.
- **Q3.** A partial send archives what you answered, keeps the unanswered cards, and appends questions your answers unblocked.
- **Q4.** Letter keys answer the active card (the first unanswered card, or the one you last clicked into), then move to the next unanswered card.
- **Q5.** No “Accept remaining recommendations” button.
- **Q6.** On Stop, unanswered cards move to Assumed defaults with their recommended option; you can veto them before Finish review.
- **Q7.** Fewer questions re-checks every unanswered card in the current round, not just the one carrying it.
- **Q8.** I update `skills/markside/SKILL.md`, the letter-key code, and `docs/agent-review-loop.md`, and move this doc to `docs/history/designs/2026-10-21-question-card-rounds.grill.md`. No design doc or ADR.

My assumed defaults (listed in full below; comment on any to veto it):

- Archive order, Skip, rewriting unclear cards, vetoes going to the next round, and per-card chips all work as listed.
- Active-card outline, scroll only when off screen, ⌘⇧↵ works page-wide, and the doc's intro line mentions partial sends.
- Skill and extension changes ship separately; one-at-a-time skills are the one-card case; no new CONTEXT.md term.

If this matches your understanding, click **Finish review**.

## Assumed defaults

- Answered cards are archived verbatim in question-number order, each with its own `> **Your decision: X.**` line.
- Skip stays per card: the card is archived as `> **Deferred.**` and doesn't come back unless you ask.
- A card you ask about or call unclear is rewritten in place, keeping its number, and stays in the current round.
- Vetoing an Assumed default asks it in the next round rather than as “the next question”.
- Skip, Fewer questions, and Stop stay as per-card chips; Fewer questions and Stop apply to the whole interview whichever card carries them.
- No new CONTEXT.md term: a Question Card still asks one question, and “round” stays the questioning skill's concept. The skill description drops “one-question-at-a-time”.
- New questions unblocked by a partial send are appended after the unanswered cards, continuing the numbering.
- The active card shows the hint line and a subtle accent outline; advancing scrolls the next card into view only when it's off screen. When every card is answered, letters change the active card's answer.
- ⌘⇧↵ sends the Review from anywhere on the page whenever an agent Review is active, regardless of card count.
- The doc's intro line says you can answer any or all cards before sending, and the skill tells the user that in chat when a round has several cards.
- Skill and extension changes ship independently: the skill's round rules work on the current extension, which just lacks letter keys in rounds until the keyboard change ships.
- One-at-a-time skills such as interview-me are the one-card case of the same rules; nothing changes for them.

## Answered questions

### Q1. Who decides how many questions an interview doc asks at once?

`skills/markside/SKILL.md` step 3 says "Write exactly one question under Current question." The grilling skill now asks the whole **frontier** in one round: every decision whose prerequisites are settled, numbered, each with a recommendation. Other questioning skills, such as interview-me, still ask one at a time. Today `/grill-me /markside` can't follow both.

What Markside already does with several `question` fences in one doc (checked in the code):

- Each fence renders as its own card with its own options and answer tile.
- Each answer is a separate Review Comment quoting that card's heading, so one Send can carry several answers.
- Letter-key shortcuts and the hint line turn off when more than one card is answerable (`components/content-view.tsx:669`).

- **A. Follow the questioning skill's rhythm.** Markside shows one card when the skill asks one question and a round of cards when it asks a round. Grilling and interview-me both work unchanged, but the Markside skill has to define round layout, archiving, and how Skip, Fewer questions, and Stop behave in a round.
- **B. Always one question at a time in Markside.** Markside keeps its current rule and feeds the frontier to the user serially, ignoring grilling's round shape. Nothing changes, but every frontier question costs a full Send → agent → Reload cycle.
- **C. Rounds, capped at a few cards.** Markside follows the skill's rounds but shows at most three cards, holding the rest of the frontier for the next round. Rounds stay short enough to answer in one sitting, but the cap is an arbitrary second rule on top of the questioning skill's.

<details open>
<summary>Compare tradeoffs</summary>

| Criterion | A. Follow the skill | B. Always one | C. Capped rounds |
|---|---|---|---|
| Round trips for a 4-question frontier | 1 | 4 | 2 |
| Matches grilling's round model | ✓ Yes | ✕ Overrides it | △ Splits large rounds |
| Matches one-at-a-time skills | ✓ Yes | ✓ Yes | ✓ Yes |
| New skill rules for rounds | △ Needed | ✓ None | △ Needed, plus a cap |
| New extension work | △ Keyboard, maybe round controls | ✓ None | △ Same as A |

</details>

**Recommended: A.** The renderer and comment model already handle several cards per Send, so the cost is mostly skill rules; forcing one at a time throws away the round trip savings that motivated grilling's change.

> **Your decision: A.** Markside follows the questioning skill's rhythm: one card for a single question, several cards for a round.

### Q2. How does the interview doc lay out a round?

The doc currently has `## Current question`, `## Assumed defaults`, and `## Answered questions`. A round puts several `question` fences in the current section. Answers anchor to each card's heading text, so headings must stay unique.

- **A. One `## Current questions` section, numbered across rounds.** Every round's cards go under the same heading, continuing the numbers (Q2–Q7, then Q8…). The doc says nothing about rounds, which keeps it simple, but you can't see later where one round ended.
- **B. A `## Round N` section, numbered across rounds.** The current section is titled with the round number, and Answered questions groups archived cards under `### Round N`. You can see the interview's shape, but it adds a heading level above the archived `### Q…` headings and rounds mean nothing to one-at-a-time skills.
- **C. Keep `## Current question` as the heading.** Only the content changes; the singular heading stays even with several cards. There's nothing to migrate, but the heading misdescribes a round.

**Recommended: A.** Rounds belong to the questioning skill, not the record; continuous numbers already keep every heading unique and ordered.

> **Your decision: A.** One `## Current questions` section holds every round's cards, numbered continuously, with no round labels in the doc.

### Q3. What happens when you send a round with some cards unanswered?

Grilling says to wait for answers before the next round, but Markside lets you send any time, and each answer is a separate comment.

- **A. Archive the answers, keep the rest, add newly unblocked questions.** The agent archives what you answered, leaves unanswered cards in place, and appends questions your answers just unblocked. You can answer in pieces, but a round can grow while you're still working through it.
- **B. Archive the answers, keep the rest, add nothing yet.** The agent archives what you answered and waits for the remaining cards before recomputing the frontier. Rounds stay fixed, but a partial send gives you nothing new to answer.
- **C. Markside won't send until every card is answered.** The Send button stays disabled, saying how many cards are still unanswered. Rounds stay whole, but you can't send one urgent answer or question early.

<details open>
<summary>Compare tradeoffs</summary>

| Criterion | A. Grow the round | B. Hold the round | C. Block Send |
|---|---|---|---|
| Send one answer early | ✓ Yes | ✓ Yes | ✕ No |
| Next questions after a partial send | ✓ Appear | ✕ Wait | — |
| Round stays a fixed set | △ No | ✓ Yes | ✓ Yes |
| Extension work | ✓ None | ✓ None | △ Send gating |

</details>

**Recommended: A.** Every answer reshapes the frontier, and grilling asks the whole frontier, so newly unblocked questions belong beside the unanswered ones.

> **Your decision: A.** Answers are archived, unanswered cards stay, and newly unblocked questions are appended to the round.

### Q4. How do letter keys work when several cards are answerable?

Today letter keys and the hint line turn off when more than one card is answerable, and so does **⌘⇧↵ to send review**, because it lives in the same listener (`components/question-card-actions.tsx`).

- **A. Letters answer the active card, then move to the next unanswered one.** The active card is the first unanswered card, or whichever card you last clicked into; only it shows the hint line. You can answer a whole round from the keyboard, but you need to notice which card is active.
- **B. No letter keys in a round; keep ⌘⇧↵ working page-wide.** Single cards keep letter keys; rounds are answered by clicking. It's the smallest change, but rounds lose the fast path.
- **C. Number-then-letter chords, such as `3` `B`.** Any card is reachable without changing focus. It's precise, but it's a new and unfamiliar key scheme.

**Recommended: A.** It keeps the single-card behavior as the one-card case of the same rule and makes a round as fast to answer as one card.

> **Your decision: A.** Letters answer the active card (first unanswered, or the one last clicked into), then move to the next unanswered card.

### Q5. Should a round offer “Accept remaining recommendations”?

Grilling words every question so that “yes” accepts the recommendation. In chat, answering a round with “yes” takes one word; in Markside it takes one click per card.

- **A. Add one button after the last card when two or more cards are unanswered.** It selects the recommended option on every unanswered card and leaves answered cards alone; you still review and send. A round of agreements takes one click, but it makes approving every recommendation without reading them the easy path.
- **B. No round-level button.** You click the recommended option on each card. Every decision stays deliberate, but agreeing with a large round is tedious.

**Recommended: A.** Accepting is visible, reversible before Send, and still anchors one ordinary answer comment per card.

> **Your decision: B.** No round-level accept button; each recommendation is chosen deliberately.

### Q6. When you stop mid-round, what happens to the cards you didn't answer?

Stop applies to the whole interview whichever card carries it. Answers sent with it are archived normally. Today the one current question simply disappears when the Summary replaces it.

- **A. Move them to Assumed defaults using their recommended option.** The Summary lists them as the agent's defaults, which you can veto by commenting before Finish review. Nothing is silently dropped, but stopping no longer means “ask me nothing more” if you veto one.
- **B. List them in the Summary as open questions with no decision.** The agent records that they were asked but unanswered. Nothing is decided on your behalf, but later work has to guess or ask again.
- **C. Archive them as Deferred.** They join Answered questions with `> **Deferred.**`, as if skipped. It reuses an existing marker, but scatters unanswered questions through the record.

**Recommended: A.** Later work will use some answer anyway; naming it as a vetoable default before Finish keeps the agent's choices visible.

> **Your decision: A.** On Stop, unanswered cards move to Assumed defaults with their recommended option, vetoable before Finish review.

### Q7. When you ask for fewer questions mid-round, does it apply to the other cards in that round?

Fewer questions keeps only decisions that are costly to reverse or where reasonable people would disagree; the rest become Assumed defaults.

- **A. Yes: re-check every unanswered card in the round.** Cards below the bar are archived with `> **Moved to Assumed defaults.**`; answers sent alongside are kept. The round shrinks right away, but cards you were about to answer can disappear.
- **B. No: only the card carrying the request, plus future rounds.** The rest of the current round stays as asked. Nothing you're looking at vanishes, but you still answer low-value cards already on screen.

**Recommended: A.** Asking for fewer questions means the round on screen is already too long.

> **Your decision: A.** Fewer questions re-checks every unanswered card in the current round.

### Q8. Where do these decisions land once the interview is finished?

After you click **Finish review**, I make the actual changes in every option below: I rewrite the interview rules in `skills/markside/SKILL.md` for rounds, change the letter-key code, and update `docs/agent-review-loop.md`. The options differ only in what written record of *why* is kept, and where.

This doc (`question-card-rounds.grill.md`) is that record today: every question, its options, and your answer. It sits at the repository root for now.

- **A. Keep this doc, moved next to the other past interviews.** I move it to `docs/history/designs/`, where the two interview docs from earlier this week already live. No new files are written; if someone later asks why rounds work this way, they read this doc.
- **B. Keep this doc, and also write a short summary doc beside it.** Same as A, plus a one-page `2026-10-21-question-card-rounds-design.md` listing the decisions. The reasons are quicker to find, but the summary repeats this doc.
- **C. Keep this doc, and also write an ADR.** Same as A, plus a numbered decision record (`docs/adr/0009-…`) like the existing ones. Future agents are pointed at it more prominently, but ADRs so far cover the extension's architecture, not how the skill runs interviews.
- **D. Delete this doc.** I make the changes and remove this doc and its `.review.json`. Nothing extra is left in the repository, but the reasons behind each decision are lost.

**Recommended: A.** The updated skill tells agents what to do, and this doc already explains why; a summary or ADR would repeat it.

> **Your decision: A.** Make the changes in place and keep this doc as history in `docs/history/designs/`; no summary doc or ADR.
