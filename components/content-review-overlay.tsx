import type { ActiveReview } from "~lib/review"
import {
  Download,
  GripVertical,
  X
} from "lucide-react"
import React from "react"
import { ReviewPanel,type ReviewCopyStatus } from "~components/review-panel"
import { Button } from "~components/ui/button"
import {
  type ResolvedAnchor,
  type ResolvedReviewComment,
  type ReviewComment
} from "~lib/review"
import {
  REVIEW_OVERLAY_WIDTHS
} from "~lib/review-layout"

interface ContentReviewOverlayProps {
  isMdFile: boolean
  reviewOverlayRef: React.RefObject<HTMLElement>
  reviewOverlayOpen: boolean
  reviewOverlaySize: "compact" | "standard" | "wide"
  outlineOpen: boolean
  rightSidebarWidth: number
  reviewOverlayPosition: { x: number; y: number; } | null
  reviewOverlayDragging: boolean
  startReviewOverlayDrag: (event: React.PointerEvent<HTMLDivElement>) => void
  updateReviewOverlayDrag: (event: React.PointerEvent<HTMLDivElement>) => void
  endReviewOverlayDrag: (event: React.PointerEvent<HTMLDivElement>) => void
  moveReviewOverlayWithKeyboard: (event: React.KeyboardEvent<HTMLButtonElement>) => void
  reviewItemCount: number
  openImportReviewDialog: () => void
  setReviewOverlaySize: React.Dispatch<React.SetStateAction<"compact" | "standard" | "wide">>
  nextReviewOverlaySize: "compact" | "standard" | "wide"
  closeReviewOverlay: (restoreTriggerFocus?: boolean) => void
  fileUrl: string
  reviewSelectionVersion: number
  review: ActiveReview | null
  resolvedReviewComments: ResolvedReviewComment[]
  selectedReviewId: string | null
  reviewPersistenceError: boolean
  copyReviewStatus: ReviewCopyStatus | null
  jumpableReviewCommentIds: Set<string>
  resolvedImportedComments: Map<string, ReviewComment & ResolvedAnchor>
  jumpableImportedCommentIds: Set<string>
  selectedImportedCommentId: string | null
  updateReviewNote: (note: string) => void
  updateReviewComment: (id: string, body: string) => void
  deleteReviewCommentById: (id: string) => void
  selectReviewComment: (id: string) => void
  jumpToReviewSection: (id: string) => void
  jumpToImportedComment: (id: string) => void
  copyActiveReview: (commentId?: string, reviewOverride?: ActiveReview | null) => Promise<boolean>
  clearReview: () => void
}

export function ContentReviewOverlay({
  isMdFile,
  reviewOverlayRef,
  reviewOverlayOpen,
  reviewOverlaySize,
  outlineOpen,
  rightSidebarWidth,
  reviewOverlayPosition,
  reviewOverlayDragging,
  startReviewOverlayDrag,
  updateReviewOverlayDrag,
  endReviewOverlayDrag,
  moveReviewOverlayWithKeyboard,
  reviewItemCount,
  openImportReviewDialog,
  setReviewOverlaySize,
  nextReviewOverlaySize,
  closeReviewOverlay,
  fileUrl,
  reviewSelectionVersion,
  review,
  resolvedReviewComments,
  selectedReviewId,
  reviewPersistenceError,
  copyReviewStatus,
  jumpableReviewCommentIds,
  resolvedImportedComments,
  jumpableImportedCommentIds,
  selectedImportedCommentId,
  updateReviewNote,
  updateReviewComment,
  deleteReviewCommentById,
  selectReviewComment,
  jumpToReviewSection,
  jumpToImportedComment,
  copyActiveReview,
  clearReview,
}: ContentReviewOverlayProps) {
  return (
    <>
        {isMdFile && (
          <aside
            ref={reviewOverlayRef}
            id="markside-review-overlay"
            aria-labelledby="markside-review-overlay-title"
            aria-hidden={!reviewOverlayOpen}
            style={{
              width: `min(${REVIEW_OVERLAY_WIDTHS[reviewOverlaySize]}px, calc(100% - 3rem))`,
              "--review-outline-offset": `${outlineOpen ? rightSidebarWidth : 0}px`,
              ...(reviewOverlayPosition && {
                left: reviewOverlayPosition.x,
                top: reviewOverlayPosition.y,
                right: "auto",
              }),
            } as React.CSSProperties}
            className={`review-overlay absolute right-6 top-[4.5rem] z-50 max-h-[70svh] flex-col overflow-hidden rounded-2xl border text-foreground shadow-2xl xl:right-[calc(var(--review-outline-offset)+1.5rem)] ${reviewOverlayOpen ? "flex" : "hidden"}`}>
            <div
              className={`review-chrome flex h-11 shrink-0 touch-none select-none items-center justify-between border-b px-4 ${reviewOverlayDragging ? "cursor-grabbing" : "cursor-grab"}`}
              onPointerDown={startReviewOverlayDrag}
              onPointerMove={updateReviewOverlayDrag}
              onPointerUp={endReviewOverlayDrag}
              onPointerCancel={endReviewOverlayDrag}
              onLostPointerCapture={endReviewOverlayDrag}>
              <div className="flex min-w-0 items-baseline gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  data-review-drag-handle
                  onKeyDown={moveReviewOverlayWithKeyboard}
                  className="-ml-2 h-7 w-6 shrink-0 self-center cursor-grab text-muted-foreground"
                  aria-label="Move Review. Use arrow keys to reposition it.">
                  <GripVertical size={14} />
                </Button>
                <h2 id="markside-review-overlay-title" className="text-sm font-semibold">
                  Review
                </h2>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {reviewItemCount} {reviewItemCount === 1 ? "item" : "items"}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={openImportReviewDialog}
                  className="h-7 gap-1.5 px-2 text-xs text-muted-foreground"
                  aria-label="Import review from link">
                  <Download size={13} />
                  Import
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setReviewOverlaySize(nextReviewOverlaySize)}
                  className="hidden h-7 w-7 xl:inline-flex"
                  aria-label={`Review width: ${reviewOverlaySize}. Switch to ${nextReviewOverlaySize}`}
                  title={`Review width: ${reviewOverlaySize}`}>
                  <span
                    aria-hidden="true"
                    className={`block h-3 rounded-[2px] border border-current ${
                      reviewOverlaySize === "compact"
                        ? "w-3"
                        : reviewOverlaySize === "wide"
                          ? "w-5"
                          : "w-4"
                    }`}
                  />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => closeReviewOverlay()}
                  className="h-7 w-7"
                  aria-label="Close Review">
                  <X size={15} />
                </Button>
              </div>
            </div>
            <div className="flex min-h-0 flex-1 flex-col">
              <ReviewPanel
                key={fileUrl}
                open={reviewOverlayOpen}
                selectionVersion={reviewSelectionVersion}
                review={review}
                comments={resolvedReviewComments}
                selectedId={selectedReviewId}
                persistenceError={reviewPersistenceError}
                copyStatus={copyReviewStatus}
                jumpableCommentIds={jumpableReviewCommentIds}
                resolvedImportedComments={resolvedImportedComments}
                jumpableImportedCommentIds={jumpableImportedCommentIds}
                selectedImportedCommentId={selectedImportedCommentId}
                onNoteChange={updateReviewNote}
                onUpdateComment={updateReviewComment}
                onDeleteComment={deleteReviewCommentById}
                onSelectComment={selectReviewComment}
                onJumpToSection={jumpToReviewSection}
                onJumpToImportedComment={jumpToImportedComment}
                onCopy={() => void copyActiveReview()}
                onCopyComment={(id) => copyActiveReview(id)}
                onClear={clearReview}
              />
            </div>
          </aside>
        )}
    </>
  )
}
