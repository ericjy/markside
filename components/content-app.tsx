import React,{ useEffect,useRef,useState } from "react"

import { ContentDialogs } from "~components/content-dialogs"
import { ContentReviewOverlay } from "~components/content-review-overlay"
import { ContentReviewFinishBar } from "~components/content-review-finish-bar"
import { ContentReloadBar } from "~components/content-reload-bar"
import { ContentToolbar } from "~components/content-toolbar"
import { ContentView } from "~components/content-view"
import { ContentZenModeEdge } from "~components/content-zen-mode"
import { FilePalette } from "~components/file-palette"
import { type RawEditorHandle } from "~components/raw-editor"
import { type ReviewCopyStatus } from "~components/review-panel"
import { SidebarLeft } from "~components/sidebar-left"
import {
  SidebarInset,
  SidebarProvider
} from "~components/ui/sidebar"
import { useActiveReview } from "~hooks/use-active-review"
import {
  useContentFileLoading,
  useWikilinkNavigation,
  type FileNavigationTarget
} from "~hooks/use-content-file-loading"
import { useContentPdfExport } from "~hooks/use-content-pdf-export"
import { useContentPreferences } from "~hooks/use-content-preferences"
import { useContentPreview } from "~hooks/use-content-preview"
import { useContentReadability } from "~hooks/use-content-readability"
import { useContentReload } from "~hooks/use-content-reload"
import { useContentAgentReview } from "~hooks/use-content-agent-review"
import { useContentReview } from "~hooks/use-content-review"
import { useContentReviewHighlights } from "~hooks/use-content-review-highlights"
import { useContentReviewOverlay } from "~hooks/use-content-review-overlay"
import {
  useContentReviewPrompt,
  useReviewPromptActivity
} from "~hooks/use-content-review-prompt"
import { useContentSave,type SaveState } from "~hooks/use-content-save"
import { useContentSelection } from "~hooks/use-content-selection"
import { useContentShortcuts } from "~hooks/use-content-shortcuts"
import { useContentSnapshots } from "~hooks/use-content-snapshots"
import { useContentSplitPane } from "~hooks/use-content-split-pane"
import { readZenModeSession,useContentZenMode } from "~hooks/use-content-zen-mode"
import { usePersistedDirectory } from "~hooks/use-persisted-directory"
import { getPendingReviewItemCount } from "~lib/agent-review"
import { resolveUnsavedNavigationPolicy } from "~lib/auto-save"
import { getContentFileSurfaces, getSavePathParts } from "~lib/content-app-policy"
import { getFileHandle, indexActiveReview } from "~lib/db"
import { classifyMarksideFileUrl } from "~lib/file-types"
import { headingNumbers } from "~lib/heading-numbering"
import { type Heading } from "~lib/headings"
import { type QuestionCard } from "~lib/markdown"
import {
  resolveInitialSidebarState,
  setOutlineOpenPreference,
  shouldSyncDraftFromContent,
  type MarkdownMode,
  type PaneWidthPreferences
} from "~lib/markdown-mode"
import { rerenderMermaidBlocks } from "~lib/mermaid"
import { canExportPdf } from "~lib/pdf-export"
import {
  createPreviewEnhancementScheduler,
  createPreviewScheduler,
} from "~lib/preview-scheduler"
import {
  createEmptyReview,
  getReviewItemCount,
  hashReviewSource,
  type ActiveReview
} from "~lib/review"
import { buildRenderedTextIndex,type RenderedTextIndex } from "~lib/review-dom"
import { fileFolderPath,resolveFileBreadcrumbs } from "~lib/url"

// Hooks run in a deliberate order: effects that read the rendered preview
// (highlights, PDF export, draft sync) must be declared after useContentPreview.
export function FileRenderer({
  initialContent,
  initialMode,
  initialSplitPercent,
  initialPaneWidthPreferences,
  initialThemePreference,
  initialOutlineOpen,
  focusSource = false,
}: {
  initialContent: string | null
  initialMode: MarkdownMode
  initialSplitPercent: number
  initialPaneWidthPreferences: PaneWidthPreferences
  initialThemePreference: boolean | null
  initialOutlineOpen: boolean | null
  focusSource?: boolean
}) {
  const [content, setContent] = useState<string | null>(initialContent)
  const [error, setError] = useState<string | null>(null)
  const [headings, setHeadings] = useState<Heading[]>([])
  const [questionCards, setQuestionCards] = useState<QuestionCard[]>([])
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null)
  const [mode, setMode] = useState<MarkdownMode>(initialMode)
  const [previewWidth, setPreviewWidth] = useState(initialPaneWidthPreferences.previewWidth)
  const [sourceFullWidth, setSourceFullWidth] = useState(initialPaneWidthPreferences.sourceFullWidth)
  const [sidebarWidth, setSidebarWidth] = useState(280)
  const [rightSidebarWidth, setRightSidebarWidth] = useState(300)
  const [fileUrl, setFileUrl] = useState(() => window.location.href.split("#")[0])
  const fileUrlRef = useRef(fileUrl)
  fileUrlRef.current = fileUrl
  const isAddressBarSynced = fileUrl === window.location.href.split("#")[0]
  const isMdFile = classifyMarksideFileUrl(fileUrl) === "markdown"
  const isPdfExportable = canExportPdf(fileUrl)
  const { isImageFile, modeSurfaces, isSplitView, sourceVisible, previewVisible } = getContentFileSurfaces(fileUrl, mode)
  const initialSidebarState = resolveInitialSidebarState({
    mode: initialMode,
    isMarkdown: isMdFile,
    outlineOpenByDefault: initialOutlineOpen !== false && window.innerWidth >= 1280,
  })
  const [leftOpen, setLeftOpen] = useState(initialSidebarState.leftOpen)
  const [outlineOpen, setOutlineOpen] = useState(initialSidebarState.outlineOpen)
  const chooseOutlineOpen = (open: boolean) => {
    setOutlineOpen(open)
    void setOutlineOpenPreference(open).catch(() => undefined)
  }
  const { handle, rootUrl, status, openDirectory, reauthorize, folderError } = usePersistedDirectory()
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [zenMode, setZenMode] = useState(readZenModeSession)
  // Zen mode starts with the Outline hidden and toggles it separately, leaving
  // the normal open state and saved preference unchanged.
  const [zenOutlineOpen, setZenOutlineOpen] = useState(false)
  useEffect(() => {
    if (!zenMode) setZenOutlineOpen(false)
  }, [zenMode])
  const outlineShown = zenMode ? zenOutlineOpen : outlineOpen
  const toolbarWrapperRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    // A toolbar control clicked before entering would otherwise keep the hidden toolbar focused.
    const active = document.activeElement
    if (zenMode && active instanceof HTMLElement && toolbarWrapperRef.current?.contains(active)) active.blur()
  }, [zenMode])
  const chooseShownOutlineOpen = zenMode ? setZenOutlineOpen : chooseOutlineOpen
  const [saveFolderDialogOpen, setSaveFolderDialogOpen] = useState(false)
  const [imageReloadVersion, setImageReloadVersion] = useState(0)
  const [imageObjectUrl, setImageObjectUrl] = useState<string | null>(null)
  const [conflict, setConflict] = useState(false)
  const initialDraft = modeSurfaces.source ? initialContent ?? "" : ""
  const [draft, setDraft] = useState(initialDraft)
  // Keeps latest draft accessible in stable event handlers without stale closures
  const draftRef = useRef(initialDraft)
  const draftFileUrlRef = useRef<string | null>(null)
  const pendingDraftSyncRef = useRef(false)
  const hasUnsavedDraftRef = useRef(false)
  const [saveState, setSaveState] = useState<SaveState>("idle")
  const [pendingNavigation, setPendingNavigation] =
    useState<FileNavigationTarget | null>(null)
  const [copied, setCopied] = useState(false)
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null)
  const [selectedImportedCommentId, setSelectedImportedCommentId] = useState<string | null>(null)
  const [reviewSelectionVersion, setReviewSelectionVersion] = useState(0)
  const [reviewRenderVersion, setReviewRenderVersion] = useState(0)
  const [copyReviewStatus, setCopyReviewStatus] = useState<ReviewCopyStatus | null>(null)
  const [clipboardFallback, setClipboardFallback] = useState<string | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const sidebarInsetRef = useRef<HTMLDivElement>(null)
  const renderedFileUrlRef = useRef<string | null>(null)
  const rawEditorRef = useRef<RawEditorHandle>(null)
  const renderedTextIndexRef = useRef<RenderedTextIndex | null>(null)
  const fileHandleRef = useRef<FileSystemFileHandle | null>(null)
  const pendingHandleRef = useRef<FileSystemFileHandle | null>(null)
  const fileMenuPointerInteractionRef = useRef(false)
  const fileMenuTriggerRef = useRef<HTMLButtonElement | null>(null)
  const previewSchedulerRef = useRef<ReturnType<typeof createPreviewScheduler> | null>(null)
  if (!previewSchedulerRef.current) {
    previewSchedulerRef.current = createPreviewScheduler()
  }
  const previewEnhancementSchedulerRef = useRef<
    ReturnType<typeof createPreviewEnhancementScheduler> | null
  >(null)
  if (!previewEnhancementSchedulerRef.current) {
    previewEnhancementSchedulerRef.current = createPreviewEnhancementScheduler()
  }
  const previewEnhancementRef = useRef<number | null>(null)
  const previewScrollRef = useRef<HTMLDivElement>(null)
  const pendingPreviewSourceLineRef = useRef<number | null>(null)
  const pendingRevealSourceLineRef = useRef<number | null>(null)
  const previewFollowPausedRef = useRef(false)
  const diskLastModifiedRef = useRef<number>(0)
  const diskContentRef = useRef<string | null>(initialContent)
  const {
    review,
    reviewLoaded,
    reviewCounts,
    persistenceError: reviewPersistenceError,
    updateReview,
    waitForReviewPersistence,
    discardUnpersistedReview,
  } = useActiveReview(fileUrl, isMdFile)
  const reviewItemCount = review ? getReviewItemCount(review) : 0
  const ownReviewItemCount = review
    ? review.comments.length + (review.note.trim() ? 1 : 0)
    : 0
  const importedRoundCount = review?.importedRounds?.length ?? 0
  const { fileName, crumbs, crumbUrls, hasMore } = resolveFileBreadcrumbs(fileUrl)
  const currentFileName = fileName ?? "this file"
  const addressBarFileName =
    resolveFileBreadcrumbs(window.location.href.split("#")[0]).fileName ?? "the current file"

  const cancelPreviewUpdate = () => {
    previewSchedulerRef.current?.cancel()
  }

  const cancelPreviewEnhancement = () => {
    previewEnhancementSchedulerRef.current?.cancel()
    if (previewEnhancementRef.current !== null) {
      window.cancelIdleCallback(previewEnhancementRef.current)
      previewEnhancementRef.current = null
    }
  }

  const navigateTabToFile = (url: string) => {
    try {
      chrome.runtime.sendMessage({ type: "navigate-file", url }, (response) => {
        if (chrome.runtime.lastError) {
          setError("Chrome blocked navigation to the selected local file.")
          return
        }
        if (response?.error) setError(response.error)
      })
    } catch {
      setError("Reload the page to reconnect Markside.")
    }
  }

  const currentReviewDocument = () => {
    const root = contentRef.current
    if (!root) return null
    const index = buildRenderedTextIndex(root, hashReviewSource(content ?? ""))
    renderedTextIndexRef.current = index
    return index
  }

  const reviewForMutation = (current: ActiveReview | null) => current ?? createEmptyReview(
    fileUrl,
    hashReviewSource(content ?? ""),
  )

  const { dark, setDark, followsSystemThemeRef, numberHeadings, setNumberHeadings, typeface } =
    useContentPreferences(initialThemePreference)
  const outlineNumbers = numberHeadings ? headingNumbers(headings) : []
  const promptActivity = useReviewPromptActivity()
  const { setReviewPromptReady, trackReviewPromptActivity } = promptActivity
  const overlay = useContentReviewOverlay({
    fileUrl,
    isMdFile,
    isSplitView,
    outlineOpen: outlineShown,
    rightSidebarWidth,
    sidebarInsetRef,
  })
  const zen = useContentZenMode({
    zenMode,
    setZenMode,
    escapeClosesPanel: overlay.reviewOverlayOpen || paletteOpen,
  })
  const selection = useContentSelection({
    fileUrl,
    content,
    isMdFile,
    previewVisible,
    contentRef,
    previewScrollRef,
  })
  const readability = useContentReadability({
    fileUrl,
    content,
    review,
    updateReview,
    reviewForMutation,
    currentReviewDocument,
    setSelectedReviewId,
    setReviewOverlayOpen: overlay.setReviewOverlayOpen,
    trackReviewPromptActivity,
  })
  const split = useContentSplitPane({
    initialSplitPercent,
    initialSidebarState,
    isSplitView,
    leftOpen,
    setLeftOpen,
    outlineOpen,
    setOutlineOpen,
  })
  const { doSave, scheduleAutoSave, cancelScheduledSave, autoSaveEnabledRef } = useContentSave({
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
  })
  const reload = useContentReload({
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
    closeSelectionComposer: selection.closeSelectionComposer,
  })

  useEffect(() => {
    setSelectedReviewId(null)
    setCopyReviewStatus(null)
  }, [fileUrl, isMdFile])

  // Consumes a reveal request queued by revealSelectionInSource when Preview mode
  // had to switch to Split before the source pane (and rawEditorRef) existed.
  useEffect(() => {
    if (!isSplitView) return
    const line = pendingRevealSourceLineRef.current
    if (line === null) return
    pendingRevealSourceLineRef.current = null
    rawEditorRef.current?.revealLine(line)
  }, [isSplitView])

  const { performFileNavigation } = useContentFileLoading({
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
  })

  const snapshots = useContentSnapshots({
    review,
    hasUnsavedDraftRef,
    draftRef,
    diskContentRef,
    content,
    currentFileName,
    cancelScheduledSave,
    doSave,
    fileUrlRef,
    setReviewPromptReady,
    updateReview,
    reviewForMutation,
  })

  const requestFileNavigation = async (target: FileNavigationTarget) => {
    if (review && getReviewItemCount(review) > 0) {
      const persisted = await waitForReviewPersistence()
      if (!persisted) {
        if (!window.confirm("This Review has not been saved. Leave this file and discard the in-memory Review?")) return
        discardUnpersistedReview()
      }
    }
    const policy = resolveUnsavedNavigationPolicy({
      autoSaveEnabled: autoSaveEnabledRef.current,
      hasUnsavedDraft: hasUnsavedDraftRef.current,
    })
    if (policy === "confirm") {
      setPendingNavigation(target)
      return
    }
    if (policy === "save") {
      cancelScheduledSave()
      const saved = await doSave(draftRef.current, fileUrlRef.current)
      if (!saved) return
    }
    await performFileNavigation(target)
  }

  const handleFileSelect = (url: string, handle: FileSystemFileHandle) => {
    void requestFileNavigation({ url, handle })
  }

  const chooseSaveFolder = async () => {
    if (!(await openDirectory("readwrite"))) return
    setSaveFolderDialogOpen(false)
    await doSave(draftRef.current, fileUrlRef.current)
  }

  const handleDraftChange = (value: string, sourceLine: number) => {
    reload.clearReloadChanges()
    setDraft(value)
    draftRef.current = value
    if (isSplitView) {
      pendingPreviewSourceLineRef.current = sourceLine
      previewFollowPausedRef.current = false
      previewSchedulerRef.current?.schedule(() => {
        setContent(draftRef.current)
      })
    }
    hasUnsavedDraftRef.current = true
    setSaveState("unsaved")
    scheduleAutoSave()
  }

  const { selectMode } = useContentPreview({
    mode,
    cancelPreviewUpdate,
    pendingDraftSyncRef,
    draftRef,
    content,
    setContent,
    setDraft,
    setMode,
    contentRef,
    cancelPreviewEnhancement,
    setHeadings,
    setReadabilityMounts: readability.setReadabilityMounts,
    setQuestionCards,
    renderedFileUrlRef,
    fileUrl,
    imageReloadVersion,
    previewEnhancementRef,
    setReviewRenderVersion,
    changesVisible: reload.changesVisible,
    reloadComparison: reload.reloadComparison,
    isSplitView,
    previewEnhancementSchedulerRef,
    readabilitySections: readability.readabilitySections,
    readabilityMounts: readability.readabilityMounts,
    previewFollowPausedRef,
    pendingPreviewSourceLineRef,
    previewScrollRef,
    numberHeadings,
    previewVisible,
    setActiveHeadingId,
    headings,
  })

  const revealSelectionInSource = () => {
    const { selectionAction, setSelectionAction } = selection
    if (!selectionAction || selectionAction.sourceLine === null) return
    const line = selectionAction.sourceLine
    setSelectionAction(null)
    if (isSplitView) {
      rawEditorRef.current?.revealLine(line)
      return
    }
    pendingRevealSourceLineRef.current = line
    selectMode("split")
  }

  const [agentSessionCheckVersion, setAgentSessionCheckVersion] = useState(0)
  const [agentSessionCheck, setAgentSessionCheck] = useState<{ url: string; status: "checking" | "not-found" | "idle" } | null>(null)
  const [agentReviewLoadedUrl, setAgentReviewLoadedUrl] = useState<string | null>(null)
  const [agentDiscoveryVersion, setAgentDiscoveryVersion] = useState(0)
  const agentDiscoveryEnabledRef = useRef(false)
  useEffect(() => {
    // Users usually switch to their agent and back: to start a review, or after it
    // replies. One read on return is not file watching: nothing runs while idle.
    const discover = () => { if (agentDiscoveryEnabledRef.current) setAgentDiscoveryVersion((version) => version + 1) }
    window.addEventListener("focus", discover)
    return () => window.removeEventListener("focus", discover)
  }, [])
  const agentHandoff = useContentAgentReview({
    fileUrl,
    enabled: isMdFile,
    open: overlay.reviewOverlayOpen,
    reloadVersion: reload.reloadVersion,
    sessionCheckVersion: agentSessionCheckVersion,
    discoveryVersion: agentDiscoveryVersion,
    onSessionChecked: (found) => setAgentSessionCheck({ url: fileUrl, status: found ? "idle" : "not-found" }),
    onLoaded: setAgentReviewLoadedUrl,
    // The agent edits the document before marking comments Addressed, so its reply means the document changed.
    onAgentReplied: () => void reload.checkDiskForUpdates().catch(() => undefined),
    review,
    updateReview,
    openDirectory,
    directory: handle && rootUrl ? { handle, rootUrl } : null,
    diskContentRef,
    hasUnsavedDraftRef,
    renderedTextIndexRef,
  })
  agentDiscoveryEnabledRef.current = isMdFile && fileUrl.startsWith("file:")
  const checkReviewUpdates = async () => {
    const [agentChanged, documentChanged] = await Promise.all([
      agentHandoff?.checkForUpdates?.() ?? Promise.resolve(false),
      reload.checkDiskForUpdates(),
    ])
    return agentChanged || documentChanged
  }
  const pendingReviewItemCount = review ? getPendingReviewItemCount(review, agentHandoff?.file) : 0
  const addressedReviewCount = [...(agentHandoff?.results?.values() ?? [])].filter(({ status }) => status === "addressed").length
    + (agentHandoff?.file?.noteStatus === "addressed" && !agentHandoff.completed ? 1 : 0)
  const reviewNotice = agentHandoff?.error
    ? { kind: "error" as const, message: agentHandoff.error }
    : addressedReviewCount > 0
      ? { kind: "reply" as const, message: `${addressedReviewCount} ${addressedReviewCount === 1 ? "reply" : "replies"} to review` }
      : undefined
  const reviewIndexReady = isMdFile && reviewLoaded && agentReviewLoadedUrl === fileUrl
  useEffect(() => {
    if (reviewIndexReady) indexActiveReview(fileUrl, review?.updatedAt ?? "", pendingReviewItemCount)
  }, [reviewIndexReady, fileUrl, review?.updatedAt, pendingReviewItemCount])

  const highlights = useContentReviewHighlights({
    review,
    agentResults: agentHandoff?.results,
    content,
    fileUrl,
    contentRef,
    previewScrollRef,
    previewVisible,
    renderedTextIndexRef,
    selectedReviewId,
    selectedImportedCommentId,
    reviewRenderVersion,
    numberHeadings,
    changesVisible: reload.changesVisible,
    reloadComparison: reload.reloadComparison,
  })

  const pdf = useContentPdfExport({
    content,
    setContent,
    draftRef,
    contentRef,
    currentFileName,
    setShowChanges: reload.setShowChanges,
    setReviewPromptReady,
    trackReviewPromptActivity,
  })

  const prompt = useContentReviewPrompt({
    activity: promptActivity,
    fileUrl,
    content,
    error,
    blocked:
      clipboardFallback !== null ||
      snapshots.linkSnapshotDialog !== null ||
      snapshots.importReviewDialog !== null ||
      pendingNavigation !== null ||
      pdf.pdfExportTipOpen ||
      reload.reloadConfirmOpen ||
      saveFolderDialogOpen ||
      reload.reviewCopyReload !== null ||
      paletteOpen ||
      selection.selectionComposerOpen ||
      selection.selectionPresetPickerOpen ||
      selection.quickCommentMenuOpen,
  })

  const reviewActions = useContentReview({
    fileUrl,
    isMdFile,
    previewVisible,
    review,
    agentHandoff,
    updateReview,
    reviewForMutation,
    currentReviewDocument,
    renderedTextIndexRef,
    highlights,
    overlay,
    selection,
    setSelectedReviewId,
    setSelectedImportedCommentId,
    setReviewSelectionVersion,
    setCopyReviewStatus,
    setReviewCopyReload: reload.setReviewCopyReload,
    setClipboardFallback,
    readabilityResultsRef: readability.readabilityResultsRef,
    saveReadabilityResults: readability.saveReadabilityResults,
    diskContentRef,
    hasUnsavedDraftRef,
    setReviewPromptReady,
    trackReviewPromptActivity,
  })

  useEffect(() => {
    if (!content || !contentRef.current || reload.changesVisible) return
    rerenderMermaidBlocks(contentRef.current, dark)
  }, [dark])

  useEffect(() => {
    if (content === null || !shouldSyncDraftFromContent({
      content,
      isMarkdown: isMdFile,
      sourceVisible,
      isSplitView,
      hasPendingDraftSync: pendingDraftSyncRef.current,
    })) return
    pendingDraftSyncRef.current = false
    setDraft(content)
    draftRef.current = content
  }, [content]) // eslint-disable-line react-hooks/exhaustive-deps — visibility changes must not overwrite an in-progress draft

  useEffect(() => {
    if (content === null || !isMdFile || draftFileUrlRef.current === fileUrl) return
    draftFileUrlRef.current = fileUrl
    setDraft(content)
    draftRef.current = content
  }, [content, fileUrl, isMdFile])

  useEffect(() => {
    cancelPreviewUpdate()
    fileHandleRef.current = null
    diskLastModifiedRef.current = 0
    hasUnsavedDraftRef.current = false
    setConflict(false)
    setSaveState("idle")
    if (pendingHandleRef.current) {
      // Sidebar supplied a handle directly — use it, skip IndexedDB lookup.
      fileHandleRef.current = pendingHandleRef.current
      pendingHandleRef.current = null
      return
    }
    getFileHandle(fileUrl).then((handle) => {
      if (handle) {
        // Always restore the handle. If write permission has lapsed (common after
        // page reload), doSave will call requestPermission on the next user-gesture
        // save (Cmd+S or Save button) — no need to show the full file picker again.
        fileHandleRef.current = handle
        handle.getFile().then(f => {
          diskLastModifiedRef.current = f.lastModified
          scheduleAutoSave()
        }).catch(() => {})
      }
    })
  }, [fileUrl])

  useWikilinkNavigation({ contentRef, fileUrl, requestFileNavigation, setError })

  useEffect(() => {
    return () => {
      previewSchedulerRef.current?.cancel()
      cancelPreviewEnhancement()
    }
  }, [])

  useContentShortcuts({
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
    reviewOverlayOpen: overlay.reviewOverlayOpen,
    clipboardFallback,
    reviewCopyReload: reload.reviewCopyReload,
    closeReviewOverlay: overlay.closeReviewOverlay,
    reviewPromptOpen: prompt.reviewPromptOpen,
    dismissReviewPrompt: prompt.dismissReviewPrompt,
  })

  return (
    <SidebarProvider
      open={leftOpen}
      onOpenChange={setLeftOpen}
      style={
        { "--sidebar-width": `${sidebarWidth}px` } as React.CSSProperties
      }>
      <ContentDialogs
        reviewPromptOpen={prompt.reviewPromptOpen}
        dismissReviewPrompt={prompt.dismissReviewPrompt}
        acceptReviewPrompt={prompt.acceptReviewPrompt}
        clipboardFallback={clipboardFallback}
        setClipboardFallback={setClipboardFallback}
        linkSnapshotDialog={snapshots.linkSnapshotDialog}
        closeLinkSnapshotDialog={snapshots.closeLinkSnapshotDialog}
        setLinkSnapshotDialog={snapshots.setLinkSnapshotDialog}
        ownReviewItemCount={ownReviewItemCount}
        updateLinkSnapshotReviewChoice={snapshots.updateLinkSnapshotReviewChoice}
        importedRoundCount={importedRoundCount}
        openLinkSnapshotUrl={snapshots.openLinkSnapshotUrl}
        copyBackupUrl={snapshots.copyBackupUrl}
        backupUrlCopyState={snapshots.backupUrlCopyState}
        confirmLinkSnapshot={snapshots.confirmLinkSnapshot}
        importReviewDialog={snapshots.importReviewDialog}
        closeImportReviewDialog={snapshots.closeImportReviewDialog}
        setImportReviewDialog={snapshots.setImportReviewDialog}
        decodeImportReviewInput={snapshots.decodeImportReviewInput}
        confirmImportReview={snapshots.confirmImportReview}
        pendingNavigation={pendingNavigation}
        setPendingNavigation={setPendingNavigation}
        performFileNavigation={performFileNavigation}
        saveState={saveState}
        cancelScheduledSave={cancelScheduledSave}
        doSave={doSave}
        draftRef={draftRef}
        fileUrlRef={fileUrlRef}
        pdfExportTipOpen={pdf.pdfExportTipOpen}
        dismissPdfExportTip={pdf.dismissPdfExportTip}
        continuePdfExport={pdf.continuePdfExport}
        saveFolderDialogOpen={saveFolderDialogOpen}
        currentFileName={currentFileName}
        folderError={folderError}
        setSaveFolderDialogOpen={setSaveFolderDialogOpen}
        chooseSaveFolder={chooseSaveFolder}
        reviewCopyReload={reload.reviewCopyReload}
        cancelReviewCopyReload={reload.cancelReviewCopyReload}
        reloadForReviewCopy={reload.reloadForReviewCopy}
        reloadConfirmOpen={reload.reloadConfirmOpen}
        setReloadConfirmOpen={reload.setReloadConfirmOpen}
        handleReloadFromDisk={reload.handleReloadFromDisk}
        renderedCopyStatus={pdf.renderedCopyStatus}
      />
      <div className={zenMode ? "hidden" : "contents"}>
      <SidebarLeft
        currentFileUrl={fileUrl}
        sidebarWidth={sidebarWidth}
        onResize={setSidebarWidth}
        onFileSelect={handleFileSelect}
        handle={handle}
        rootUrl={rootUrl}
        status={status}
        openDirectory={openDirectory}
        reauthorize={reauthorize}
        folderError={folderError}
        onOpenPalette={() => setPaletteOpen(true)}
        reviewCounts={{ ...reviewCounts, [fileUrl]: pendingReviewItemCount }}
      />
      </div>
      <SidebarInset ref={sidebarInsetRef} className="relative h-svh overflow-hidden">
      {zenMode && (
        <ContentZenModeEdge
          hintVisible={zen.hintVisible}
          toolbarRevealed={zen.toolbarRevealed}
          pointerNearTop={zen.pointerNearTop}
          rightInset={overlay.reviewOverlayOpen && overlay.reviewOverlayDocked ? overlay.reviewDockWidth : 16}
          onReveal={zen.revealToolbar}
        />
      )}
      {/* In Zen mode the toolbar overlays the document while revealed; keyboard focus also reveals it. */}
      <div ref={toolbarWrapperRef} data-zen-toolbar className={!zenMode ? "contents"
        : `absolute inset-x-0 top-0 z-[60] bg-background shadow-sm ${zen.toolbarRevealed ? "" : "pointer-events-none opacity-0 has-[:focus-visible]:pointer-events-auto has-[:focus-visible]:opacity-100"}`}>
      <ContentToolbar
        leftOpen={leftOpen}
        hasMore={hasMore}
        crumbs={crumbs}
        crumbUrls={crumbUrls}
        fileUrl={fileUrl}
        setCopied={setCopied}
        copied={copied}
        isAddressBarSynced={isAddressBarSynced}
        navigateTabToFile={navigateTabToFile}
        currentFileName={currentFileName}
        addressBarFileName={addressBarFileName}
        sourceVisible={sourceVisible}
        saveState={saveState}
        cancelScheduledSave={cancelScheduledSave}
        doSave={doSave}
        draftRef={draftRef}
        reloadTriggerRef={reload.reloadTriggerRef}
        requestReloadFromDisk={reload.requestReloadFromDisk}
        reloadLoading={reload.reloadLoading}
        content={content}
        diskChanged={reload.diskChanged}
        previewVisible={previewVisible}
        selectMode={selectMode}
        isMdFile={isMdFile}
        mode={mode}
        dark={dark}
        followsSystemThemeRef={followsSystemThemeRef}
        setDark={setDark}
        reviewTriggerRef={overlay.reviewTriggerRef}
        reviewOverlayOpen={overlay.reviewOverlayOpen}
        closeReviewOverlay={overlay.closeReviewOverlay}
        setReviewOverlayOpen={overlay.setReviewOverlayOpen}
        reviewItemCount={pendingReviewItemCount}
        reviewNotice={reviewNotice}
        chooseOutlineOpen={chooseShownOutlineOpen}
        outlineOpen={outlineShown}
        requestLinkSnapshot={snapshots.requestLinkSnapshot}
        fileMenuTriggerRef={fileMenuTriggerRef}
        fileMenuPointerInteractionRef={fileMenuPointerInteractionRef}
        previewWidth={previewWidth}
        setPreviewWidth={setPreviewWidth}
        typeface={typeface}
        numberHeadings={numberHeadings}
        setNumberHeadings={setNumberHeadings}
        readabilityControlsVisible={readability.readabilityControlsVisible}
        setReadabilityControlsVisible={readability.setReadabilityControlsVisible}
        copyRenderedPreview={pdf.copyRenderedPreview}
        isPdfExportable={isPdfExportable}
        requestPdfExport={pdf.requestPdfExport}
        zenMode={zenMode}
        setZenMode={setZenMode}
      />
      </div>
      {/* Leaves room above the document so a revealed toolbar doesn't crowd it. */}
      {zenMode && <div className="h-5 shrink-0" />}
        {conflict && (
          <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-2 bg-amber-50 dark:bg-amber-950 border-b border-amber-200 dark:border-amber-800 text-xs">
            <span className="text-amber-800 dark:text-amber-200">
              <strong className="font-medium">File was modified externally.</strong> Your unsaved changes conflict with the version on disk.
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => void doSave(draftRef.current, fileUrl, { force: true })}
                className="px-2.5 py-1 rounded border border-amber-400 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900 transition-colors font-medium">
                Overwrite
              </button>
              <button
                onClick={() => void reload.handleReloadFromDisk()}
                className="px-2.5 py-1 rounded border border-amber-400 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900 transition-colors font-medium">
                Reload from disk
              </button>
            </div>
          </div>
        )}

      <ContentView
        checkReviewUpdates={checkReviewUpdates}
        isImageFile={isImageFile}
        error={error}
        imageObjectUrl={imageObjectUrl}
        fileUrl={fileUrl}
        splitContainerRef={split.splitContainerRef}
        isSplitView={isSplitView}
        splitMinWidth={split.splitMinWidth}
        sourceVisible={sourceVisible}
        previewPercent={split.previewPercent}
        sourceFullWidth={sourceFullWidth}
        content={content}
        rawEditorRef={rawEditorRef}
        draft={draft}
        dark={dark}
        setSourceFullWidth={setSourceFullWidth}
        currentFileName={currentFileName}
        focusSource={focusSource}
        handleDraftChange={handleDraftChange}
        updateSplitFromClientX={split.updateSplitFromClientX}
        storeSplitPercent={split.storeSplitPercent}
        adjustSplitBy={split.adjustSplitBy}
        previewScrollRef={previewScrollRef}
        previewVisible={previewVisible}
        previewFollowPausedRef={previewFollowPausedRef}
        captureReviewSelection={selection.captureReviewSelection}
        reviewCommentIdAtPoint={highlights.reviewCommentIdAtPoint}
        importedReviewCommentIdAtPoint={highlights.importedReviewCommentIdAtPoint}
        handleReviewHighlightClick={reviewActions.handleReviewHighlightClick}
        reviewOverlayDocked={overlay.reviewOverlayDocked}
        reviewDockWidth={overlay.reviewDockWidth}
        selectionAction={selection.selectionAction}
        selectionComposerOpen={selection.selectionComposerOpen}
        selectionComposerTextareaRef={selection.selectionComposerTextareaRef}
        selectionComposerBody={selection.selectionComposerBody}
        selectionComposerSelectionRef={selection.selectionComposerSelectionRef}
        setSelectionComposerBody={selection.setSelectionComposerBody}
        closeSelectionComposer={selection.closeSelectionComposer}
        saveSelectionComposerComment={reviewActions.saveSelectionComposerComment}
        reviewFinishBar={
          <ContentReviewFinishBar
            agentHandoff={agentHandoff}
            panelOpen={overlay.reviewOverlayOpen}
            diskChanged={reload.diskChanged}
            questionsOpen={questionCards.some((card) => card.options.length > 0 && !reviewActions.questionAnswer(card.target)?.trim())}
            disabled={content === null || saveState === "saving"}
          />
        }
        agentHandoff={agentHandoff}
        sendSelectionComposerComment={reviewActions.sendSelectionComposerComment}
        selectionPresetPickerOpen={selection.selectionPresetPickerOpen}
        setSelectionPresetPickerOpen={selection.setSelectionPresetPickerOpen}
        insertSelectionComposerPreset={selection.insertSelectionComposerPreset}
        selectionComposerCopyState={selection.selectionComposerCopyState}
        copySelectionComposerComment={reviewActions.copySelectionComposerComment}
        selectionToolbarRef={selection.selectionToolbarRef}
        activateReviewSelection={reviewActions.activateReviewSelection}
        quickCommentMenuOpen={selection.quickCommentMenuOpen}
        quickCommentPointerDismissRef={selection.quickCommentPointerDismissRef}
        setQuickCommentMenuOpen={selection.setQuickCommentMenuOpen}
        quickCommentTriggerRef={selection.quickCommentTriggerRef}
        activateQuickComment={reviewActions.activateQuickComment}
        revealSelectionInSource={revealSelectionInSource}
        contentRef={contentRef}
        readabilityControlsVisible={readability.readabilityControlsVisible}
        previewWidth={previewWidth}
        readabilityMounts={readability.readabilityMounts}
        questionCards={questionCards}
        questionAnswer={reviewActions.questionAnswer}
        questionActionsBusy={reviewActions.questionActionsBusy}
        answerQuestion={reviewActions.answerQuestion}
        clearQuestionAnswer={reviewActions.clearQuestionAnswer}
        composeQuestionAnswer={reviewActions.composeQuestionAnswer}
        matchingReadabilityResult={readability.matchingReadabilityResult}
        hasSingleH1={readability.hasSingleH1}
        readabilityConsentGranted={readability.readabilityConsentGranted}
        confirmReadabilityConsent={readability.confirmReadabilityConsent}
        runReadabilityCheck={readability.runReadabilityCheck}
        runReadabilityLocate={readability.runReadabilityLocate}
        addReadabilityComment={readability.addReadabilityComment}
        saveReadabilityResults={readability.saveReadabilityResults}
        readabilityResultsRef={readability.readabilityResultsRef}
        reviewBadgeAnchors={highlights.reviewBadgeAnchors}
        jumpToReviewSection={reviewActions.jumpToReviewSection}
        selectedReviewId={selectedReviewId}
        outlineOpen={outlineOpen || outlineShown}
        outlineHidden={zenMode && !zenOutlineOpen}
        numberHeadings={numberHeadings}
        headings={headings}
        outlineNumbers={outlineNumbers}
        activeHeadingId={activeHeadingId}
        rightSidebarWidth={rightSidebarWidth}
        setRightSidebarWidth={setRightSidebarWidth}
        setOutlineOpen={zenMode ? setZenOutlineOpen : setOutlineOpen}
        chooseOutlineOpen={chooseShownOutlineOpen}
        setActiveHeadingId={setActiveHeadingId}
      />
      {(reload.diskChanged || reload.hasReloadChanges || reload.reloadLoading || reload.reloadNoticeOpen) && (
        <div className="pointer-events-none absolute bottom-5 left-0 z-40 print:hidden" style={{ right: overlay.reviewOverlayDocked ? overlay.reviewDockWidth : 0 }}>
          <div style={{ width: isSplitView ? `${split.previewPercent}%` : "100%" }}>
            <div className="flex justify-center px-4 xl:mr-[var(--reload-outline-width)]" style={{ "--reload-outline-width": `${outlineShown && previewVisible ? rightSidebarWidth : 0}px` } as React.CSSProperties}>
              <ContentReloadBar
                diskChanged={reload.diskChanged}
                reloadLoading={reload.reloadLoading}
                requestReloadFromDisk={reload.requestReloadFromDisk}
                reloadNoticeOpen={reload.reloadNoticeOpen}
                hasReloadChanges={reload.hasReloadChanges}
                reloadComparison={reload.reloadComparison}
                changesVisible={reload.changesVisible}
                closeSelectionComposer={selection.closeSelectionComposer}
                setShowChanges={reload.setShowChanges}
                previewVisible={previewVisible}
                selectMode={selectMode}
                dismissReloadChanges={reload.dismissReloadChanges}
                review={review}
                clearReview={reviewActions.clearReview}
                agentReviewFile={agentHandoff?.file}
                disabled={content === null || saveState === "saving"}
              />
            </div>
          </div>
        </div>
      )}
      <ContentReviewOverlay
        checkReviewUpdates={checkReviewUpdates}
        reloadDocumentLoading={reload.reloadLoading}
        agentHandoff={agentHandoff}
        agentSessionCheckStatus={agentSessionCheck?.url === fileUrl ? agentSessionCheck.status : "idle"}
        checkAgentSession={() => {
          setAgentSessionCheck({ url: fileUrl, status: "checking" })
          setAgentSessionCheckVersion((version) => version + 1)
        }}
        reviewLoading={isMdFile && (!reviewLoaded || agentReviewLoadedUrl !== fileUrl)}
        interview={questionCards.length > 0}
        diskChanged={reload.diskChanged}
        questionsOpen={questionCards.some((card) => card.options.length > 0 && !reviewActions.questionAnswer(card.target)?.trim())}
        reviewFolder={fileUrl.startsWith("file:") && !(rootUrl && getSavePathParts(fileUrl, rootUrl))
          ? { path: fileFolderPath(fileUrl), choose: () => openDirectory("readwrite") }
          : null}
        isMdFile={isMdFile}
        reviewOverlayDocked={overlay.reviewOverlayDocked}
        reviewLayout={overlay.reviewLayout}
        toggleReviewDock={overlay.toggleReviewDock}
        reviewDockWidth={overlay.reviewDockWidth}
        resizeReviewDock={overlay.resizeReviewDock}
        saveReviewDockWidth={overlay.saveReviewDockWidth}
        reviewOverlayRef={overlay.reviewOverlayRef}
        reviewOverlayOpen={overlay.reviewOverlayOpen}
        reviewOverlaySize={overlay.reviewOverlaySize}
        outlineOpen={outlineShown}
        zenMode={zenMode}
        rightSidebarWidth={rightSidebarWidth}
        reviewOverlayPosition={overlay.reviewOverlayPosition}
        reviewOverlayDragging={overlay.reviewOverlayDragging}
        startReviewOverlayDrag={overlay.startReviewOverlayDrag}
        updateReviewOverlayDrag={overlay.updateReviewOverlayDrag}
        endReviewOverlayDrag={overlay.endReviewOverlayDrag}
        moveReviewOverlayWithKeyboard={overlay.moveReviewOverlayWithKeyboard}
        reviewItemCount={reviewItemCount}
        openImportReviewDialog={snapshots.openImportReviewDialog}
        setReviewOverlaySize={overlay.setReviewOverlaySize}
        nextReviewOverlaySize={overlay.nextReviewOverlaySize}
        closeReviewOverlay={overlay.closeReviewOverlay}
        fileUrl={fileUrl}
        reviewSelectionVersion={reviewSelectionVersion}
        review={review}
        resolvedReviewComments={highlights.resolvedReviewComments}
        selectedReviewId={selectedReviewId}
        reviewPersistenceError={reviewPersistenceError}
        copyReviewStatus={copyReviewStatus}
        jumpableReviewCommentIds={reviewActions.jumpableReviewCommentIds}
        resolvedImportedComments={highlights.resolvedImportedComments}
        jumpableImportedCommentIds={reviewActions.jumpableImportedCommentIds}
        selectedImportedCommentId={selectedImportedCommentId}
        updateReviewNote={reviewActions.updateReviewNote}
        updateReviewComment={reviewActions.updateReviewComment}
        changeReviewCommentStatus={reviewActions.changeReviewCommentStatus}
        deleteReviewCommentById={reviewActions.deleteReviewCommentById}
        selectReviewComment={reviewActions.selectReviewComment}
        clearReviewSelection={reviewActions.clearReviewSelection}
        jumpToReviewSection={reviewActions.jumpToReviewSection}
        jumpToImportedComment={reviewActions.jumpToImportedComment}
        copyActiveReview={reviewActions.copyActiveReview}
        clearReview={reviewActions.clearReview}
      />
      </SidebarInset>
      <FilePalette
        open={paletteOpen}
        rootHandle={handle}
        rootUrl={rootUrl}
        onFileSelect={handleFileSelect}
        onClose={() => setPaletteOpen(false)}
      />
    </SidebarProvider>
  )
}
