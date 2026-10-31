import { findContentScriptFile } from "./content-script-injection"

export const WEB_PREVIEW_ORIGINS = ["http://*/*", "https://*/*"]
const SCRIPT_ID = "web-markdown-preview"
const ENABLED_KEY = "webPreviewEnabled"
const WEB_MARKDOWN_MATCHES = ["*.md*", "*.mD*", "*.Md*", "*.MD*", "*.ma*", "*.mA*", "*.Ma*", "*.MA*"]
  .map(path => `*://*/${path}`)

export function isWebMarkdownUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return (url.protocol === "http:" || url.protocol === "https:") && /\.(?:md|markdown|mdx)$/i.test(url.pathname)
  } catch {
    return false
  }
}

export function webDocumentIdentity(value: string): { filename: string; source: string; kind: "github" | "gitlab" | "bitbucket" | "website" } {
  const url = new URL(value)
  const parts = url.pathname.split("/").filter(Boolean)
  const last = parts.at(-1) || url.host
  let filename = last
  try { filename = decodeURIComponent(last) } catch { /* Keep the URL spelling. */ }
  if (url.hostname === "raw.githubusercontent.com" && parts.length >= 4) {
    return { filename, source: `${parts[0]}/${parts[1]}`, kind: "github" }
  }
  const marker = parts.indexOf("-")
  if (url.hostname === "gitlab.com" && marker >= 2 && parts[marker + 1] === "raw" && parts.length >= marker + 4) {
    return { filename, source: parts.slice(0, marker).join("/"), kind: "gitlab" }
  }
  if (url.hostname === "bitbucket.org" && parts[2] === "raw" && parts.length >= 5) {
    return { filename, source: `${parts[0]}/${parts[1]}`, kind: "bitbucket" }
  }
  return { filename, source: url.host, kind: "website" }
}

export async function webPreviewEnabled(): Promise<boolean> {
  const scripts = await chrome.scripting.getRegisteredContentScripts({ ids: [SCRIPT_ID] })
  return scripts.length > 0 && await chrome.permissions.contains({ origins: WEB_PREVIEW_ORIGINS })
}

export async function setWebPreviewEnabled(enabled: boolean): Promise<boolean> {
  if (!enabled) {
    await chrome.storage.local.set({ [ENABLED_KEY]: false })
    const scripts = await chrome.scripting.getRegisteredContentScripts({ ids: [SCRIPT_ID] })
    if (scripts.length) await chrome.scripting.unregisterContentScripts({ ids: [SCRIPT_ID] })
    if (!await chrome.permissions.remove({ origins: WEB_PREVIEW_ORIGINS })) throw new Error("Website access could not be removed")
    return false
  }
  const granted = await chrome.permissions.request({ origins: WEB_PREVIEW_ORIGINS })
  if (!granted) return false
  const response = await chrome.runtime.sendMessage({ type: "enable-web-preview" })
  if (!response?.ok) throw new Error(response?.error ?? "Online preview could not be enabled")
  return true
}

// Chrome may close the popup while the user responds to the permission prompt.
// The service worker completes this work from permissions.onAdded independently.
export async function completeWebPreviewEnable(): Promise<void> {
  if (!await chrome.permissions.contains({ origins: WEB_PREVIEW_ORIGINS })) return
  await registerWebPreview()
  await chrome.storage.local.set({ [ENABLED_KEY]: true })
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true }).catch(() => [])
  if (tab?.id !== undefined && tab.url && isWebMarkdownUrl(tab.url)) {
    await previewActiveWebTab(tab.id).catch(() => false)
  }
}

export async function restoreWebPreview(): Promise<void> {
  const saved = await chrome.storage.local.get(ENABLED_KEY)
  if (saved[ENABLED_KEY] !== false && await chrome.permissions.contains({ origins: WEB_PREVIEW_ORIGINS })) {
    await registerWebPreview()
    await chrome.storage.local.set({ [ENABLED_KEY]: true })
  }
}

export async function registerWebPreview(): Promise<void> {
  const file = findContentScriptFile(chrome.runtime.getManifest(), "markside")
  if (!file) throw new Error("Markside content script not found")
  const scripts = await chrome.scripting.getRegisteredContentScripts({ ids: [SCRIPT_ID] })
  const script: chrome.scripting.RegisteredContentScript = {
    id: SCRIPT_ID,
    matches: WEB_MARKDOWN_MATCHES,
    js: ["vega-engine-loader.js", file],
    runAt: "document_idle",
    persistAcrossSessions: true,
  }
  if (scripts.length) await chrome.scripting.updateContentScripts([script])
  else await chrome.scripting.registerContentScripts([script])
}

export async function previewActiveWebTab(tabId: number): Promise<boolean> {
  const [result] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => document.getElementById("markside-mount") ? "rendered" : document.contentType === "text/plain" && document.body?.children.length === 1 && document.body.firstElementChild?.tagName === "PRE" ? "eligible" : "ineligible",
  })
  if (result?.result === "rendered") return true
  if (result?.result !== "eligible") return false
  const file = findContentScriptFile(chrome.runtime.getManifest(), "markside")
  if (!file) return false
  await chrome.scripting.executeScript({ target: { tabId }, files: ["vega-engine-loader.js", file] })
  return true
}
