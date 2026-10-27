# Spike: HTML embed frames

Tests the frame in [HTML embeds](spec.md):
a `srcdoc` frame with `sandbox="allow-scripts"`, a CSP `<meta>`, and an
injected height script. `host.html` repeats the DOM steps a content script
would take on a `file://` page. `run.mjs` loads it in Playwright's Chromium
(Chrome for Testing 1248) with a local server that logs every request the
embeds manage to make, then prints to PDF.

The harness lived on the throwaway `spike/html-embeds` branch, in
`spike/html-embeds/`.

## Results

| Scenario | Scripts | Requests that got through | Sizing | PDF |
|---|---|---|---|---|
| `file://` page, proposed frame | ✓ run | self-navigation (with data in the query), meta refresh, WebRTC STUN | ✓ | ✓ includes script output |
| plus `webrtc 'block'; navigate-to 'none'` in the embed CSP | ✓ | same three; Chrome ignores both directives | ✓ | ✓ |
| plus page policy `frame-src 'none'` | ✓ | WebRTC STUN only | ✓ | ✓ |
| `file://` page, `sandbox=""` (no scripts) | ✕ | none | ✕ stuck at default height | △ clipped |
| Snapshot viewer CSP, `srcdoc` | ✕ blocked | none | ✕ stuck at default height | △ clipped |
| Snapshot viewer CSP, frame loaded from a same-site route | ✓ | WebRTC STUN only | ✓ | ✓ |

The embed CSP blocked fetch, XHR, `sendBeacon`, WebSocket, EventSource,
dynamic import, workers, external scripts, stylesheets, fonts, images, SVG
images, video posters, nested frames, objects, and prefetch and preload links.
The sandbox blocked `window.open`, form submission, and top navigation.

## Findings

1. **A `srcdoc` frame inherits the embedder's CSP.** On `file://` pages there
   is none, so the frame works. On the Snapshot viewer, `script-src 'self'` and
   `style-src 'self'` block every inline script and style in the embed,
   including the height script. The viewer needs a different mechanism: a
   same-site route such as `/embed-frame` with its own CSP header, loaded as the
   frame's `src`, which receives the HTML by `postMessage` and writes it into
   its own document. That passed every check above.
2. **The embed's own CSP cannot stop it navigating itself.** `location.href =
   "https://…?data"` and `<meta http-equiv="refresh">` both send a request.
   Chrome does not support `navigate-to`. The embedder's `frame-src` does
   govern a child frame's navigation, so a page policy of `frame-src 'none'`
   blocks both while `srcdoc` frames still render. The viewer's existing
   `default-src 'self'` already does this for the route frame. Markside uses no
   other frames, so the page policy breaks nothing.
3. **WebRTC cannot be blocked.** `RTCPeerConnection` contacts any STUN or TURN
   server; CSP has no working directive for it, and the sandbox has no flag.
   A TURN username can carry data. Stubbing the constructor in the injected
   script is bypassable through a nested `srcdoc` frame, which inherits the
   embed's opaque origin. The embed can only send what it already contains plus
   the reader's IP address, because its opaque origin cannot read the document,
   Markside, or other files. Markdown already loads remote `https:` images,
   which reveal the same IP address and timing.
4. **Sizing works.** A `ResizeObserver` on the root element posts the height.
   `min-height: 100vh` settled without growing. A continuously animating embed
   posted about 60 messages a second; post only on change, once per animation
   frame.
5. **PDF Export captures frames,** including content that scripts wrote.
6. **Inject after `<head>`.** Putting the `<meta>` before `<!doctype>` would
   switch the embed into quirks mode. Prepending works for fragments without a
   doctype or head, such as a bare `<svg>`.

A later run loaded the built extension with file access. From the real content
script, embeds rendered, the page policy applied, every HTTP request and
navigation from an embed failed, an embed kept its state while typing in
Split, and PDF output included embeds.
