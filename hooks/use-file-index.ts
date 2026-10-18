import { useEffect, useState } from "react"
import { SKIP } from "~hooks/use-file-tree"

export type IndexedFile = {
  name: string
  path: string
  handle: FileSystemFileHandle
}

async function walkDir(
  handle: FileSystemDirectoryHandle,
  prefix: string,
  results: IndexedFile[]
): Promise<void> {
  for await (const entry of handle.values()) {
    if (SKIP.has(entry.name)) continue
    const path = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.kind === "directory") {
      await walkDir(entry as FileSystemDirectoryHandle, path, results)
    } else {
      results.push({
        name: entry.name,
        path,
        handle: entry as FileSystemFileHandle
      })
    }
  }
}

export function useFileIndex(
  rootHandle: FileSystemDirectoryHandle | null,
  enabled: boolean
): { files: IndexedFile[]; loading: boolean; error: boolean } {
  const [files, setFiles] = useState<IndexedFile[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return
    }
    if (!rootHandle) {
      setFiles([])
      setLoading(false)
      setError(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(false)
    const results: IndexedFile[] = []
    walkDir(rootHandle, "", results)
      .then(() => {
        if (!cancelled) {
          setFiles(results)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true)
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [enabled, rootHandle])

  return { files, loading, error }
}
