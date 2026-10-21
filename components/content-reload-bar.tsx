import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import { Check, ChevronDown, RefreshCw, Trash2 } from "lucide-react"
import React from "react"
import { Button } from "~components/ui/button"
import type { ActiveReview } from "~lib/review"
import type { MarkdownMode } from "~lib/markdown-mode"

interface Props {
  diskChanged: boolean
  reloadLoading: boolean
  requestReloadFromDisk: () => void
  reloadNoticeOpen: boolean
  hasReloadChanges: boolean
  reloadComparison: { before: string; after: string } | null
  changesVisible: boolean
  closeSelectionComposer: () => void
  setShowChanges: React.Dispatch<React.SetStateAction<boolean>>
  previewVisible: boolean
  selectMode: (mode: MarkdownMode) => void
  dismissReloadChanges: () => void
  review: ActiveReview | null
  clearReview: () => void
  disabled: boolean
}

export function ContentReloadBar({
  diskChanged, reloadLoading, requestReloadFromDisk, reloadNoticeOpen,
  hasReloadChanges, reloadComparison, changesVisible, closeSelectionComposer,
  setShowChanges, previewVisible, selectMode, dismissReloadChanges, review, clearReview, disabled,
}: Props) {
  return (
    <div aria-label="Document changes" className="pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-3 rounded-xl border bg-background px-3 py-2 text-foreground shadow-lg">
      {diskChanged ? (
        <>
          <span role="status" className="text-xs text-muted-foreground">Document changed on disk</span>
          <Button size="sm" onClick={requestReloadFromDisk} disabled={disabled || reloadLoading}>
            <RefreshCw size={14} className={reloadLoading ? "animate-spin" : ""} aria-hidden="true" />
            {reloadLoading ? "Reloading…" : "Reload"}
          </Button>
        </>
      ) : hasReloadChanges ? (
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
      ) : reloadLoading ? (
        <span role="status" className="text-xs text-muted-foreground">Reloading…</span>
      ) : reloadNoticeOpen ? (
        <span role="status" className="text-xs text-muted-foreground">{reloadComparison ? "No changes on disk" : "Reloaded from disk"}</span>
      ) : null}
    </div>
  )
}
