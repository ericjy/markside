import React,{ useRef,useState } from "react"
import {
  buildHostedSnapshotUrl,
  DEFAULT_EXPIRY_DAYS,
  encryptSnapshotEnvelope,
  HOSTED_SNAPSHOT_UPLOAD_URL,
  uploadHostedSnapshot,
  type ExpiryDays
} from "~lib/hosted-snapshot"
import {
  buildSnapshotEnvelopeBytes,
  createLinkSnapshot,
  decodeLinkSnapshotFragment,
  type LinkSnapshotCreation,
} from "~lib/link-snapshot"
import {
  analyzeLinkSnapshotResources,
  type LinkSnapshotResources,
} from "~lib/link-snapshot-resources"
import {
  resolveReviewPolicy,
  type ActiveReview,
  type ReviewRound
} from "~lib/review"
import {
  recordReviewPromptEvent
} from "~lib/review-prompt"

export type LinkSnapshotDialog = {
  markdown: string
  creation: LinkSnapshotCreation
  resources: LinkSnapshotResources
  requiresSave: boolean
  includeReview: boolean
  reviewerName: string
  kind: "link" | "hosted"
  expiryDays: ExpiryDays
  shareUrl: string | null
  status: "confirm" | "copying" | "uploading" | "copied" | "copy-failed" | "save-failed" | "upload-failed"
}

export type ImportReviewDialog = {
  input: string
  status: "input" | "invalid" | "empty" | "preview" | "imported"
  rounds: ReviewRound[]
}

interface UseContentSnapshotsOptions {
  review: ActiveReview | null
  hasUnsavedDraftRef: React.MutableRefObject<boolean>
  draftRef: React.MutableRefObject<string>
  diskContentRef: React.MutableRefObject<string | null>
  content: string | null
  currentFileName: string
  cancelScheduledSave: () => void
  doSave: (text: string, url: string, options?: { force?: boolean; allowFolderPrompt?: boolean }) => Promise<boolean>
  fileUrlRef: React.MutableRefObject<string>
  setReviewPromptReady: React.Dispatch<React.SetStateAction<boolean>>
  updateReview: (mutate: (current: ActiveReview | null) => ActiveReview | null) => void
  reviewForMutation: (current: ActiveReview | null) => ActiveReview
}

export function useContentSnapshots({
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
}: UseContentSnapshotsOptions) {
  const [linkSnapshotDialog, setLinkSnapshotDialog] = useState<LinkSnapshotDialog | null>(null)
  const [backupUrlCopyState, setBackupUrlCopyState] = useState<"idle" | "copied">("idle")
  const backupUrlCopyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [importReviewDialog, setImportReviewDialog] = useState<ImportReviewDialog | null>(null)

  const buildSnapshotReviews = (includeReview: boolean, reviewerName: string): ReviewRound[] => {
    const importedRounds = review?.importedRounds ?? []
    if (!includeReview || !review) return importedRounds
    const created = resolveReviewPolicy({
      review,
      document: { sourceHash: "", text: "", headings: [] },
      request: {
        type: "create-round",
        id: crypto.randomUUID(),
        reviewerName,
        createdAt: new Date().toISOString(),
      },
    })
    if (created.type !== "create-round" || created.outcome !== "created") return importedRounds
    return [...importedRounds, created.round]
  }

  const requestLinkSnapshot = () => {
    const markdown = hasUnsavedDraftRef.current
      ? draftRef.current
      : diskContentRef.current ?? content ?? ""
    const creation = createLinkSnapshot({
      filename: currentFileName,
      markdown,
      reviews: buildSnapshotReviews(false, ""),
    })
    setLinkSnapshotDialog({
      markdown,
      creation,
      resources: analyzeLinkSnapshotResources(markdown),
      requiresSave: hasUnsavedDraftRef.current,
      includeReview: false,
      reviewerName: "",
      kind: creation.status === "ready" && !creation.oversized ? "link" : "hosted",
      expiryDays: DEFAULT_EXPIRY_DAYS,
      shareUrl: null,
      status: "confirm",
    })
  }

  const updateLinkSnapshotReviewChoice = (includeReview: boolean, reviewerName: string) => {
    setLinkSnapshotDialog((current) => {
      if (!current) return current
      return {
        ...current,
        includeReview,
        reviewerName,
        creation: createLinkSnapshot({
          filename: currentFileName,
          markdown: current.markdown,
          reviews: buildSnapshotReviews(includeReview, reviewerName),
        }),
      }
    })
  }

  const confirmLinkSnapshot = async () => {
    if (!linkSnapshotDialog || linkSnapshotDialog.creation.status !== "ready") return
    const { includeReview, reviewerName, kind, expiryDays } = linkSnapshotDialog
    setLinkSnapshotDialog((current) => current && { ...current, status: "copying" })
    if (hasUnsavedDraftRef.current) {
      cancelScheduledSave()
      const saved = await doSave(draftRef.current, fileUrlRef.current)
      if (!saved) {
        setLinkSnapshotDialog((current) => current && { ...current, status: "save-failed" })
        return
      }
    }
    const markdown = diskContentRef.current ?? linkSnapshotDialog.markdown
    const creation = createLinkSnapshot({
      filename: currentFileName,
      markdown,
      reviews: buildSnapshotReviews(includeReview, reviewerName),
    })
    const resources = analyzeLinkSnapshotResources(markdown)
    if (creation.status !== "ready") {
      setLinkSnapshotDialog({
        markdown,
        creation,
        resources,
        requiresSave: false,
        includeReview,
        reviewerName,
        kind,
        expiryDays,
        shareUrl: null,
        status: "confirm",
      })
      return
    }
    let shareUrl = creation.url
    if (kind === "hosted") {
      setLinkSnapshotDialog((current) => current && { ...current, status: "uploading" })
      try {
        const envelope = buildSnapshotEnvelopeBytes({
          filename: currentFileName,
          markdown,
          reviews: buildSnapshotReviews(includeReview, reviewerName),
        })
        const { key, blob } = await encryptSnapshotEnvelope(envelope)
        const id = await uploadHostedSnapshot(blob, expiryDays)
        shareUrl = buildHostedSnapshotUrl(id, key)
      } catch (error) {
        console.error(
          `[Markside] Hosted snapshot upload to ${HOSTED_SNAPSHOT_UPLOAD_URL} failed:`,
          error,
        )
        setLinkSnapshotDialog((current) => current && { ...current, status: "upload-failed" })
        return
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl)
      await recordReviewPromptEvent("link-snapshot").catch(() => false)
      setLinkSnapshotDialog({
        markdown,
        creation,
        resources,
        requiresSave: false,
        includeReview,
        reviewerName,
        kind,
        expiryDays,
        shareUrl,
        status: "copied",
      })
    } catch {
      setLinkSnapshotDialog({
        markdown,
        creation,
        resources,
        requiresSave: false,
        includeReview,
        reviewerName,
        kind,
        expiryDays,
        shareUrl,
        status: "copy-failed",
      })
    }
  }

  const closeLinkSnapshotDialog = () => {
    if (backupUrlCopyTimeoutRef.current) {
      clearTimeout(backupUrlCopyTimeoutRef.current)
      backupUrlCopyTimeoutRef.current = null
    }
    if (linkSnapshotDialog?.status === "copied") setReviewPromptReady(true)
    setBackupUrlCopyState("idle")
    setLinkSnapshotDialog(null)
  }

  const openImportReviewDialog = () => {
    setImportReviewDialog({ input: "", status: "input", rounds: [] })
  }

  const closeImportReviewDialog = () => {
    setImportReviewDialog(null)
  }

  const extractLinkSnapshotFragment = (pasted: string) => {
    const trimmed = pasted.trim()
    try {
      return new URL(trimmed).hash
    } catch {
      return trimmed.startsWith("#") ? trimmed : `#${trimmed}`
    }
  }

  const decodeImportReviewInput = () => {
    if (!importReviewDialog) return
    const decoded = decodeLinkSnapshotFragment(extractLinkSnapshotFragment(importReviewDialog.input))
    if (decoded.status !== "ready") {
      setImportReviewDialog((current) => current && { ...current, status: "invalid", rounds: [] })
      return
    }
    const rounds = decoded.snapshot.reviews ?? []
    if (rounds.length === 0) {
      setImportReviewDialog((current) => current && { ...current, status: "empty", rounds: [] })
      return
    }
    setImportReviewDialog((current) => current && { ...current, status: "preview", rounds })
  }

  const confirmImportReview = () => {
    if (!importReviewDialog || importReviewDialog.rounds.length === 0) return
    const rounds = importReviewDialog.rounds
    updateReview((current) => {
      const result = resolveReviewPolicy({
        review: reviewForMutation(current),
        document: { sourceHash: "", text: "", headings: [] },
        request: {
          type: "import-rounds",
          rounds,
          updatedAt: new Date().toISOString(),
        },
      })
      return result.type === "import-rounds" && result.outcome === "imported"
        ? result.review
        : reviewForMutation(current)
    })
    setImportReviewDialog((current) => current && { ...current, status: "imported" })
  }

  const copyBackupUrl = async () => {
    if (!linkSnapshotDialog || linkSnapshotDialog.creation.status !== "ready") return
    const urlToCopy = linkSnapshotDialog.shareUrl ?? linkSnapshotDialog.creation.url
    try {
      await navigator.clipboard.writeText(urlToCopy)
    } catch {
      return
    }
    if (backupUrlCopyTimeoutRef.current) clearTimeout(backupUrlCopyTimeoutRef.current)
    setBackupUrlCopyState("copied")
    backupUrlCopyTimeoutRef.current = setTimeout(() => setBackupUrlCopyState("idle"), 2_000)
  }

  const openLinkSnapshotUrl = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer")
  }

  return {
    linkSnapshotDialog,
    setLinkSnapshotDialog,
    backupUrlCopyState,
    importReviewDialog,
    setImportReviewDialog,
    requestLinkSnapshot,
    closeLinkSnapshotDialog,
    updateLinkSnapshotReviewChoice,
    openLinkSnapshotUrl,
    copyBackupUrl,
    confirmLinkSnapshot,
    openImportReviewDialog,
    closeImportReviewDialog,
    decodeImportReviewInput,
    confirmImportReview,
  }
}
