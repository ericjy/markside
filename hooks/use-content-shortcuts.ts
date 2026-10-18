import type { DirectoryStatus } from "./use-persisted-directory"
import React,{ useEffect } from "react"
import { isFilePaletteShortcut,isSaveShortcut,isToggleSourceShortcut } from "~lib/content-app-policy"
import {
  toggleSourceMode,
  type MarkdownMode
} from "~lib/markdown-mode"

interface UseContentShortcutsOptions {
  sourceVisible: boolean
  cancelScheduledSave: () => void
  doSave: (text: string, url: string, options?: { force?: boolean; allowFolderPrompt?: boolean }) => Promise<boolean>
  draftRef: React.MutableRefObject<string>
  fileUrl: string
  isMdFile: boolean
  selectMode: (nextMode: MarkdownMode) => void
  mode: MarkdownMode
  content: string | null
  status: DirectoryStatus
  setPaletteOpen: React.Dispatch<React.SetStateAction<boolean>>
  reviewOverlayOpen: boolean
  clipboardFallback: string | null
  reviewCopyReload: { comment: boolean; loading: boolean; error: string | null; } | null
  closeReviewOverlay: (restoreTriggerFocus?: boolean) => void
  reviewPromptOpen: boolean
  dismissReviewPrompt: () => void
}

export function useContentShortcuts({
  sourceVisible,
  cancelScheduledSave,
  doSave,
  draftRef,
  fileUrl,
  isMdFile,
  selectMode,
  mode,
  content,
  status,
  setPaletteOpen,
  reviewOverlayOpen,
  clipboardFallback,
  reviewCopyReload,
  closeReviewOverlay,
  reviewPromptOpen,
  dismissReviewPrompt,
}: UseContentShortcutsOptions) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return
      if (isSaveShortcut(e)) {
        e.preventDefault()
        if (!sourceVisible) return
        cancelScheduledSave()
        void doSave(draftRef.current, fileUrl)
      } else if (isToggleSourceShortcut(e, isMdFile)) {
        e.preventDefault()
        selectMode(toggleSourceMode(mode))
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [mode, sourceVisible, isMdFile, content, fileUrl]) // doSave only uses stable setters and refs — no stale closure risk

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isFilePaletteShortcut(e, status)) {
        e.preventDefault()
        setPaletteOpen((prev) => !prev)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [status])

  useEffect(() => {
    if (!reviewOverlayOpen || clipboardFallback || reviewCopyReload) return
    const handler = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      event.preventDefault()
      closeReviewOverlay(true)
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [reviewOverlayOpen, clipboardFallback, reviewCopyReload])

  useEffect(() => {
    if (!reviewPromptOpen) return
    const handler = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      event.preventDefault()
      dismissReviewPrompt()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [reviewPromptOpen])
}
