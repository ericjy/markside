import { t, tPresetChip } from "~lib/i18n"
import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import { useEffect, useRef, useState, type ReactElement } from "react"

import {
  REVIEW_PRESET_GROUPS,
  REVIEW_PRESETS,
  searchReviewPresets,
  type ReviewPreset,
  type ReviewPresetGroup,
} from "~lib/review-presets"

const GROUP_LABELS: Record<ReviewPresetGroup, string> = {
  concision: "Concision",
  clarity: "Clarity",
  voice: "Voice",
  rigor: "Rigor",
  structure: "Structure",
  approval: "Approval",
}

interface ReviewPresetPickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  trigger: ReactElement
  onSelect: (preset: ReviewPreset) => void
}

export function ReviewPresetPicker({
  open,
  onOpenChange,
  trigger,
  onSelect,
}: ReviewPresetPickerProps) {
  const [query, setQuery] = useState("")
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const englishMatches = searchReviewPresets(query)
  const normalizedQuery = query.trim().toLocaleLowerCase()
  const matches = normalizedQuery
    ? [...englishMatches, ...REVIEW_PRESETS.filter((preset) => !englishMatches.includes(preset) &&
      `${tPresetChip(preset.chip)} ${t(preset.name)}`.toLocaleLowerCase().includes(normalizedQuery))]
    : englishMatches

  useEffect(() => setActiveIndex(0), [query])

  useEffect(() => {
    if (!open) return
    // Radix focuses a menu item during opening; search takes focus afterward.
    const frame = requestAnimationFrame(() => inputRef.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [open])

  const selectPreset = (preset: ReviewPreset) => {
    onSelect(preset)
    onOpenChange(false)
    setQuery("")
  }

  return (
    <DropdownMenu.Root
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) setQuery("")
      }}>
      <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={4}
          collisionPadding={12}
          style={{ zIndex: 100000 }}
          className="review-overlay w-[22rem] max-w-[calc(100vw-24px)] rounded-md border p-1 text-foreground shadow-md">
          <input
            ref={inputRef}
            aria-label={t("Search presets")}
            aria-activedescendant={matches[activeIndex] ? `review-preset-${matches[activeIndex].id}` : undefined}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              event.stopPropagation()
              if (event.key === "Escape") {
                event.preventDefault()
                onOpenChange(false)
              } else if (event.key === "ArrowDown" && matches.length > 0) {
                event.preventDefault()
                setActiveIndex((current) => (current + 1) % matches.length)
              } else if (event.key === "ArrowUp" && matches.length > 0) {
                event.preventDefault()
                setActiveIndex((current) => (current - 1 + matches.length) % matches.length)
              } else if (event.key === "Enter" && matches[activeIndex]) {
                event.preventDefault()
                selectPreset(matches[activeIndex])
              }
            }}
            placeholder={t("Search presets…")}
            className="review-input h-10 w-full border-b bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground"
          />
          <div className="max-h-80 overflow-y-auto p-1">
            {matches.length === 0 && (
              <p className="px-3 py-6 text-center text-xs text-muted-foreground">{t("No presets found.")}</p>
            )}
            {REVIEW_PRESET_GROUPS.map((group) => {
              const presets = matches.filter((preset) => preset.group === group)
              if (presets.length === 0) return null
              return (
                <DropdownMenu.Group key={group}>
                  <DropdownMenu.Label className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {t(GROUP_LABELS[group])}
                  </DropdownMenu.Label>
                  {presets.map((preset) => {
                    const index = matches.indexOf(preset)
                    return (
                      <DropdownMenu.Item
                        id={`review-preset-${preset.id}`}
                        key={preset.id}
                        aria-label={`${tPresetChip(preset.chip)}: ${t(preset.name)}`}
                        onPointerMove={() => setActiveIndex(index)}
                        onSelect={() => selectPreset(preset)}
                        className={index === activeIndex
                          ? "flex cursor-pointer select-none items-baseline gap-1.5 rounded-sm bg-accent px-2 py-2 text-sm text-accent-foreground outline-none"
                          : "flex cursor-pointer select-none items-baseline gap-1.5 rounded-sm px-2 py-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground"}>
                        <span className="font-semibold">{tPresetChip(preset.chip)}:</span>
                        <span>{t(preset.name)}</span>
                      </DropdownMenu.Item>
                    )
                  })}
                </DropdownMenu.Group>
              )
            })}
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
