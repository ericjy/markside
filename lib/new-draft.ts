import { parseFrontmatter } from "./frontmatter"
import { extractHeadings } from "./headings"
import { MIN_SPLIT_PANE_WIDTH, type MarkdownMode } from "./markdown-mode"

export const NEW_DRAFT_STORAGE_KEY = "newDraft"
export const NEW_DRAFT_PAGE = "tabs/draft.html"

// Kept only until the draft's first save; `tabId` is the tab editing it.
export interface StoredDraft {
  content: string
  updatedAt: string
  tabId: number | null
}

export async function readStoredDraft(): Promise<StoredDraft | null> {
  const stored = (await chrome.storage.local.get(NEW_DRAFT_STORAGE_KEY))[NEW_DRAFT_STORAGE_KEY]
  if (!stored || typeof stored.content !== "string") return null
  return {
    content: stored.content,
    updatedAt: typeof stored.updatedAt === "string" ? stored.updatedAt : "",
    tabId: typeof stored.tabId === "number" ? stored.tabId : null,
  }
}

export async function storeDraft(draft: StoredDraft): Promise<void> {
  await chrome.storage.local.set({ [NEW_DRAFT_STORAGE_KEY]: draft })
}

export async function clearStoredDraft(): Promise<void> {
  await chrome.storage.local.remove(NEW_DRAFT_STORAGE_KEY)
}

// Split when both panes get their minimum width; otherwise the editor alone.
export function initialDraftMode(windowWidth: number): MarkdownMode {
  return windowWidth >= 2 * MIN_SPLIT_PANE_WIDTH ? "split" : "source"
}

export function suggestDraftFileName(content: string): string {
  const heading = extractHeadings(parseFrontmatter(content).body)[0]?.text ?? ""
  const name = heading
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 100)
    .trim()
  return `${name || "Untitled"}.md`
}

// Focuses the tab still editing the unsaved draft, or opens a draft tab.
export async function openNewDraft(): Promise<void> {
  const draftUrl = chrome.runtime.getURL(NEW_DRAFT_PAGE)
  const tabId = (await readStoredDraft())?.tabId
  if (tabId != null) {
    const contexts = await chrome.runtime.getContexts({
      contextTypes: [chrome.runtime.ContextType.TAB],
      tabIds: [tabId],
    })
    if (contexts.some((context) => context.documentUrl?.startsWith(draftUrl))) {
      const tab = await chrome.tabs.update(tabId, { active: true })
      if (tab) await chrome.windows.update(tab.windowId, { focused: true })
      return
    }
  }
  await chrome.tabs.create({ url: draftUrl })
}
