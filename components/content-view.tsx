import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import {
  BadgeCheck,
  BookOpen,
  Check,
  ChevronDown,
  Code,
  Copy,
  Crosshair,
  Lightbulb,
  MegaphoneOff,
  MessageSquarePlus,
  Minimize2,
  Quote,
  Send,
  Sparkles,
  ThumbsUp,
  UserRound,
  Zap,
  type LucideIcon
} from "lucide-react"
import React from "react"
import type { AgentReviewHandoff } from "~hooks/use-content-agent-review"
import { createPortal } from "react-dom"
import { RawEditor,type RawEditorHandle } from "~components/raw-editor"
import { QuestionCardActions } from "~components/question-card-actions"
import { ReadabilityHeadingControl } from "~components/readability-heading-control"
import { ReviewPresetPicker } from "~components/review-preset-picker"
import { SidebarRight } from "~components/sidebar-right"
import { Button } from "~components/ui/button"
import { Tooltip,TooltipContent,TooltipTrigger } from "~components/ui/tooltip"
import { type Heading } from "~lib/headings"
import { type QuestionCard } from "~lib/markdown"
import {
  MIN_SPLIT_PANE_WIDTH,
  setPaneFullWidth
} from "~lib/markdown-mode"
import type { ResolvedReadabilityResult } from "~lib/readability"
import {
  type ReadabilityDimension,
  type ReadabilityResult,
  type ReadabilitySection
} from "~lib/readability"
import {
  type ReviewAnchor
} from "~lib/review"
import {
  type ReviewBadgeAnchor
} from "~lib/review-dom"
import {
  SELECTION_COMPOSER_SIZE
} from "~lib/review-layout"
import {
  QUICK_COMMENT_PRESETS,
  type ReviewTextSelection
} from "~lib/review-presets"

const QUICK_COMMENT_ICONS: Record<string, LucideIcon> = {
  clarify: Lightbulb,
  specify: Crosshair,
  example: BookOpen,
  condense: Minimize2,
  humanize: UserRound,
  dehype: MegaphoneOff,
  simplify: Sparkles,
  verify: BadgeCheck,
  agree: ThumbsUp,
}

interface ContentViewProps {
  isImageFile: boolean
  error: string | null
  imageObjectUrl: string | null
  fileUrl: string
  splitContainerRef: React.RefObject<HTMLDivElement>
  isSplitView: boolean
  splitMinWidth: number
  sourceVisible: boolean
  previewPercent: number
  sourceFullWidth: boolean
  content: string | null
  rawEditorRef: React.RefObject<RawEditorHandle>
  draft: string
  dark: boolean
  setSourceFullWidth: React.Dispatch<React.SetStateAction<boolean>>
  currentFileName: string
  focusSource: boolean
  handleDraftChange: (value: string, sourceLine: number) => void
  updateSplitFromClientX: (clientX: number) => void
  storeSplitPercent: () => void
  adjustSplitBy: (delta: number) => void
  previewScrollRef: React.RefObject<HTMLDivElement>
  previewVisible: boolean
  previewFollowPausedRef: React.MutableRefObject<boolean>
  captureReviewSelection: (event: React.MouseEvent) => void
  reviewCommentIdAtPoint: (clientX: number, clientY: number) => string | null
  importedReviewCommentIdAtPoint: (clientX: number, clientY: number) => string | null
  handleReviewHighlightClick: (event: React.MouseEvent) => void
  reviewOverlayDocked: boolean
  reviewDockWidth: number
  selectionAction: { anchor: ReviewAnchor; range: Range; selectionPoint: { x: number; y: number; }; toolbarPosition: { x: number; y: number; }; composerPosition: { x: number; y: number; }; sourceLine: number | null; question?: true; } | null
  selectionComposerOpen: boolean
  selectionComposerTextareaRef: React.RefObject<HTMLTextAreaElement>
  selectionComposerBody: string
  selectionComposerSelectionRef: React.MutableRefObject<ReviewTextSelection>
  setSelectionComposerBody: React.Dispatch<React.SetStateAction<string>>
  closeSelectionComposer: () => void
  saveSelectionComposerComment: () => void
  agentHandoff?: AgentReviewHandoff
  sendSelectionComposerComment: () => Promise<void>
  selectionPresetPickerOpen: boolean
  setSelectionPresetPickerOpen: React.Dispatch<React.SetStateAction<boolean>>
  insertSelectionComposerPreset: (instruction: string) => void
  selectionComposerCopyState: "idle" | "copying" | "copied"
  copySelectionComposerComment: () => Promise<void>
  selectionToolbarRef: React.MutableRefObject<HTMLDivElement | null>
  activateReviewSelection: () => void
  quickCommentMenuOpen: boolean
  quickCommentPointerDismissRef: React.MutableRefObject<boolean>
  setQuickCommentMenuOpen: React.Dispatch<React.SetStateAction<boolean>>
  quickCommentTriggerRef: React.MutableRefObject<HTMLButtonElement | null>
  activateQuickComment: (instruction: string) => void
  revealSelectionInSource: () => void
  contentRef: React.RefObject<HTMLDivElement>
  readabilityControlsVisible: boolean
  previewFullWidth: boolean
  readabilityMounts: { heading: HTMLElement; mount: HTMLSpanElement; section: ReadabilitySection; }[]
  questionCards: QuestionCard[]
  questionAnswer: (target: HTMLElement) => React.ComponentProps<typeof QuestionCardActions>["answer"]
  questionActionsBusy: boolean
  answerQuestion: (target: HTMLElement, body: string) => void
  composeQuestionAnswer: (target: HTMLElement, point: { x: number; y: number }) => void
  matchingReadabilityResult: (section: ReadabilitySection) => ResolvedReadabilityResult | null
  hasSingleH1: boolean
  readabilityConsentGranted: boolean
  confirmReadabilityConsent: () => void
  runReadabilityCheck: (section: ReadabilitySection) => Promise<void>
  runReadabilityLocate: (section: ReadabilitySection, result: ReadabilityResult, dimensions: ReadabilityDimension[]) => Promise<void>
  addReadabilityComment: (section: ReadabilitySection, result: ReadabilityResult) => void
  saveReadabilityResults: (next: ReadabilityResult[]) => void
  readabilityResultsRef: React.MutableRefObject<ReadabilityResult[]>
  reviewBadgeAnchors: ReviewBadgeAnchor[]
  jumpToReviewSection: (id: string) => void
  selectedReviewId: string | null
  outlineOpen: boolean
  numberHeadings: boolean
  headings: Heading[]
  outlineNumbers: string[]
  activeHeadingId: string | null
  rightSidebarWidth: number
  setRightSidebarWidth: React.Dispatch<React.SetStateAction<number>>
  setOutlineOpen: React.Dispatch<React.SetStateAction<boolean>>
  setActiveHeadingId: React.Dispatch<React.SetStateAction<string | null>>
}

export function ContentView({
  isImageFile,
  error,
  imageObjectUrl,
  fileUrl,
  splitContainerRef,
  isSplitView,
  splitMinWidth,
  sourceVisible,
  previewPercent,
  sourceFullWidth,
  content,
  rawEditorRef,
  draft,
  dark,
  setSourceFullWidth,
  currentFileName,
  focusSource,
  handleDraftChange,
  updateSplitFromClientX,
  storeSplitPercent,
  adjustSplitBy,
  previewScrollRef,
  previewVisible,
  previewFollowPausedRef,
  captureReviewSelection,
  reviewCommentIdAtPoint,
  importedReviewCommentIdAtPoint,
  handleReviewHighlightClick,
  reviewOverlayDocked,
  reviewDockWidth,
  selectionAction,
  selectionComposerOpen,
  selectionComposerTextareaRef,
  selectionComposerBody,
  selectionComposerSelectionRef,
  setSelectionComposerBody,
  closeSelectionComposer,
  saveSelectionComposerComment,
  agentHandoff,
  sendSelectionComposerComment,
  selectionPresetPickerOpen,
  setSelectionPresetPickerOpen,
  insertSelectionComposerPreset,
  selectionComposerCopyState,
  copySelectionComposerComment,
  selectionToolbarRef,
  activateReviewSelection,
  quickCommentMenuOpen,
  quickCommentPointerDismissRef,
  setQuickCommentMenuOpen,
  quickCommentTriggerRef,
  activateQuickComment,
  revealSelectionInSource,
  contentRef,
  readabilityControlsVisible,
  previewFullWidth,
  readabilityMounts,
  questionCards,
  questionAnswer,
  questionActionsBusy,
  answerQuestion,
  composeQuestionAnswer,
  matchingReadabilityResult,
  hasSingleH1,
  readabilityConsentGranted,
  confirmReadabilityConsent,
  runReadabilityCheck,
  runReadabilityLocate,
  addReadabilityComment,
  saveReadabilityResults,
  readabilityResultsRef,
  reviewBadgeAnchors,
  jumpToReviewSection,
  selectedReviewId,
  outlineOpen,
  numberHeadings,
  headings,
  outlineNumbers,
  activeHeadingId,
  rightSidebarWidth,
  setRightSidebarWidth,
  setOutlineOpen,
  setActiveHeadingId,
}: ContentViewProps) {
  const composerAgent = agentHandoff?.completed ? undefined : agentHandoff
  const composerSending = !!composerAgent && (composerAgent.sending || composerAgent.updatingCommentId != null)
  const answerableQuestionCards = questionCards.filter(({ options }) => options.length > 0)
  return (
    <>
        <div className="flex-1 min-h-0 print:!mr-0" style={{ marginRight: reviewOverlayDocked ? reviewDockWidth : 0 }}>
          {isImageFile && (
            <div className="h-full overflow-y-auto px-8 py-10">
              <div className="flex h-full items-center justify-center">
                {error ? (
                  <p className="text-destructive text-sm">{error}</p>
                ) : imageObjectUrl ? (
                  <img
                    src={imageObjectUrl}
                    alt={decodeURIComponent(fileUrl.split("/").pop() ?? "")}
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <p className="text-muted-foreground text-sm">Loading…</p>
                )}
              </div>
            </div>
          )}

          {!isImageFile && (
            <div
              data-markside-content-scroll
              className="h-full min-h-0 overflow-x-auto">
              <div
                data-markside-content-layout
                ref={splitContainerRef}
                style={
                  isSplitView
                    ? { minWidth: `${splitMinWidth}px` }
                    : undefined
                }
                className={`h-full min-h-0 ${
                  isSplitView ? "relative flex" : ""
                }`}>
                {sourceVisible && (
                  <div
                    data-markside-source
                    style={
                      isSplitView
                        ? {
                            width: `${100 - previewPercent}%`,
                            minWidth: `${MIN_SPLIT_PANE_WIDTH}px`,
                          }
                        : undefined
                    }
                    className={`h-full min-w-0 overflow-hidden px-8 pt-2 pb-10 ${
                      isSplitView ? "order-2" : "w-full"
                    }`}>
                    <div className={`h-full ${sourceFullWidth ? "" : "mx-auto max-w-5xl"}`}>
                      {error ? (
                        <p className="text-destructive text-sm">{error}</p>
                      ) : content === null ? (
                        <p className="text-muted-foreground text-sm">Loading…</p>
                      ) : (
                        <RawEditor
                          ref={rawEditorRef}
                          content={draft}
                          dark={dark}
                          fullWidth={sourceFullWidth}
                          onToggleFullWidth={() => {
                            const next = !sourceFullWidth
                            setSourceFullWidth(next)
                            void setPaneFullWidth("source", next).catch(() => undefined)
                          }}
                          fileName={currentFileName}
                          autoFocus={focusSource}
                          onChange={handleDraftChange}
                        />
                      )}
                    </div>
                  </div>
                )}

                {isSplitView && (
                  <div
                    data-markside-split-resizer
                    role="separator"
                    aria-label="Resize Source and Preview panes"
                    aria-orientation="vertical"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(previewPercent)}
                    aria-valuetext={`${Math.round(previewPercent)}% Preview, ${Math.round(100 - previewPercent)}% Source`}
                    tabIndex={0}
                    style={{ left: `${previewPercent}%` }}
                    className="group absolute inset-y-0 z-10 w-3 -translate-x-1/2 cursor-col-resize touch-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                    onPointerDown={(event) => {
                      event.currentTarget.setPointerCapture(event.pointerId)
                      updateSplitFromClientX(event.clientX)
                    }}
                    onPointerMove={(event) => {
                      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                        updateSplitFromClientX(event.clientX)
                      }
                    }}
                    onPointerUp={(event) => {
                      event.currentTarget.releasePointerCapture(event.pointerId)
                      storeSplitPercent()
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "ArrowLeft") {
                        event.preventDefault()
                        adjustSplitBy(-5)
                      } else if (event.key === "ArrowRight") {
                        event.preventDefault()
                        adjustSplitBy(5)
                      }
                    }}>
                    <span className="mx-auto block h-full w-px bg-border transition-colors group-hover:bg-foreground/40" />
                  </div>
                )}

                <div
                  data-markside-preview
                  ref={previewScrollRef}
                  style={
                    isSplitView
                      ? {
                          width: `${previewPercent}%`,
                          minWidth: `${MIN_SPLIT_PANE_WIDTH}px`,
                        }
                      : undefined
                  }
                  className={`relative h-full min-w-0 overflow-y-auto ${
                    previewVisible ? "" : "hidden"
                  } ${isSplitView ? "order-1" : "w-full"}`}
                  onWheel={() => {
                    if (isSplitView) previewFollowPausedRef.current = true
                  }}
                  onPointerDown={() => {
                    if (isSplitView) previewFollowPausedRef.current = true
                  }}
                  onTouchStart={() => {
                    if (isSplitView) previewFollowPausedRef.current = true
                  }}
                  onMouseUp={captureReviewSelection}
                  onMouseMove={(event) => {
                    const hovering = reviewCommentIdAtPoint(event.clientX, event.clientY) ??
                      importedReviewCommentIdAtPoint(event.clientX, event.clientY)
                    event.currentTarget.style.cursor = hovering ? "pointer" : ""
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.cursor = ""
                  }}
                  onClick={handleReviewHighlightClick}>
                  <div className="flex min-h-full min-w-0 items-start">
                    <div
                      className="relative min-h-full min-w-0 flex-1 pl-20 pr-8 pt-10 pb-28 transition-[padding] duration-200 print:p-0">
                  {selectionAction && selectionComposerOpen && (
                    <div
                      style={{
                        left: selectionAction.composerPosition.x,
                        top: selectionAction.composerPosition.y,
                        width: SELECTION_COMPOSER_SIZE.width,
                      }}
                      className="absolute z-[90] rounded-lg border bg-background p-3 text-sm text-foreground shadow-lg"
                      onMouseUp={(event) => event.stopPropagation()}>
                      <div className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                        <Quote className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <p className="line-clamp-3">{selectionAction.anchor.exact}</p>
                      </div>
                      <textarea
                        ref={selectionComposerTextareaRef}
                        value={selectionComposerBody}
                        onSelect={(event) => {
                          selectionComposerSelectionRef.current = {
                            start: event.currentTarget.selectionStart,
                            end: event.currentTarget.selectionEnd,
                          }
                        }}
                        onChange={(event) => {
                          selectionComposerSelectionRef.current = {
                            start: event.currentTarget.selectionStart,
                            end: event.currentTarget.selectionEnd,
                          }
                          setSelectionComposerBody(event.currentTarget.value)
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Escape") {
                            event.preventDefault()
                            closeSelectionComposer()
                          } else if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                            event.preventDefault()
                            if (event.shiftKey && composerAgent) {
                              if (!composerSending) void sendSelectionComposerComment()
                            } else {
                              saveSelectionComposerComment()
                            }
                          }
                        }}
                        placeholder={selectionAction.question ? "Your answer, or what’s unclear" : "Add a comment"}
                        className="review-input mt-2 min-h-[7.5rem] w-full resize-y rounded-md border px-3 py-2.5 text-sm leading-relaxed outline outline-2 outline-offset-1 outline-transparent placeholder:text-muted-foreground focus-visible:outline-ring"
                      />
                      {composerAgent?.folderToChoose && (
                        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                          To send, allow access to this document's folder when Chrome asks.
                        </p>
                      )}
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <ReviewPresetPicker
                          open={selectionPresetPickerOpen}
                          onOpenChange={setSelectionPresetPickerOpen}
                          trigger={(
                            <button
                              type="button"
                              className="flex h-9 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-muted-foreground outline outline-2 outline-offset-1 outline-transparent hover:bg-accent hover:text-foreground focus-visible:outline-ring active:bg-accent/80">
                              Presets <ChevronDown size={13} />
                            </button>
                          )}
                          onSelect={(preset) => insertSelectionComposerPreset(preset.instruction)}
                        />
                        <div className="flex items-center gap-2">
                          <Button className="h-9" variant="ghost" size="sm" onClick={closeSelectionComposer}>
                            Cancel
                          </Button>
                          <Button
                            className="h-9"
                            variant="outline"
                            size="sm"
                            disabled={!selectionComposerBody.trim() || selectionComposerCopyState === "copying"}
                            onClick={() => void copySelectionComposerComment()}>
                            {selectionComposerCopyState === "copied" ? <Check size={14} /> : <Copy size={14} />}{" "}
                            {selectionComposerCopyState === "copied" ? "Copied" : "Save & copy prompt"}
                          </Button>
                          <div className="flex items-center">
                            <Button
                              className={composerAgent ? "h-9 rounded-r-none" : "h-9"}
                              size="sm"
                              disabled={!selectionComposerBody.trim() || selectionComposerCopyState === "copying"}
                              onClick={saveSelectionComposerComment}>
                              Save
                            </Button>
                            {composerAgent && (
                              <DropdownMenu.Root>
                                <DropdownMenu.Trigger asChild>
                                  <Button
                                    className="h-9 w-8 rounded-l-none border-l border-primary-foreground/20 px-0"
                                    size="sm"
                                    aria-label="More save options"
                                    disabled={!selectionComposerBody.trim() || selectionComposerCopyState === "copying" || composerSending}>
                                    <ChevronDown size={14} />
                                  </Button>
                                </DropdownMenu.Trigger>
                                <DropdownMenu.Portal>
                                  <DropdownMenu.Content
                                    align="end"
                                    sideOffset={4}
                                    collisionPadding={12}
                                    style={{ zIndex: 100000 }}
                                    className="min-w-[12rem] rounded-lg border bg-background p-1.5 text-foreground shadow-md">
                                    <DropdownMenu.Item
                                      onSelect={() => void sendSelectionComposerComment()}
                                      className="flex cursor-pointer select-none flex-col rounded-md px-2 py-2 text-sm leading-5 outline-none data-[highlighted]:bg-[hsl(var(--review-card-hover))]">
                                      <span className="flex items-center gap-2 font-medium"><Send size={14} aria-hidden="true" />Save & send review</span>
                                      <span className="pl-[22px] text-xs text-muted-foreground">Sends all comments and overall feedback</span>
                                    </DropdownMenu.Item>
                                  </DropdownMenu.Content>
                                </DropdownMenu.Portal>
                              </DropdownMenu.Root>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {selectionAction && !selectionComposerOpen && (
                    <div
                      ref={selectionToolbarRef}
                      style={{ left: selectionAction.toolbarPosition.x, top: selectionAction.toolbarPosition.y }}
                      className="review-toolbar-in absolute z-[90] flex h-9 w-max items-stretch overflow-hidden rounded-md border bg-background text-xs font-medium text-foreground shadow-lg"
                      onMouseUp={(event) => event.stopPropagation()}>
                      <button
                        type="button"
                        aria-label="Add comment"
                        className="flex shrink-0 items-center gap-1.5 whitespace-nowrap px-2.5 outline outline-2 -outline-offset-1 outline-transparent hover:bg-accent focus-visible:outline-ring"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={(event) => {
                          event.stopPropagation()
                          activateReviewSelection()
                        }}>
                        <MessageSquarePlus size={14} aria-hidden="true" />
                        Comment
                      </button>
                      <DropdownMenu.Root
                        open={quickCommentMenuOpen}
                        onOpenChange={(open) => {
                          if (open) quickCommentPointerDismissRef.current = false
                          setQuickCommentMenuOpen(open)
                        }}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <DropdownMenu.Trigger asChild>
                              <button
                                ref={quickCommentTriggerRef}
                                type="button"
                                aria-label="Quick comment"
                                className="flex w-9 shrink-0 items-center justify-center border-l outline outline-2 -outline-offset-1 outline-transparent hover:bg-accent focus-visible:outline-ring"
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={(event) => event.stopPropagation()}>
                                <Zap size={14} aria-hidden="true" />
                              </button>
                            </DropdownMenu.Trigger>
                          </TooltipTrigger>
                          <TooltipContent side="top" sideOffset={6} className="text-xs">
                            Quick comment
                          </TooltipContent>
                        </Tooltip>
                        <DropdownMenu.Portal>
                          <DropdownMenu.Content
                            align="start"
                            sideOffset={4}
                            collisionPadding={12}
                            onPointerDownOutside={() => {
                              quickCommentPointerDismissRef.current = true
                            }}
                            onCloseAutoFocus={(event) => {
                              if (!quickCommentPointerDismissRef.current) return
                              quickCommentPointerDismissRef.current = false
                              event.preventDefault()
                              quickCommentTriggerRef.current?.blur()
                            }}
                            style={{ zIndex: 100000 }}
                            className="grid w-max max-w-[calc(100vw-24px)] grid-cols-[max-content_max-content_1fr] gap-x-2.5 rounded-lg border bg-background p-1.5 text-foreground shadow-md">
                            {QUICK_COMMENT_PRESETS.map((preset) => {
                              const Icon = QUICK_COMMENT_ICONS[preset.id]
                              return (
                                <DropdownMenu.Item
                                  key={preset.id}
                                  aria-label={`${preset.chip}. ${preset.name}`}
                                  onSelect={() => activateQuickComment(preset.instruction)}
                                  className="col-span-3 grid cursor-pointer select-none grid-cols-subgrid items-baseline whitespace-nowrap rounded-md px-2 py-2 text-sm leading-5 outline-none hover:bg-[hsl(var(--review-card-hover))] focus:bg-[hsl(var(--review-card-hover))] data-[highlighted]:bg-[hsl(var(--review-card-hover))]">
                                  <Icon className="self-center text-muted-foreground" size={15} aria-hidden="true" />
                                  <span className="font-medium">{preset.chip}</span>
                                  <span className="text-muted-foreground">{preset.name}</span>
                                </DropdownMenu.Item>
                              )
                            })}
                          </DropdownMenu.Content>
                        </DropdownMenu.Portal>
                      </DropdownMenu.Root>
                      {selectionAction.sourceLine !== null && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              aria-label="Reveal in Source"
                              className="flex w-9 shrink-0 items-center justify-center border-l outline outline-2 -outline-offset-1 outline-transparent hover:bg-accent focus-visible:outline-ring"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={(event) => {
                                event.stopPropagation()
                                revealSelectionInSource()
                              }}>
                              <Code size={14} aria-hidden="true" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" sideOffset={6} className="text-xs">
                            Reveal in Source
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  )}
                  {content === null && !error && (
                    <p className="text-muted-foreground">Loading…</p>
                  )}
                  {error && (
                    <p className="text-destructive">Error: {error}</p>
                  )}
                  <div
                    ref={contentRef}
                    className={`prose prose-neutral dark:prose-invert ${!readabilityControlsVisible ? "readability-controls-hidden" : ""} ${
                      previewFullWidth ? "max-w-none" : "mx-auto max-w-5xl"
                    }`}
                  />
                  {readabilityControlsVisible && readabilityMounts.map(({ heading, mount, section }) => {
                    if (!heading.isConnected) return null
                    const matched = matchingReadabilityResult(section)
                    return createPortal(
                      <ReadabilityHeadingControl
                        section={section}
                        result={matched?.result ?? null}
                        status={matched?.status ?? null}
                        wholeDocument={section.level === 1 && hasSingleH1}
                        consentGranted={readabilityConsentGranted}
                        onConsent={confirmReadabilityConsent}
                        onCheck={runReadabilityCheck}
                        onLocate={runReadabilityLocate}
                        onComment={addReadabilityComment}
                        onRemove={(result) => saveReadabilityResults(readabilityResultsRef.current.filter((item) => item.id !== result.id))}
                      />,
                      mount,
                      `${section.sourceLine}:${section.path.join("/")}`,
                    )
                  })}
                  {!agentHandoff?.completed && questionCards.map((card, index) => card.mount.isConnected && createPortal(
                    <QuestionCardActions
                      card={card}
                      answer={questionAnswer(card.target)}
                      busy={questionActionsBusy}
                      keyboard={answerableQuestionCards.length === 1 && answerableQuestionCards[0] === card}
                      onAnswer={(body) => answerQuestion(card.target, body)}
                      onCompose={(point) => composeQuestionAnswer(card.target, point)}
                      onSend={composerAgent ? () => void composerAgent.send() : undefined}
                      commentAt={(x, y) => !!(reviewCommentIdAtPoint(x, y) ?? importedReviewCommentIdAtPoint(x, y))}
                    />,
                    card.mount,
                    `question-${index}`,
                  ))}
                  {reviewBadgeAnchors.map((badge) => (
                    <button
                      key={badge.id}
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        jumpToReviewSection(badge.id)
                      }}
                      style={{
                        top: badge.top,
                        left: badge.left,
                        transform: "translate(-100%, -50%)",
                      }}
                      className={`review-badge review-badge-approximate absolute z-[80] ${
                        selectedReviewId === badge.id ? "review-badge-selected" : ""
                      }`}
                      title="Approximate location — the reviewed text was edited"
                      aria-label={`Review comment ${badge.displayNumber}, approximate location`}>
                      ?
                    </button>
                  ))}
                    </div>
                    <SidebarRight
                      open={outlineOpen}
                      headings={numberHeadings ? headings.map((heading, index) => {
                        const number = outlineNumbers[index]
                        return { ...heading, text: number ? `${number} ${heading.text}` : heading.text }
                      }) : headings}
                      activeHeadingId={activeHeadingId}
                      width={rightSidebarWidth}
                      onResize={setRightSidebarWidth}
                      onClose={() => setOutlineOpen(false)}
                      onHeadingClick={(id) => {
                        setActiveHeadingId(id)
                        window.location.hash = id
                        if (window.innerWidth < 1280) setOutlineOpen(false)
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
    </>
  )
}
