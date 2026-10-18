import React,{ useEffect,useState } from "react"
import { hasDocumentH1,resolvePdfExportTitle } from "~lib/pdf-export"
import { copyRenderedContent } from "~lib/rendered-copy"
import { type ReviewPromptEvent } from "~lib/review-prompt"

const PDF_EXPORT_TIP_STORAGE_KEY = "pdfExportTipSeen"

interface UseContentPdfExportOptions {
  content: string | null
  setContent: React.Dispatch<React.SetStateAction<string | null>>
  draftRef: React.MutableRefObject<string>
  contentRef: React.RefObject<HTMLDivElement>
  currentFileName: string
  setShowChanges: React.Dispatch<React.SetStateAction<boolean>>
  setReviewPromptReady: React.Dispatch<React.SetStateAction<boolean>>
  trackReviewPromptActivity: (event: ReviewPromptEvent) => void
}

// Call after the preview hook: printing waits for the preview render effect.
export function useContentPdfExport({
  content,
  setContent,
  draftRef,
  contentRef,
  currentFileName,
  setShowChanges,
  setReviewPromptReady,
  trackReviewPromptActivity,
}: UseContentPdfExportOptions) {
  const [pdfExportTipOpen, setPdfExportTipOpen] = useState(false)
  const [pendingPdfExport, setPendingPdfExport] = useState<string | null>(null)
  const [renderedCopyStatus, setRenderedCopyStatus] = useState<
    "idle" | "copied" | "error"
  >("idle")

  const insertPdfExportTitle = (markdown: string) => {
    const container = contentRef.current
    if (!container) return

    container.querySelector(".pdf-export-title")?.remove()
    if (hasDocumentH1(markdown)) return

    const title = document.createElement("h1")
    title.className = "pdf-export-title"
    title.textContent = resolvePdfExportTitle(markdown, currentFileName)
    container.prepend(title)
  }

  const startPdfExport = () => {
    setShowChanges(false)
    const latestContent = draftRef.current
    const previousTitle = document.title
    const restorePage = () => {
      document.title = previousTitle
      delete document.documentElement.dataset.pdfExport
      setReviewPromptReady(true)
    }

    document.title = resolvePdfExportTitle(latestContent, currentFileName)
    document.documentElement.dataset.pdfExport = "true"
    window.addEventListener("afterprint", restorePage, { once: true })

    if (content !== latestContent) setContent(latestContent)
    setPendingPdfExport(latestContent)
    trackReviewPromptActivity("pdf-export")
  }

  const requestPdfExport = () => {
    void chrome.storage.local.get(PDF_EXPORT_TIP_STORAGE_KEY)
      .then((stored) => {
        if (stored[PDF_EXPORT_TIP_STORAGE_KEY] === true) {
          startPdfExport()
          return
        }
        setPdfExportTipOpen(true)
      })
      .catch(() => setPdfExportTipOpen(true))
  }

  const continuePdfExport = () => {
    setPdfExportTipOpen(false)
    void chrome.storage.local.set({ [PDF_EXPORT_TIP_STORAGE_KEY]: true })
      .catch(() => undefined)
    startPdfExport()
  }

  const dismissPdfExportTip = () => {
    setPdfExportTipOpen(false)
    void chrome.storage.local.set({ [PDF_EXPORT_TIP_STORAGE_KEY]: true })
      .catch(() => undefined)
  }

  const copyRenderedPreview = async () => {
    const renderedContent = contentRef.current
    if (!renderedContent) return
    try {
      await copyRenderedContent(renderedContent)
      setRenderedCopyStatus("copied")
    } catch {
      setRenderedCopyStatus("error")
    }
    setTimeout(() => setRenderedCopyStatus("idle"), 2_000)
  }

  useEffect(() => {
    if (pendingPdfExport === null || content !== pendingPdfExport) return
    insertPdfExportTitle(pendingPdfExport)
    setPendingPdfExport(null)
    window.print()
  }, [content, pendingPdfExport])

  return {
    pdfExportTipOpen,
    requestPdfExport,
    continuePdfExport,
    dismissPdfExportTip,
    copyRenderedPreview,
    renderedCopyStatus,
  }
}
