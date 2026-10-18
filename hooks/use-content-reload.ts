import React,{ useEffect,useRef,useState } from "react"
import { type ReviewCopyStatus } from "~components/review-panel"
import { readFileFromDisk } from "~lib/file-reload"
import { type MarkdownMode } from "~lib/markdown-mode"
import { type SaveState } from "~hooks/use-content-save"

const RELOAD_NOTICE_MS = 2000

export type ReviewCopyReload = {
  comment: boolean
  loading: boolean
  error: string | null
}

interface UseContentReloadOptions {
  fileUrl: string
  isMdFile: boolean
  isImageFile: boolean
  mode: MarkdownMode
  setMode: React.Dispatch<React.SetStateAction<MarkdownMode>>
  content: string | null
  setContent: React.Dispatch<React.SetStateAction<string | null>>
  setDraft: React.Dispatch<React.SetStateAction<string>>
  setError: React.Dispatch<React.SetStateAction<string | null>>
  setImageObjectUrl: React.Dispatch<React.SetStateAction<string | null>>
  setImageReloadVersion: React.Dispatch<React.SetStateAction<number>>
  setSaveState: React.Dispatch<React.SetStateAction<SaveState>>
  setConflict: React.Dispatch<React.SetStateAction<boolean>>
  setCopyReviewStatus: React.Dispatch<React.SetStateAction<ReviewCopyStatus | null>>
  draftRef: React.MutableRefObject<string>
  fileUrlRef: React.MutableRefObject<string>
  fileHandleRef: React.MutableRefObject<FileSystemFileHandle | null>
  diskContentRef: React.MutableRefObject<string | null>
  diskLastModifiedRef: React.MutableRefObject<number>
  hasUnsavedDraftRef: React.MutableRefObject<boolean>
  cancelPreviewUpdate: () => void
  cancelScheduledSave: () => void
  closeSelectionComposer: () => void
}

export function useContentReload({
  fileUrl,
  isMdFile,
  isImageFile,
  mode,
  setMode,
  content,
  setContent,
  setDraft,
  setError,
  setImageObjectUrl,
  setImageReloadVersion,
  setSaveState,
  setConflict,
  setCopyReviewStatus,
  draftRef,
  fileUrlRef,
  fileHandleRef,
  diskContentRef,
  diskLastModifiedRef,
  hasUnsavedDraftRef,
  cancelPreviewUpdate,
  cancelScheduledSave,
  closeSelectionComposer,
}: UseContentReloadOptions) {
  const [reloadConfirmOpen, setReloadConfirmOpen] = useState(false)
  const [reloadNoticeOpen, setReloadNoticeOpen] = useState(false)
  const [reloadLoading, setReloadLoading] = useState(false)
  const reloadLoadingRef = useRef(false)
  const reloadTriggerRef = useRef<HTMLButtonElement>(null)
  const reloadNoticeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [reloadComparison, setReloadComparison] = useState<{ before: string; after: string } | null>(null)
  const [showChanges, setShowChanges] = useState(false)
  const [reviewCopyReload, setReviewCopyReload] = useState<ReviewCopyReload | null>(null)
  const hasReloadChanges = !!reloadComparison && reloadComparison.before !== reloadComparison.after
  const changesVisible = showChanges && hasReloadChanges && content === reloadComparison?.after

  const clearReloadNotice = () => {
    if (!reloadNoticeTimeoutRef.current) return
    clearTimeout(reloadNoticeTimeoutRef.current)
    reloadNoticeTimeoutRef.current = null
  }

  useEffect(() => {
    setReviewCopyReload(null)
    setReloadComparison(null)
    setShowChanges(false)
  }, [fileUrl, isMdFile])

  useEffect(() => clearReloadNotice, [])

  const handleReloadFromDisk = async ({ forReviewCopy = false } = {}) => {
    if (reloadLoadingRef.current) return
    reloadLoadingRef.current = true
    setReloadLoading(true)
    const reloadUrl = fileUrlRef.current
    const previousDraft = draftRef.current
    const previousContent = diskContentRef.current
    cancelPreviewUpdate()
    cancelScheduledSave()
    setReloadNoticeOpen(false)
    clearReloadNotice()
    try {
      const file = await readFileFromDisk(
        fileHandleRef.current,
        reloadUrl,
        isImageFile,
      )
      if (fileUrlRef.current !== reloadUrl) return
      if (draftRef.current !== previousDraft) throw new Error("The draft changed while reloading. Try Reload again.")
      diskLastModifiedRef.current = file.lastModified
      if (isImageFile) {
        if (!file.buffer) throw new Error("Failed to read image from disk")
        const blob = new Blob([file.buffer], {
          type: file.type || "application/octet-stream",
        })
        setImageObjectUrl((previous) => {
          if (previous) URL.revokeObjectURL(previous)
          return URL.createObjectURL(blob)
        })
        setContent("")
      } else {
        if (file.text === null) throw new Error("Failed to read file from disk")
        const text = file.text
        if (isMdFile && previousContent !== null) {
          setReloadComparison({ before: previousContent, after: text })
          setShowChanges(previousContent !== text)
          if (previousContent !== text && mode === "source") setMode("preview")
        }
        closeSelectionComposer()
        diskContentRef.current = text
        setImageReloadVersion((version) => version + 1)
        setContent(text)
        setDraft(text)
        draftRef.current = text
      }
      setSaveState("idle")
      setConflict(false)
      hasUnsavedDraftRef.current = false
      setError(null)
      setReloadNoticeOpen(true)
      setCopyReviewStatus(null)
      reloadNoticeTimeoutRef.current = setTimeout(() => {
        reloadNoticeTimeoutRef.current = null
        setReloadNoticeOpen(false)
      }, RELOAD_NOTICE_MS)
    } catch (err) {
      if (forReviewCopy) throw err
      setError((err as Error).message ?? "Failed to reload file")
    } finally {
      reloadLoadingRef.current = false
      setReloadLoading(false)
    }
  }

  const requestReloadFromDisk = () => {
    if (hasUnsavedDraftRef.current) {
      setReloadConfirmOpen(true)
      return
    }
    void handleReloadFromDisk()
  }

  const cancelReviewCopyReload = () => {
    setReviewCopyReload(null)
  }

  const reloadForReviewCopy = async () => {
    if (!reviewCopyReload || reviewCopyReload.loading) return
    if (hasUnsavedDraftRef.current) {
      setReviewCopyReload({ ...reviewCopyReload, error: "Save your Unsaved Draft before reloading." })
      return
    }
    setReviewCopyReload({ ...reviewCopyReload, loading: true, error: null })
    try {
      await handleReloadFromDisk({ forReviewCopy: true })
      setReviewCopyReload(null)
    } catch {
      setReviewCopyReload((current) => current && {
        ...current,
        loading: false,
        error: "Couldn't reload the file. Nothing was copied. Try again or cancel.",
      })
    }
  }

  const dismissReloadChanges = () => {
    closeSelectionComposer()
    setShowChanges(false)
    setReloadComparison(null)
    reloadTriggerRef.current?.focus()
  }

  // Editing makes the comparison stale.
  const clearReloadChanges = () => {
    setReloadComparison(null)
    setShowChanges(false)
  }

  return {
    reloadConfirmOpen,
    setReloadConfirmOpen,
    reloadNoticeOpen,
    reloadLoading,
    reloadTriggerRef,
    reloadComparison,
    hasReloadChanges,
    changesVisible,
    setShowChanges,
    reviewCopyReload,
    setReviewCopyReload,
    handleReloadFromDisk,
    requestReloadFromDisk,
    cancelReviewCopyReload,
    reloadForReviewCopy,
    dismissReloadChanges,
    clearReloadChanges,
  }
}
