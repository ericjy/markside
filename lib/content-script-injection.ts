// A content script only runs on pages that were loaded after the extension was
// installed or reloaded, so the tab a user is looking at when they first open
// the popover may have none. Rather than asking them to reload the page, the
// popover injects it.

export function findContentScriptFile(
  manifest: chrome.runtime.Manifest,
  name: string,
): string | null {
  for (const entry of manifest.content_scripts ?? []) {
    const file = entry.js?.find((candidate) => candidate.split("/").pop()?.startsWith(name))
    if (file) return file
  }
  return null
}

export async function ensureContentScript(tabId: number, name: string): Promise<void> {
  const file = findContentScriptFile(chrome.runtime.getManifest(), name)
  if (!file) return
  // The script guards its own bootstrap, so injecting one that is already
  // running does nothing.
  await chrome.scripting.executeScript({ target: { tabId }, files: [file] })
}
