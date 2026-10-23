export type MarkdownMode = "preview" | "source" | "split"
export const MIN_SPLIT_PANE_WIDTH = 320
export const MARKDOWN_MODE_STORAGE_KEY = "markdownMode"

export async function getMarkdownMode(): Promise<MarkdownMode> {
  const stored = await chrome.storage.local.get(MARKDOWN_MODE_STORAGE_KEY)
  const mode = stored[MARKDOWN_MODE_STORAGE_KEY]
  return mode === "source" || mode === "split" ? mode : "preview"
}

export async function setMarkdownMode(mode: MarkdownMode): Promise<void> {
  await chrome.storage.local.set({ [MARKDOWN_MODE_STORAGE_KEY]: mode })
}

export const SPLIT_PERCENT_STORAGE_KEY = "splitPreviewPercent"
export const DEFAULT_SPLIT_PERCENT = 50

export async function getSplitPercent(): Promise<number> {
  const stored = await chrome.storage.local.get(SPLIT_PERCENT_STORAGE_KEY)
  const percent = stored[SPLIT_PERCENT_STORAGE_KEY]
  // A pane the window can no longer fit is clamped again once its width is known.
  return typeof percent === "number" && percent > 0 && percent < 100
    ? percent
    : DEFAULT_SPLIT_PERCENT
}

export async function setSplitPercent(percent: number): Promise<void> {
  await chrome.storage.local.set({ [SPLIT_PERCENT_STORAGE_KEY]: percent })
}

export const PREVIEW_FULL_WIDTH_STORAGE_KEY = "previewFullWidth"
export const PREVIEW_WIDTH_STORAGE_KEY = "previewWidth"
export const SOURCE_FULL_WIDTH_STORAGE_KEY = "sourceFullWidth"

export type PreviewWidth = "narrow" | "standard" | "full"

export type PaneWidthPreferences = {
  previewWidth: PreviewWidth
  sourceFullWidth: boolean
}

export const DEFAULT_PANE_WIDTH_PREFERENCES: PaneWidthPreferences = {
  previewWidth: "standard",
  sourceFullWidth: true,
}

export async function getPaneWidthPreferences(): Promise<PaneWidthPreferences> {
  const stored = await chrome.storage.local.get([
    PREVIEW_WIDTH_STORAGE_KEY,
    PREVIEW_FULL_WIDTH_STORAGE_KEY,
    SOURCE_FULL_WIDTH_STORAGE_KEY,
  ])
  const width = stored[PREVIEW_WIDTH_STORAGE_KEY]
  return {
    previewWidth: width === "narrow" || width === "standard" || width === "full"
      ? width
      : stored[PREVIEW_FULL_WIDTH_STORAGE_KEY] === true ? "full" : "standard",
    sourceFullWidth: typeof stored[SOURCE_FULL_WIDTH_STORAGE_KEY] === "boolean"
      ? stored[SOURCE_FULL_WIDTH_STORAGE_KEY]
      : DEFAULT_PANE_WIDTH_PREFERENCES.sourceFullWidth,
  }
}

export async function setPreviewWidthPreference(width: PreviewWidth): Promise<void> {
  await chrome.storage.local.set({ [PREVIEW_WIDTH_STORAGE_KEY]: width })
}

export async function setSourceFullWidthPreference(fullWidth: boolean): Promise<void> {
  await chrome.storage.local.set({ [SOURCE_FULL_WIDTH_STORAGE_KEY]: fullWidth })
}

export const LEFT_OPEN_STORAGE_KEY = "leftOpen"

export async function getLeftOpenPreference(): Promise<boolean> {
  const stored = await chrome.storage.local.get(LEFT_OPEN_STORAGE_KEY)
  const open = stored[LEFT_OPEN_STORAGE_KEY]
  return typeof open === "boolean" ? open : true
}

export async function setLeftOpenPreference(open: boolean): Promise<void> {
  await chrome.storage.local.set({ [LEFT_OPEN_STORAGE_KEY]: open })
}

export const OUTLINE_OPEN_STORAGE_KEY = "outlineOpen"

// null means the user has never toggled the outline, so the window width decides.
export async function getOutlineOpenPreference(): Promise<boolean | null> {
  const stored = await chrome.storage.local.get(OUTLINE_OPEN_STORAGE_KEY)
  const open = stored[OUTLINE_OPEN_STORAGE_KEY]
  return typeof open === "boolean" ? open : null
}

export async function setOutlineOpenPreference(open: boolean): Promise<void> {
  await chrome.storage.local.set({ [OUTLINE_OPEN_STORAGE_KEY]: open })
}

interface SidebarState {
  leftOpen: boolean
  outlineOpen: boolean
}

export function resolveInitialSidebarState({
  mode,
  isMarkdown,
  leftOpenByDefault = true,
  outlineOpenByDefault,
}: {
  mode: MarkdownMode
  isMarkdown: boolean
  leftOpenByDefault?: boolean
  outlineOpenByDefault: boolean
}): SidebarState & {
  stateBeforeSplit: SidebarState | null
  wasSplitView: boolean
} {
  const defaultState = {
    leftOpen: leftOpenByDefault,
    outlineOpen: outlineOpenByDefault,
  }
  const wasSplitView = isMarkdown && mode === "split"
  return wasSplitView
    ? {
        leftOpen: false,
        outlineOpen: false,
        stateBeforeSplit: defaultState,
        wasSplitView,
      }
    : {
        ...defaultState,
        stateBeforeSplit: null,
        wasSplitView,
      }
}

export function getModeSurfaces(mode: MarkdownMode) {
  return {
    preview: mode === "preview" || mode === "split",
    source: mode === "source" || mode === "split",
  }
}

export function toggleSourceMode(mode: MarkdownMode): MarkdownMode {
  return mode === "preview" ? "source" : "preview"
}

interface ModeTransitionInput {
  currentMode: MarkdownMode
  nextMode: MarkdownMode
  content: string | null
  draft: string
}

export function resolveModeTransition({
  currentMode,
  nextMode,
  content,
  draft,
}: ModeTransitionInput) {
  if (currentMode === nextMode) {
    return { mode: currentMode, content, draft }
  }
  if (nextMode === "preview") {
    return { mode: nextMode, content: draft, draft }
  }
  if (currentMode === "preview") {
    return { mode: nextMode, content, draft: content ?? "" }
  }
  if (nextMode === "split") {
    return { mode: nextMode, content: draft, draft }
  }
  return { mode: nextMode, content, draft }
}

interface DraftContentSyncInput {
  content: string | null
  isMarkdown: boolean
  sourceVisible: boolean
  isSplitView: boolean
  hasPendingDraftSync: boolean
}

export function shouldSyncDraftFromContent({
  content,
  isMarkdown,
  sourceVisible,
  isSplitView,
  hasPendingDraftSync,
}: DraftContentSyncInput) {
  if (content === null || (!sourceVisible && isMarkdown)) return false
  return !isSplitView || hasPendingDraftSync
}

export function clampSplitPercent(
  percent: number,
  containerWidth: number,
  minPaneWidth = MIN_SPLIT_PANE_WIDTH,
) {
  if (containerWidth <= minPaneWidth * 2) return 50
  const minPercent = (minPaneWidth / containerWidth) * 100
  return Math.min(100 - minPercent, Math.max(minPercent, percent))
}

// Each pane keeps its minimum width, so the split container needs room for both.
export function getSplitMinWidth(previewPercent: number, minPaneWidth = MIN_SPLIT_PANE_WIDTH) {
  return Math.max(
    minPaneWidth * 2,
    (minPaneWidth * 100) / previewPercent,
    (minPaneWidth * 100) / (100 - previewPercent),
  )
}
