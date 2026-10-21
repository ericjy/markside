---
name: markside
description: Open a local Markdown file in Markside using Google Chrome, wait for its Review Comments with /markside review, or run one-question-at-a-time interviews (such as /grill-me) in Markside. Use this Beta skill when the user invokes /markside, asks to open a Markdown file specifically in Markside, asks to answer interview questions "in Markside", or asks for Markside setup. Do not trigger merely because Markdown was created or discussed.
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
3. If stdout starts with `STILL_WAITING:`, rerun the same command. A tool that
   yields a running process needs to be resumed until it exits. Do not continue
   the task until comments arrive, unless the user asks to stop or proceed.
   Other failures require reporting the error, not a retry loop.
4. When comments arrive, address every comment by ID, make the requested changes,
   and answer questions. Then run `markside address <file> <id> --reply "..."`
   for each addressed comment with a one-line reply. Leave unaddressed comments
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

Use this when the user wants another skill's one-question-at-a-time interview
answered in Markside instead of chat: for example `/grill-me <topic> in
Markside`, "interview me in Markside", or "continue this in Markside" partway
through an interview. The questioning skill still decides what to ask, when to
look facts up, and what durable docs to write. This section only decides how
questions are asked and answered.

1. Create the interview doc. When grilling an existing file such as
   `docs/PLAN.md`, use the sibling `docs/PLAN.grill.md`. Otherwise use
   `GRILL-<topic>.md` at the repository root, with a short kebab-case topic.
   Leave the subject file unchanged during the interview.
2. Lay it out as a title, one line explaining how to answer, then
   `## Current question` followed by `## Answered questions`. When continuing
   from chat, put the questions already answered under Answered questions.
3. Write exactly one question under Current question in a `question` fence:

   ````markdown
   ```question
   ### Q3. Where does the interview doc live?

   Context the user needs to decide.

   - **A. Sibling doc.** What it means and what it costs.
   - **B. Inside the plan.** What it means and what it costs.

   **Recommended: A.** Why, compared with each alternative.
   ```
   ````

   Markside turns this exact shape into a card whose options are the answer
   controls, so keep to it:
   - Number questions in order, and put the heading first inside the block.
   - Write the options as one top-level list. Start every item with a bold
     capital letter, period, and short title (`**A. Title.**`), using A, B, C
     in order. The letters are the answer values.
   - Keep each option to its title and one or two short sentences, so the
     options can be compared at a glance. Put the trade-off reasoning in the
     recommendation.
   - End with exactly one `**Recommended: X.**` paragraph after the list,
     naming one listed letter. Markside labels that option.
4. Run the Review workflow above on the interview doc. Tell the user to click
   an option (or press its letter), or click **Other answer…** to write their
   own, then click **Send review to agent**.
5. An answer is a comment whose quote is the question heading and whose body is
   an option letter or the user's own words. When it arrives, move the question out of its `question` fence to
   the end of Answered questions as plain Markdown, followed by
   `> **Your decision: A.** <one sentence>`. Write the next question under
   Current question, address the comment with a one-line reply, and continue
   the Review. If the comment asks something instead of answering, answer it in
   the current question and leave it current.
6. When no questions remain, replace Current question with `## Summary`: the
   decisions as short bullets, then ask the user to click **Finish review** if
   it matches their understanding. Finishing is the confirmation of shared
   understanding. Do not act on the decisions before `Review resolved`.
7. After the Review is resolved, follow the questioning skill for durable
   output. If it names none, offer to fold the decisions into the subject file,
   and ask whether to keep or delete the interview doc.

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
