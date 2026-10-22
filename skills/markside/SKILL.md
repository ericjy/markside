---
name: markside
description: Open a local Markdown file in Markside using Google Chrome, wait for its Review Comments with /markside review, or run interviews (such as /grill-me) in Markside. Use this Beta skill when the user invokes /markside, asks to open a Markdown file specifically in Markside, asks to answer interview questions "in Markside", or asks for Markside setup. Do not trigger merely because Markdown was created or discussed.
compatibility: Requires Google Chrome plus POSIX shell on macOS/Linux or PowerShell on Windows. Markside must be installed separately with file URL access enabled. Opening and setup need no Node.js. Review mode requires Node.js 20+ and the Markside CLI.
---

# Markside

Open one local Markdown file in Markside without making the user find and paste
its path. Invocation is authorization to launch Chrome; do not add another
confirmation beyond any approval required by the host agent.

## Review with the agent

For `/markside review <file>`, use this workflow instead of the open-only flow
below. Invocation authorizes opening Chrome and waiting for the user's Review.

1. Resolve the supplied Markdown file. Use an installed `markside` CLI, or
   `node <Markside checkout>/cli/markside.mjs` when developing in its repository.
   After npm publication, `npx markside` is also supported. If none is available,
   explain that the prototype CLI must be installed from the Markside checkout
   with `npm install --global ./cli`; do not substitute an unrelated npm package.
2. Before the first wait, tell the user in one short message that the review has
   started, because the waiting command shows no output until it exits. Name the
   file and say to add comments in Markside, then click **Send review to agent**.
   Without `--no-open`, say Chrome is opening it; with `--no-open`, say it is
   ready in the open tab. For example: `Review started for PLAN.md. Add comments
   in Markside, then click Send review to agent. I'll wait here.` Do not repeat
   it on `STILL_WAITING:` retries.
   Run `markside review <file>` and wait. Set the tool timeout to 600,000 ms.
   Preserve explicit `--timeout` and `--no-open` arguments. Quote paths as single
   arguments so spaces and shell metacharacters remain literal.
3. If stdout starts with `STILL_WAITING:`, rerun the command with `--no-open`
   added, as the printed command shows, because Chrome is already open. Keep any
   explicit `--timeout`. Every retry, including one inside a shell loop, must
   include `--no-open`. A tool that
   yields a running process needs to be resumed until it exits. Do not continue
   the task until comments arrive, unless the user asks to stop or proceed.
   Other failures require reporting the error, not a retry loop.
4. When comments arrive, address every comment by ID, make the requested changes,
   and answer questions. Then run `markside address <file> <id> --reply "..."`
   for each addressed comment with a one-line reply. A Review note labeled
   `(ID note)` awaits its own reply: address it with the ID `note`. Leave unaddressed comments
   open and explain what needs the user's decision. Use the same CLI executable
   for review, comments, and address. Addressed means the agent has finished;
   only the user resolves a comment in Markside. Never mark it resolved yourself.
5. After addressing the received comments, tell the user to reload Markside and
   check the changes. If they stayed in the tab, Markside shows Reload once your
   reply lands. Then run `markside review <file> --continue --no-open`
   with the same CLI executable and wait again. Do not finish the task merely
   because you addressed the comments. This preserves the current Review without
   opening another Chrome tab. On `STILL_WAITING:`, rerun this continuation command.
   When more comments arrive, repeat steps 4–5. Finish when the CLI reports
   `Review resolved for ...`, or when the user explicitly asks to stop or proceed.
   If a comment needs clarification, ask the user and wait for their answer rather
   than repeatedly reading the same open comment.

The adjacent `<file>.review.json` is the only handoff channel. Never write
`status: "sent"` yourself or infer approval from elapsed time. Read current
comments without waiting with `markside comments <file>`.

A Review ends only when the reviewer resolves all comments and finishes it. A
fresh `review` then starts a new one. Addressing or resolving all comments keeps
the current Review active, even without `--continue`. `--continue` reports
resolution even if the reviewer finished before the wait started. `review` returns only open feedback. `comments` also lists addressed
and resolved comments with their replies; do not treat those as new work.
If the CLI returns
`Review resolved for ...`, the user has accepted all comments and finished; continue the task
without making further changes for those comments.

If the user explicitly prefers to keep chatting while reviewing, the waiting
command may run as a background tool task. Check its output before the next
step. The default is to wait in the foreground.

These instructions apply equally to Claude Code, Codex, and Cursor. Hosts may
spell skill invocations differently. Do not give the open-only success sentence
for a Review request; report the received comments and resulting changes.

## Ask questions in Markside

Use this when the user wants another skill's interview answered in Markside instead of chat: for example `/grill-me <topic> in
Markside`, "interview me in Markside", or "continue this in Markside" partway
through an interview. A bare `/markside` invoked together with a questioning
skill, such as `/grill-me /markside`, also means this workflow, not opening a
file. The questioning skill still decides what to ask, how many questions to
ask at once, when to look facts up, and what durable docs to write. This
section only decides how questions are asked and answered.

1. Create the interview doc. When grilling an existing file such as
   `docs/PLAN.md`, use the sibling `docs/PLAN.grill.md`. Otherwise use
   `<topic>.grill.md` at the repository root, with a short kebab-case topic.
   Leave the subject file unchanged during the interview.
2. Lay it out as a title, one line explaining how to answer, then
   `## Current questions` and `## Previous questions`.
   The answer line says the user can pick an option or use the tile to answer
   in their own words, ask, skip, let you decide the rest, or stop, and that
   they may answer any or all cards before sending. Previous questions
   holds every settled question, answered, deferred, or left open, in the
   order it was settled; leave it empty until there is one. Every decision is
   the user's: put each one to them as a card unless they ask you to decide
   the rest. When continuing
   from chat, copy the original questions and options already answered under
   Previous questions, including their context, tradeoffs, and recommendations.
   Do not replace them with summaries. If the original text is unavailable,
   label the record as a summary rather than reconstructing original wording.
3. Under Current questions, write each question the questioning skill asks
   now in its own `question` fence: one fence when it asks one question, and
   one per question, in order, when it asks a round. Number questions
   continuously across the interview and do not label rounds; the unique
   numbers keep each heading a distinct answer anchor. Write each fence like this:

   ````markdown
   ```question
   ### Q3. Where does the interview doc live?

   Context the user needs to decide.

   - **A. Keep the interview in a sibling document.** Create a separate interview file next to the plan. The plan stays focused, but there is another file to manage.
   - **B. Put the interview inside the plan.** Add the questions and answers to the plan itself. Everything stays in one file, but temporary questions interrupt the plan.

   **Recommended: A.** It keeps temporary interview questions out of the plan; the extra file can be removed afterward.

   <details open>
   <summary>Compare tradeoffs</summary>

   | Criterion | A. Sibling document | B. Inside the plan |
   |---|---|---|
   | Plan stays focused | ✓ Interview stays separate | △ Questions interrupt the plan |
   | File management | Two files | One file |

   </details>
   ```
   ````

   Markside turns this exact shape into a card whose options are the answer
   controls, so keep to it:
   - Number questions in order, and put the heading first inside the block.
   - Write the options as one top-level list. Start every item with a bold
     capital letter, period, and a short sentence stating the approach
     (`**A. Keep the interview in a sibling document.**`), using A, B, C
     in order. The letters are the answer values.
   - Follow each title with two short sentences: explain what happens in
     practice, then the main benefit and drawback. Use plain language and
     explain technical terms needed to choose. Markside puts this description
     below the title. Optional comparison tables can add detail, but each
     option must be understandable without opening a disclosure.
   - Use the user's words and the project's existing terms. Do not coin labels
     for options, components, or ideas; describe them instead. When referring
     to an earlier question, restate what it decided, such as
     `Q3 (the interview doc lives beside the plan)`, never a bare `Q3`.
   - When the choice is visual or structural, such as a layout, flow, or
     state change, add a small Mermaid diagram to the context. It shows the
     situation being decided, such as what a comment attaches to or how parts
     connect, not the options or their outcomes, which the options and table
     already state. Fence it with `~~~mermaid`, because a backtick fence would
     close the question fence.
   - When shared criteria help compare the options, add a Markdown table
     inside `<details open>` with `<summary>Compare tradeoffs</summary>`, expanded
     by default so it is visible before choosing. Keep it collapsible. Put it
     last, after the recommendation, as in the example.
     Leave blank lines around the table so Markdown renders
     inside the HTML disclosure. Omit the comparison for simple questions.
   - In comparison tables, use options as columns and criteria as rows. Keep
     cells short. Prefix evaluative cells with ✓ for meeting the need, △ for
     a tradeoff, ✕ for not meeting the need, or ? for an unknown that needs
     verification, followed by explanatory text. Markside colors those
     symbols. Keep neutral facts such as file counts unscored. Do not add a
     legend or colored-circle emoji, and do not present assumptions as facts.
   - Right after the options, write exactly one `**Recommended: X.**`
     paragraph outside the disclosure, naming one listed letter. Give the main reason and decisive
     tradeoff in one or two short sentences. Put detailed comparisons in the
     table rather than a long recommendation paragraph. Markside labels the
     recommended option separately from the user's selected answer.
4. Run the Review workflow above on the interview doc. Tell the user to click
   an option (or press its letter), or click **Something else…** (or press T) to answer in their own words, ask,
   skip, or stop, then click **Send review to agent**. When several cards are shown, add that
   letters answer the highlighted card and then move to the next unanswered one,
   and that they can send before answering every card. Markside supplies the custom-answer
   tile after the options and the keyboard hints at the top of the card; do not write those controls
   into the Markdown. Clicking that tile opens the composer; saving a custom
   answer marks it selected. Nothing is sent until the user sends the Review.
5. An answer is a comment whose quote is a question heading and whose body is
   an option letter or the user's own words. One Send may answer several
   cards; handle each comment as follows, then archive in question-number order.
   For an answer, archive the question at the end of Previous questions so
   the record stays short but complete: its heading, then
   `> **Your decision: A.** <one sentence>` preserving any additional notes
   from the user's answer, then everything else from its `question` fence
   verbatim inside a collapsed disclosure:

   ````markdown
   ### Q3. Where does the interview doc live?

   > **Your decision: A.** Keep it beside the plan.

   <details>
   <summary>Full question</summary>

   Context, options, recommendation, and comparison, copied verbatim.

   </details>
   ````

   Preserve the context, full option titles and descriptions, recommendation,
   and comparison disclosures and tables. Do not shorten or rewrite any of
   them, and leave blank lines inside the disclosure so Markdown renders.
   Before removing the fence from
   Current questions, verify that the archived question matches the original
   fence contents. Leave unanswered cards in place, and append after them any
   questions the questioning skill can now ask, continuing the numbering.
   Address each comment with a one-line reply, and continue
   the Review. If a comment asks something or says the question or options
   are unclear, record no decision. Rewrite the unclear part of that
   question in place, adding a diagram, table, or example where it helps, keeping its number and heading so the answer still
   anchors, address the comment with a one-line reply naming what changed, and
   continue the Review. If it asks to skip or defer the question, archive it as
   above with `> **Deferred.**` in place of the decision line. Requests to
   decide the rest or to stop apply to the whole interview, whichever card
   carries them. If a comment asks you to decide the rest, add
   `Focus: you decide the rest (asked at Q<n>).` below the answer line,
   archive the other answers sent with it, then settle every unanswered card
   and every question the questioning skill would still ask, writing each in
   full with its own number and archiving it with
   `> **Assumed decision: X.** <one sentence>` naming its recommended option,
   and go to step 6. If a comment on an assumed decision vetoes or questions
   it, remove it from Previous questions and ask it again as a card, keeping
   its number and heading. If a comment asks to stop, archive the other
   answers sent with it, archive each remaining unanswered card with
   `> **Open.**` in place of the decision line, and go to step 6. Do not
   settle open questions yourself.
6. When no questions remain or the user asks to stop, check every decision
   against the subject file and any spec or design doc the interview relies
   on. Ask about each contradiction as a new card before summarizing. Then
   replace Current questions with `## Before you finish`, listing as short
   bullets only what the user has not already seen in a decision line: how
   you read each answer given in their own words, details you inferred or
   combined across questions that no question decided, assumed decisions
   labeled as yours, and open questions labeled as open. Do not restate
   decisions made by choosing an option. End with one line asking the user
   to click **Finish review** if this matches their understanding; when there
   is nothing to list, that line is the whole section. With no current questions left, rename
   Previous questions to `## Question history` and remove the answer line
   below the title. If a later comment reopens a question, restore both
   headings and the answer line, and ask it as a card. Finishing confirms shared
   understanding; it is not a request to implement.
7. After the Review is resolved, the interview is over. Write only the
   durable docs the questioning skill names, such as a glossary or ADRs.
   Then report the decisions in chat and stop: do not edit code, build, or
   implement the plan unless the user asked for that, before or after the
   interview. If the questioning skill names no output, offer to fold the
   decisions into the subject file or to implement them, and wait.
   Keep the interview doc as the record of how each decision was made; delete
   it, and its `<file>.review.json`, only when the user asks.

## Choose the target

1. If the user supplied a path, use that path.
2. Otherwise, use the single Markdown file most recently created or referenced
   in the current task.
3. If there is no candidate or more than one plausible candidate, ask the user
   which file to open. Do not guess from filesystem modification times.

Open exactly one existing local file whose extension is `.md`, `.mdx`, or
`.markdown`. Extensions are case-sensitive because Markside's Chrome content
matching is case-sensitive. Reject URLs, directories, missing files, and other
extensions.

## Open the file

Resolve the selected path to an absolute path, then run the launcher for the
host operating system. Resolve each script path relative to this `SKILL.md`.

- macOS: `scripts/open-macos.sh <absolute-path>`
- Linux: `scripts/open-linux.sh <absolute-path>`
- Windows: `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/open-windows.ps1 <absolute-path>`

The launchers deliberately use Google Chrome's normal profile, open a new tab,
and do not fall back to the system's default browser. Do not replace them with
browser automation: an automated browser profile may not contain Markside.

After a successful launch, respond only with `Opened filename.md in Markside.`,
using the actual basename. A successful launch cannot verify that the extension
rendered the file. If the user reports raw Markdown, direct them to setup.

## Setup

When the user invokes `/markside setup` or asks to install/configure Markside,
run the platform launcher with `--setup` instead of a file path:

- macOS: `scripts/open-macos.sh --setup`
- Linux: `scripts/open-linux.sh --setup`
- Windows: `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/open-windows.ps1 -Setup`

Explain that Chrome requires the user to install Markside from the opened Web
Store page, then visit Markside's extension details and enable **Allow access to
file URLs**. The skill cannot install the extension or verify profile settings.

## Failures and privacy

Surface the launcher's actionable error without trying another browser. The
launcher validates file metadata but never reads file contents. It performs no
telemetry, update checks, or network requests; setup only asks Chrome to open the
public Web Store page.
