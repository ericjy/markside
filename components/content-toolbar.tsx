import type { ActiveReview } from "~lib/review"
import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import {
  BookOpen,
  Check,
  ChevronDown,
  Columns2,
  Copy,
  Eye,
  Link2,
  MessageSquare,
  Moon,
  MoreHorizontal,
  MoveHorizontal,
  Pencil,
  Printer,
  RefreshCw,
  Share2,
  Sun,
  TableOfContents,
  Trash2
} from "lucide-react"
import React from "react"
import { Button } from "~components/ui/button"
import { Separator } from "~components/ui/separator"
import {
  SidebarTrigger
} from "~components/ui/sidebar"
import { Tooltip,TooltipContent,TooltipProvider,TooltipTrigger } from "~components/ui/tooltip"
import {
  setPaneFullWidth,
  type MarkdownMode
} from "~lib/markdown-mode"
import { READABILITY_CHECK_ENABLED } from "~lib/readability-service"
import {
  setThemePreference
} from "~lib/theme-preference"

interface ContentToolbarProps {
  leftOpen: boolean
  hasMore: boolean
  crumbs: string[]
  crumbUrls: string[]
  fileUrl: string
  setCopied: React.Dispatch<React.SetStateAction<boolean>>
  copied: boolean
  isAddressBarSynced: boolean
  navigateTabToFile: (url: string) => void
  currentFileName: string
  addressBarFileName: string
  sourceVisible: boolean
  saveState: "idle" | "unsaved" | "saving" | "saved" | "error"
  cancelScheduledSave: () => void
  doSave: (text: string, url: string, options?: { force?: boolean; allowFolderPrompt?: boolean }) => Promise<boolean>
  draftRef: React.MutableRefObject<string>
  reloadTriggerRef: React.RefObject<HTMLButtonElement>
  requestReloadFromDisk: () => void
  reloadLoading: boolean
  content: string | null
  reloadNoticeOpen: boolean
  hasReloadChanges: boolean
  reloadComparison: { before: string; after: string; } | null
  changesVisible: boolean
  closeSelectionComposer: () => void
  setShowChanges: React.Dispatch<React.SetStateAction<boolean>>
  previewVisible: boolean
  selectMode: (nextMode: MarkdownMode) => void
  dismissReloadChanges: () => void
  review: ActiveReview | null
  clearReview: () => void
  isMdFile: boolean
  mode: MarkdownMode
  dark: boolean
  followsSystemThemeRef: React.MutableRefObject<boolean>
  setDark: React.Dispatch<React.SetStateAction<boolean>>
  reviewTriggerRef: React.MutableRefObject<HTMLButtonElement | null>
  reviewOverlayOpen: boolean
  closeReviewOverlay: (restoreTriggerFocus?: boolean) => void
  setReviewOverlayOpen: React.Dispatch<React.SetStateAction<boolean>>
  reviewItemCount: number
  setOutlineOpen: React.Dispatch<React.SetStateAction<boolean>>
  outlineOpen: boolean
  requestLinkSnapshot: () => void
  fileMenuTriggerRef: React.MutableRefObject<HTMLButtonElement | null>
  fileMenuPointerInteractionRef: React.MutableRefObject<boolean>
  previewFullWidth: boolean
  setPreviewFullWidth: React.Dispatch<React.SetStateAction<boolean>>
  numberHeadings: boolean
  setNumberHeadings: React.Dispatch<React.SetStateAction<boolean>>
  readabilityControlsVisible: boolean
  setReadabilityControlsVisible: React.Dispatch<React.SetStateAction<boolean>>
  copyRenderedPreview: () => Promise<void>
  isPdfExportable: boolean
  requestPdfExport: () => void
}

export function ContentToolbar({
  leftOpen,
  hasMore,
  crumbs,
  crumbUrls,
  fileUrl,
  setCopied,
  copied,
  isAddressBarSynced,
  navigateTabToFile,
  currentFileName,
  addressBarFileName,
  sourceVisible,
  saveState,
  cancelScheduledSave,
  doSave,
  draftRef,
  reloadTriggerRef,
  requestReloadFromDisk,
  reloadLoading,
  content,
  reloadNoticeOpen,
  hasReloadChanges,
  reloadComparison,
  changesVisible,
  closeSelectionComposer,
  setShowChanges,
  previewVisible,
  selectMode,
  dismissReloadChanges,
  review,
  clearReview,
  isMdFile,
  mode,
  dark,
  followsSystemThemeRef,
  setDark,
  reviewTriggerRef,
  reviewOverlayOpen,
  closeReviewOverlay,
  setReviewOverlayOpen,
  reviewItemCount,
  setOutlineOpen,
  outlineOpen,
  requestLinkSnapshot,
  fileMenuTriggerRef,
  fileMenuPointerInteractionRef,
  previewFullWidth,
  setPreviewFullWidth,
  numberHeadings,
  setNumberHeadings,
  readabilityControlsVisible,
  setReadabilityControlsVisible,
  copyRenderedPreview,
  isPdfExportable,
  requestPdfExport,
}: ContentToolbarProps) {
  return (
    <>
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
          <>
            <SidebarTrigger className={`-ml-1 ${leftOpen ? "bg-accent" : ""}`} />
            <Separator orientation="vertical" className="mr-2 h-4" />
          </>
          <nav className="flex min-w-0 flex-1 items-center gap-1 text-sm">
            <div className="flex min-w-0 items-center gap-1 overflow-hidden">
              {hasMore && (
                <span className="text-muted-foreground shrink-0">…</span>
              )}
              {crumbs.map((part, i) => (
                <React.Fragment key={i}>
                  {(i > 0 || hasMore) && (
                    <span className="text-muted-foreground/50 shrink-0">/</span>
                  )}
                  {i === crumbs.length - 1 ? (
                    <span className="text-foreground font-medium truncate">
                      {part}
                    </span>
                  ) : crumbUrls[i] ? (
                    <a
                      href={crumbUrls[i]}
                      className="text-muted-foreground hover:text-foreground shrink-0 max-w-[120px] truncate transition-colors">
                      {part}
                    </a>
                  ) : (
                    <span className="text-muted-foreground shrink-0 max-w-[120px] truncate">
                      {part}
                    </span>
                  )}
                </React.Fragment>
              ))}
            </div>
            <TooltipProvider delayDuration={200} disableHoverableContent>
              <div className="flex shrink-0 items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const path = decodeURIComponent(fileUrl.replace(/^file:\/\/\//, "/"))
                        void navigator.clipboard.writeText(path).then(() => {
                          setCopied(true)
                          setTimeout(() => setCopied(false), 1500)
                        })
                      }}
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      aria-label={copied ? "File path copied" : "Copy file path"}>
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" sideOffset={8} className="text-xs">
                    {copied ? "File path copied" : "Copy file path"}
                  </TooltipContent>
                </Tooltip>
                {!isAddressBarSynced && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => navigateTabToFile(fileUrl)}
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        aria-label={`Sync URL to ${currentFileName}`}>
                        <Link2 size={14} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="bottom"
                      sideOffset={8}
                      style={{
                        maxWidth: "20rem",
                        overflowWrap: "anywhere",
                        whiteSpace: "normal",
                      }}
                      className="text-xs leading-relaxed">
                      Update the address bar from {addressBarFileName} to {currentFileName}
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </TooltipProvider>
          </nav>
          {sourceVisible && saveState !== "idle" && (
            <div
              className="flex shrink-0 items-center gap-2"
              aria-live={saveState === "error" ? "assertive" : "polite"}>
              {saveState === "unsaved" && (
                <span className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-amber-500"
                    aria-hidden="true"
                  />
                  Unsaved
                </span>
              )}
              {saveState === "error" && (
                <span className="text-xs font-medium text-red-600 dark:text-red-400">
                  Save failed
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  cancelScheduledSave()
                  void doSave(draftRef.current, fileUrl)
                }}
                disabled={saveState === "saving" || saveState === "saved"}
                className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1 text-xs font-medium transition-[background-color,border-color,color,transform] active:scale-[0.98] disabled:active:scale-100 ${
                  saveState === "error"
                    ? "border-red-400 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                    : saveState === "saving"
                      ? "cursor-not-allowed border-border text-muted-foreground"
                      : saveState === "saved"
                        ? "border-emerald-500/40 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                        : "border-zinc-900 bg-zinc-900 text-white hover:bg-zinc-800 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
                }`}>
                {saveState === "saving"
                  ? "Saving…"
                  : saveState === "saved"
                    ? <><Check size={12} />Saved</>
                    : saveState === "error"
                      ? "Retry"
                      : "Save"}
              </button>
            </div>
          )}
          <Button
            ref={reloadTriggerRef}
            type="button"
            variant="ghost"
            onClick={requestReloadFromDisk}
            disabled={reloadLoading || content === null || saveState === "saving"}
            className="h-8 shrink-0 gap-1.5 px-2 text-xs"
            title="Reload current file from disk"
            aria-label="Reload from disk">
            <RefreshCw size={14} className={reloadLoading ? "animate-spin" : ""} />
            {reloadLoading ? "Reloading…" : "Reload"}
          </Button>
          {reloadNoticeOpen && !hasReloadChanges && (
            <span role="status" aria-live="polite" className="shrink-0 text-xs text-muted-foreground">
              {reloadComparison ? "No changes on disk" : "Reloaded from disk"}
            </span>
          )}
          {hasReloadChanges && (
            <div className="flex shrink-0 items-center gap-2">
              <label
                className={`flex h-8 cursor-pointer items-center gap-1.5 rounded-md border px-2 text-xs font-medium transition-colors ${
                  changesVisible
                    ? "border-transparent bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
                title="Show text added and removed since the last reload. Added text is green, removed text is struck through in red.">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 cursor-pointer"
                  checked={changesVisible}
                  onChange={(event) => {
                    closeSelectionComposer()
                    setShowChanges(event.target.checked)
                    if (event.target.checked && !previewVisible) selectMode("preview")
                  }}
                />
                Show changes
              </label>
              <div className="flex items-center overflow-hidden rounded-md border">
                <Button
                  type="button"
                  variant="ghost"
                  className="h-7 gap-1.5 rounded-none px-2 text-xs"
                  title="Done reviewing the changes"
                  onClick={dismissReloadChanges}>
                  <Check size={14} />
                  Done
                </Button>
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-6 rounded-none border-l"
                      aria-label="Done options">
                      <ChevronDown size={14} />
                    </Button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content
                      align="end"
                      sideOffset={8}
                      style={{ minWidth: "13rem", zIndex: 100000 }}
                      className="rounded-md border bg-background p-1 text-foreground shadow-md">
                      <DropdownMenu.Item
                        className="flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground"
                        onSelect={dismissReloadChanges}>
                        <Check size={14} />
                        Done
                      </DropdownMenu.Item>
                      {review && (
                        <DropdownMenu.Item
                          className="flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground"
                          onSelect={() => {
                            clearReview()
                            dismissReloadChanges()
                          }}>
                          <Trash2 size={14} />
                          Done and clear comments
                        </DropdownMenu.Item>
                      )}
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              </div>
            </div>
          )}
          {isMdFile && (
            <div
              role="group"
              aria-label="Markdown display mode"
              className="flex items-center overflow-hidden rounded-md border text-xs font-medium">
              {([
                ["preview", "Preview", Eye],
                ["source", "Source", Pencil],
                ["split", "Split", Columns2],
              ] as const).map(([nextMode, label, Icon], index) => (
                <button
                  key={nextMode}
                  type="button"
                  onClick={() => selectMode(nextMode)}
                  title={label}
                  aria-label={`${label} mode`}
                  aria-pressed={mode === nextMode}
                  className={`flex items-center gap-1.5 px-2.5 py-1 transition-colors ${
                    index > 0 ? "border-l" : ""
                  } ${
                    mode === nextMode
                      ? "bg-accent text-foreground"
                      : "hover:bg-accent/50"
                  }`}>
                  <Icon size={13} strokeWidth={1.8} />
                  <span className="hidden lg:inline">{label}</span>
                </button>
              ))}
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              const el = document.documentElement
              const nextDark = !dark
              el.classList.add("theme-switching")
              followsSystemThemeRef.current = false
              setDark(nextDark)
              void setThemePreference(nextDark).catch(() => undefined)
              requestAnimationFrame(() =>
                requestAnimationFrame(() => el.classList.remove("theme-switching"))
              )
            }}
            className="h-7 w-7"
            aria-label="Toggle theme">
            {dark ? <Sun size={14} /> : <Moon size={14} />}
          </Button>
          {isMdFile && (
            <Button
              ref={reviewTriggerRef}
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => {
                if (reviewOverlayOpen) {
                  closeReviewOverlay()
                } else {
                  setReviewOverlayOpen(true)
                }
              }}
              className={`relative h-7 w-7 ${reviewOverlayOpen ? "bg-accent" : ""}`}
              aria-label={reviewItemCount > 0
                ? `Toggle Review, ${reviewItemCount} ${reviewItemCount === 1 ? "item" : "items"}`
                : "Toggle Review"}
              aria-pressed={reviewOverlayOpen}
              aria-expanded={reviewOverlayOpen}
              aria-controls="markside-review-overlay"
              title="Review">
              <MessageSquare size={16} />
              {reviewItemCount > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute -right-1.5 -top-1.5 min-w-4 rounded-full bg-foreground px-1 text-center text-[9px] font-semibold leading-4 text-background tabular-nums">
                  {reviewItemCount > 99 ? "99+" : reviewItemCount}
                </span>
              )}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOutlineOpen((o) => !o)}
            className={`h-7 w-7 ${outlineOpen ? "bg-accent" : ""}`}
            aria-label="Toggle outline"
            aria-pressed={outlineOpen}>
            <TableOfContents size={16} />
          </Button>
          {isMdFile && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={content === null}
              onClick={requestLinkSnapshot}
              className="h-7 w-7"
              aria-label="Create Share Link">
              <Share2 size={14} />
            </Button>
          )}
          {isMdFile && <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <Button
                ref={fileMenuTriggerRef}
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                aria-label="File actions"
                title="File actions">
                <MoreHorizontal size={16} />
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={8}
                onPointerDownCapture={() => {
                  fileMenuPointerInteractionRef.current = true
                }}
                onCloseAutoFocus={(event) => {
                  if (!fileMenuPointerInteractionRef.current) return
                  fileMenuPointerInteractionRef.current = false
                  event.preventDefault()
                  fileMenuTriggerRef.current?.blur()
                }}
                style={{ minWidth: "11rem", zIndex: 100000 }}
                className="rounded-md border bg-background p-1 text-foreground shadow-md">
                {isMdFile && previewVisible && (
                  <DropdownMenu.CheckboxItem checked={previewFullWidth}
                    onCheckedChange={(checked) => {
                      setPreviewFullWidth(checked)
                      void setPaneFullWidth("preview", checked).catch(() => undefined)
                    }}
                    className="group flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent">
                    <MoveHorizontal size={14} className="w-3.5 shrink-0" />
                    Full width
                    <span className="ml-auto flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[3px] border border-muted-foreground/50 transition-colors group-data-[state=checked]:border-foreground group-data-[state=checked]:bg-foreground group-data-[state=checked]:text-background">
                      <DropdownMenu.ItemIndicator><Check size={11} strokeWidth={3} /></DropdownMenu.ItemIndicator>
                    </span>
                  </DropdownMenu.CheckboxItem>
                )}
                {isMdFile && previewVisible && (
                  <DropdownMenu.CheckboxItem checked={numberHeadings}
                    onCheckedChange={(checked) => {
                      setNumberHeadings(checked)
                      void chrome.storage.local.set({ numberHeadings: checked })
                    }}
                    className="group flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent">
                    <span aria-hidden="true" className="w-3.5 shrink-0 text-center font-mono text-[10px] font-medium leading-none">1.2</span>
                    Number headings
                    <span className="ml-auto flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[3px] border border-muted-foreground/50 transition-colors group-data-[state=checked]:border-foreground group-data-[state=checked]:bg-foreground group-data-[state=checked]:text-background">
                      <DropdownMenu.ItemIndicator><Check size={11} strokeWidth={3} /></DropdownMenu.ItemIndicator>
                    </span>
                  </DropdownMenu.CheckboxItem>
                )}
                {READABILITY_CHECK_ENABLED && isMdFile && previewVisible && (
                  <DropdownMenu.CheckboxItem checked={readabilityControlsVisible}
                    onCheckedChange={(checked) => {
                      setReadabilityControlsVisible(checked)
                      void chrome.storage.local.set({ readabilityControlsVisible: checked })
                    }}
                    className="group flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent">
                    <BookOpen size={14} aria-hidden="true" className="w-3.5 shrink-0" />
                    Show readability buttons
                    <span className="ml-auto flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[3px] border border-muted-foreground/50 transition-colors group-data-[state=checked]:border-foreground group-data-[state=checked]:bg-foreground group-data-[state=checked]:text-background">
                      <DropdownMenu.ItemIndicator><Check size={11} strokeWidth={3} /></DropdownMenu.ItemIndicator>
                    </span>
                  </DropdownMenu.CheckboxItem>
                )}
                {isMdFile && previewVisible && content !== null && (
                  <DropdownMenu.Item
                    className="flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground"
                    onSelect={() => void copyRenderedPreview()}>
                    <Copy size={14} />
                    Copy rendered content
                  </DropdownMenu.Item>
                )}
                {isPdfExportable && (
                  <DropdownMenu.Item
                    className="flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground"
                    onSelect={requestPdfExport}>
                    <Printer size={14} />
                    Print or save as PDF
                  </DropdownMenu.Item>
                )}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>}
        </header>
    </>
  )
}
