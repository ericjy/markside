import draftSample from "data-text:~lib/draft-sample.md"
import { Check, Columns2, Eye, FileText, Moon, Pencil, Sun, Trash2, X } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

import { MarkdownRenderer } from "~components/markdown-renderer"
import { RawEditor } from "~components/raw-editor"
import { Button } from "~components/ui/button"
import { useContentPreferences } from "~hooks/use-content-preferences"
import { AUTO_SAVE_DELAY_MS, getAutoSaveEnabled, watchAutoSaveEnabled } from "~lib/auto-save"
import { getFileHandle, setFileHandle } from "~lib/db"
import { isSaveShortcut, isToggleSourceShortcut } from "~lib/content-app-policy"
import { toggleSourceMode, type MarkdownMode } from "~lib/markdown-mode"
import {
  clearStoredDraft,
  recordSavedDraft,
  initialDraftMode,
  readStoredDraft,
  storeDraft,
  suggestDraftFileName,
} from "~lib/new-draft"
import { getThemePreference, setThemePreference } from "~lib/theme-preference"

import "~style.css"

const STORE_DELAY_MS = 300
const OPEN_KEYS = [/Mac/.test(navigator.platform) ? "⌘" : "Ctrl", "O"]

type DraftStart =
  | { kind: "draft"; content: string }
  | { kind: "file"; handle: FileSystemFileHandle; content: string }
  | { kind: "reopen"; handle: FileSystemFileHandle }
  | { kind: "missing"; name: string | null }

// After the first save the URL carries `?file=`, and the saved handle is
// stored under that URL so a reload reopens the file instead of a blank draft.
async function loadDraftStart(): Promise<DraftStart> {
  if (!new URLSearchParams(location.search).has("file")) {
    return { kind: "draft", content: (await readStoredDraft().catch(() => null))?.content ?? "" }
  }
  const handle = await getFileHandle(location.href)
  if (!handle) return { kind: "missing", name: null }
  if (await handle.queryPermission({ mode: "readwrite" }) !== "granted") return { kind: "reopen", handle }
  return readSavedFile(handle)
}

async function readSavedFile(handle: FileSystemFileHandle): Promise<DraftStart> {
  try {
    return { kind: "file", handle, content: await (await handle.getFile()).text() }
  } catch {
    return { kind: "missing", name: handle.name }
  }
}

export default function DraftTab() {
  const [theme, setTheme] = useState<boolean | null | undefined>(undefined)
  const [start, setStart] = useState<DraftStart | null>(null)

  useEffect(() => {
    void getThemePreference().catch(() => null).then(setTheme)
    void loadDraftStart().then(setStart)
  }, [])

  if (theme === undefined || !start) return null
  if (start.kind === "draft" || start.kind === "file") {
    return (
      <DraftEditor
        initialThemePreference={theme}
        initialContent={start.content}
        initialFile={start.kind === "file" ? start.handle : null}
      />
    )
  }
  return <DraftNotice initialThemePreference={theme} start={start} onStart={setStart} />
}

function DraftNotice({
  initialThemePreference,
  start,
  onStart,
}: {
  initialThemePreference: boolean | null
  start: Extract<DraftStart, { kind: "reopen" | "missing" }>
  onStart: (start: DraftStart) => void
}) {
  useContentPreferences(initialThemePreference)
  const reopen = async () => {
    if (start.kind !== "reopen") return
    if (await start.handle.requestPermission({ mode: "readwrite" }) !== "granted") return
    onStart(await readSavedFile(start.handle))
  }
  const name = start.kind === "reopen" ? start.handle.name : start.name

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background px-8 text-center text-foreground">
      {start.kind === "reopen" ? (
        <>
          <p className="text-sm text-muted-foreground">Chrome needs your permission to open {name} again.</p>
          <Button onClick={() => void reopen()} className="h-8 px-3 text-xs">Reopen {name}</Button>
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {name ? `${name} was moved or deleted.` : "This saved draft can no longer be found."}
          </p>
          <Button variant="outline" onClick={() => location.assign(location.pathname)} className="h-8 px-3 text-xs">
            Start a new draft
          </Button>
        </>
      )}
    </div>
  )
}

function DraftEditor({
  initialThemePreference,
  initialContent,
  initialFile,
}: {
  initialThemePreference: boolean | null
  initialContent: string
  initialFile: FileSystemFileHandle | null
}) {
  const { dark, setDark, followsSystemThemeRef } = useContentPreferences(initialThemePreference)
  const [content, setContent] = useState(initialContent)
  const [mode, setMode] = useState<MarkdownMode>(() => initialDraftMode(window.innerWidth))
  const [sourceFullWidth, setSourceFullWidth] = useState(false)
  const [file, setFile] = useState<FileSystemFileHandle | null>(initialFile)
  const [savedContent, setSavedContent] = useState<string | null>(initialFile ? initialContent : null)
  const [noticeOpen, setNoticeOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const contentRef = useRef(initialContent)
  const fileRef = useRef<FileSystemFileHandle | null>(initialFile)
  const savedContentRef = useRef<string | null>(initialFile ? initialContent : null)
  const tabIdRef = useRef<number | null>(null)
  const storeTimerRef = useRef<number | null>(null)
  const savingRef = useRef(false)
  const autoSaveRef = useRef(false)
  const autoSaveTimerRef = useRef<number | null>(null)

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

  useEffect(() => {
    void getAutoSaveEnabled().then((enabled) => { autoSaveRef.current = enabled })
    return watchAutoSaveEnabled((enabled) => { autoSaveRef.current = enabled })
  }, [])

  // Auto Save applies once the draft has a file; before that, storage keeps it.
  const scheduleAutoSave = () => {
    if (autoSaveTimerRef.current !== null) window.clearTimeout(autoSaveTimerRef.current)
    autoSaveTimerRef.current = null
    if (!autoSaveRef.current) return
    autoSaveTimerRef.current = window.setTimeout(() => {
      autoSaveTimerRef.current = null
      if (savingRef.current) scheduleAutoSave()
      else void save()
    }, AUTO_SAVE_DELAY_MS)
  }

  const handleChange = (value: string) => {
    contentRef.current = value
    setContent(value)
    if (fileRef.current) {
      scheduleAutoSave()
      return
    }
    cancelPersist()
    storeTimerRef.current = window.setTimeout(persist, STORE_DELAY_MS)
  }

  const save = useCallback(async () => {
    if (savingRef.current || (!fileRef.current && !contentRef.current.trim())) return
    savingRef.current = true
    if (autoSaveTimerRef.current !== null) window.clearTimeout(autoSaveTimerRef.current)
    autoSaveTimerRef.current = null
    setSaving(true)
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
        const fileUrl = new URL(location.href)
        fileUrl.search = `?file=${crypto.randomUUID()}`
        history.replaceState(null, "", fileUrl)
        await setFileHandle(fileUrl.href, handle).catch(() => undefined)
        fileRef.current = handle
        setFile(handle)
        setNoticeOpen(true)
        cancelPersist()
        await clearStoredDraft().catch(() => undefined)
        if (tabIdRef.current !== null) {
          void recordSavedDraft(tabIdRef.current, handle.name).catch(() => undefined)
        }
      }
      savedContentRef.current = text
      setSavedContent(text)
      setError(null)
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") return
      setError(caught instanceof Error ? caught.message : "Could not save the file.")
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }, [])

  const insertSample = () => {
    handleChange(draftSample)
  }

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
  const saved = file !== null && !unsaved && !error
  const empty = file === null && !content.trim()

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
          {unsaved && !saving && <span className="ml-2 text-xs font-normal text-muted-foreground">Unsaved</span>}
        </h1>
        <div className="ml-auto flex items-center gap-1">
          {!file && content.trim() && (
            <Button variant="ghost" onClick={discard} className="h-8 shrink-0 gap-1.5 px-2 text-xs">
              <Trash2 size={14} /> Discard
            </Button>
          )}
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || saved || empty}
            className={`ml-1 mr-2 inline-flex min-w-[80px] items-center justify-center gap-1.5 rounded-md border px-3 py-1 text-xs font-medium transition-[background-color,border-color,color,transform] active:scale-[0.98] disabled:active:scale-100 ${
              error && !saving
                ? "border-red-400 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                : saving || empty
                  ? "cursor-not-allowed border-border text-muted-foreground"
                  : saved
                    ? "border-emerald-500/40 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                    : "border-zinc-900 bg-zinc-900 text-white hover:bg-zinc-800 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
            }`}>
            {saving ? "Saving…" : error ? "Retry" : saved ? <><Check size={12} />Saved</> : "Save"}
          </button>
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
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              const el = document.documentElement
              const nextDark = !dark
              el.classList.add("theme-switching")
              followsSystemThemeRef.current = false
              setDark(nextDark)
              void setThemePreference(nextDark).catch(() => undefined)
              requestAnimationFrame(() =>
                requestAnimationFrame(() => el.classList.remove("theme-switching"))
              )
            }}
            className="h-7 w-7"
            aria-label="Toggle theme">
            {dark ? <Sun size={14} /> : <Moon size={14} />}
          </Button>
        </div>
      </header>

      <div role="status" className="shrink-0">
        {noticeOpen && file && (
          <div className="flex items-center gap-2 border-b bg-muted px-4 py-2 text-xs">
            <Check size={14} className="shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            <span className="min-w-0">
              <span className="font-medium text-foreground">Saved as {file.name}</span>
              <span className="text-muted-foreground">
                {" · "}Reopen it with{" "}
                {OPEN_KEYS.map((key) => (
                  <kbd key={key} className="mr-0.5 inline-block min-w-[18px] rounded border border-b-2 bg-background px-1 text-center font-sans text-[11px] font-semibold text-foreground">{key}</kbd>
                ))}
                {" "}to use all Markside features.
              </span>
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
                <div className="flex h-full flex-col items-center justify-center px-8 text-center">
                  <Eye size={22} strokeWidth={1.5} className="text-muted-foreground/60" aria-hidden="true" />
                  <p className="mt-3 text-sm text-muted-foreground">Nothing to preview yet</p>
                  <Button variant="outline" onClick={insertSample} className="mt-4 h-8 gap-1.5 px-3 text-xs">
                    <FileText size={14} /> Insert sample
                  </Button>
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
