# Markside Agent Skill

Status: Implemented. See `skills/markside/`.

## Problem

After an agent writes a Markdown file, the user must locate it and copy its path
into Chrome or find it through the browser's Open dialog. Markside should provide
a portable Agent Skill that lets the user ask the current agent to open the file
it already knows about.

## Product contract

- Publish a Beta Agent Skill named `markside` under `skills/markside/`.
- The primary explicit invocation is `/markside`; hosts may expose another skill
  invocation syntax. Clear natural-language requests such as “open this in
  Markside” should also trigger it.
- With no argument, open the single local Markdown file most recently created or
  referenced in the current task. Accept an explicit path when supplied. Ask the
  user when the context identifies zero or multiple candidates; do not guess from
  filesystem modification times.
- Open exactly one existing `.md`, `.mdx`, or `.markdown` file per invocation.
  Treat the extensions as case-sensitive because Markside's Chrome content globs
  are case-sensitive.
- Invocation is authorization to launch Google Chrome. Do not add another
  conversational confirmation, but continue to respect the host's normal GUI
  execution approval.
- Launch Google Chrome through dependency-free native scripts for macOS, Linux,
  and Windows. Do not require Node.js at runtime.
- Use Chrome's normal profile and open a new foreground tab. Do not inspect
  profiles, detect duplicate tabs, or fall back to another browser.
- On success, respond minimally: `Opened filename.md in Markside.`
- Add `/markside setup` to open the Chrome Web Store listing and explain how to
  enable **Allow access to file URLs**. Chrome installation and extension
  installation remain user-approved actions.
- The launcher does not read file contents and makes no network requests,
  telemetry calls, or update checks. Opening the Web Store in Chrome is the only
  network-facing setup action.
- Treat missing files, unsupported extensions, and unavailable Chrome as clear,
  actionable failures.

## Distribution and verification

- Keep the skill in the main Markside repository.
- Document installation and usage in the README, user guide, and Markside
  website.
- Add a three-OS GitHub Actions matrix that verifies launcher behavior without
  opening a GUI.
- Label the initial release Beta.
