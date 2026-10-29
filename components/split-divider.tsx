import { t } from "~lib/i18n"
interface Props {
  previewPercent: number
  updateSplitFromClientX: (clientX: number) => void
  storeSplitPercent: () => void
  adjustSplitBy: (delta: number) => void
}

export function SplitDivider({
  previewPercent,
  updateSplitFromClientX,
  storeSplitPercent,
  adjustSplitBy,
}: Props) {
  return (
    <div
      data-markside-split-resizer
      role="separator"
      aria-label={t("Resize Source and Preview panes")}
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
  )
}
