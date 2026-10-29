import React,{ useEffect,useRef } from "react"
import { AUTO_SAVE_DELAY_MS,getAutoSaveEnabled,watchAutoSaveEnabled } from "~lib/auto-save"
import { queryHandlePermission,requestHandlePermission,tryHandleFromDirectory,type PermissionCapableHandle } from "~lib/content-file-access"
import {
  setFileHandle
} from "~lib/db"
import {
  type ReviewPromptEvent
} from "~lib/review-prompt"

export type SaveState = "idle" | "unsaved" | "saving" | "saved" | "error"

interface UseContentSaveOptions {
  saveState: SaveState
  setSaveState: React.Dispatch<React.SetStateAction<SaveState>>
  fileHandleRef: React.MutableRefObject<FileSystemFileHandle | null>
  setSaveFolderDialogOpen: React.Dispatch<React.SetStateAction<boolean>>
  diskLastModifiedRef: React.MutableRefObject<number>
  setConflict: React.Dispatch<React.SetStateAction<boolean>>
  diskContentRef: React.MutableRefObject<string | null>
  draftRef: React.MutableRefObject<string>
  fileUrlRef: React.MutableRefObject<string>
  hasUnsavedDraftRef: React.MutableRefObject<boolean>
  trackReviewPromptActivity: (event: ReviewPromptEvent) => void
  setReviewPromptReady: React.Dispatch<React.SetStateAction<boolean>>
}

export function useContentSave({
  saveState,
  setSaveState,
  fileHandleRef,
  setSaveFolderDialogOpen,
  diskLastModifiedRef,
  setConflict,
  diskContentRef,
  draftRef,
  fileUrlRef,
  hasUnsavedDraftRef,
  trackReviewPromptActivity,
  setReviewPromptReady,
}: UseContentSaveOptions) {
  const autoSaveEnabledRef = useRef(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cancelScheduledSave = () => {
    if (!debounceRef.current) return
    clearTimeout(debounceRef.current)
    debounceRef.current = null
  }

  const doSave = async (
    text: string,
    url: string,
    {
      force = false,
      allowFolderPrompt = true,
    }: {
      force?: boolean
      allowFolderPrompt?: boolean
    } = {}
  ): Promise<boolean> => {
    try {
      setSaveState("saving")
      let handle = fileHandleRef.current
      if (!handle) {
        handle = await tryHandleFromDirectory(url)
        if (!handle) {
          // No saved folder contains this file. Ask for one rather than opening
          // a Save As picker, so the file is written in place.
          if (allowFolderPrompt) setSaveFolderDialogOpen(true)
          setSaveState("unsaved")
          return false
        }
        fileHandleRef.current = handle
        await setFileHandle(url, handle)
      } else {
        // Existing handle — check for external modifications before writing.
        if (!force && diskLastModifiedRef.current > 0) {
          try {
            const current = await handle.getFile()
            if (current.lastModified !== diskLastModifiedRef.current) {
              setSaveState("unsaved")
              setConflict(true)
              return false
            }
          } catch { /* can't read — proceed */ }
        }
        // Permission may have been revoked since last use.
        // requestPermission requires a user gesture, so this only succeeds when
        // doSave is called from Cmd+S or the Save button. If called from the
        // autosave debounce (no gesture), it throws and falls to the catch block,
        // showing "Save failed" so the user knows to press Cmd+S to re-authorize.
        try {
          const permissionHandle = handle as FileSystemFileHandle & PermissionCapableHandle
          const perm = await queryHandlePermission(permissionHandle, "readwrite")
          if (perm !== "granted") {
            await requestHandlePermission(permissionHandle, "readwrite")
          }
        } catch {
          // queryPermission/requestPermission unavailable — let createWritable
          // surface an explicit error if permission is actually missing.
        }
      }
      const writable = await handle.createWritable()
      await writable.write(text)
      await writable.close()
      diskContentRef.current = text
      // Update stored timestamp so the next save check is accurate.
      try {
        diskLastModifiedRef.current = (await handle.getFile()).lastModified
      } catch {
        diskLastModifiedRef.current = Date.now()
      }
      const savedLatestDraft =
        draftRef.current === text && fileUrlRef.current === url
      hasUnsavedDraftRef.current = !savedLatestDraft
      setConflict(false)
      setSaveState(savedLatestDraft ? "saved" : "unsaved")
      if (savedLatestDraft) trackReviewPromptActivity("save")
      return savedLatestDraft
    } catch (err) {
      const name = (err as DOMException).name
      if (name === "AbortError") {
        // User dismissed the file picker — treat as cancel, not error
        setSaveState(fileHandleRef.current ? "unsaved" : "idle")
      } else if (name === "NotAllowedError") {
        // Write permission not granted — happens on autosave after page reload
        // (requestPermission needs a user gesture). Stay "unsaved" so the Save
        // button remains clickable; the next Cmd+S or button click will re-prompt.
        setSaveState("unsaved")
      } else {
        console.error("[markside] save failed", err)
        setSaveState("error")
      }
      return false
    }
  }

  const scheduleAutoSave = () => {
    cancelScheduledSave()
    if (
      !autoSaveEnabledRef.current ||
      !hasUnsavedDraftRef.current
    ) return
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null
      void doSave(draftRef.current, fileUrlRef.current, {
        allowFolderPrompt: false,
      })
    }, AUTO_SAVE_DELAY_MS)
  }

  useEffect(() => {
    let active = true
    const applySetting = (enabled: boolean) => {
      if (!active) return
      autoSaveEnabledRef.current = enabled
      if (enabled) {
        scheduleAutoSave()
      } else cancelScheduledSave()
    }
    void getAutoSaveEnabled().then(applySetting)
    const unwatch = watchAutoSaveEnabled(applySetting)
    return () => {
      active = false
      unwatch()
    }
  }, [])

  useEffect(() => {
    const warnIfUnsaved = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedDraftRef.current) return
      event.preventDefault()
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", warnIfUnsaved)
    return () => window.removeEventListener("beforeunload", warnIfUnsaved)
  }, [])

  useEffect(() => {
    if (saveState !== "saved") return
    const promptTimer = window.setTimeout(() => {
      if (!hasUnsavedDraftRef.current) setReviewPromptReady(true)
    }, 900)
    const timer = window.setTimeout(() => {
      setSaveState((current) => current === "saved" ? "idle" : current)
    }, 1800)
    return () => {
      window.clearTimeout(promptTimer)
      window.clearTimeout(timer)
    }
  }, [saveState])

  useEffect(() => cancelScheduledSave, [])

  return { doSave, scheduleAutoSave, cancelScheduledSave, autoSaveEnabledRef }
}
