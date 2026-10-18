import { getSavePathParts } from "./content-app-policy"
import { getDirectoryEntryForUrl } from "./db"

type PermissionMode = "read" | "readwrite"
export type PermissionCapableHandle = {
  queryPermission?: (descriptor: { mode: PermissionMode }) => Promise<PermissionState>
  requestPermission?: (descriptor: { mode: PermissionMode }) => Promise<PermissionState>
}
// ─── Helpers ─────────────────────────────────────────────────────────────────

export async function queryHandlePermission(
  handle: PermissionCapableHandle,
  mode: PermissionMode
): Promise<PermissionState> {
  return handle.queryPermission ? handle.queryPermission({ mode }) : "granted"
}

export async function requestHandlePermission(
  handle: PermissionCapableHandle,
  mode: PermissionMode
): Promise<PermissionState> {
  return handle.requestPermission ? handle.requestPermission({ mode }) : "granted"
}

export function normalizeDiskText(text: string | null) {
  return text?.replace(/\r\n?/g, "\n") ?? null
}

// Try to obtain a writable FileSystemFileHandle by traversing the matching
// opened directory handle stored in IndexedDB. This avoids showSaveFilePicker
// (full OS file picker) — at most it shows the browser's small
// requestPermission prompt. Returns null if no saved directory contains the
// file.
export async function tryHandleFromDirectory(
  url: string
): Promise<FileSystemFileHandle | null> {
  try {
    const entry = await getDirectoryEntryForUrl(url)
    if (!entry) return null
    const parts = getSavePathParts(url, entry.rootUrl)
    if (!parts) return null
    const perm = await requestHandlePermission(entry.handle, "readwrite")
    if (perm !== "granted") return null
    let dir: FileSystemDirectoryHandle = entry.handle
    for (let i = 0; i < parts.length - 1; i++) {
      dir = await dir.getDirectoryHandle(parts[i])
    }
    return await dir.getFileHandle(parts[parts.length - 1])
  } catch {
    return null
  }
}
