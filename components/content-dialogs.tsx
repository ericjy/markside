import { t } from "~lib/i18n"
import type { FolderError } from "~hooks/use-persisted-directory"
import {
  AlertTriangle,
  Check,
  Copy,
  ExternalLink,
  X
} from "lucide-react"
import React from "react"
import { ReviewCopyReloadDialog } from "~components/review-copy-reload-dialog"
import { ReviewPromptModal } from "~components/review-prompt-modal"
import { SaveFolderDialog } from "~components/save-folder-dialog"
import { Button } from "~components/ui/button"
import type { FileNavigationTarget } from "~hooks/use-content-file-loading"
import type { ImportReviewDialog, LinkSnapshotDialog } from "~hooks/use-content-snapshots"
import { HOSTED_SNAPSHOT_URL_CHARACTERS } from "~lib/hosted-snapshot"
import { fileFolderPath } from "~lib/url"

interface ContentDialogsProps {
  reviewPromptOpen: boolean
  dismissReviewPrompt: () => void
  acceptReviewPrompt: () => void
  clipboardFallback: string | null
  setClipboardFallback: React.Dispatch<React.SetStateAction<string | null>>
  linkSnapshotDialog: LinkSnapshotDialog | null
  closeLinkSnapshotDialog: () => void
  setLinkSnapshotDialog: React.Dispatch<React.SetStateAction<LinkSnapshotDialog | null>>
  ownReviewItemCount: number
  updateLinkSnapshotReviewChoice: (includeReview: boolean, reviewerName: string) => void
  importedRoundCount: number
  openLinkSnapshotUrl: (url: string) => void
  copyBackupUrl: () => Promise<void>
  backupUrlCopyState: "copied" | "idle"
  confirmLinkSnapshot: () => Promise<void>
  compressLinkSnapshotImages: () => Promise<void>
  importReviewDialog: ImportReviewDialog | null
  closeImportReviewDialog: () => void
  setImportReviewDialog: React.Dispatch<React.SetStateAction<ImportReviewDialog | null>>
  decodeImportReviewInput: () => Promise<void>
  confirmImportReview: () => void
  pendingNavigation: FileNavigationTarget | null
  setPendingNavigation: React.Dispatch<React.SetStateAction<FileNavigationTarget | null>>
  performFileNavigation: (target: FileNavigationTarget) => Promise<void>
  saveState: "idle" | "unsaved" | "saving" | "saved" | "error"
  cancelScheduledSave: () => void
  doSave: (text: string, url: string, options?: { force?: boolean; allowFolderPrompt?: boolean }) => Promise<boolean>
  draftRef: React.MutableRefObject<string>
  fileUrlRef: React.MutableRefObject<string>
  pdfExportTipOpen: boolean
  dismissPdfExportTip: () => void
  continuePdfExport: () => void
  saveFolderDialogOpen: boolean
  currentFileName: string
  folderError: FolderError | null
  setSaveFolderDialogOpen: React.Dispatch<React.SetStateAction<boolean>>
  chooseSaveFolder: () => Promise<void>
  reviewCopyReload: { comment: boolean; loading: boolean; error: string | null; } | null
  cancelReviewCopyReload: () => void
  reloadForReviewCopy: () => Promise<void>
  reloadConfirmOpen: boolean
  setReloadConfirmOpen: React.Dispatch<React.SetStateAction<boolean>>
  handleReloadFromDisk: (options?: { forReviewCopy?: boolean }) => Promise<void>
  renderedCopyStatus: "copied" | "idle" | "error"
}

export function ContentDialogs({
  reviewPromptOpen,
  dismissReviewPrompt,
  acceptReviewPrompt,
  clipboardFallback,
  setClipboardFallback,
  linkSnapshotDialog,
  closeLinkSnapshotDialog,
  setLinkSnapshotDialog,
  ownReviewItemCount,
  updateLinkSnapshotReviewChoice,
  importedRoundCount,
  openLinkSnapshotUrl,
  copyBackupUrl,
  backupUrlCopyState,
  confirmLinkSnapshot,
  compressLinkSnapshotImages,
  importReviewDialog,
  closeImportReviewDialog,
  setImportReviewDialog,
  decodeImportReviewInput,
  confirmImportReview,
  pendingNavigation,
  setPendingNavigation,
  performFileNavigation,
  saveState,
  cancelScheduledSave,
  doSave,
  draftRef,
  fileUrlRef,
  pdfExportTipOpen,
  dismissPdfExportTip,
  continuePdfExport,
  saveFolderDialogOpen,
  currentFileName,
  folderError,
  setSaveFolderDialogOpen,
  chooseSaveFolder,
  reviewCopyReload,
  cancelReviewCopyReload,
  reloadForReviewCopy,
  reloadConfirmOpen,
  setReloadConfirmOpen,
  handleReloadFromDisk,
  renderedCopyStatus,
}: ContentDialogsProps) {
  return (
    <>
      {reviewPromptOpen && (
        <ReviewPromptModal
          onDismiss={dismissReviewPrompt}
          onReview={acceptReviewPrompt}
        />
      )}
      {clipboardFallback && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4" role="presentation">
          <div role="dialog" aria-modal="true" aria-labelledby="copy-review-fallback-title" className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-lg border bg-background p-5 shadow-2xl">
            <h2 id="copy-review-fallback-title" className="text-base font-semibold">{t("Copy prompt manually")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("Clipboard access failed. Select and copy the complete prompt below.")}</p>
            <textarea
              readOnly
              autoFocus
              value={clipboardFallback}
              onFocus={(event) => event.currentTarget.select()}
              className="mt-4 min-h-80 w-full flex-1 resize-y rounded-md border bg-muted/30 p-3 font-mono text-xs"
            />
            <div className="mt-4 flex justify-end">
              <Button onClick={() => setClipboardFallback(null)}>{t("Done")}</Button>
            </div>
          </div>
        </div>
      )}
      {linkSnapshotDialog && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4" role="presentation">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="link-snapshot-title"
            className="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-lg border bg-background p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 id="link-snapshot-title" className="flex items-center gap-2 text-base font-semibold" aria-live="polite">
                    {linkSnapshotDialog.status === "copied" && <Check size={17} className="text-emerald-700 dark:text-emerald-400" aria-hidden="true" />}
                    {linkSnapshotDialog.status === "copied" ? t("Link copied") : linkSnapshotDialog.status === "copy-failed" ? t("Link ready to copy") : t("Create Share Link")}
                  </h2>
                  {linkSnapshotDialog.status !== "copied" && linkSnapshotDialog.status !== "copy-failed" && (
                    <span className="rounded-full border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {t("Beta")}</span>
                  )}
                </div>
                {linkSnapshotDialog.status !== "copied" && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {linkSnapshotDialog.status === "copy-failed"
                      ? t("The link was created, but couldn't be copied automatically. Copy it below.")
                      : t("Anyone with the link can view this copy. Changes to the file won't update it.")}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                aria-label={t("Close")}
                onClick={closeLinkSnapshotDialog}>
                <X size={14} />
              </Button>
            </div>

            {linkSnapshotDialog.status !== "copied" && linkSnapshotDialog.status !== "copy-failed" && (
              <fieldset className="mt-4">
                <legend className="mb-2 text-sm font-medium">{t("How to share")}</legend>

                <div className="grid gap-2">
                  <label
                    className={`flex cursor-pointer flex-col gap-1 rounded-md border p-3 text-sm transition-colors has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60 ${
                      linkSnapshotDialog.kind === "link"
                        ? "border-foreground/40 bg-muted/40"
                        : "hover:bg-muted/20"
                    }`}>
                    <span className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                      <span className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="snapshot-kind"
                          checked={linkSnapshotDialog.kind === "link"}
                          disabled={linkSnapshotDialog.creation.status !== "ready" || ["copying", "uploading", "compressing"].includes(linkSnapshotDialog.status)}
                          onChange={() => setLinkSnapshotDialog((current) =>
                            current && { ...current, kind: "link", status: "confirm", imageNotice: null, images: current.originalImages, compressed: false })}
                        />
                        <span className="font-medium">{t("Keep content in the link")}</span>
                      </span>
                      <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
                        {t("{0}-character link", [linkSnapshotDialog.creation.characters.toLocaleString()])}</span>
                    </span>
                    <span className="text-muted-foreground">
                      {t("No upload. The link never expires, but it can be long.")}</span>
                    {linkSnapshotDialog.creation.status === "too-large" && (
                      <span className="mt-1 text-xs text-muted-foreground">{t("This document is too large for a link. Choose the encrypted copy.")}</span>
                    )}
                    {linkSnapshotDialog.kind === "link" && linkSnapshotDialog.creation.status === "ready" && linkSnapshotDialog.creation.oversized && (
                      <span className="mt-1 rounded border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200">
                        {t("Chat clients like Slack may refuse to send links past 4,000 characters.")}</span>
                    )}
                  </label>

                  <label
                    className={`flex cursor-pointer flex-col gap-1 rounded-md border p-3 text-sm transition-colors ${
                      linkSnapshotDialog.kind === "hosted"
                        ? "border-foreground/40 bg-muted/40"
                        : "hover:bg-muted/20"
                    }`}>
                    <span className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                      <span className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="snapshot-kind"
                          checked={linkSnapshotDialog.kind === "hosted"}
                          disabled={["copying", "uploading", "compressing"].includes(linkSnapshotDialog.status)}
                          onChange={() => setLinkSnapshotDialog((current) =>
                            current && { ...current, kind: "hosted", status: "confirm", imageNotice: null })}
                        />
                        <span className="font-medium">{t("Upload an encrypted copy")}</span>
                      </span>
                      <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
                        {t("{0}-character link", [HOSTED_SNAPSHOT_URL_CHARACTERS.toLocaleString()])}</span>
                    </span>
                    <span className="text-muted-foreground">
                      {t("Encrypted before upload. The decryption key stays in the link, and Markside can't read the copy. Expires in {0} days.", [linkSnapshotDialog.expiryDays])}</span>
                  </label>
                </div>
              </fieldset>
            )}

            {linkSnapshotDialog.kind === "link" && linkSnapshotDialog.creation.status === "too-large" ? (
              <p className="mt-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                {t("This document is {0} KB, above the {1} KB limit a recipient's browser can open. Shorten the document or send the Markdown file directly instead.", [
                  Math.round(linkSnapshotDialog.creation.bytes / 1024).toLocaleString(),
                  Math.round(linkSnapshotDialog.creation.maxBytes / 1024).toLocaleString(),
                ])}</p>
            ) : null}
            {linkSnapshotDialog.status !== "copied" && linkSnapshotDialog.status !== "copy-failed" && (
              <div className="mt-4 space-y-2">
                {linkSnapshotDialog.kind === "hosted" && Object.keys(linkSnapshotDialog.images).length > 0 && (
                  <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
                    <Check size={14} className="mt-0.5 shrink-0 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
                    <span>{t(Object.keys(linkSnapshotDialog.images).length === 1
                      ? "{0} local image included in the encrypted copy."
                      : "{0} local images included in the encrypted copy.", [Object.keys(linkSnapshotDialog.images).length])}</span>
                  </p>
                )}
                {linkSnapshotDialog.kind === "link" && linkSnapshotDialog.resources.localImages > 0 && (
                  <p role="note" className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                    <span>{t(linkSnapshotDialog.resources.localImages === 1
                      ? "{0} image won't be included in this copy."
                      : "{0} images won't be included in this copy.", [linkSnapshotDialog.resources.localImages])}</span>
                  </p>
                )}
                {linkSnapshotDialog.resources.localDocumentLinks > 0 && (
                  <p role="note" className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                    <span>{t(linkSnapshotDialog.resources.localDocumentLinks === 1
                      ? "{0} link to a local file won't work for the recipient."
                      : "{0} links to local files won't work for the recipient.", [linkSnapshotDialog.resources.localDocumentLinks])}</span>
                  </p>
                )}
                {linkSnapshotDialog.kind === "hosted" && linkSnapshotDialog.missingImages.length > 0 && (
                  <div role="note" className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs leading-5 text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                    <div className="min-w-0">
                      <p>{linkSnapshotDialog.missingImages.length === 1
                        ? t("Couldn't read this image. You can still share without it:")
                        : t("Couldn't read these images. You can still share without them:")}</p>
                      <ul className="mt-1 list-inside list-disc break-all font-mono">
                        {linkSnapshotDialog.missingImages.map(src => <li key={src}>{src}</li>)}
                      </ul>
                    </div>
                  </div>
                )}
                {linkSnapshotDialog.status === "too-large" ? (
                  <div role="alert" className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs leading-5 text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200">
                    {linkSnapshotDialog.compressed ? (
                      <>
                        <p className="font-medium">{t("Still too large to share")}</p>
                        <p className="mt-1 break-words">{linkSnapshotDialog.imageNotice}</p>
                        <p className="mt-1">{t("Make the images smaller yourself, then try again.")}</p>
                      </>
                    ) : (
                      <>
                        <p className="font-medium">{linkSnapshotDialog.imageNotice}</p>
                        <p className="mt-1">{t("Compress images to continue, or make them smaller yourself. Original files, animations, and SVGs won't change.")}</p>
                      </>
                    )}
                  </div>
                ) : linkSnapshotDialog.imageNotice && <p role="status" className="break-words rounded-md bg-muted/50 p-3 text-xs leading-5">{linkSnapshotDialog.imageNotice}</p>}

              </div>
            )}
            {linkSnapshotDialog.status !== "copied" && linkSnapshotDialog.status !== "copy-failed" && linkSnapshotDialog.missingEmbeds.length > 0 ? (
              <div role="note" className="mt-3 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs leading-5 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                <p>
                  {linkSnapshotDialog.missingEmbeds.length === 1
                    ? t("Markside could not read this HTML Embed, so the shared link will show it as missing:")
                    : t("Markside could not read these HTML Embeds, so the shared link will show them as missing:")}{" "}
                  {linkSnapshotDialog.missingEmbeds.map((src, index) => (
                    <React.Fragment key={src}>
                      {index > 0 ? ", " : ""}
                      <code className="break-all">{src}</code>
                    </React.Fragment>
                  ))}
                </p>
              </div>
            ) : null}
            {linkSnapshotDialog.status !== "copied" && linkSnapshotDialog.status !== "copy-failed" && ownReviewItemCount > 0 && (
              <div className="mt-4 rounded-md border p-3">
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={linkSnapshotDialog.includeReview}
                    onChange={(event) => updateLinkSnapshotReviewChoice(
                      event.currentTarget.checked,
                      linkSnapshotDialog.reviewerName,
                    )}
                  />
                  <span>
                    {t(ownReviewItemCount === 1
                      ? "Include my Review ({0} item) in this link"
                      : "Include my Review ({0} items) in this link", [ownReviewItemCount])}</span>
                </label>
                {linkSnapshotDialog.includeReview && (
                  <input
                    type="text"
                    value={linkSnapshotDialog.reviewerName}
                    onChange={(event) => updateLinkSnapshotReviewChoice(true, event.currentTarget.value)}
                    placeholder={t("Your name (optional)")}
                    className="review-input mt-2 w-full rounded-md border px-2.5 py-1.5 text-sm outline outline-2 outline-offset-1 outline-transparent placeholder:text-muted-foreground focus-visible:outline-ring"
                  />
                )}
              </div>
            )}
            {linkSnapshotDialog.status !== "copied" && linkSnapshotDialog.status !== "copy-failed" && importedRoundCount > 0 && (
              <p className="mt-3 text-xs text-muted-foreground">
                {t(importedRoundCount === 1
                  ? "{0} previously imported Review Round will also be included in this link."
                  : "{0} previously imported Review Rounds will also be included in this link.", [importedRoundCount])}</p>
            )}

            {linkSnapshotDialog.status === "save-failed" && (
              <p role="alert" className="mt-4 text-sm font-medium text-red-600 dark:text-red-400">
                {t("Link not created because the latest changes were not saved. Resolve the save issue and try again.")}</p>
            )}
            {linkSnapshotDialog.status === "uploading" && (
              <p className="mt-4 text-sm text-muted-foreground">{t("Encrypting and uploading…")}</p>
            )}
            {linkSnapshotDialog.status === "upload-failed" && (
              <p role="alert" className="mt-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                {t("Couldn’t upload the encrypted copy. Your document is unchanged. Try again, or choose “Keep content in the link” to share without uploading.")}</p>
            )}
            {(linkSnapshotDialog.status === "copied" || linkSnapshotDialog.status === "copy-failed") && (linkSnapshotDialog.creation.status === "ready" || linkSnapshotDialog.shareUrl) && (
              <div className="mt-4">
                <label htmlFor="link-snapshot-url" className="text-xs font-medium text-muted-foreground">{t("Share link")}</label>
                <textarea
                  id="link-snapshot-url"
                  readOnly
                  autoFocus={linkSnapshotDialog.status === "copy-failed"}
                  rows={2}
                  value={linkSnapshotDialog.shareUrl ?? (linkSnapshotDialog.creation.status === "ready" ? linkSnapshotDialog.creation.url : "")}
                  onFocus={(event) => event.currentTarget.select()}
                  className="mt-1.5 max-h-20 w-full resize-none overflow-x-hidden overflow-y-auto whitespace-pre-wrap break-all rounded-md border bg-muted/30 p-3 font-mono text-xs"
                />
                <div className="mt-2 flex flex-wrap items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => openLinkSnapshotUrl(linkSnapshotDialog.shareUrl ?? (linkSnapshotDialog.creation.status === "ready" ? linkSnapshotDialog.creation.url : ""))}>
                    <ExternalLink size={14} /> {t(" Open link")}</Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => void copyBackupUrl()}>
                    {backupUrlCopyState === "copied" ? <Check size={14} /> : <Copy size={14} />} {backupUrlCopyState === "copied" ? t("Copied") : t("Copy link")}
                  </Button>
                </div>
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={closeLinkSnapshotDialog}>
                {linkSnapshotDialog.status === "copied" || linkSnapshotDialog.status === "copy-failed" ? t("Done") : t("Cancel")}
              </Button>
              {linkSnapshotDialog.status === "too-large" && !linkSnapshotDialog.compressed ? (
                <Button onClick={() => void compressLinkSnapshotImages()}>{t("Compress images")}</Button>
              ) : linkSnapshotDialog.status !== "copied" && linkSnapshotDialog.status !== "copy-failed" && linkSnapshotDialog.status !== "too-large" && (
                <Button
                  disabled={(linkSnapshotDialog.kind === "link" && linkSnapshotDialog.creation.status !== "ready") || ["copying", "uploading", "compressing"].includes(linkSnapshotDialog.status)}
                  onClick={() => void confirmLinkSnapshot()}>
                  {linkSnapshotDialog.status === "compressing"
                    ? t("Compressing…")
                    : linkSnapshotDialog.status === "copying" || linkSnapshotDialog.status === "uploading"
                      ? t("Creating…")
                      : linkSnapshotDialog.requiresSave
                        ? t("Save and create link")
                        : t("Create and copy link")}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
      {importReviewDialog && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4" role="presentation">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="import-review-title"
            className="w-full max-w-lg rounded-lg border bg-background p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="import-review-title" className="text-base font-semibold">{t("Import Review from link")}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("Paste a reviewer's link to add their comments to Review History. Markside's servers never see its contents.")}</p>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={t("Close")} onClick={closeImportReviewDialog}>
                <X size={14} />
              </Button>
            </div>

            {importReviewDialog.status !== "preview" && importReviewDialog.status !== "imported" && (
              <>
                <textarea
                  autoFocus
                  rows={3}
                  value={importReviewDialog.input}
                  onChange={(event) => setImportReviewDialog((current) => current && {
                    ...current,
                    input: event.currentTarget.value,
                    status: "input",
                  })}
                  placeholder="https://markside.app/s..."
                  className="review-input mt-4 w-full resize-none rounded-md border px-3 py-2.5 font-mono text-xs outline outline-2 outline-offset-1 outline-transparent placeholder:text-muted-foreground focus-visible:outline-ring"
                />
                {importReviewDialog.status === "invalid" && (
                  <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
                    {t("That link isn't a valid Markside Share Link.")}</p>
                )}
                {importReviewDialog.status === "unavailable" && (
                  <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
                    {t("That link has expired or was removed.")}</p>
                )}
                {importReviewDialog.status === "load-failed" && (
                  <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
                    {t("Couldn't download that link. Check your connection and try again.")}</p>
                )}
                {importReviewDialog.status === "empty" && (
                  <p role="alert" className="mt-2 text-sm text-amber-700 dark:text-amber-300">
                    {t("That link doesn't include a Review yet.")}</p>
                )}
                <div className="mt-4 flex justify-end gap-2">
                  <Button variant="ghost" onClick={closeImportReviewDialog}>{t("Cancel")}</Button>
                  <Button
                    disabled={!importReviewDialog.input.trim() || importReviewDialog.status === "loading"}
                    onClick={() => void decodeImportReviewInput()}>
                    {importReviewDialog.status === "loading" ? t("Decoding…") : t("Decode")}
                  </Button>
                </div>
              </>
            )}

            {importReviewDialog.status === "preview" && (
              <>
                <ul className="mt-4 space-y-1.5 text-sm">
                  {importReviewDialog.rounds.map((round, index) => (
                    <li key={round.id} className="rounded-md border px-3 py-2">
                      {t("Round {0} — {1}", [index + 1, round.reviewerName || t("Reviewer")])}{" "}
                      <span className="text-muted-foreground">
                        {round.note.trim()
                          ? t(round.comments.length === 1 ? "({0} comment, 1 note)" : "({0} comments, 1 note)", [round.comments.length])
                          : t(round.comments.length === 1 ? "({0} comment)" : "({0} comments)", [round.comments.length])}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex justify-end gap-2">
                  <Button variant="ghost" onClick={closeImportReviewDialog}>{t("Cancel")}</Button>
                  <Button onClick={confirmImportReview}>{t("Import into this file's Review")}</Button>
                </div>
              </>
            )}

            {importReviewDialog.status === "imported" && (
              <>
                <p role="status" className="mt-4 flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  <Check size={14} /> {t(importReviewDialog.rounds.length === 1
                    ? "Imported {0} Review Round."
                    : "Imported {0} Review Rounds.", [importReviewDialog.rounds.length])}
                </p>
                <div className="mt-4 flex justify-end">
                  <Button onClick={closeImportReviewDialog}>{t("Done")}</Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {pendingNavigation && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          role="presentation">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="unsaved-draft-title"
            className="w-full max-w-sm rounded-lg border bg-background p-5 shadow-2xl">
            <h2 id="unsaved-draft-title" className="text-base font-semibold">
              {t("Save changes before switching files?")}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("This file has an unsaved draft. You can save it, discard it, or stay on the current file.")}</p>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setPendingNavigation(null)}>
                {t("Cancel")}</Button>
              <Button
                variant="outline"
                onClick={() => {
                  const target = pendingNavigation
                  setPendingNavigation(null)
                  void performFileNavigation(target)
                }}>
                {t("Discard")}</Button>
              <Button
                disabled={saveState === "saving"}
                onClick={() => {
                  const target = pendingNavigation
                  setPendingNavigation(null)
                  cancelScheduledSave()
                  void doSave(draftRef.current, fileUrlRef.current).then(
                    (saved) => {
                      if (saved) void performFileNavigation(target)
                    }
                  )
                }}>
                {t("Save")}</Button>
            </div>
          </div>
        </div>
      )}
      {pdfExportTipOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          role="presentation">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="pdf-export-tip-title"
            className="w-full max-w-sm rounded-lg border bg-background p-5 shadow-2xl">
            <h2 id="pdf-export-tip-title" className="text-base font-semibold">
              {t("Export a clean PDF")}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("Chrome will open its print dialog. Choose Save to PDF, then under More settings turn off Headers and footers to remove the local path and timestamp.")}</p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={dismissPdfExportTip}>
                {t("Cancel")}</Button>
              <Button onClick={continuePdfExport}>{t("Continue")}</Button>
            </div>
          </div>
        </div>
      )}
      {saveFolderDialogOpen && (
        <SaveFolderDialog
          fileName={currentFileName}
          folderPath={fileFolderPath(fileUrlRef.current)}
          folderError={folderError}
          onCancel={() => setSaveFolderDialogOpen(false)}
          onChooseFolder={() => void chooseSaveFolder()}
        />
      )}
      {reviewCopyReload && (
        <ReviewCopyReloadDialog
          comment={reviewCopyReload.comment}
          loading={reviewCopyReload.loading}
          error={reviewCopyReload.error}
          onCancel={cancelReviewCopyReload}
          onReload={() => void reloadForReviewCopy()}
        />
      )}
      {reloadConfirmOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          role="presentation">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="reload-confirm-title"
            className="w-full max-w-sm rounded-lg border bg-background p-5 shadow-2xl">
            <h2 id="reload-confirm-title" className="text-base font-semibold">
              {t("Reload from disk?")}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("This file has an unsaved draft. Reloading will discard it and show the latest version from disk.")}</p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setReloadConfirmOpen(false)}>
                {t("Cancel")}</Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setReloadConfirmOpen(false)
                  void handleReloadFromDisk()
                }}>
                {t("Reload and discard")}</Button>
            </div>
          </div>
        </div>
      )}
      {renderedCopyStatus !== "idle" && (
        <div
          data-markside-toast
          role="status"
          aria-live="polite"
          className="fixed left-1/2 top-4 z-[100] flex -translate-x-1/2 items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium text-foreground shadow-lg">
          {renderedCopyStatus === "copied" ? (
            <><Check size={14} className="text-emerald-600 dark:text-emerald-400" /> {t(" Rendered content copied")}</>
          ) : (
            t("Couldn’t copy rendered content")
          )}
        </div>
      )}
    </>
  )
}
