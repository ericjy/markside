---
name: markside
description: Open a local Markdown file in Markside using Google Chrome, or wait for its Review Comments with /markside review. Use this Beta skill when the user invokes /markside, asks to open a Markdown file specifically in Markside, or asks for Markside setup. Do not trigger merely because Markdown was created or discussed.
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
2. Run `markside review <file>` and wait. Set the tool timeout to 600,000 ms.
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

The adjacent `<file>.review.json` is the only handoff channel. Never write
`status: "sent"` yourself or infer approval from elapsed time. Read current
comments without waiting with `markside comments <file>`. Starting another
Review after all comments are addressed or resolved creates a fresh pending
request and keeps the previous comment statuses and replies. If the CLI returns
`Review resolved for ...`, the user has accepted all comments; continue the task
without making further changes for those comments.

If the user explicitly prefers to keep chatting while reviewing, the waiting
command may run as a background tool task. Check its output before the next
step. The default is to wait in the foreground.

These instructions apply equally to Claude Code, Codex, and Cursor. Hosts may
spell skill invocations differently. Do not give the open-only success sentence
for a Review request; report the received comments and resulting changes.

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
