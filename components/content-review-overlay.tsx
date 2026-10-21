import { currentAgentReview } from "~lib/agent-review"
import { getReviewItemCount } from "~lib/review"
import type { ActiveReview } from "~lib/review"
import {
  Download,
  GripVertical,
  PanelRight,
  PanelsTopLeft,
  X
} from "lucide-react"
import React, { useRef } from "react"
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

import type { AgentReviewHandoff } from "~hooks/use-content-agent-review"

interface ContentReviewOverlayProps {
  checkReviewUpdates: () => Promise<boolean>
  reloadDocumentLoading: boolean
  agentHandoff?: AgentReviewHandoff
  checkAgentSession: () => void
  agentSessionCheckStatus: "idle" | "checking" | "not-found"
  reviewLoading: boolean
  reviewFolder: { path: string; choose: () => Promise<boolean> } | null
  isMdFile: boolean
  reviewOverlayDocked: boolean
  reviewLayout: "floating" | "docked"
  toggleReviewDock: () => void
  reviewDockWidth: number
  resizeReviewDock: (width: number) => void
  saveReviewDockWidth: (width: number) => void
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
  changeReviewCommentStatus: (id: string, status: "open" | "resolved") => void
  deleteReviewCommentById: (id: string) => (() => void) | void
  selectReviewComment: (id: string) => void
  jumpToReviewSection: (id: string) => void
  jumpToImportedComment: (id: string) => void
  copyActiveReview: (commentId?: string, reviewOverride?: ActiveReview | null) => Promise<boolean>
  clearReview: () => void
}

export function ContentReviewOverlay({
  checkReviewUpdates,
  reloadDocumentLoading,
  isMdFile,
  reviewOverlayDocked,
  reviewLayout,
  toggleReviewDock,
  reviewDockWidth,
  resizeReviewDock,
  saveReviewDockWidth,
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
  reviewItemCount: storedReviewItemCount,
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
  agentHandoff,
  checkAgentSession,
  agentSessionCheckStatus,
  reviewLoading,
  reviewFolder,
  jumpableReviewCommentIds,
  resolvedImportedComments,
  jumpableImportedCommentIds,
  selectedImportedCommentId,
  updateReviewNote,
  updateReviewComment,
  changeReviewCommentStatus,  deleteReviewCommentById,
  selectReviewComment,
  jumpToReviewSection,
  jumpToImportedComment,
  copyActiveReview,
  clearReview,
}: ContentReviewOverlayProps) {
  const resizeStart = useRef<{ x: number; width: number } | null>(null)
  const currentReview = agentHandoff?.file ? currentAgentReview(review, agentHandoff.file) : review
  const storedCommentCount = agentHandoff?.file ? agentHandoff.file.comments.filter(({ id }) => !review?.comments.some((comment) => comment.id === id)).length : 0
  const reviewItemCount = agentHandoff?.file ? (currentReview ? getReviewItemCount(currentReview) : storedCommentCount) : storedReviewItemCount
  return (
    <>
        {isMdFile && (
          <aside
            ref={reviewOverlayRef}
            id="markside-review-overlay"
            aria-labelledby="markside-review-overlay-title"
            aria-hidden={!reviewOverlayOpen}
            style={{
              width: reviewOverlayDocked ? reviewDockWidth : `min(${REVIEW_OVERLAY_WIDTHS[reviewOverlaySize]}px, calc(100% - 3rem))`,
              "--review-outline-offset": `${outlineOpen ? rightSidebarWidth : 0}px`,
              ...(!reviewOverlayDocked && reviewOverlayPosition && {
                left: reviewOverlayPosition.x,
                top: reviewOverlayPosition.y,
                right: "auto",
              }),
            } as React.CSSProperties}
            className={`review-overlay absolute z-50 print:!hidden flex-col text-foreground ${reviewOverlayDocked ? "right-0 top-12 bottom-0 border-l" : "right-6 top-[4.5rem] max-h-[70svh] overflow-hidden rounded-2xl border shadow-2xl xl:right-[calc(var(--review-outline-offset)+1.5rem)]"} ${reviewOverlayOpen ? "flex" : "hidden"}`}>
            <div
              className={`review-chrome flex h-11 shrink-0 touch-none select-none items-center justify-between border-b px-4 ${reviewOverlayDocked ? "" : reviewOverlayDragging ? "cursor-grabbing" : "cursor-grab"}`}
              onPointerDown={reviewOverlayDocked ? undefined : startReviewOverlayDrag}
              onPointerMove={reviewOverlayDocked ? undefined : updateReviewOverlayDrag}
              onPointerUp={reviewOverlayDocked ? undefined : endReviewOverlayDrag}
              onPointerCancel={reviewOverlayDocked ? undefined : endReviewOverlayDrag}
              onLostPointerCapture={reviewOverlayDocked ? undefined : endReviewOverlayDrag}>
              <div className="flex min-w-0 items-center gap-2">
                {!reviewOverlayDocked && <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  data-review-drag-handle
                  onKeyDown={moveReviewOverlayWithKeyboard}
                  className="-ml-2 h-7 w-6 shrink-0 self-center cursor-grab text-muted-foreground"
                  aria-label="Move Review. Use arrow keys to reposition it.">
                  <GripVertical size={14} />
                </Button>}
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
                  className={reviewOverlayDocked ? "hidden" : "hidden h-7 w-7 xl:inline-flex"}
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
                  onClick={toggleReviewDock}
                  className="h-7 w-7"
                  aria-label={reviewLayout === "docked" ? "Float Review" : "Dock Review right"}
                  title={reviewLayout === "docked" ? "Float Review" : "Dock Review right"}>
                  {reviewLayout === "docked" ? <PanelsTopLeft size={15} /> : <PanelRight size={15} />}
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
            {reviewOverlayDocked && (
              <div
                role="separator"
                aria-label="Resize Review sidebar"
                aria-orientation="vertical"
                aria-valuemin={320}
                aria-valuemax={600}
                aria-valuenow={reviewDockWidth}
                tabIndex={0}
                className="absolute inset-y-0 -left-1 z-10 w-2 cursor-col-resize touch-none hover:bg-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onPointerDown={(event) => {
                  if (event.button !== 0) return
                  event.preventDefault()
                  resizeStart.current = { x: event.clientX, width: reviewDockWidth }
                  event.currentTarget.setPointerCapture(event.pointerId)
                }}
                onPointerMove={(event) => {
                  if (!resizeStart.current || !event.currentTarget.hasPointerCapture(event.pointerId)) return
                  resizeReviewDock(resizeStart.current.width + resizeStart.current.x - event.clientX)
                }}
                onLostPointerCapture={() => {
                  resizeStart.current = null
                  saveReviewDockWidth(reviewDockWidth)
                }}
                onPointerUp={(event) => {
                  if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
                }}
                onKeyDown={(event) => {
                  const next = event.key === "ArrowLeft" ? reviewDockWidth + 16
                    : event.key === "ArrowRight" ? reviewDockWidth - 16
                    : event.key === "Home" ? 320 : event.key === "End" ? 600 : null
                  if (next === null) return
                  event.preventDefault()
                  resizeReviewDock(next)
                  saveReviewDockWidth(next)
                }}
              />
            )}
            <div className="flex min-h-0 flex-1 flex-col">
              <ReviewPanel
                onCheckUpdates={checkReviewUpdates}
                reloadDocumentLoading={reloadDocumentLoading}
                key={fileUrl}
                sourceUrl={fileUrl}
                open={reviewOverlayOpen}
                selectionVersion={reviewSelectionVersion}
                review={review}
                comments={resolvedReviewComments}
                selectedId={selectedReviewId}
                persistenceError={reviewPersistenceError}
                copyStatus={copyReviewStatus}
                agentHandoff={agentHandoff}
                onCheckAgentSession={checkAgentSession}
                agentSessionCheckStatus={agentSessionCheckStatus}
                reviewLoading={reviewLoading}
                reviewFolder={reviewFolder}
                jumpableCommentIds={jumpableReviewCommentIds}
                resolvedImportedComments={resolvedImportedComments}
                jumpableImportedCommentIds={jumpableImportedCommentIds}
                selectedImportedCommentId={selectedImportedCommentId}
                onNoteChange={updateReviewNote}
                onUpdateComment={updateReviewComment}
                onChangeCommentStatus={changeReviewCommentStatus}
                onDeleteComment={deleteReviewCommentById}
                onSelectComment={selectReviewComment}
                onJumpToSection={jumpToReviewSection}
                onJumpToImportedComment={jumpToImportedComment}
                onCopy={() => void copyActiveReview(undefined, currentReview)}
                onCopyComment={(id) => copyActiveReview(id)}
                onClear={clearReview}
              />
            </div>
          </aside>
        )}
    </>
  )
}
