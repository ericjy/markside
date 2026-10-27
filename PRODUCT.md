# Product

<!-- impeccable:product-schema 1 -->

## Platform

Markside is a Chrome Manifest V3 extension for local files. Setup instructions
cover Chrome. Recipients open shared snapshots in a web viewer without installing
the extension.

## Product promise

Read, review, and edit local Markdown in Chrome. Give an agent feedback on its
plans, specs, and docs, or correct the source yourself. Changes go back to the
original file.

This brief covers the current repository, including the Beta agent Review
loop. The latest Web Store release may have fewer features.

## Users and jobs

- Developers working with coding agents need to inspect generated Markdown,
  point to exact passages, request changes, and check the agent's response.
- People reading and writing local Markdown need comfortable rendering, quick
  corrections saved to the original file, and navigation through nearby docs.
- Teammates receiving a snapshot need to read the document without installing
  Markside or setting up the author's project.

Markside should work well for everyday Markdown use. Its strongest reason to
choose it is Review, which lets users send precise feedback to an agent without
assembling quotes and instructions in chat.

## What users can do

| Capability | What the user can do |
| --- | --- |
| Read Markdown | Open `.md`, `.mdx`, and `.markdown` files in Preview with tables, task lists, alerts, frontmatter, math, highlighted code, Mermaid diagrams, and HTML Embeds: interactive local HTML files shown in place in isolated frames. Navigate the outline and adjust the theme, typeface, width, and heading numbering. |
| Navigate local work | Authorize a folder, browse its file tree, follow relative links and wikilinks, or find a file with the quick switcher. Saved folders support separate projects in separate tabs. Create a new Markdown file in the open root folder. |
| Edit and save | Use Source or Split, make changes, and save to the original file. Auto Save is optional and off by default. Other text files use Source; images use an image viewer. |
| Prepare a Review | Add anchored Review Comments, exact Text Replacements, and a Review Note without modifying the document. Suggest Edits starts an editable instruction for the agent. Copy the whole Review or one comment as a prompt. |
| Inspect external changes | Reload a document to see a Reload Comparison with additions and removals. Comment on removed passages as historical context. |
| Return to pending work | Find pending document Reviews in the extension popup and reopen them. Copying a Review keeps it available until the user clears it. |
| Export and share | Copy rendered content, use PDF Export through Chrome's print dialog, or create a snapshot link after saving the Markdown. Snapshot sharing is Beta. |

## Getting started and reviewing a document

The first useful moment is opening a local Markdown file and seeing it rendered
in Chrome. Users must first enable **Allow access to file URLs**, which Chrome
turns off by default for Web Store installs. Choosing a folder separately grants
access for browsing and saving. Markside remembers that permission.

To review a document:

1. Open a local document directly or through the optional Beta `markside` Agent
   Skill.
2. Read it in Preview, add Review Comments or Text Replacements, and optionally
   add a Review Note. Make direct source corrections when useful.
3. Save any Unsaved Draft, then copy the Review as a prompt and give it to the
   agent. Markside checks the disk version before copying. If it has changed,
   reload and check the text before copying again.
4. After the agent edits the file, Reload, inspect the Reload
   Comparison, and continue the Review.

The optional Beta two-way Review loop adds **Send comments to agent** in
place of copying a prompt. It requires the `markside` npm CLI and Node.js
20+. The CLI and extension exchange data through `<document>.review.json` beside
the Markdown file. The agent marks a comment Addressed and may reply. The user
checks the result and chooses Resolve or Reopen. Only the user can send comments.
See [agent Review setup and contract](docs/changes/2026-10-18-agent-review-loop/spec.md).

## Sharing

Snapshots capture saved Markdown at the time of sharing. They cannot change,
synchronize the local file, include local assets other than HTML Embed files,
or support live collaborative editing. Users can include the current Review and import returned Review rounds
from a snapshot link.

- A Link Snapshot carries content in the URL fragment without uploading it.
  It never expires and cannot be revoked. Long links may fail in messaging apps.
- A Hosted Snapshot encrypts content in the sender's browser before uploading
  ciphertext. The key stays in the URL fragment. The sender chooses 7, 30, or 90
  days before expiry. The sender cannot revoke it early.

Anyone with the complete link can read a snapshot. Local images, relative
document links, and wikilinks are unavailable to recipients. Remote HTTPS images
may load from their original hosts. See the [sharing guide](docs/user-guide.md#share-link).

## Feature status

- Local reading, editing, saving, document Review, Reload Comparison, and PDF
  Export are part of the current extension.
- Snapshot sharing, the optional Agent Skill, and its two-way agent Review
  loop are Beta. The Review loop requires Node.js 20+ and the `markside` npm CLI.
- Localhost Review is paused. Its entry is outside the content-script build.
  Current builds do not register it or request localhost access.
- Readability Check is unreleased and disabled by default. A build with it
  enabled asks for consent before sending a selected section to Markside's
  service and its AI provider. It assesses wording and is separate from a Review.

## Constraints

- Ordinary reading, editing, and Review storage stay on the user's computer.
  Reviews leave browser storage only when the user sends or shares them.
  Markside requires no account and collects no analytics or telemetry.
- The current extension is free and the client is MIT-licensed. Future hosted
  service pricing is not defined by this brief.
- The extension never watches or polls document files. Users control when to
  Reload or navigate. The waiting CLI watches only its Review handoff
  file for the duration of a request. See [ADR-0002](docs/adr/0002-no-file-watching.md).
- Saves target the original file through an authorized directory. If no saved
  directory contains it, ask for its folder. Detect external edits before
  overwriting, and protect Unsaved Drafts during navigation.
- Ordinary local use does not upload documents. Creating a Hosted Snapshot
  uploads an encrypted copy. Readability Check, when enabled, requires separate
  consent to send text. Remote images in documents can make their own requests.
- Review instructions leave source text unchanged. Markside does not run an
  agent or generate rewrites through Suggest Edits. The user controls handoff and
  acceptance of the agent's response.

## Terminology

Use the definitions in [CONTEXT.md](CONTEXT.md), including Review, Review Comment,
Review Note, Text Replacement, Active Review, Reload Comparison, Addressed Review
Comment, Resolved Review Comment, Auto Save, Unsaved Draft, Link Snapshot, and
Hosted Snapshot. Keep the definitions there rather than duplicating them here.

## Brand commitments

- The name is Markside. The README uses "Your local Markdown workspace in Chrome"
  and "A human layer for the plans, specs, and docs your AI agents write."
- The logo is the "M→" mark in `assets/icon.svg`.
- Keep typography, colors, controls, and spacing consistent across the popup,
  options page, and document UI.

## Keeping this brief current

Update this file when the audience, main workflow, privacy rules, or feature
availability changes. Mark features as current, Beta, prototype, unreleased, or
paused. Check whether users can access a feature before describing it as
available. Keep speculative roadmap items out of this brief.

Keep detailed behavior in the [user guide](docs/user-guide.md), implementation
details in [system design](docs/system-design.md), vocabulary in
[CONTEXT.md](CONTEXT.md), and release copy and procedure in the
[Store listing](docs/store-listing.md). When behavior changes, update those docs
and any affected claims here.
