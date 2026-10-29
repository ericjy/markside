---
date: 2026-10-28
status: draft
author: Eric Yang
interview: grill.md
design: spec.md
---

# Intent: Local images in Hosted Snapshots

## Problem

A person sharing a Markdown document with a non-technical teammate wants the
recipient to read it in a browser. Hosted Snapshots do not carry local images,
so a document that looks complete to its author can arrive with missing images.
The discussion began with a Reddit question about sharing Markdown in a readable
form; it is a single signal, not evidence of the size of the need.

## Proposed outcome

A sender can create a Hosted Snapshot that includes the document's readable
local images. The recipient opens the link and reads the document with those
images without installing Markside. The sender understands what will be
uploaded and can decide whether to proceed when an image is unavailable.

## Affected users and systems

- Authors sharing local Markdown and recipients reading Hosted Snapshots.
- The extension's Share flow, local file reading and snapshot encoding; the
  website's upload service, snapshot decoder and viewer.

## Constraints

- Only Hosted Snapshots carry local images; Link Snapshots keep their existing
  behavior. HTTPS images continue to load from their original addresses.
- An explicit Hosted Snapshot encrypts the document and images in the sender's
  browser before upload. The snapshot remains an immutable copy with the
  existing expiry choices.
- Support Markdown images and HTML `img` references, including readable files
  outside the document folder. Explain missing images and let the sender
  continue or cancel.
- When the content is too large, offer automatic image compression or manual
  adjustment. Show compression results before upload; preserve animation and
  SVG, and require manual adjustment if compression still cannot fit.
- Respect the existing no-file-watching decision.

## Open questions

- What Hosted Snapshot size limit is practical, after checking upload and
  browser limits, storage cost, and representative documents?
- Which compression and image-validation methods preserve the agreed behavior
  across supported browsers and image formats? Validate before implementation.
