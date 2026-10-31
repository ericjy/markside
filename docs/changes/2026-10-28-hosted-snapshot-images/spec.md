---
date: 2026-10-28
status: implemented
intent: intent.md
interview: grill.md
---

# Local images in Hosted Snapshots

This design follows the [interview](grill.md).

## Requirements

| ID | Requirement | Decided by |
|---|---|---|
| R1 | A Hosted Snapshot carries readable local images referenced in the saved Markdown so a recipient can view them without installing Markside. It remains an immutable copy. | [Q1–Q2](grill.md#question-history) |
| R2 | Include local images referenced by Markdown image syntax and HTML `img`; resolve relative, parent-directory and `file:` references using existing document-relative behavior, including readable files outside the document folder. Do not treat HTML Embeds as images. | [Q7, Q11](grill.md#question-history) |
| R3 | A Hosted Snapshot containing images encrypts them along with the document in the sender's browser. The server receives ciphertext; the decryption key remains in the URL fragment. Existing expiry choices apply. | [Intent](intent.md#constraints), [ADR-0007](../../adr/0007-host-encrypted-snapshots.md) |
| R4 | Before upload, explain that images are included, show their count, and let the sender cancel. With local image references, preselect Hosted Snapshot; the sender may switch to Link Snapshot and sees that local images will be unavailable. | [Q4, Q12](grill.md#question-history) |
| R5 | Identify unreadable images by path before upload. The sender can cancel or explicitly continue with those images missing. | [Q3](grill.md#question-history) |
| R6 | HTTPS images remain referenced by their original URL and are not fetched for packaging. | [Q5](grill.md#question-history) |
| R7 | If the Hosted Snapshot exceeds its validated limit, show the size and limit and offer automatic compression or manual adjustment. Do not upload an oversized snapshot. | [Q6, Q10](grill.md#question-history) |
| R8 | Before uploading compressed images, show the original and resulting size and identify affected images; require confirmation. Preserve animation and SVG rather than silently converting them. If compression cannot meet the limit, explain this and require manual adjustment. Do not overwrite source files. | [Q8–Q9, Q13](grill.md#question-history) |
| R9 | Link Snapshots continue to exclude local images and retain their existing independent size limit. Existing Link and Hosted Snapshots remain readable. | [Q1](grill.md#question-history), [ADR-0004](../../adr/0004-carry-link-snapshots-in-url-fragments.md) |

## Design

The extension identifies image references from parsed Markdown and HTML,
resolves them against the current document URL, and reads them using the
existing local-file access path. Record the reference as written so the viewer
can replace the corresponding image source without modifying the Markdown.
Deduplicate reads of the same resolved file. A failed read is reported as a
missing image; it must not silently become an upload.

The sender's confirmation must apply to the content actually uploaded: after a
required save, re-read the saved document and its image references, and show
any changed image count, missing files or size before creating the link. Avoid
watching or polling files.

Extend the Hosted Snapshot envelope to carry image bytes and validated media
types, keyed or mapped to the original references. The exact representation and
versioning need a compatibility spike: existing parsers reject unknown envelope
keys, and both the extension and website parse snapshots. The viewer must render
only packaged image data for those references and must not expose arbitrary
active HTML or execute SVG script. The website must understand the new format
before any released extension produces it. Preserve old decoding and links.

Compression runs locally on a separate copy. It must report which images changed
and avoid flattening animation or converting SVG. Determine supported formats,
quality policy and safe bounds in the feasibility work; if an image cannot be
safely processed, retain it unchanged and apply R7–R8. A failed or cancelled
upload must not produce a share link.

The website's viewer also creates Review reply snapshots. Verify that this
existing flow handles image-bearing Hosted Snapshots without losing images or
creating invalid links; specify any necessary viewer and import changes before
implementation. This is a compatibility concern, not a new collaborative
editing feature.

## Current limits and unresolved design work

The implementation uses a 4 MB encrypted upload limit and a 6 MiB decoded
Hosted Snapshot limit. Vercel documents a 4.5 MB request and response limit:
[Functions limits](https://vercel.com/docs/functions/limitations). Storage
cost and representative-device memory behavior still need verification.

- `lib/link-snapshot.ts` limits decoded envelopes to 256 KiB; the website has
  its own matching decoder. Hosted and Link paths currently share this limit.
- The website's `src/pages/api/snapshots.ts` caps upload bodies at 350,000
  bytes. The extension passes ciphertext through Chrome messaging as a number
  array, which may increase memory use. Any new limit must account for encoded
  envelope size, encrypted upload size, browser memory, platform limits and
  storage cost. Measure with representative files before selecting it.
- Define a bounded decoding and image validation strategy, supported formats,
  compression algorithm, limits and user-facing units. Validate that animated
  formats are reliably recognized and that SVG remains safe to render.
- Verify rendering, permissions, inaccessible files, changed files and review
  replies in Chrome using the extension and website together. Determine the
  website deployment and backward-compatibility sequence.

## Intent constraints

| Constraint | Addressed by |
|---|---|
| Hosted only; remote images stay remote | R1, R6, R9 |
| Encrypt before upload; immutable and expiring | R1, R3 |
| Local references and missing-image choice | R2, R5 |
| Compression choice and confirmation | R7, R8 |
| No file watching | Design reads at explicit share; [ADR-0002](../../adr/0002-no-file-watching.md) |

## Areas of concern

| Concern | Owner |
|---|---|
| Validate limits and storage economics before selecting a cap. | Implementation owner |
| Viewer, extension and upload endpoint are in separate repositories and must agree on format, limits and release order. | Implementation owner |
| Handle untrusted image content and bound decoding and browser memory. | Implementation owner |
| Confirm that Review reply snapshots preserve the document and images without breaking Link Snapshot limits. | Implementation owner |

## Verification

Test reference extraction, path resolution, deduplication, missing images,
size accounting, compression decisions, envelope validation, old-link
compatibility and safe rendering. Manually verify actual local-file access,
permissions, upload, recipient rendering, compression confirmation, and Review
reply in Chrome as described by `docs/manual-test.md`.
