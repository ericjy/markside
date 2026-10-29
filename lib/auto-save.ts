export const AUTO_SAVE_STORAGE_KEY = "autoSaveEnabled"
export const AUTO_SAVE_DELAY_MS = 1500

export function resolveAutoSaveEnabled(value: unknown): boolean {
  return value === true
}

export async function getAutoSaveEnabled(): Promise<boolean> {
  const stored = await chrome.storage.local.get(AUTO_SAVE_STORAGE_KEY)
  return resolveAutoSaveEnabled(stored[AUTO_SAVE_STORAGE_KEY])
}

export async function setAutoSaveEnabled(enabled: boolean): Promise<void> {
  await chrome.storage.local.set({ [AUTO_SAVE_STORAGE_KEY]: enabled })
}

export function watchAutoSaveEnabled(
  onChange: (enabled: boolean) => void
): () => void {
  const listener = (
    changes: Record<string, chrome.storage.StorageChange>,
    areaName: string
  ) => {
    if (areaName !== "local") return
    const change = changes[AUTO_SAVE_STORAGE_KEY]
    if (change) onChange(resolveAutoSaveEnabled(change.newValue))
  }
  chrome.storage.onChanged.addListener(listener)
  return () => chrome.storage.onChanged.removeListener(listener)
}

export function resolveUnsavedNavigationPolicy({
  autoSaveEnabled,
  hasUnsavedDraft,
}: {
  autoSaveEnabled: boolean
  hasUnsavedDraft: boolean
}): "navigate" | "save" | "confirm" {
  if (!hasUnsavedDraft) return "navigate"
  return autoSaveEnabled ? "save" : "confirm"
}
