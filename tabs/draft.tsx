import { Columns2, Eye, Pencil, Trash2, X } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

import { MarkdownRenderer } from "~components/markdown-renderer"
import { RawEditor } from "~components/raw-editor"
import { Button } from "~components/ui/button"
import { useContentPreferences } from "~hooks/use-content-preferences"
import { isSaveShortcut, isToggleSourceShortcut } from "~lib/content-app-policy"
import { toggleSourceMode, type MarkdownMode } from "~lib/markdown-mode"
import {
  clearStoredDraft,
  initialDraftMode,
  readStoredDraft,
  storeDraft,
  suggestDraftFileName,
} from "~lib/new-draft"
import { getThemePreference } from "~lib/theme-preference"

import "~style.css"

const STORE_DELAY_MS = 300
const OPEN_SHORTCUT = /Mac/.test(navigator.platform) ? "⌘O" : "Ctrl+O"

export default function DraftTab() {
  const [initial, setInitial] = useState<{ theme: boolean | null; content: string } | null>(null)

  useEffect(() => {
    void Promise.all([
      getThemePreference().catch(() => null),
      readStoredDraft().catch(() => null),
    ]).then(([theme, draft]) => setInitial({ theme, content: draft?.content ?? "" }))
  }, [])

  if (!initial) return null
  return <DraftEditor initialThemePreference={initial.theme} initialContent={initial.content} />
}

function DraftEditor({
  initialThemePreference,
  initialContent,
}: {
  initialThemePreference: boolean | null
  initialContent: string
}) {
  const { dark } = useContentPreferences(initialThemePreference)
  const [content, setContent] = useState(initialContent)
  const [mode, setMode] = useState<MarkdownMode>(() => initialDraftMode(window.innerWidth))
  const [sourceFullWidth, setSourceFullWidth] = useState(false)
  const [file, setFile] = useState<FileSystemFileHandle | null>(null)
  const [savedContent, setSavedContent] = useState<string | null>(null)
  const [noticeOpen, setNoticeOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const contentRef = useRef(initialContent)
  const fileRef = useRef<FileSystemFileHandle | null>(null)
  const savedContentRef = useRef<string | null>(null)
  const tabIdRef = useRef<number | null>(null)
  const storeTimerRef = useRef<number | null>(null)
  const savingRef = useRef(false)

  const persist = useCallback(() => {
    void storeDraft({
      content: contentRef.current,
      updatedAt: new Date().toISOString(),
      tabId: tabIdRef.current,
    }).catch(() => undefined)
  }, [])

  const cancelPersist = () => {
    if (storeTimerRef.current !== null) window.clearTimeout(storeTimerRef.current)
    storeTimerRef.current = null
  }

  // Claim the stored draft for this tab so the popup focuses it.
  useEffect(() => {
    void chrome.tabs.getCurrent().then((tab) => {
      tabIdRef.current = tab?.id ?? null
      if (!fileRef.current) persist()
    })
  }, [persist])

  const handleChange = (value: string) => {
    contentRef.current = value
    setContent(value)
    if (fileRef.current) return
    cancelPersist()
    storeTimerRef.current = window.setTimeout(persist, STORE_DELAY_MS)
  }

  const save = useCallback(async () => {
    if (savingRef.current) return
    savingRef.current = true
    try {
      const firstSave = !fileRef.current
      const handle = fileRef.current ?? await window.showSaveFilePicker({
        suggestedName: suggestDraftFileName(contentRef.current),
        types: [{ description: "Markdown", accept: { "text/markdown": [".md"] } }],
      })
      const text = contentRef.current
      const writable = await handle.createWritable()
      await writable.write(text)
      await writable.close()
      if (firstSave) {
        fileRef.current = handle
        setFile(handle)
        setNoticeOpen(true)
        cancelPersist()
        await clearStoredDraft().catch(() => undefined)
      }
      savedContentRef.current = text
      setSavedContent(text)
      setError(null)
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") return
      setError(caught instanceof Error ? caught.message : "Could not save the file.")
    } finally {
      savingRef.current = false
    }
  }, [])

  const discard = () => {
    if (!window.confirm("Discard this draft?")) return
    cancelPersist()
    contentRef.current = ""
    setContent("")
    persist()
  }

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (isSaveShortcut(event)) {
        event.preventDefault()
        void save()
      } else if (isToggleSourceShortcut(event, true)) {
        event.preventDefault()
        setMode(toggleSourceMode)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [save])

  // Before the first save the stored draft keeps the text, so only edits not
  // yet written to the saved file need a warning.
  useEffect(() => {
    const warnIfUnsaved = (event: BeforeUnloadEvent) => {
      if (!fileRef.current || contentRef.current === savedContentRef.current) return
      event.preventDefault()
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", warnIfUnsaved)
    return () => window.removeEventListener("beforeunload", warnIfUnsaved)
  }, [])

  useEffect(() => {
    document.title = file ? file.name : "New draft"
  }, [file])

  const unsaved = file !== null && content !== savedContent

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b px-4">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" className="h-5 w-5 shrink-0" aria-hidden="true">
          <rect width="128" height="128" rx="28" fill="#18181b" />
          <path d="M22 92 V 28 h12 l26 38 26 -38 h12 V 92 h-12 V 50 l-22 32 h-8 L34 50 V 92 Z" fill="#fff" />
          <g stroke="#fff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <path d="M90 108 H118" />
            <path d="M109 99 L118 108 L109 117" />
          </g>
        </svg>
        <h1 className="min-w-0 truncate text-sm font-semibold">
          {file ? file.name : "New draft"}
          {unsaved && <span className="ml-2 text-xs font-normal text-muted-foreground">Edited</span>}
        </h1>
        <div className="ml-auto flex items-center gap-1">
          <div
            role="group"
            aria-label="Markdown display mode"
            className="mr-1 flex items-center overflow-hidden rounded-md border text-xs font-medium">
            {([
              ["preview", "Preview", Eye],
              ["source", "Source", Pencil],
              ["split", "Split", Columns2],
            ] as const).map(([nextMode, label, Icon], index) => (
              <button
                key={nextMode}
                type="button"
                onClick={() => setMode(nextMode)}
                title={label}
                aria-label={`${label} mode`}
                aria-pressed={mode === nextMode}
                className={`flex items-center gap-1.5 px-2.5 py-1 transition-colors ${
                  index > 0 ? "border-l" : ""
                } ${
                  mode === nextMode
                    ? "bg-accent text-foreground"
                    : "hover:bg-accent/50"
                }`}>
                <Icon size={13} strokeWidth={1.8} />
                <span className="hidden lg:inline">{label}</span>
              </button>
            ))}
          </div>
          {!file && (
            <Button variant="ghost" onClick={discard} className="h-8 shrink-0 gap-1.5 px-2 text-xs">
              <Trash2 size={14} /> Discard
            </Button>
          )}
          <button
            type="button"
            onClick={() => void save()}
            className="ml-1 inline-flex items-center gap-1.5 rounded-md border border-zinc-900 bg-zinc-900 px-3 py-1 text-xs font-medium text-white transition-[background-color,border-color,color,transform] hover:bg-zinc-800 active:scale-[0.98] dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200">
            Save
          </button>
        </div>
      </header>

      <div role="status" className="shrink-0">
        {noticeOpen && file && (
          <div className="flex items-center gap-3 border-b bg-muted px-4 py-2 text-xs">
            <span>
              Saved as <strong>{file.name}</strong>. To use the file tree, Reviews, and
              relative images, open it with {OPEN_SHORTCUT} or from its folder.
            </span>
            <button
              className="ml-auto rounded p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Dismiss"
              onClick={() => setNoticeOpen(false)}>
              <X size={14} />
            </button>
          </div>
        )}
      </div>
      {error && (
        <p role="alert" className="shrink-0 border-b px-4 py-2 text-xs text-destructive">
          Could not save: {error}
        </p>
      )}

      <main className="min-h-0 flex-1">
        <div className="flex h-full">
          {mode !== "source" && (
            <div className={`h-full overflow-auto ${mode === "split" ? "w-1/2 border-r" : "w-full"}`}>
              {content.trim() ? (
                <MarkdownRenderer content={content} />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground/60">
                  <Eye size={20} strokeWidth={1.5} aria-hidden="true" />
                  <span className="text-xs font-medium">Preview</span>
                </div>
              )}
            </div>
          )}
          {mode !== "preview" && (
            <div className={`h-full min-w-0 px-8 pb-10 pt-2 ${mode === "split" ? "w-1/2" : "w-full"}`}>
              <div className={`h-full ${sourceFullWidth || mode === "split" ? "" : "mx-auto max-w-5xl"}`}>
                <RawEditor
                  content={content}
                  dark={dark}
                  fileName={file?.name ?? "Untitled.md"}
                  fullWidth={sourceFullWidth}
                  onToggleFullWidth={() => setSourceFullWidth((current) => !current)}
                  autoFocus
                  placeholder="Write or paste Markdown…"
                  onChange={handleChange}
                />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
