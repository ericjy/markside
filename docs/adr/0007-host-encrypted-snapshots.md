---
status: proposed
---

# Host encrypted snapshots on Markside

When a Markdown document grows too large to fit in a URL that chat clients will
transmit, Markside will encrypt the content in the sender's browser, store the
ciphertext on Vercel Blob, and carry only the identifier and decryption key in
the link. The key stays in the URL fragment, which is never sent to the server,
so Markside receives and stores ciphertext only. The sender chooses between this
kind of snapshot and the existing link-encoded kind on every share.

A 3,549-word document encodes to a 12,629-character inline link. Chat clients
including Slack truncate or refuse links past roughly 4,000 characters.
Alternatives were measured to close that gap: Brotli-11 compression plus a
denser Base85 alphabet saves about 22 percent where about 68 percent was
required. Compression, alphabet, and envelope changes are therefore rejected.
The payload must leave the URL.

The snapshot format places the identifier in the path and the key in the
fragment. The server receives the identifier but never the key. Ciphertext is
encrypted in the sender's browser with AES-256-GCM and never transmitted
unencrypted. The landing site is no longer fully static; it requires a Vercel
route to accept uploads and serve the stored blobs.

Because the server stores ciphertext it cannot read, it cannot moderate hosted
snapshots. Abuse handling is limited to deleting a reported identifier. Hosted
snapshots expire on a sender-chosen 7, 30, or 90 day schedule and cannot be
revoked early. A daily sweep removes expired snapshots.

The identifier encodes the expiry date so no metadata store is needed. The read
route derives the blob pathname straight from the identifier and the sweep
enumerates date-prefixed folders, keeping the read path stateless and the
storage interface small enough that a later self-hosted deployment substitutes
its own backend without changing the link format.
