import React,{ useEffect,useState } from "react"
import {
  classifyMarksideFileUrl,
  isMarkdownTextFileUrl,
} from "~lib/file-types"
import {
  resolveFetchedFileContent,
  resolveWikilinkCandidates
} from "~lib/url"

export type FileNavigationTarget =
  | { url: string; handle: FileSystemFileHandle }
  | { url: string; text: string }

export function useMarkdownTextChoice(fileUrl: string) {
  const [choice, setChoice] = useState<{ url: string; markdown: boolean } | null>(null)

  useEffect(() => { setChoice(null) }, [fileUrl])

  const currentChoice = choice?.url === fileUrl ? choice : null
  return {
    suggestMarkdown: isMarkdownTextFileUrl(fileUrl) && currentChoice === null,
    markdownText: currentChoice?.markdown === true,
    chooseMarkdownText: (markdown: boolean) => setChoice({ url: fileUrl, markdown }),
  }
}

interface UseContentFileLoadingOptions {
  initialContent: string | null
  setError: React.Dispatch<React.SetStateAction<string | null>>
  diskContentRef: React.MutableRefObject<string | null>
  pendingDraftSyncRef: React.MutableRefObject<boolean>
  setContent: React.Dispatch<React.SetStateAction<string | null>>
  cancelPreviewUpdate: () => void
  cancelScheduledSave: () => void
  setImageObjectUrl: React.Dispatch<React.SetStateAction<string | null>>
  diskLastModifiedRef: React.MutableRefObject<number>
  pendingHandleRef: React.MutableRefObject<FileSystemFileHandle | null>
  setDraft: React.Dispatch<React.SetStateAction<string>>
  draftRef: React.MutableRefObject<string>
  hasUnsavedDraftRef: React.MutableRefObject<boolean>
  setSaveState: React.Dispatch<React.SetStateAction<"idle" | "unsaved" | "saving" | "saved" | "error">>
  setConflict: React.Dispatch<React.SetStateAction<boolean>>
  setImageReloadVersion: React.Dispatch<React.SetStateAction<number>>
  setFileUrl: React.Dispatch<React.SetStateAction<string>>
}

export function useContentFileLoading({
  initialContent,
  setError,
  diskContentRef,
  pendingDraftSyncRef,
  setContent,
  cancelPreviewUpdate,
  cancelScheduledSave,
  setImageObjectUrl,
  diskLastModifiedRef,
  pendingHandleRef,
  setDraft,
  draftRef,
  hasUnsavedDraftRef,
  setSaveState,
  setConflict,
  setImageReloadVersion,
  setFileUrl,
}: UseContentFileLoadingOptions) {
  // Fallback for browsers that do not expose the original file in a <pre>.
  useEffect(() => {
    if (initialContent !== null) return
    const initialUrl = window.location.href.split("#")[0]
    try {
      chrome.runtime.sendMessage({ type: "fetch-file", url: initialUrl }, (res) => {
        if (chrome.runtime.lastError || !res) { setError("Reload the page to reconnect Markside."); return }
        const result = resolveFetchedFileContent(res)
        if (result.content !== null) {
          diskContentRef.current = result.content
          pendingDraftSyncRef.current = true
          setContent(result.content)
        }
        else setError(result.error)
      })
    } catch { setError("Reload the page to reconnect Markside.") }
  }, [initialContent])


  const performFileNavigation = async (target: FileNavigationTarget) => {
    cancelPreviewUpdate()
    cancelScheduledSave()
    const isMarkdown = classifyMarksideFileUrl(target.url) === "markdown"
    pendingDraftSyncRef.current = isMarkdown
    setError(null)
    setImageObjectUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null })
    try {
      if ("handle" in target) {
        const file = await target.handle.getFile()
        diskLastModifiedRef.current = file.lastModified
        pendingHandleRef.current = target.handle
        if (/\.(png|jpe?g|gif|webp|svg|bmp|ico|tiff?)$/i.test(target.url)) {
          pendingDraftSyncRef.current = false
          const buffer = await file.arrayBuffer()
          const blob = new Blob([buffer], { type: file.type || "application/octet-stream" })
          setImageObjectUrl(URL.createObjectURL(blob))
          setContent("")
        } else {
          const text = await file.text()
          diskContentRef.current = text
          setContent(text)
          if (!isMarkdown) {
            setDraft(text)
            draftRef.current = text
          }
        }
      } else {
        diskContentRef.current = target.text
        setContent(target.text)
      }
      hasUnsavedDraftRef.current = false
      setSaveState("idle")
      setConflict(false)
      setImageReloadVersion((version) => version + 1)
      setFileUrl(target.url)
    } catch (err) {
      setError((err as Error).message ?? "Failed to read file")
    }
  }

  return { performFileNavigation }
}

interface UseWikilinkNavigationOptions {
  contentRef: React.RefObject<HTMLDivElement>
  fileUrl: string
  requestFileNavigation: (target: FileNavigationTarget) => Promise<void>
  setError: React.Dispatch<React.SetStateAction<string | null>>
}

// Wikilinks name a sibling file without its extension, so each Markdown
// extension is tried until one exists.
export function useWikilinkNavigation({
  contentRef,
  fileUrl,
  requestFileNavigation,
  setError,
}: UseWikilinkNavigationOptions) {
  useEffect(() => {
    const el = contentRef.current
    if (!el) return

    const handler = async (e: MouseEvent) => {
      const target = e.target
      if (!(target instanceof Element)) return
      const link = target.closest<HTMLElement>("[data-wikilink]")
      if (!link) return
      e.preventDefault()
      const name = link.getAttribute("data-wikilink")?.trim() ?? ""
      const candidates = resolveWikilinkCandidates(fileUrl, name)
      if (candidates.length === 0) return
      for (const targetUrl of candidates) {
        const loaded = await new Promise<boolean>((resolve) => {
          try {
            chrome.runtime.sendMessage({ type: "fetch-file", url: targetUrl }, (res) => {
              if (chrome.runtime.lastError || !res || res.text === undefined) { resolve(false); return }
              void requestFileNavigation({ url: targetUrl, text: res.text })
              resolve(true)
            })
          } catch { resolve(false) }
        })
        if (loaded) return
      }
      setError(`No file found for [[${name}]].`)
    }

    el.addEventListener("click", handler)
    return () => el.removeEventListener("click", handler)
  }, [fileUrl])
}
