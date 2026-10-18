export interface DirectoryEntry {
  rootUrl: string
  handle: FileSystemDirectoryHandle
}

export function selectDirectoryEntry(
  entries: readonly DirectoryEntry[],
  fileUrl: string,
): DirectoryEntry | null {
  const documentUrl = fileUrl.split("#")[0]
  let selected: DirectoryEntry | null = null

  for (const entry of entries) {
    if (!entry.rootUrl.endsWith("/")) continue
    if (!documentUrl.startsWith(entry.rootUrl)) continue
    if (!selected || entry.rootUrl.length > selected.rootUrl.length) {
      selected = entry
    }
  }

  return selected
}

export function mergeLegacyDirectoryEntry(
  entries: readonly DirectoryEntry[],
  legacy: DirectoryEntry | null,
): { entries: DirectoryEntry[]; imported: DirectoryEntry | null } {
  if (!legacy || entries.some((entry) => entry.rootUrl === legacy.rootUrl)) {
    return { entries: [...entries], imported: null }
  }

  return {
    entries: [...entries, legacy],
    imported: legacy,
  }
}
