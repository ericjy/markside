import { t } from "~lib/i18n"
import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import {
  BookOpen,
  Check,
  ChevronRight,
  Columns2,
  Copy,
  Eye,
  Link2,
  Maximize2,
  Minimize2,
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
  Type
} from "lucide-react"
import React from "react"
import { ZEN_MODE_SHORTCUT } from "~components/content-zen-mode"
import { Button } from "~components/ui/button"
import { Separator } from "~components/ui/separator"
import {
  SidebarTrigger
} from "~components/ui/sidebar"
import { Tooltip,TooltipContent,TooltipProvider,TooltipTrigger } from "~components/ui/tooltip"
import {
  setPreviewWidthPreference,
  type PreviewWidth,
  type MarkdownMode
} from "~lib/markdown-mode"
import { READABILITY_CHECK_ENABLED } from "~lib/readability-service"
import { setTypeface, TYPEFACES, type Typeface } from "~lib/typeface"
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
  diskChanged: boolean
  previewVisible: boolean
  selectMode: (nextMode: MarkdownMode) => void
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
  reviewNotice?: { kind: "reply" | "error"; message: string }
  chooseOutlineOpen: (open: boolean) => void
  outlineOpen: boolean
  requestLinkSnapshot: () => void
  fileMenuTriggerRef: React.MutableRefObject<HTMLButtonElement | null>
  fileMenuPointerInteractionRef: React.MutableRefObject<boolean>
  previewWidth: PreviewWidth
  setPreviewWidth: React.Dispatch<React.SetStateAction<PreviewWidth>>
  typeface: Typeface
  numberHeadings: boolean
  setNumberHeadings: React.Dispatch<React.SetStateAction<boolean>>
  headingsAlreadyNumbered: boolean
  readabilityControlsVisible: boolean
  setReadabilityControlsVisible: React.Dispatch<React.SetStateAction<boolean>>
  copyRenderedPreview: () => Promise<void>
  isPdfExportable: boolean
  requestPdfExport: () => void
  zenMode: boolean
  setZenMode: (zenMode: boolean) => void
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
  diskChanged,
  previewVisible,
  selectMode,
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
  reviewNotice,
  chooseOutlineOpen,
  outlineOpen,
  requestLinkSnapshot,
  fileMenuTriggerRef,
  fileMenuPointerInteractionRef,
  previewWidth,
  setPreviewWidth,
  typeface,
  numberHeadings,
  setNumberHeadings,
  headingsAlreadyNumbered,
  readabilityControlsVisible,
  setReadabilityControlsVisible,
  copyRenderedPreview,
  isPdfExportable,
  requestPdfExport,
  zenMode,
  setZenMode,
}: ContentToolbarProps) {
  return (
    <>
        <header data-markside-toolbar className="flex h-12 shrink-0 items-center gap-2 border-b px-4 dark:bg-sidebar">
          <>
            {/* Zen mode keeps the file tree hidden, so its toggle becomes the way out. */}
            {zenMode ? (
              <Button variant="ghost" size="icon" className="-ml-1 h-7 w-7" onClick={() => setZenMode(false)}
                aria-label={t("Exit Zen mode")} title={t("Exit Zen mode ({0})", [ZEN_MODE_SHORTCUT])}>
                <Minimize2 size={16} />
              </Button>
            ) : (
              <SidebarTrigger className={`-ml-1 ${leftOpen ? "bg-accent" : ""}`}
                aria-label={leftOpen ? t("Hide file tree") : t("Show file tree")} title={leftOpen ? t("Hide file tree") : t("Show file tree")} />
            )}
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
                      aria-label={copied ? t("File path copied") : t("Copy file path")}>
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" sideOffset={8} className="text-xs">
                    {copied ? t("File path copied") : t("Copy file path")}
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
                        aria-label={t("Sync URL to {0}", [currentFileName])}>
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
                      {t("Update the address bar from ")}{addressBarFileName} {t(" to ")}{currentFileName}
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
                  {t("Unsaved")}</span>
              )}
              {saveState === "error" && (
                <span className="text-xs font-medium text-red-600 dark:text-red-400">
                  {t("Save failed")}</span>
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
                  ? t("Saving…")
                  : saveState === "saved"
                    ? <><Check size={12} />{t("Saved")}</>
                    : saveState === "error"
                      ? t("Retry")
                      : t("Save")}
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
            title={diskChanged ? t("This file changed on disk. Reload to see the changes.") : t("Reload current file from disk")}
            aria-label={t("Reload from disk")}>
            <RefreshCw size={14} className={reloadLoading ? "animate-spin" : ""} />
            {reloadLoading ? t("Reloading…") : t("Reload")}
          </Button>

          {isMdFile && (
            <div
              role="group"
              aria-label={t("Markdown display mode")}
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
                  title={t(label)}
                  aria-label={t("{0} mode", [t(label)])}
                  aria-pressed={mode === nextMode}
                  className={`flex items-center gap-1.5 px-2.5 py-1 transition-colors ${
                    index > 0 ? "border-l" : ""
                  } ${
                    mode === nextMode
                      ? "bg-accent text-foreground"
                      : "hover:bg-accent/50"
                  }`}>
                  <Icon size={13} strokeWidth={1.8} />
                  <span className="hidden lg:inline">{t(label)}</span>
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
            aria-label={t("Toggle theme")}>
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
              aria-label={reviewNotice ? t("Toggle Review, {0}", [t(reviewNotice.message)]) : reviewItemCount > 0
                ? t("Toggle Review, {0}", [t(reviewItemCount === 1 ? "{0} item" : "{0} items", [reviewItemCount])])
                : t("Toggle Review")}
              aria-pressed={reviewOverlayOpen}
              aria-expanded={reviewOverlayOpen}
              aria-controls="markside-review-overlay"
              title={reviewNotice ? t("Review: {0}", [t(reviewNotice.message)]) : t("Review")}>
              <MessageSquare size={16} />
              {(reviewItemCount > 0 || reviewNotice) && (
                <span
                  aria-hidden="true"
                  className={`absolute -right-1.5 -top-1.5 min-w-4 rounded-full px-1 text-center text-[9px] font-semibold leading-4 tabular-nums ${reviewNotice?.kind === "error" ? "bg-destructive text-destructive-foreground" : reviewNotice?.kind === "reply" ? "bg-emerald-700 text-white dark:bg-emerald-400 dark:text-emerald-950" : "bg-foreground text-background"}`}>
                  {reviewNotice?.kind === "error" ? "!" : reviewItemCount > 99 ? "99+" : reviewItemCount || "•"}
                </span>
              )}
              {!reviewOverlayOpen && <span role="status" className="sr-only">{reviewNotice && t(reviewNotice.message)}</span>}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => chooseOutlineOpen(!outlineOpen)}
            className={`h-7 w-7 ${outlineOpen ? "bg-accent" : ""}`}
            aria-label={t("Toggle outline")}
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
              aria-label={t("Create Share Link")}>
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
                aria-label={t("File actions")}
                title={t("File actions")}>
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
                  <DropdownMenu.Sub>
                    <DropdownMenu.SubTrigger className="flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent data-[state=open]:bg-accent">
                      <Type size={14} className="mr-2 w-3.5 shrink-0" />
                      {t("Typeface")}<span className="ml-auto pl-4 text-xs text-muted-foreground">{t(TYPEFACES[typeface].label)}</span>
                      <ChevronRight size={14} className="shrink-0 text-muted-foreground" />
                    </DropdownMenu.SubTrigger>
                    <DropdownMenu.Portal>
                      <DropdownMenu.SubContent sideOffset={4} alignOffset={-4}
                        style={{ minWidth: "10rem", zIndex: 100000 }}
                        className="rounded-md border bg-background p-1 text-foreground shadow-md">
                        <DropdownMenu.RadioGroup value={typeface} aria-label={t("Typeface")}
                          onValueChange={(value) => void setTypeface(value as Typeface).catch(() => undefined)}>
                          {(Object.keys(TYPEFACES) as Typeface[]).map(id => (
                            <DropdownMenu.RadioItem key={id} value={id}
                              style={{ fontFamily: TYPEFACES[id].stack }}
                              className="flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent">
                              {t(TYPEFACES[id].label)}
                              <span className="ml-auto flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                                <DropdownMenu.ItemIndicator><Check size={13} strokeWidth={2.5} /></DropdownMenu.ItemIndicator>
                              </span>
                            </DropdownMenu.RadioItem>
                          ))}
                        </DropdownMenu.RadioGroup>
                      </DropdownMenu.SubContent>
                    </DropdownMenu.Portal>
                  </DropdownMenu.Sub>
                )}
                {isMdFile && previewVisible && (
                  <DropdownMenu.Sub>
                    <DropdownMenu.SubTrigger className="flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent data-[state=open]:bg-accent">
                      <MoveHorizontal size={14} className="mr-2 w-3.5 shrink-0" />
                      {t("Page width")}<span className="ml-auto pl-4 text-xs text-muted-foreground">
                        {previewWidth === "standard" ? t("Standard") : previewWidth === "extended" ? t("Extended") : t("Full width")}
                      </span>
                      <ChevronRight size={14} className="shrink-0 text-muted-foreground" />
                    </DropdownMenu.SubTrigger>
                    <DropdownMenu.Portal>
                      <DropdownMenu.SubContent sideOffset={4} alignOffset={-4}
                        style={{ minWidth: "10rem", zIndex: 100000 }}
                        className="rounded-md border bg-background p-1 text-foreground shadow-md">
                        <DropdownMenu.RadioGroup value={previewWidth} aria-label={t("Page width")}
                          onValueChange={(value) => {
                            const width = value as PreviewWidth
                            setPreviewWidth(width)
                            void setPreviewWidthPreference(width).catch(() => undefined)
                          }}>
                          {([
                            ["standard", "Standard"],
                            ["extended", "Extended"],
                            ["full", "Full width"],
                          ] as const).map(([width, label]) => (
                            <DropdownMenu.RadioItem key={width} value={width}
                              className="flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent">
                              {t(label)}
                              <span className="ml-auto flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                                <DropdownMenu.ItemIndicator><Check size={13} strokeWidth={2.5} /></DropdownMenu.ItemIndicator>
                              </span>
                            </DropdownMenu.RadioItem>
                          ))}
                        </DropdownMenu.RadioGroup>
                      </DropdownMenu.SubContent>
                    </DropdownMenu.Portal>
                  </DropdownMenu.Sub>
                )}
                {isMdFile && previewVisible && (
                  <DropdownMenu.CheckboxItem checked={numberHeadings} disabled={headingsAlreadyNumbered}
                    title={headingsAlreadyNumbered ? t("This document numbers its own headings.") : undefined}
                    onCheckedChange={(checked) => {
                      setNumberHeadings(checked)
                      void chrome.storage.local.set({ numberHeadings: checked })
                    }}
                    className="group flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent data-[disabled]:cursor-default data-[disabled]:text-muted-foreground">
                    <span aria-hidden="true" className="mr-2 w-3.5 shrink-0 text-center font-mono text-[10px] font-medium leading-none">1.2</span>
                    {t("Number headings")}{headingsAlreadyNumbered
                      ? <span className="ml-auto pl-4 text-xs">{t("Already numbered")}</span>
                      : <span className="ml-auto flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[3px] border border-muted-foreground/50 transition-colors group-data-[state=checked]:border-foreground group-data-[state=checked]:bg-foreground group-data-[state=checked]:text-background">
                          <DropdownMenu.ItemIndicator><Check size={11} strokeWidth={3} /></DropdownMenu.ItemIndicator>
                        </span>}
                  </DropdownMenu.CheckboxItem>
                )}
                {READABILITY_CHECK_ENABLED && isMdFile && previewVisible && (
                  <DropdownMenu.CheckboxItem checked={readabilityControlsVisible}
                    onCheckedChange={(checked) => {
                      setReadabilityControlsVisible(checked)
                      void chrome.storage.local.set({ readabilityControlsVisible: checked })
                    }}
                    className="group flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent">
                    <BookOpen size={14} aria-hidden="true" className="mr-2 w-3.5 shrink-0" />
                    {t("Show readability buttons")}<span className="ml-auto flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[3px] border border-muted-foreground/50 transition-colors group-data-[state=checked]:border-foreground group-data-[state=checked]:bg-foreground group-data-[state=checked]:text-background">
                      <DropdownMenu.ItemIndicator><Check size={11} strokeWidth={3} /></DropdownMenu.ItemIndicator>
                    </span>
                  </DropdownMenu.CheckboxItem>
                )}
                <DropdownMenu.Item
                  className="flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground"
                  onSelect={() => setZenMode(!zenMode)}>
                  {zenMode ? <Minimize2 size={14} className="mr-2 shrink-0" /> : <Maximize2 size={14} className="mr-2 shrink-0" />}
                  {zenMode ? t("Exit Zen mode") : t("Zen mode")}
                  <kbd className="ml-auto pl-4 font-mono text-xs text-muted-foreground">{ZEN_MODE_SHORTCUT}</kbd>
                </DropdownMenu.Item>
                {isMdFile && previewVisible && content !== null && (
                  <DropdownMenu.Item
                    className="flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground"
                    onSelect={() => void copyRenderedPreview()}>
                    <Copy size={14} className="mr-2 shrink-0" />
                    {t("Copy rendered content")}</DropdownMenu.Item>
                )}
                {isPdfExportable && (
                  <DropdownMenu.Item
                    className="flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground"
                    onSelect={requestPdfExport}>
                    <Printer size={14} className="mr-2 shrink-0" />
                    {t("Print or save as PDF")}</DropdownMenu.Item>
                )}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>}
        </header>
    </>
  )
}
