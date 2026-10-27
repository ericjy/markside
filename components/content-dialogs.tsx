import type { FolderError } from "~hooks/use-persisted-directory"
import {
  AlertTriangle,
  Check,
  Copy,
  ExternalLink,
  Info,
  X
} from "lucide-react"
import React from "react"
import { ReviewCopyReloadDialog } from "~components/review-copy-reload-dialog"
import { ReviewPromptModal } from "~components/review-prompt-modal"
import { SaveFolderDialog } from "~components/save-folder-dialog"
import { Button } from "~components/ui/button"
import type { FileNavigationTarget } from "~hooks/use-content-file-loading"
import type { LinkSnapshotDialog } from "~hooks/use-content-snapshots"
import {
  DEFAULT_EXPIRY_DAYS,
  HOSTED_SNAPSHOT_URL_CHARACTERS
} from "~lib/hosted-snapshot"
import {
  type ReviewRound
} from "~lib/review"
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
  importReviewDialog: { input: string; status: "input" | "invalid" | "empty" | "preview" | "imported"; rounds: ReviewRound[]; } | null
  closeImportReviewDialog: () => void
  setImportReviewDialog: React.Dispatch<React.SetStateAction<{ input: string; status: "input" | "invalid" | "empty" | "preview" | "imported"; rounds: ReviewRound[]; } | null>>
  decodeImportReviewInput: () => void
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
            <h2 id="copy-review-fallback-title" className="text-base font-semibold">Copy prompt manually</h2>
            <p className="mt-1 text-sm text-muted-foreground">Clipboard access failed. Select and copy the complete prompt below.</p>
            <textarea
              readOnly
              autoFocus
              value={clipboardFallback}
              onFocus={(event) => event.currentTarget.select()}
              className="mt-4 min-h-80 w-full flex-1 resize-y rounded-md border bg-muted/30 p-3 font-mono text-xs"
            />
            <div className="mt-4 flex justify-end">
              <Button onClick={() => setClipboardFallback(null)}>Done</Button>
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
            className="w-full max-w-lg rounded-lg border bg-background p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 id="link-snapshot-title" className="text-base font-semibold">
                    Create Share Link
                  </h2>
                  <span className="rounded-full border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Beta
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  A private link that opens this markdown in the recipient's browser. It's a
                  frozen copy that won't update if the file changes later.
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                aria-label="Close"
                onClick={closeLinkSnapshotDialog}>
                <X size={14} />
              </Button>
            </div>

            {linkSnapshotDialog.status === "copied" || linkSnapshotDialog.status === "copy-failed" ? (
              <p className="mt-4 text-sm text-muted-foreground">
                {linkSnapshotDialog.kind === "link"
                  ? "This link never expires."
                  : `This link expires in ${DEFAULT_EXPIRY_DAYS} days.`}
              </p>
            ) : (
              <fieldset className="mt-4">
                <legend className="mb-2 text-sm font-medium">How to share</legend>

                <div className="grid gap-2">
                  <label
                    className={`flex cursor-pointer flex-col gap-1 rounded-md border p-3 text-sm transition-colors has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60 ${
                      linkSnapshotDialog.kind === "link"
                        ? "border-foreground/40 bg-muted/40"
                        : "hover:bg-muted/20"
                    }`}>
                    <span className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="snapshot-kind"
                          checked={linkSnapshotDialog.kind === "link"}
                          disabled={linkSnapshotDialog.creation.status !== "ready"}
                          onChange={() => setLinkSnapshotDialog((current) =>
                            current && { ...current, kind: "link" })}
                        />
                        <span className="font-medium">Content encoded in the link</span>
                      </span>
                      <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
                        {linkSnapshotDialog.creation.characters.toLocaleString()} URL characters
                      </span>
                    </span>
                    <span className="text-muted-foreground">
                      The document is encoded into the link. Nothing reaches Markside's
                      servers, and the link never expires.
                    </span>
                    {linkSnapshotDialog.creation.status === "ready" && linkSnapshotDialog.creation.oversized && (
                      <span className="mt-1 rounded border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200">
                        Chat clients like Slack may refuse to send links past 4,000 characters.
                      </span>
                    )}
                  </label>

                  <label
                    className={`flex cursor-pointer flex-col gap-1 rounded-md border p-3 text-sm transition-colors ${
                      linkSnapshotDialog.kind === "hosted"
                        ? "border-foreground/40 bg-muted/40"
                        : "hover:bg-muted/20"
                    }`}>
                    <span className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="snapshot-kind"
                          checked={linkSnapshotDialog.kind === "hosted"}
                          onChange={() => setLinkSnapshotDialog((current) =>
                            current && { ...current, kind: "hosted" })}
                        />
                        <span className="font-medium">Content encrypted and hosted by Markside</span>
                      </span>
                      <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
                        {HOSTED_SNAPSHOT_URL_CHARACTERS.toLocaleString()} URL characters
                      </span>
                    </span>
                    <span className="text-muted-foreground">
                      The document is encrypted in your browser, then uploaded. The key stays in
                      the link and never reaches Markside's servers, so all they store is
                      ciphertext they can't read. The link expires in {DEFAULT_EXPIRY_DAYS} days.
                    </span>
                  </label>
                </div>
              </fieldset>
            )}

            {linkSnapshotDialog.creation.status === "too-large" ? (
              <p className="mt-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                This document is {Math.round(linkSnapshotDialog.creation.bytes / 1024).toLocaleString()} KB, above the{" "}
                {Math.round(linkSnapshotDialog.creation.maxBytes / 1024).toLocaleString()} KB limit a recipient's
                browser can open. Shorten the document or send the Markdown file directly instead.
              </p>
            ) : null}
            {linkSnapshotDialog.resources.localImages > 0 || linkSnapshotDialog.resources.localDocumentLinks > 0 ? (
              <div role="note" className="mt-3 flex items-start gap-2 px-1 text-xs leading-5 text-muted-foreground">
                <Info size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                <p>
                  {linkSnapshotDialog.resources.localImages} local image{linkSnapshotDialog.resources.localImages === 1 ? "" : "s"} and {linkSnapshotDialog.resources.localDocumentLinks} local document link{linkSnapshotDialog.resources.localDocumentLinks === 1 ? "" : "s"} are not included in the shared link, keeping the shared content limited to this Markdown and leaving the referenced local files on your device.
                </p>
              </div>
            ) : null}
            {linkSnapshotDialog.missingEmbeds.length > 0 ? (
              <div role="note" className="mt-3 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs leading-5 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                <p>
                  Markside could not read {linkSnapshotDialog.missingEmbeds.length === 1 ? "this HTML Embed" : "these HTML Embeds"}, so the shared link will show {linkSnapshotDialog.missingEmbeds.length === 1 ? "it" : "them"} as missing:{" "}
                  {linkSnapshotDialog.missingEmbeds.map((src, index) => (
                    <React.Fragment key={src}>
                      {index > 0 ? ", " : ""}
                      <code className="break-all">{src}</code>
                    </React.Fragment>
                  ))}
                </p>
              </div>
            ) : null}
            {ownReviewItemCount > 0 && (
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
                    Include my Review ({ownReviewItemCount} item{ownReviewItemCount === 1 ? "" : "s"}) in this link
                  </span>
                </label>
                {linkSnapshotDialog.includeReview && (
                  <input
                    type="text"
                    value={linkSnapshotDialog.reviewerName}
                    onChange={(event) => updateLinkSnapshotReviewChoice(true, event.currentTarget.value)}
                    placeholder="Your name (optional)"
                    className="review-input mt-2 w-full rounded-md border px-2.5 py-1.5 text-sm outline outline-2 outline-offset-1 outline-transparent placeholder:text-muted-foreground focus-visible:outline-ring"
                  />
                )}
              </div>
            )}
            {importedRoundCount > 0 && (
              <p className="mt-3 text-xs text-muted-foreground">
                {importedRoundCount} previously imported Review Round
                {importedRoundCount === 1 ? "" : "s"} will also travel with this link.
              </p>
            )}

            {linkSnapshotDialog.status === "save-failed" && (
              <p role="alert" className="mt-4 text-sm font-medium text-red-600 dark:text-red-400">
                Link not created because the latest changes were not saved. Resolve the save issue and try again.
              </p>
            )}
            {linkSnapshotDialog.status === "uploading" && (
              <p className="mt-4 text-sm text-muted-foreground">Encrypting and uploading…</p>
            )}
            {linkSnapshotDialog.status === "upload-failed" && (
              <p className="mt-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                The upload failed and no link was created. Your document was not changed. Try again, or choose
                In the link to share without uploading.
              </p>
            )}
            {linkSnapshotDialog.status === "copied" && linkSnapshotDialog.creation.status === "ready" && (
              <div className="mt-4">
                <div className="flex items-center justify-between gap-2">
                  <p role="status" className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                    <Check size={14} /> Link copied
                  </p>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 shrink-0 text-xs"
                      title="Open the shared link in a new tab"
                      onClick={() => {
                        if (linkSnapshotDialog.creation.status === "ready") {
                          openLinkSnapshotUrl(linkSnapshotDialog.shareUrl ?? linkSnapshotDialog.creation.url)
                        }
                      }}>
                      <ExternalLink size={14} /> Open link
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 shrink-0 text-xs"
                      onClick={() => void copyBackupUrl()}>
                      {backupUrlCopyState === "copied" ? <Check size={14} /> : <Copy size={14} />}{" "}
                      {backupUrlCopyState === "copied" ? "Copied" : "Copy link"}
                    </Button>
                  </div>
                </div>
                <textarea
                  id="link-snapshot-url"
                  aria-label="Shared link"
                  readOnly
                  rows={3}
                  value={linkSnapshotDialog.shareUrl ?? linkSnapshotDialog.creation.url}
                  onFocus={(event) => event.currentTarget.select()}
                  className="mt-2 max-h-20 w-full resize-none overflow-x-hidden overflow-y-auto whitespace-pre-wrap break-all rounded-md border bg-muted/30 p-3 font-mono text-xs"
                />
              </div>
            )}
            {linkSnapshotDialog.status === "copy-failed" && linkSnapshotDialog.creation.status === "ready" && (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground">Clipboard access failed. Select and copy the complete URL.</p>
                <textarea
                  readOnly
                  autoFocus
                  rows={3}
                  value={linkSnapshotDialog.shareUrl ?? linkSnapshotDialog.creation.url}
                  onFocus={(event) => event.currentTarget.select()}
                  className="mt-2 max-h-20 w-full resize-none overflow-x-hidden overflow-y-auto whitespace-pre-wrap break-all rounded-md border bg-muted/30 p-3 font-mono text-xs"
                />
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-[11px] tabular-nums text-muted-foreground">
                    {(linkSnapshotDialog.shareUrl?.length ?? linkSnapshotDialog.creation.characters).toLocaleString()} characters
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9"
                      aria-label="Open the shared link in a new tab"
                      title="Open the shared link in a new tab"
                      onClick={() => {
                        if (linkSnapshotDialog.creation.status === "ready") {
                          openLinkSnapshotUrl(linkSnapshotDialog.shareUrl ?? linkSnapshotDialog.creation.url)
                        }
                      }}>
                      <ExternalLink size={14} />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9"
                      aria-label="Copy full URL"
                      title="Copy full URL"
                      onClick={() => void navigator.clipboard.writeText(linkSnapshotDialog.creation.status === "ready" ? linkSnapshotDialog.shareUrl ?? linkSnapshotDialog.creation.url : "").then(
                        () => setLinkSnapshotDialog((current) => current && { ...current, status: "copied" }),
                        () => undefined,
                      )}>
                      <Copy size={14} />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={closeLinkSnapshotDialog}>
                {linkSnapshotDialog.status === "copied" ? "Done" : "Cancel"}
              </Button>
              {linkSnapshotDialog.status !== "copied" && linkSnapshotDialog.status !== "copy-failed" && (
                <Button
                  disabled={linkSnapshotDialog.creation.status !== "ready" || linkSnapshotDialog.status === "copying" || linkSnapshotDialog.status === "uploading"}
                  onClick={() => void confirmLinkSnapshot()}>
                  {linkSnapshotDialog.status === "copying" || linkSnapshotDialog.status === "uploading"
                    ? "Creating…"
                    : linkSnapshotDialog.requiresSave
                      ? "Save and create link"
                      : "Create and copy link"}
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
                <h2 id="import-review-title" className="text-base font-semibold">Import Review from link</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Paste a link a reviewer sent you to bring their comments into Review History. Markside decodes it locally, without a network request.
                </p>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Close" onClick={closeImportReviewDialog}>
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
                  placeholder="https://markside.app/s#x1...."
                  className="review-input mt-4 w-full resize-none rounded-md border px-3 py-2.5 font-mono text-xs outline outline-2 outline-offset-1 outline-transparent placeholder:text-muted-foreground focus-visible:outline-ring"
                />
                {importReviewDialog.status === "invalid" && (
                  <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
                    That link isn't a valid Markside Share Link.
                  </p>
                )}
                {importReviewDialog.status === "empty" && (
                  <p role="alert" className="mt-2 text-sm text-amber-700 dark:text-amber-300">
                    That link doesn't include a Review yet.
                  </p>
                )}
                <div className="mt-4 flex justify-end gap-2">
                  <Button variant="ghost" onClick={closeImportReviewDialog}>Cancel</Button>
                  <Button
                    disabled={!importReviewDialog.input.trim()}
                    onClick={decodeImportReviewInput}>
                    Decode
                  </Button>
                </div>
              </>
            )}

            {importReviewDialog.status === "preview" && (
              <>
                <ul className="mt-4 space-y-1.5 text-sm">
                  {importReviewDialog.rounds.map((round, index) => (
                    <li key={round.id} className="rounded-md border px-3 py-2">
                      Round {index + 1} — {round.reviewerName || "Reviewer"}{" "}
                      <span className="text-muted-foreground">
                        ({round.comments.length} comment{round.comments.length === 1 ? "" : "s"}
                        {round.note.trim() ? ", 1 note" : ""})
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex justify-end gap-2">
                  <Button variant="ghost" onClick={closeImportReviewDialog}>Cancel</Button>
                  <Button onClick={confirmImportReview}>Import into this file's Review</Button>
                </div>
              </>
            )}

            {importReviewDialog.status === "imported" && (
              <>
                <p role="status" className="mt-4 flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  <Check size={14} /> Imported {importReviewDialog.rounds.length} Review Round
                  {importReviewDialog.rounds.length === 1 ? "" : "s"}.
                </p>
                <div className="mt-4 flex justify-end">
                  <Button onClick={closeImportReviewDialog}>Done</Button>
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
              Save changes before switching files?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              This file has an unsaved draft. You can save it, discard it, or
              stay on the current file.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setPendingNavigation(null)}>
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  const target = pendingNavigation
                  setPendingNavigation(null)
                  void performFileNavigation(target)
                }}>
                Discard
              </Button>
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
                Save
              </Button>
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
              Export a clean PDF
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Chrome will open its print dialog. Choose Save to PDF, then under
              More settings turn off Headers and footers to remove the local
              path and timestamp.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={dismissPdfExportTip}>
                Cancel
              </Button>
              <Button onClick={continuePdfExport}>Continue</Button>
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
              Reload from disk?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              This file has an unsaved draft. Reloading will discard it and
              show the latest version from disk.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setReloadConfirmOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setReloadConfirmOpen(false)
                  void handleReloadFromDisk()
                }}>
                Reload and discard
              </Button>
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
            <><Check size={14} className="text-emerald-600 dark:text-emerald-400" /> Rendered content copied</>
          ) : (
            "Couldn’t copy rendered content"
          )}
        </div>
      )}
    </>
  )
}
