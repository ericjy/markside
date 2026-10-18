---
status: proposed
---

# Prototype Link Snapshots in URL fragments

Markside will validate Link Snapshot demand with an experimental static viewer at `https://markside.app/s` and an explicitly experimental `x1` fragment format. The viewer decodes and renders the content entirely in the recipient's browser, keeping document contents off Markside's servers and letting recipients read snapshots without installing the extension. The prototype excludes local assets, warns rather than blocks once a document passes the tested comfortable URL-size limit (still letting the sender proceed), blocks outright only when the decompressed content exceeds what the viewer's decoder will accept, and offers no revocation, expiry, or upload fallback.

The `x1` fragment is a raw-DEFLATE-compressed, Base64URL-encoded UTF-8 envelope containing the Markdown and its basename. An optional `~heading-id` suffix identifies a heading within the snapshot without replacing the content-bearing fragment. Experimental links carry no permanent compatibility guarantee; `v1` remains reserved for a production format only if demand is validated. `markside.app` is now the permanent domain, purchased and linked on Vercel ahead of that validation.

For documents too large to carry inline, see [ADR-0007](0007-host-encrypted-snapshots.md) for the Hosted Snapshot approach.
