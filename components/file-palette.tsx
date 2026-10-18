import { Search } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { useFileIndex, type IndexedFile } from "~hooks/use-file-index"
import { fuzzySearch } from "~lib/fuzzy"

interface FilePaletteProps {
  open: boolean
  rootHandle: FileSystemDirectoryHandle | null
  rootUrl: string | null
  onFileSelect: (url: string, handle: FileSystemFileHandle) => void
  onClose: () => void
}

export function FilePalette({
  open,
  rootHandle,
  rootUrl,
  onFileSelect,
  onClose
}: FilePaletteProps) {
  const [query, setQuery] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const { files, loading, error } = useFileIndex(rootHandle, open)

  const results = fuzzySearch(query, files)

  // Reset state and focus input when palette opens
  useEffect(() => {
    if (open) {
      setQuery("")
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  // Reset selection to 0 when query changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  // Scroll the selected row into view on keyboard navigation
  useEffect(() => {
    const el = listRef.current?.children[selectedIndex] as HTMLElement | undefined
    el?.scrollIntoView({ block: "nearest" })
  }, [selectedIndex])

  const openFile = (entry: IndexedFile) => {
    if (!rootUrl) return
    onFileSelect(rootUrl + entry.path, entry.handle)
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      const entry = results[selectedIndex]
      if (entry) openFile(entry)
    } else if (e.key === "Escape") {
      onClose()
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[18vh] bg-black/50"
      onClick={onClose}>
      <div
        className="w-full max-w-lg mx-4 bg-background border rounded-lg shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}>

        {/* Search input */}
        <div className="flex items-center gap-2 px-3 border-b">
          <Search size={15} className="text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search files…"
            className="flex-1 py-3 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
          />
        </div>

        {/* Results area */}
        <div className="max-h-72 overflow-y-auto">
          {loading && (
            <p className="px-4 py-6 text-sm text-muted-foreground text-center">
              Loading…
            </p>
          )}
          {error && (
            <p className="px-4 py-6 text-sm text-destructive text-center">
              Could not read folder
            </p>
          )}
          {!loading && !error && results.length === 0 && (
            <p className="px-4 py-6 text-sm text-muted-foreground text-center">
              {files.length === 0 ? "No files" : "No results"}
            </p>
          )}
          {!loading && !error && results.length > 0 && (
            <ul ref={listRef}>
              {results.map((entry, i) => {
                const dir = entry.path.includes("/")
                  ? entry.path.slice(0, entry.path.lastIndexOf("/"))
                  : ""
                return (
                  <li
                    key={entry.path}
                    onClick={() => openFile(entry)}
                    className={`px-4 py-2 cursor-pointer ${
                      i === selectedIndex ? "bg-accent" : "hover:bg-accent/50"
                    }`}>
                    <p className="text-sm font-medium truncate">{entry.name}</p>
                    {dir && (
                      <p className="text-xs text-muted-foreground truncate">{dir}</p>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
