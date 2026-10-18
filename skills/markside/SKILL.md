---
name: markside
description: Open the one local Markdown file the agent just created or referenced in Markside using Google Chrome. Use this Beta skill when the user invokes /markside, asks to open a Markdown file specifically in Markside, or asks for Markside setup. Do not trigger merely because Markdown was created or discussed.
compatibility: Requires Google Chrome plus POSIX shell on macOS/Linux or PowerShell on Windows. Markside must be installed separately with file URL access enabled. Node.js is not required.
---

# Markside

Open one local Markdown file in Markside without making the user find and paste
its path. Invocation is authorization to launch Chrome; do not add another
confirmation beyond any approval required by the host agent.

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
