const FILE_TREE_EXPANSION_STORAGE_PREFIX = "fileTreeExpandedPaths:"

export function getExpandedFileTreeStorageKey(rootUrl: string): string {
  return `${FILE_TREE_EXPANSION_STORAGE_PREFIX}${rootUrl}`
}

export function readExpandedFileTreePaths(value: unknown): string[] {
  if (!Array.isArray(value)) return []

  return [...new Set(value.filter((path): path is string =>
    typeof path === "string" && path.length > 0
  ))]
}

export function updateExpandedFileTreePaths(
  paths: readonly string[],
  path: string,
  expanded: boolean,
): string[] {
  const next = new Set(paths)
  if (expanded) next.add(path)
  else next.delete(path)
  return [...next]
}

export function revealFileTreeFolder(
  paths: readonly string[],
  folder: string,
): string[] {
  const next = new Set(paths)
  const names = folder.split("/")
  names.forEach((_, index) => next.add(names.slice(0, index + 1).join("/")))
  return [...next]
}

export async function getExpandedFileTreePaths(
  rootUrl: string,
): Promise<string[]> {
  const key = getExpandedFileTreeStorageKey(rootUrl)
  const stored = await chrome.storage.local.get(key)
  return readExpandedFileTreePaths(stored[key])
}

export async function setExpandedFileTreePaths(
  rootUrl: string,
  paths: readonly string[],
): Promise<void> {
  const key = getExpandedFileTreeStorageKey(rootUrl)
  await chrome.storage.local.set({ [key]: [...paths] })
}

const SIDEBAR_SCROLL_PREFIX = "sidebarScrollTop:"

export async function getSidebarScrollTop(rootUrl: string): Promise<number | null> {
  const key = `${SIDEBAR_SCROLL_PREFIX}${rootUrl}`
  const stored = await chrome.storage.local.get(key)
  const value = stored[key]
  return typeof value === "number" ? value : null
}

export async function setSidebarScrollTop(rootUrl: string, scrollTop: number): Promise<void> {
  await chrome.storage.local.set({ [`${SIDEBAR_SCROLL_PREFIX}${rootUrl}`]: scrollTop })
}

export async function clearSidebarScrollTop(rootUrl: string): Promise<void> {
  await chrome.storage.local.remove(`${SIDEBAR_SCROLL_PREFIX}${rootUrl}`)
}
