// HTML Embeds: image syntax pointing at a local `.html` file renders that file
// in a sandboxed frame. See docs/changes/2026-10-25-html-embeds/spec.md.

// Scripts and inline styles run; every fetch, subresource, and connection is
// blocked. Navigation is blocked by the page's frame-src policy instead,
// because a document's own policy cannot stop it navigating itself.
export const HTML_EMBED_POLICY =
  "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; media-src data: blob:"

const HEIGHT_MESSAGE = "marksideEmbedHeight"
const EXPANDED_MESSAGE = "marksideEmbedExpanded"

// The frame is sized to its content, so it never scrolls inline. A scrollbar
// would narrow content that scales with width, which can keep it overflowing.
const HEIGHT_SCRIPT = `<script>(() => {
  const root = document.documentElement
  root.style.overflowY = "hidden"
  addEventListener("message", (event) => {
    const expanded = event.source === parent ? event.data?.${EXPANDED_MESSAGE} : undefined
    if (typeof expanded === "boolean") root.style.overflowY = expanded ? "auto" : "hidden"
  })
  let last = -1
  let queued = false
  const post = () => {
    queued = false
    const height = root.scrollHeight
    if (height === last) return
    last = height
    parent.postMessage({ ${HEIGHT_MESSAGE}: height }, "*")
  }
  const queue = () => {
    if (queued) return
    queued = true
    requestAnimationFrame(post)
  }
  new ResizeObserver(queue).observe(root)
  addEventListener("load", queue)
})()</script>`

const EXPAND_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>`
const CLOSE_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>`
const COMMENT_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>`

export const HTML_EMBED_COMMENT_EVENT = "markside:html-embed-comment"

export function isHtmlEmbedPath(src: string): boolean {
  if (/^[a-z][a-z\d+.-]*:/i.test(src) || src.startsWith("//")) return false
  return /\.html$/.test(src.split(/[?#]/)[0])
}

// The rendered caption doubles as the Review Comment quote for the whole embed.
export function htmlEmbedQuote(src: string): string {
  return `[HTML: ${src}]`
}

// The policy goes inside <head> when there is one; anything before <!doctype>
// would put the embed in quirks mode.
export function buildHtmlEmbedDocument(html: string): string {
  const injected = `<meta http-equiv="Content-Security-Policy" content="${HTML_EMBED_POLICY}">${HEIGHT_SCRIPT}`
  const head = /<head(\s[^>]*)?>/i.exec(html)
  if (head) return html.slice(0, head.index + head[0].length) + injected + html.slice(head.index + head[0].length)
  const doctype = /^\s*<!doctype[^>]*>/i.exec(html)
  if (doctype) return doctype[0] + injected + html.slice(doctype[0].length)
  return injected + html
}

export function installHtmlEmbedNavigationPolicy(doc: Document): void {
  if (doc.querySelector("meta[data-markside-embed-policy]")) return
  const meta = doc.createElement("meta")
  meta.httpEquiv = "Content-Security-Policy"
  meta.content = "frame-src 'none'"
  meta.dataset.marksideEmbedPolicy = ""
  doc.head.append(meta)
}

export function readHtmlEmbedFile(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: "fetch-file", url }, (response: { text?: string; error?: string } | undefined) => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message))
      else if (typeof response?.text === "string") resolve(response.text)
      else reject(new Error(response?.error ?? "Unreadable file"))
    })
  })
}

const fileCache = new Map<string, Promise<string>>()
const frameKeys = new WeakMap<HTMLIFrameElement, string>()
const frameHeights = new WeakMap<HTMLIFrameElement, number>()
let parkingLot: HTMLElement | null = null
let listening = false

type MovableParent = HTMLElement & { moveBefore?: (node: Node, child: Node | null) => void }

// Chrome's moveBefore keeps a frame's document alive across a DOM move, so an
// embed keeps its state when Split replaces the Preview's HTML.
function moveFrame(frame: HTMLIFrameElement, parent: MovableParent): boolean {
  if (typeof parent.moveBefore !== "function" || !frame.isConnected || !parent.isConnected) return false
  parent.moveBefore(frame, null)
  return true
}

export function parkHtmlEmbedFrames(root: HTMLElement): void {
  const frames = root.querySelectorAll<HTMLIFrameElement>("iframe.html-embed-frame")
  if (!frames.length) return
  if (!parkingLot?.isConnected) {
    parkingLot = document.createElement("div")
    parkingLot.hidden = true
    document.body.append(parkingLot)
  }
  for (const frame of frames) moveFrame(frame, parkingLot)
}

function listenForHeights() {
  if (listening) return
  listening = true
  window.addEventListener("message", (event) => {
    const height = (event.data as Record<string, unknown> | null)?.[HEIGHT_MESSAGE]
    if (typeof height !== "number" || !Number.isFinite(height)) return
    for (const frame of document.querySelectorAll<HTMLIFrameElement>("iframe.html-embed-frame")) {
      if (frame.contentWindow !== event.source) continue
      frameHeights.set(frame, height)
      frame.style.height = `${Math.ceil(height)}px`
    }
  })
}

function createButton(action: string, label: string, icon: string) {
  const button = document.createElement("button")
  button.type = "button"
  button.className = "mermaid-control mermaid-control-icon"
  button.dataset.embedAction = action
  button.setAttribute("aria-label", label)
  button.title = label
  button.innerHTML = icon
  return button
}

function setExpanded(figure: HTMLElement, expanded: boolean) {
  figure.classList.toggle("is-expanded", expanded)
  figure.querySelector("iframe")?.contentWindow?.postMessage({ [EXPANDED_MESSAGE]: expanded }, "*")
  const button = figure.querySelector<HTMLButtonElement>("[data-embed-action='expand']")
  if (!button) return
  const label = expanded ? "Close expanded embed" : "Expand embed"
  button.innerHTML = expanded ? CLOSE_ICON : EXPAND_ICON
  button.setAttribute("aria-label", label)
  button.title = label
  button.setAttribute("aria-pressed", String(expanded))
}

function installControls(figure: HTMLElement) {
  const controls = document.createElement("div")
  controls.className = "mermaid-controls html-embed-controls"
  controls.setAttribute("role", "group")
  controls.setAttribute("aria-label", "Embed controls")
  const comment = createButton("comment", "Comment on this embed", COMMENT_ICON)
  const expand = createButton("expand", "Expand embed", EXPAND_ICON)
  expand.setAttribute("aria-pressed", "false")
  controls.append(comment, expand)
  figure.prepend(controls)

  comment.addEventListener("click", (event) => {
    const caption = figure.querySelector<HTMLElement>(".html-embed-caption")
    if (!caption) return
    figure.dispatchEvent(new CustomEvent(HTML_EMBED_COMMENT_EVENT, {
      bubbles: true,
      detail: { caption, point: { x: event.clientX, y: event.clientY } },
    }))
  })
  expand.addEventListener("click", () => setExpanded(figure, !figure.classList.contains("is-expanded")))
  figure.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !figure.classList.contains("is-expanded")) return
    event.stopPropagation()
    setExpanded(figure, false)
    expand.focus()
  })
}

function showError(figure: HTMLElement, src: string) {
  const body = figure.querySelector<HTMLElement>(".html-embed-body")
  if (!body) return
  const message = document.createElement("div")
  message.className = "html-embed-error"
  message.textContent = `Could not open ${src}. Check that the file exists.`
  body.replaceWith(message)
}

function createFrame(key: string, html: string, title: string) {
  const frame = document.createElement("iframe")
  frame.className = "html-embed-frame"
  frame.setAttribute("sandbox", "allow-scripts")
  frame.title = title
  frame.srcdoc = buildHtmlEmbedDocument(html)
  frameKeys.set(frame, key)
  return frame
}

// Fills each embed placeholder rendered by lib/markdown.ts. Frames parked by
// parkHtmlEmbedFrames are reused when the same file and reload version return.
export async function renderHtmlEmbeds(root: HTMLElement, fileUrl: string, reloadVersion: number): Promise<void> {
  const figures = Array.from(root.querySelectorAll<HTMLElement>("figure.html-embed[data-embed-src]"))
  const parked = Array.from(parkingLot?.querySelectorAll<HTMLIFrameElement>("iframe.html-embed-frame") ?? [])
  if (figures.length) listenForHeights()
  for (const key of fileCache.keys()) if (!key.endsWith(`#${reloadVersion}`)) fileCache.delete(key)

  const loads = figures.map(async (figure) => {
    const src = figure.dataset.embedSrc!
    const url = new URL(src, fileUrl).href
    const key = `${url}#${reloadVersion}`
    const body = figure.querySelector<HTMLElement>(".html-embed-body")
    if (!body) return
    installControls(figure)
    const title = body.textContent?.trim() || src
    const reusable = parked.findIndex((frame) => frameKeys.get(frame) === key)
    if (reusable >= 0) {
      const [frame] = parked.splice(reusable, 1)
      const height = frameHeights.get(frame)
      body.replaceChildren()
      body.removeAttribute("aria-hidden")
      if (height) body.style.minHeight = `${height}px`
      if (moveFrame(frame, body)) {
        body.style.minHeight = ""
        return
      }
    }
    let load = fileCache.get(key)
    if (!load) {
      load = readHtmlEmbedFile(url)
      fileCache.set(key, load)
      load.catch(() => fileCache.delete(key))
    }
    try {
      const frame = createFrame(key, await load, title)
      body.replaceChildren(frame)
      body.removeAttribute("aria-hidden")
      body.style.minHeight = ""
    } catch {
      showError(figure, src)
    }
  })
  for (const frame of parked) frame.remove()
  await Promise.all(loads)
}

// Paths as written in each embed whose image line stands alone in its paragraph.
export function findHtmlEmbedSources(tokens: { type: string; meta?: unknown }[]): string[] {
  const sources = tokens
    .filter((token) => token.type === "html_embed")
    .map((token) => (token.meta as { src: string }).src)
  return Array.from(new Set(sources))
}
