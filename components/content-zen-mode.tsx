import React from "react"

export const ZEN_MODE_SHORTCUT = typeof navigator !== "undefined" && /Mac/.test(navigator.platform) ? "⌘." : "Ctrl+."

export function ContentZenModeEdge({ hintVisible, toolbarRevealed, pointerNearTop, rightInset, onReveal }: {
  hintVisible: boolean
  toolbarRevealed: boolean
  pointerNearTop: boolean
  rightInset: number
  onReveal: () => void
}) {
  return (
    <>
      {!toolbarRevealed && (
        <div aria-hidden="true" data-zen-edge className="absolute left-0 top-0 z-[59] flex h-3 justify-center print:hidden" style={{ right: rightInset }} onPointerEnter={onReveal}>
          <div data-zen-cue className={`mt-1.5 h-1 w-10 rounded-full motion-safe:transition-colors ${pointerNearTop ? "bg-foreground/25" : "bg-foreground/10"}`} />
        </div>
      )}
      {/* Only the hidden state transitions, so the hint appears at once and fades out. */}
      <div aria-hidden="true" className="pointer-events-none absolute left-0 top-4 z-[60] flex justify-center print:hidden" style={{ right: rightInset }}>
        <div className={`whitespace-nowrap rounded-full bg-foreground px-3 py-1.5 text-xs text-background shadow-md ${hintVisible ? "opacity-100" : "opacity-0 motion-safe:transition-opacity motion-safe:duration-300"}`}>
          Press Esc to exit Zen mode, or move to the top for the toolbar
        </div>
      </div>
      <p role="status" className="sr-only">{hintVisible ? "Zen mode on. Press Escape to exit." : ""}</p>
    </>
  )
}
