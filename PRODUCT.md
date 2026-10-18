# Product

<!-- impeccable:product-schema 1 -->

## Platform

web (Chrome MV3 extension; Chromium browsers only)

## Users and jobs

- Developers who work with AI coding agents (Claude Code, Codex, Cursor, OpenCode, Gemini CLI, and others) and spend much of their day reading the Markdown those agents write: plans, specs, skills, READMEs. Their job is to read it comfortably, give precise feedback, make small corrections, and share it with teammates.
- People who read and write local Markdown in general (notes, docs, READMEs) and want it rendered in the browser they already have open instead of in an IDE or a dedicated Markdown app.

Both audiences matter; the agent-review workflow is the sharpest differentiator.

## What the product makes possible

Markside renders a local `.md` file the moment it opens in Chrome, with a folder file tree, outline, Mermaid, KaTeX, and syntax highlighting. It lets the user edit in place (Preview, Source, Split) and save to disk, attach Google-Docs-style Review Comments and copy them as an agent-ready prompt, and share a rendered read-only snapshot as a link.

First value ("aha"): a local Markdown file opened in Chrome appears fully rendered. This requires Chrome's per-extension **Allow access to file URLs** setting, which is off by default for Web Store installs and is the main activation hurdle.

## Constraints

- Local-first and private: file contents, paths, and Reviews stay in the browser during ordinary use. No analytics, telemetry, or account.
- No file watching or polling (`docs/adr/0002-no-file-watching.md`).
- Free; no account required.
- Network requests happen only after an explicit user action (Hosted Snapshot).

## Terminology

Use the domain language in `CONTEXT.md` (Review, Review Comment, Active Review, Auto Save, Unsaved Draft, Link Snapshot, Hosted Snapshot).

## Brand commitments

- Name: Markside. Tagline in use: "View and edit Markdown in your browser" (popup and options).
- Logo: the "M→" mark (`assets/icon.svg`).
- Popup, options page, and in-page UI share one visual language; surfaces stay consistent with each other.
