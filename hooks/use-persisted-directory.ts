// hooks/usePersistedDirectory.ts
import { useCallback, useEffect, useState } from "react"
import {
  getDirectoryEntryForUrl,
  upsertDirectoryEntry,
} from "~lib/db"
import { deriveRootUrl } from "~lib/url"

export type DirectoryStatus = "loading" | "idle" | "prompt" | "granted"

export type FolderError = { picked: string; expected: string | null }

export interface PersistedDirectoryResult {
  handle: FileSystemDirectoryHandle | null
  rootUrl: string | null
  status: DirectoryStatus
  openDirectory: (mode?: "read" | "readwrite") => Promise<boolean>
  reauthorize: () => Promise<void>
  folderError: FolderError | null
}

export function usePersistedDirectory(): PersistedDirectoryResult {
  const [handle, setHandle] = useState<FileSystemDirectoryHandle | null>(null)
  const [rootUrl, setRootUrl] = useState<string | null>(null)
  const [status, setStatus] = useState<DirectoryStatus>("loading")
  const [folderError, setFolderError] = useState<FolderError | null>(null)

  useEffect(() => {
    const currentUrl = window.location.href.split("#")[0]

    getDirectoryEntryForUrl(currentUrl)
      .then(async (entry) => {
        if (!entry) {
          setStatus("idle")
          return
        }
        const perm = await entry.handle.queryPermission({ mode: "read" })
        setHandle(entry.handle)
        setRootUrl(entry.rootUrl)
        setStatus(perm === "granted" ? "granted" : "prompt")
      })
      .catch(() => setStatus("idle"))
  }, [])

  const openDirectory = useCallback(async (mode: "read" | "readwrite" = "read") => {
    try {
      const dirHandle = await window.showDirectoryPicker({ mode })
      const root = deriveRootUrl(dirHandle.name, window.location.href)
      const isIncomplete = !root.slice("file:///".length, -1).includes("/")
      if (isIncomplete) {
        const currentFolder = window.location.href.split("#")[0]
          .split("/").filter(Boolean).slice(-2, -1)[0]
        setFolderError({
          picked: dirHandle.name,
          expected: currentFolder ? decodeURIComponent(currentFolder) : null,
        })
        return false
      }
      setFolderError(null)
      await upsertDirectoryEntry({ handle: dirHandle, rootUrl: root })
      setHandle(dirHandle)
      setRootUrl(root)
      setStatus("granted")
      return true
    } catch {
      // User cancelled the picker — no state change
      return false
    }
  }, [])

  const reauthorize = useCallback(async () => {
    if (!handle) return
    const perm = await handle.requestPermission({ mode: "read" })
    if (perm === "granted") setStatus("granted")
  }, [handle])

  return { handle, rootUrl, status, openDirectory, reauthorize, folderError }
}
