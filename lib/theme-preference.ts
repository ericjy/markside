export const THEME_PREFERENCE_STORAGE_KEY = "themePreference"

export async function getThemePreference(): Promise<boolean | null> {
  const stored = await chrome.storage.local.get(THEME_PREFERENCE_STORAGE_KEY)
  const preference = stored[THEME_PREFERENCE_STORAGE_KEY]
  if (preference === "dark") return true
  if (preference === "light") return false
  return null
}

export async function setThemePreference(dark: boolean): Promise<void> {
  await chrome.storage.local.set({
    [THEME_PREFERENCE_STORAGE_KEY]: dark ? "dark" : "light",
  })
}
