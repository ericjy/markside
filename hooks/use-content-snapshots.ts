import React,{ useRef,useState } from "react"
import { t } from "~lib/i18n"
import {
  buildHostedSnapshotUrl,
  DEFAULT_EXPIRY_DAYS,
  encryptSnapshotEnvelope,
  HOSTED_SNAPSHOT_UPLOAD_URL,
  MAX_HOSTED_SNAPSHOT_OUTPUT_BYTES,
  MAX_HOSTED_SNAPSHOT_UPLOAD_BYTES,
  loadHostedSnapshot,
  parseHostedSnapshotUrl,
  uploadHostedSnapshot,
  type ExpiryDays
} from "~lib/hosted-snapshot"
import {
  buildSnapshotEnvelopeBytes,
  createLinkSnapshot,
  snapshotEnvelopeJson,
  decodeLinkSnapshotFragment,
  type LinkSnapshotCreation,
} from "~lib/link-snapshot"
import { findHtmlEmbedSources,readHtmlEmbedFile } from "~lib/html-embed"
import { md } from "~lib/markdown"
import { compressSnapshotImages, readSnapshotImages } from "~lib/snapshot-images"
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
  embeds: Record<string, string>
  // Paths of embeds whose files could not be read, so the link leaves them out.
  missingEmbeds: string[]
  images: Record<string, string>
  originalImages: Record<string, string>
  missingImages: string[]
  imageNotice: string | null
  compressed: boolean
  creation: LinkSnapshotCreation
  resources: LinkSnapshotResources
  requiresSave: boolean
  includeReview: boolean
  reviewerName: string
  kind: "link" | "hosted"
  expiryDays: ExpiryDays
  shareUrl: string | null
  status: "confirm" | "copying" | "uploading" | "copied" | "copy-failed" | "save-failed" | "upload-failed" | "too-large" | "compressing"
}

export type ImportReviewDialog = {
  input: string
  status: "input" | "loading" | "invalid" | "unavailable" | "load-failed" | "empty" | "preview" | "imported"
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

  // A missing embed file is left out; the viewer shows its error block.
  const readSnapshotEmbeds = async (markdown: string) => {
    const embeds: Record<string, string> = {}
    const missingEmbeds: string[] = []
    await Promise.all(findHtmlEmbedSources(md.parse(markdown, {})).map(async (src) => {
      try {
        embeds[src] = await readHtmlEmbedFile(new URL(src, fileUrlRef.current).href)
      } catch {
        missingEmbeds.push(src)
      }
    }))
    return { embeds, missingEmbeds }
  }

  const requestLinkSnapshot = async () => {
    const markdown = hasUnsavedDraftRef.current
      ? draftRef.current
      : diskContentRef.current ?? content ?? ""
    const { embeds, missingEmbeds } = await readSnapshotEmbeds(markdown)
    const imageFiles = await readSnapshotImages(markdown, fileUrlRef.current)
    const creation = createLinkSnapshot({
      filename: currentFileName,
      markdown,
      reviews: buildSnapshotReviews(false, ""),
      embeds,
    })
    setLinkSnapshotDialog({
      markdown,
      embeds,
      missingEmbeds,
      images: imageFiles.images,
      originalImages: imageFiles.images,
      missingImages: imageFiles.missing,
      imageNotice: null,
      compressed: false,
      creation,
      resources: analyzeLinkSnapshotResources(markdown),
      requiresSave: hasUnsavedDraftRef.current,
      includeReview: false,
      reviewerName: "",
      kind: imageFiles.missing.length || Object.keys(imageFiles.images).length ? "hosted" : creation.status === "ready" && !creation.oversized ? "link" : "hosted",
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
          embeds: current.embeds,
        }),
      }
    })
  }

  const confirmLinkSnapshot = async () => {
    if (!linkSnapshotDialog || (linkSnapshotDialog.kind === "link" && linkSnapshotDialog.creation.status !== "ready")) return
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
    const { embeds, missingEmbeds } = await readSnapshotEmbeds(markdown)
    const creation = createLinkSnapshot({
      filename: currentFileName,
      markdown,
      reviews: buildSnapshotReviews(includeReview, reviewerName),
      embeds,
    })
    const resources = analyzeLinkSnapshotResources(markdown)
    if (kind === "hosted") {
      const currentImages = await readSnapshotImages(markdown, fileUrlRef.current)
      if (markdown !== linkSnapshotDialog.markdown || JSON.stringify(currentImages.images) !== JSON.stringify(linkSnapshotDialog.originalImages) || JSON.stringify(currentImages.missing) !== JSON.stringify(linkSnapshotDialog.missingImages)) {
        setLinkSnapshotDialog(current => current && { ...current, markdown, embeds, missingEmbeds, creation, resources, requiresSave: false, images: currentImages.images, originalImages: currentImages.images, missingImages: currentImages.missing, compressed: false, imageNotice: t("The document or its images changed. Review the details, then create the link again."), status: "confirm" })
        return
      }
    }
    if (creation.status !== "ready" && kind === "link") {
      setLinkSnapshotDialog({
        ...linkSnapshotDialog,
        markdown,
        embeds,
        missingEmbeds,
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
    let shareUrl = creation.status === "ready" ? creation.url : ""
    if (kind === "hosted") {
      setLinkSnapshotDialog((current) => current && { ...current, status: "uploading" })
      try {
        const snapshot = { filename: currentFileName, markdown, reviews: buildSnapshotReviews(includeReview, reviewerName), embeds, images: linkSnapshotDialog.images }
        const envelope = buildSnapshotEnvelopeBytes(snapshot)
        const outputBytes = new TextEncoder().encode(snapshotEnvelopeJson(snapshot)).length
        if (outputBytes > MAX_HOSTED_SNAPSHOT_OUTPUT_BYTES || envelope.length + 28 > MAX_HOSTED_SNAPSHOT_UPLOAD_BYTES) {
          const uploadBytes = envelope.length + 28
          const limitDetail = uploadBytes > MAX_HOSTED_SNAPSHOT_UPLOAD_BYTES
            ? t("{0} MB; upload limit 4 MB", [(uploadBytes / 1000 / 1000).toFixed(1)])
            : t("{0} MiB; content limit 6 MiB", [(outputBytes / 1024 / 1024).toFixed(1)])
          setLinkSnapshotDialog(current => current && { ...current, status: "too-large", imageNotice: t("This copy is too large to share ({0}).", [limitDetail]) })
          return
        }
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
        ...linkSnapshotDialog,
        markdown,
        embeds,
        missingEmbeds,
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
        ...linkSnapshotDialog,
        markdown,
        embeds,
        missingEmbeds,
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

  const compressLinkSnapshotImages = async () => {
    if (!linkSnapshotDialog) return
    setLinkSnapshotDialog(current => current && { ...current, status: "compressing" })
    const images = await compressSnapshotImages(linkSnapshotDialog.originalImages)
    const imageBytes = (image: string) => {
      const data = image.slice(image.indexOf(",") + 1)
      return data.length * 3 / 4 - (data.endsWith("==") ? 2 : data.endsWith("=") ? 1 : 0)
    }
    const before = Object.values(linkSnapshotDialog.originalImages).reduce((sum, image) => sum + imageBytes(image), 0)
    const after = Object.values(images).reduce((sum, image) => sum + imageBytes(image), 0)
    const changed = Object.keys(images).filter(src => images[src] !== linkSnapshotDialog.originalImages[src])
    const snapshot = {
      filename: currentFileName,
      markdown: linkSnapshotDialog.markdown,
      reviews: buildSnapshotReviews(linkSnapshotDialog.includeReview, linkSnapshotDialog.reviewerName),
      embeds: linkSnapshotDialog.embeds,
      images,
    }
    const outputBytes = new TextEncoder().encode(snapshotEnvelopeJson(snapshot)).length
    const uploadBytes = buildSnapshotEnvelopeBytes(snapshot).length + 28
    const tooLarge = outputBytes > MAX_HOSTED_SNAPSHOT_OUTPUT_BYTES || uploadBytes > MAX_HOSTED_SNAPSHOT_UPLOAD_BYTES
    const imageNotice = t("Image size: {0} MiB → {1} MiB. {2} Your original files are unchanged.", [
      (before / 1024 / 1024).toFixed(1),
      (after / 1024 / 1024).toFixed(1),
      changed.length ? t("Compressed: {0}.", [changed.join(", ")]) : t("No images could be reduced."),
    ])
    setLinkSnapshotDialog(current => current && { ...current, images, compressed: true, status: tooLarge ? "too-large" : "confirm", imageNotice })
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

  const decodeImportReviewInput = async () => {
    if (!importReviewDialog || importReviewDialog.status === "loading") return
    const input = importReviewDialog.input
    // Ignore a hosted result that arrives after the reviewer edited the link.
    const settle = (status: ImportReviewDialog["status"], rounds: ReviewRound[] = []) =>
      setImportReviewDialog((current) => current && current.input === input ? { ...current, status, rounds } : current)
    const hosted = parseHostedSnapshotUrl(input)
    let snapshot
    if (hosted) {
      settle("loading")
      const loaded = await loadHostedSnapshot(hosted.id, hosted.key)
      if (loaded.status === "unavailable") return settle("unavailable")
      if (loaded.status === "failed") return settle("load-failed")
      if (loaded.status !== "ready") return settle("invalid")
      snapshot = loaded.snapshot
    } else {
      const decoded = decodeLinkSnapshotFragment(extractLinkSnapshotFragment(input))
      if (decoded.status !== "ready") return settle("invalid")
      snapshot = decoded.snapshot
    }
    const rounds = snapshot.reviews ?? []
    settle(rounds.length === 0 ? "empty" : "preview", rounds)
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
    if (!linkSnapshotDialog) return
    const urlToCopy = linkSnapshotDialog.shareUrl ?? (linkSnapshotDialog.creation.status === "ready" ? linkSnapshotDialog.creation.url : "")
    if (!urlToCopy) return
    try {
      await navigator.clipboard.writeText(urlToCopy)
    } catch {
      return
    }
    if (backupUrlCopyTimeoutRef.current) clearTimeout(backupUrlCopyTimeoutRef.current)
    setLinkSnapshotDialog(current => current?.status === "copy-failed" ? { ...current, status: "copied" } : current)
    setBackupUrlCopyState("copied")
    backupUrlCopyTimeoutRef.current = setTimeout(() => setBackupUrlCopyState("idle"), 2_000)
  }

  const openLinkSnapshotUrl = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer")
  }

  return {
    linkSnapshotDialog,
    compressLinkSnapshotImages,
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
