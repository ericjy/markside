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

// The draft tab records its saved filename for the popup; the handle never
// reveals a path, and session storage ends with the browser session.
function savedDraftKey(tabId: number) {
  return `savedDraft:${tabId}`
}

export async function recordSavedDraft(tabId: number, fileName: string): Promise<void> {
  await chrome.storage.session.set({ [savedDraftKey(tabId)]: fileName })
}

export async function readSavedDraftName(tabId: number): Promise<string | null> {
  const name = (await chrome.storage.session.get(savedDraftKey(tabId)))[savedDraftKey(tabId)]
  return typeof name === "string" ? name : null
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

// The draft's first heading, or its first line without Markdown markers.
export function describeDraftTitle(content: string): string {
  const { body } = parseFrontmatter(content)
  const heading = extractHeadings(body)[0]?.text
  if (heading) return heading
  const line = body.split("\n").map((text) => text.trim()).find(Boolean) ?? ""
  return line.replace(/^(?:[#>*+-]|\d+[.)]|\[[ xX]\])\s*/g, "").replace(/[*_`]/g, "").trim()
}

// Split when both panes get their minimum width; otherwise the editor alone.
export function initialDraftMode(windowWidth: number): MarkdownMode {
  return windowWidth >= 2 * MIN_SPLIT_PANE_WIDTH ? "split" : "source"
}

// Lowercase words joined by hyphens, as file names in repositories usually are.
export function suggestDraftFileName(content: string): string {
  const heading = extractHeadings(parseFrontmatter(content).body)[0]?.text ?? ""
  const name = heading
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .slice(0, 80)
    .replace(/^-+|-+$/g, "")
  return `${name || "untitled"}.md`
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
