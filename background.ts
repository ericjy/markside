export {}

import { FILE_ACCESS_SETUP_KEY } from "~lib/file-access-setup"
import { HOSTED_SNAPSHOT_UPLOAD_URL, SNAPSHOT_ORIGIN } from "~lib/hosted-snapshot"
import { LOCALHOST_REVIEW_ENABLED } from "~lib/localhost-review"
import { READABILITY_CHECK_ENABLED } from "~lib/readability-service"
import { uninstallSurveyUrl } from "~lib/uninstall-survey"
import { documentReviewEntries, getReviewBadgeText, resolveReviewIndex, REVIEW_INDEX_KEY } from "~lib/review-index"

// The toolbar icon carries the number of Review items waiting to be handed to an
// agent, so pending feedback stays visible without opening the popover.
async function paintReviewBadge() {
  const stored = await chrome.storage.local.get(REVIEW_INDEX_KEY)
  const entries = resolveReviewIndex(stored[REVIEW_INDEX_KEY])
  const text = getReviewBadgeText(LOCALHOST_REVIEW_ENABLED ? entries : documentReviewEntries(entries))
  await chrome.action.setBadgeText({ text })
  if (text) await chrome.action.setBadgeBackgroundColor({ color: "#078a52" })
}

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && REVIEW_INDEX_KEY in changes) void paintReviewBadge()
})
chrome.runtime.onStartup.addListener(() => void paintReviewBadge())
chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  void paintReviewBadge()
  // New installs land on Setup because the toolbar icon starts unpinned, so the
  // popup's file-access guidance is otherwise easy to miss.
  if (reason === "install" && !(await chrome.extension.isAllowedFileSchemeAccess())) {
    await chrome.runtime.openOptionsPage()
  }
})
void paintReviewBadge()
void chrome.runtime.setUninstallURL(uninstallSurveyUrl(SNAPSHOT_ORIGIN, chrome.runtime.getManifest().version))

async function confirmFileAccessSetup() {
  const stored = await chrome.storage.local.get(FILE_ACCESS_SETUP_KEY)
  if (stored[FILE_ACCESS_SETUP_KEY] && (await chrome.extension.isAllowedFileSchemeAccess())) {
    await chrome.runtime.openOptionsPage()
  }
}
void confirmFileAccessSetup()

function encodeBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ""
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000))
  }
  return btoa(binary)
}

// Relay fetch requests from content scripts (needed for file:// URLs)
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "consume-new-markdown-file") {
    const key = `newMarkdownTab:${_sender.tab?.id}`
    void chrome.storage.session.get(key).then(async stored => {
      const created = typeof stored[key] === "string" && stored[key] === _sender.url
      await chrome.storage.session.remove(key)
      sendResponse({ created })
    }).catch(() => sendResponse({ created: false }))
    return true
  }
  if (msg.type === "new-markdown-file") {
    if (!_sender.tab || typeof msg.url !== "string" || !msg.url.startsWith("file:///") || !msg.url.endsWith(".md")) {
      sendResponse({ error: "Invalid Markdown file URL" })
      return
    }
    void (async () => {
      // Record the one-time Source mode request before loading the file.
      const tab = await chrome.tabs.create({ url: "about:blank", active: false })
      const key = `newMarkdownTab:${tab.id}`
      try {
        await chrome.storage.session.set({ [key]: msg.url })
        await chrome.tabs.update(tab.id!, { url: msg.url, active: true })
      } catch (error) {
        await chrome.storage.session.remove(key)
        await chrome.tabs.remove(tab.id!)
        throw error
      }
      sendResponse({ ok: true })
    })().catch(error => sendResponse({ error: error.message }))
    return true
  }
  if (msg.type === "fetch-file") {
    fetch(msg.url)
      .then((r) => r.text())
      .then((text) => sendResponse({ text }))
      .catch((err) => sendResponse({ error: err.message }))
    return true // Keep channel open for async response
  }

  if (msg.type === "fetch-file-data") {
    fetch(msg.url)
      .then(async (response) => ({
        base64: encodeBase64(await response.arrayBuffer()),
        type: response.headers.get("content-type") ?? "application/octet-stream",
      }))
      .then(sendResponse)
      .catch((err) => sendResponse({ error: err.message }))
    return true
  }

  if (msg.type === "upload-snapshot") {
    fetch(HOSTED_SNAPSHOT_UPLOAD_URL, {
      method: "POST",
      headers: {
        "content-type": "application/octet-stream",
        "x-snapshot-expiry-days": String(msg.days),
      },
      body: new Uint8Array(msg.blob),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Upload failed (${response.status})`)
        const { id } = await response.json() as { id: string }
        sendResponse({ id })
      })
      .catch((err) => sendResponse({ error: err.message }))
    return true
  }

  if (READABILITY_CHECK_ENABLED && msg.type === "check-readability") {
    if (!_sender.tab || !_sender.url?.startsWith("file:///") || typeof msg.section !== "string" || !msg.section.trim()) {
      sendResponse({ error: "Invalid readability section" })
      return
    }
    fetch(`${SNAPSHOT_ORIGIN}/api/readability`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ section: msg.section }),
    }).then(async (response) => {
      const body = await response.json() as { scores?: unknown; error?: string }
      sendResponse(response.ok ? { scores: body.scores } : { error: body.error ?? "Readability Check failed" })
    }).catch(() => sendResponse({ error: "Readability Check is unavailable" }))
    return true
  }
  if (READABILITY_CHECK_ENABLED && msg.type === "locate-readability") {
    if (!_sender.tab || !_sender.url?.startsWith("file:///") || typeof msg.section !== "string" || !msg.section.trim() || !Array.isArray(msg.dimensions)) {
      sendResponse({ error: "Invalid readability section" })
      return
    }
    fetch(`${SNAPSHOT_ORIGIN}/api/readability-locate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ section: msg.section, dimensions: msg.dimensions }),
    }).then(async (response) => {
      const body = await response.json() as { findings?: unknown; error?: string }
      sendResponse(response.ok ? { findings: body.findings } : { error: body.error ?? "Locating sentences failed" })
    }).catch(() => sendResponse({ error: "Locating sentences is unavailable" }))
    return true
  }

  if (msg.type === "navigate-file") {
    const tabId = _sender.tab?.id
    if (
      tabId === undefined ||
      typeof msg.url !== "string" ||
      !msg.url.startsWith("file:///")
    ) {
      sendResponse({ error: "Invalid local file navigation" })
      return
    }

    chrome.tabs.update(tabId, { url: msg.url }, () => {
      const error = chrome.runtime.lastError
      sendResponse(error ? { error: error.message } : { ok: true })
    })
    return true
  }
})
