import { t } from "~lib/i18n"
import React, { useEffect, useId, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Check, ChevronLeft, ChevronRight, CircleAlert, Eye, EyeOff, Highlighter, MessageSquarePlus, RefreshCw, Trash2, X } from "lucide-react"

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~components/ui/tooltip"

import {
  countWeakReadabilityScores,
  groupReadabilityFindings,
  locatableLowDimensions,
  READABILITY_DIMENSIONS,
  READABILITY_MAX_SCORE,
  readabilityBand,
  readabilityBandLabel,
  scoredReadabilityDimensions,
  type ReadabilityDimension,
  type ReadabilityFinding,
  type ReadabilityFormat,
  type ReadabilityResult,
  type ReadabilitySection,
} from "~lib/readability"
import {
  addBlockTag,
  clearActiveRange,
  clearFindingRanges,
  markActiveRange,
  findSentenceRange,
  plainSentenceText,
  revealRange,
  sectionElements,
  setFindingRanges,
} from "~lib/readability-highlight"

const formatName: Record<ReadabilityFormat, string> = { list: "List", table: "Table", diagram: "Diagram" }
// Only one panel is open at a time, since they all sit in the same corner.
const PANEL_OPENED = "readability-panel-opened"

const dimensionName = (key: ReadabilityDimension) => t(READABILITY_DIMENSIONS.find(([dimension]) => dimension === key)?.[1] ?? key)

export function ReadabilityHeadingControl({ section, result, status, wholeDocument, consentGranted, onConsent, onCheck, onLocate, onComment, onRemove }: {
  section: ReadabilitySection
  result: ReadabilityResult | null
  status: "current" | "outdated" | null
  wholeDocument: boolean
  consentGranted: boolean
  onConsent: () => void
  onCheck: (section: ReadabilitySection) => Promise<void>
  onLocate: (section: ReadabilitySection, result: ReadabilityResult, dimensions: ReadabilityDimension[]) => Promise<void>
  onComment: (section: ReadabilitySection, result: ReadabilityResult) => void
  onRemove: (result: ReadabilityResult) => void
}) {
  const [open, setOpen] = useState(false)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [locating, setLocating] = useState(false)
  // While the panel is open only the current item is marked, unless the user asks for all.
  const [showAll, setShowAll] = useState(false)
  const root = useRef<HTMLSpanElement>(null)
  const [filter, setFilter] = useState<ReadabilityDimension | null>(null)
  // Which flagged item the panel is showing.
  const [index, setIndex] = useState(0)
  const popover = useRef<HTMLSpanElement>(null)
  const ranges = useRef(new Map<string, Range>())
  const [located, setLocated] = useState<ReadonlySet<string>>(new Set())
  const panelId = useId()
  const highlightOwner = useId()
  const findings = result?.findings
  // The list follows the document, and can be narrowed to one dimension.
  const visibleGroups = useMemo(() => {
    const position = (sentence: string) => {
      const index = section.source.indexOf(sentence)
      return index < 0 ? Number.MAX_SAFE_INTEGER : index
    }
    return groupReadabilityFindings((findings ?? []).filter((finding) => !filter || finding.dimension === filter))
      .sort((a, b) => position(a.sentence) - position(b.sentence))
  }, [findings, filter, section.source])
  const position = Math.min(index, Math.max(visibleGroups.length - 1, 0))
  const current = visibleGroups[position]
  const currentSentence = current?.sentence
  const sentenceCounts = useMemo(() => {
    const sentences = new Map<ReadabilityDimension, Set<string>>()
    for (const finding of findings ?? []) {
      sentences.set(finding.dimension, (sentences.get(finding.dimension) ?? new Set()).add(finding.sentence))
    }
    return sentences
  }, [findings])
  useEffect(() => {
    ranges.current = new Map()
    const heading = root.current?.closest("h1,h2,h3,h4,h5,h6") as HTMLElement | null
    // Marks belong to the open panel: closing it takes them off the page.
    if (!heading || status !== "current" || !findings?.length || !open) {
      setLocated((previous) => previous.size ? new Set() : previous)
      return
    }
    const elements = sectionElements(heading)
    for (const finding of findings) {
      if (ranges.current.has(finding.sentence)) continue
      const range = findSentenceRange(elements, plainSentenceText(finding.sentence))
      if (range) ranges.current.set(finding.sentence, range)
    }
    setLocated(new Set(ranges.current.keys()))
    const removers: Array<() => void> = []
    const marked = findings.filter((finding) => {
      if (filter && finding.dimension !== filter) return false
      // Mark only the item being looked at, unless every mark was asked for.
      return showAll || finding.sentence === currentSentence
    })
    {
      const byDimension = new Map<string, Range[]>()
      for (const finding of marked) {
        const range = ranges.current.get(finding.sentence)
        if (!range) continue
        byDimension.set(finding.dimension, [...(byDimension.get(finding.dimension) ?? []), range])
      }
      setFindingRanges(highlightOwner, byDimension)
      for (const finding of marked) {
        const range = ranges.current.get(finding.sentence)
        if (!range || !finding.suggested) continue
        const block = elements.find((element) => element.contains(range.startContainer))
        if (block) removers.push(addBlockTag(block, t("Prose → {0}", [t(formatName[finding.suggested])])))
      }
    }
    return () => {
      for (const remove of removers) remove()
      clearFindingRanges(highlightOwner)
    }
  }, [findings, status, open, showAll, currentSentence, filter, highlightOwner])
  // Clicking elsewhere closes the panel until there are findings to work through.
  useEffect(() => {
    if (!open || findings?.length) return
    const close = (event: PointerEvent) => {
      const target = event.target as Node
      if (!root.current?.contains(target) && !popover.current?.contains(target)) setOpen(false)
    }
    document.addEventListener("pointerdown", close)
    return () => document.removeEventListener("pointerdown", close)
  }, [open, findings])
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false) }
    const onOtherOpened = (event: Event) => { if ((event as CustomEvent<string>).detail !== panelId) setOpen(false) }
    document.addEventListener("keydown", onKey)
    window.addEventListener(PANEL_OPENED, onOtherOpened)
    window.dispatchEvent(new CustomEvent(PANEL_OPENED, { detail: panelId }))
    return () => {
      document.removeEventListener("keydown", onKey)
      window.removeEventListener(PANEL_OPENED, onOtherOpened)
      clearActiveRange()
    }
  }, [open, panelId])

  const weak = result ? countWeakReadabilityScores(result.scores) : 0
  const weakSummary = weak === 0 ? t("No dimensions need work") : weak === 1 ? t("1 dimension needs work") : t("{0} dimensions need work", [weak])
  const noun = wholeDocument ? t("Document readability") : t("Readability")
  // With a result the pill shows an icon (not a count): an alert when something is low, a tick when not.
  const label: React.ReactNode = status === "outdated"
    ? t("Readability · Outdated")
    : result
      ? <>{noun}<span className="readability-pill-icon" data-state={weak ? "issues" : "clear"} aria-hidden="true">
        {weak ? <CircleAlert size={13} /> : <Check size={13} />}
      </span></>
      : wholeDocument ? t("Check document readability") : t("Check readability")
  const description = status === "outdated"
    ? t("Readability result outdated")
    : result ? weakSummary : t("Check readability of {0}", [section.path.at(-1)])
  const check = async () => {
    setChecking(true)
    setError(null)
    try { await onCheck(section) }
    catch (cause) { setError(cause instanceof Error ? cause.message : t("Readability Check failed")) }
    finally { setChecking(false) }
  }
  const lowDimensions = result ? locatableLowDimensions(result.scores) : []
  const locate = async () => {
    if (!result) return
    setLocating(true)
    setError(null)
    try { await onLocate(section, result, lowDimensions) }
    catch (cause) { setError(cause instanceof Error ? cause.message : t("Locating sentences failed")) }
    finally { setLocating(false) }
  }
  // Room to keep clear at the bottom of the window: the panel's height, so the marked text
  // scrolls into the free area above it.
  const clearance = () => Math.min((popover.current?.offsetHeight ?? 0) + 40, window.innerHeight * 0.6)
  const goTo = (target: number) => {
    const group = visibleGroups[target]
    const range = group && ranges.current.get(group.sentence)
    if (!range) return false
    setIndex(target)
    revealRange(range, { persist: true, keepClear: clearance() })
    return true
  }
  // The nearest item in a direction that is actually in the page, or -1.
  const nearest = (direction: 1 | -1) => {
    for (let target = position + direction; target >= 0 && target < visibleGroups.length; target += direction) {
      if (ranges.current.has(visibleGroups[target].sentence)) return target
    }
    return -1
  }
  // A new check, a removed result, an edit, or another filter starts again from the first item.
  useEffect(() => { setIndex(0) }, [findings, status, filter])
  // The current item is marked more strongly while the panel is open.
  useEffect(() => {
    if (!open || !current) return
    const range = ranges.current.get(current.sentence)
    if (range) markActiveRange(range)
    else clearActiveRange()
  }, [open, current, located])
  const confirmAndCheck = () => {
    onConsent()
    void check()
  }
  const recheck = <button type="button" className="readability-action readability-recheck" disabled={checking}
    onClick={() => consentGranted ? void check() : confirmAndCheck()}>
    <RefreshCw size={13} aria-hidden="true" className={checking ? "readability-spinning" : ""} />
    {checking ? t("Checking…") : consentGranted ? t("Recheck") : t("Send section and recheck")}
  </button>
  const comment = result && <button type="button" className="readability-action readability-comment-action"
    disabled={status !== "current"} onClick={() => { onComment(section, result); setOpen(false) }}>
    <MessageSquarePlus size={14} aria-hidden="true" />
    {result.commentId ? t("Open section improvement comment") : t("Add section improvement comment")}
  </button>
  const remove = result && <button type="button" className="readability-action readability-remove"
    onClick={() => { onRemove(result); setOpen(false) }}>
    <Trash2 size={13} aria-hidden="true" />
    {t("Remove result")}</button>

  const previous = nearest(-1)
  const next = nearest(1)
  const found = current ? located.has(current.sentence) : false
  const block = current?.items[0].unit === "block"
  const suggested = current?.items.find((item) => item.suggested)?.suggested

  return <span ref={root} className="readability-control" onMouseUp={(event) => event.stopPropagation()}
    onKeyDown={(event) => {
      if (event.key === "Escape" && open) { setOpen(false); event.stopPropagation() }
    }}>
    <button type="button" className={`readability-pill ${status === "outdated" ? "is-outdated" : result ? weak ? "needs-work" : "is-clear" : ""}`} aria-label={description} title={description}
      aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? panelId : undefined} onClick={(event) => {
        event.stopPropagation()
        setOpen(!open)
      }}>
      {label}
    </button>
    {open && createPortal(<span ref={popover} id={panelId} className={`readability-popover ${result ? "" : "without-scores"}`} role="dialog" aria-label={wholeDocument ? t("Document readability") : t("Readability of {0}", [section.path.at(-1)])}
      onClick={(event) => event.stopPropagation()} onMouseUp={(event) => event.stopPropagation()}>
      <button type="button" className="readability-panel-close" aria-label={t("Close")} onClick={() => setOpen(false)}><X size={15} aria-hidden="true" /></button>
      <span className="readability-panel-header">
        <span className="readability-panel-brand">
          <span className="readability-panel-heading">
            <span className="readability-panel-title">{t("Readability Check")}</span>
            <span className="readability-panel-beta" style={{ textTransform: "none" }}>{t("Beta")}</span>
          </span>
          <span className="readability-panel-provider">{t("Powered by Jev, which receives this section's text.")}</span>
        </span>
      </span>
      {status === "outdated" && <span className="readability-outdated">{t("Section changed since this check.")}</span>}
      {result && <TooltipProvider delayDuration={200} disableHoverableContent><span className="readability-scores">{scoredReadabilityDimensions(result.scores).map(([key, name, judges, lowers]) => {
        const score = result.scores[key]
        const band = readabilityBand(score)
        const count = sentenceCounts.get(key as ReadabilityDimension)?.size ?? 0
        const filterable = count > 0
        return <span
          className={`readability-score ${band <= 1 ? "is-weak" : band === 2 ? "is-okay" : "is-strong"} ${band === 0 ? "is-poor" : ""} ${filterable ? "is-filterable" : ""} ${filter === key ? "is-filtered" : ""}`}
          key={key}
          onClick={filterable ? () => setFilter(filter === key ? null : key as ReadabilityDimension) : undefined}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="readability-score-label" tabIndex={0}>{t(name)}</span>
            </TooltipTrigger>
            <TooltipContent side="top" className="grid max-w-[280px] gap-1 border-transparent bg-neutral-950 text-xs text-white dark:border-white/15">
              <span>{judges}</span>
              <span className="text-white/70"><span className="font-medium text-white/90">{t("Lower when:")}</span> {lowers}</span>
            </TooltipContent>
          </Tooltip>
          <span className="readability-bar" aria-hidden="true">
            <span className="readability-bar-fill" style={{ width: `${Math.min(READABILITY_MAX_SCORE, Math.max(0, score)) / READABILITY_MAX_SCORE * 100}%` }} />
          </span>
          {filterable
            ? <button type="button" className="readability-score-value readability-score-filter" aria-pressed={filter === key}
              aria-label={t("{0}, {1} {2}. {3}", [t(readabilityBandLabel(score)), count, count === 1 ? t("sentence") : t("sentences"), filter === key ? t("Show all sentences") : t("Show only {0} sentences", [t(name)])])}>
              {t(readabilityBandLabel(score))}<span className="readability-score-count">{count}</span>
            </button>
            : <span className="readability-score-value">{t(readabilityBandLabel(score))}</span>}
        </span>
      })}</span></TooltipProvider>}
      {result && status === "current" && weak > 0 && <span className={`readability-where ${findings === undefined && lowDimensions.length > 0 ? "has-find-action" : ""}`}>
        {findings === undefined ? <>
          <button type="button" className="readability-action readability-locate-action" disabled={locating} onClick={() => void locate()}>
            {locating
              ? <RefreshCw size={13} aria-hidden="true" className="readability-spinning" />
              : <Highlighter size={14} aria-hidden="true" />}
            {locating ? t("Finding sentences…") : t("Find problem sentences")}
          </button>
        </> : findings.length === 0 ? <span className="readability-where-hint">
          {t("No single sentence stood out. The low scores come from the section as a whole.")}</span> : <>
          <span className="readability-where-header">
            <span className="readability-where-title">{t("Problems found")}</span>
            <button type="button" className="readability-where-toggle" onClick={() => setShowAll(!showAll)}
              aria-pressed={showAll}>
              {showAll ? <EyeOff size={12} aria-hidden="true" /> : <Eye size={12} aria-hidden="true" />}
              {showAll ? t("Only this one") : t("Show all marks")}
            </button>
          </span>
          {filter && <span className="readability-where-filter">
            {t("Showing ")}{dimensionName(filter)}{t(" only")}<button type="button" onClick={() => setFilter(null)}>{t("Show all")}</button>
          </span>}
          {current && <>
            <button type="button" className="readability-finding" disabled={!found}
              title={found ? t("Jump to this text") : t("This text is not visible in the page")} onClick={() => goTo(position)}>
              <span className="readability-finding-head">
                <span className="readability-finding-kind">{block ? t("Paragraph") : t("Sentence")}</span>
                {suggested && <span className="readability-format-change" aria-label={t("Prose, better as {0}", [t(formatName[suggested])])}>
                  <span className="readability-format-chip">{t("Prose")}</span>
                  <span className="readability-format-arrow" aria-hidden="true">→</span>
                  <span className="readability-format-chip is-suggested">{t(formatName[suggested])}</span>
                </span>}
              </span>
              <span className={`readability-finding-quote ${block ? "is-clamped" : ""}`}>{current.sentence.length > (block ? 240 : 140) ? `${current.sentence.slice(0, block ? 237 : 137)}…` : current.sentence}</span>
              <span className="readability-finding-reasons">{current.items.map((item) => <span key={item.violation} className="readability-finding-reason">
                <strong>{dimensionName(item.dimension)}</strong>{item.why}
              </span>)}</span>
            </button>
            <span className="readability-where-nav">
              <button type="button" className="readability-nav-button" onClick={() => goTo(previous)} disabled={previous < 0}><ChevronLeft size={14} aria-hidden="true" />{t("Previous")}</button>
              <button type="button" className="readability-nav-button" onClick={() => goTo(next)} disabled={next < 0}>{t("Next")}<ChevronRight size={14} aria-hidden="true" /></button>
              <span className="readability-where-position">{t("{0} of {1}", [position + 1, visibleGroups.length])}</span>
            </span>
          </>}
        </>}
      </span>}
      {error && <span className="readability-error" role="alert">{t(error)}</span>}
      <span className="readability-actions">
        {result ? <>
          {status === "outdated" ? recheck : comment}
          <span className={`readability-secondary-actions ${status === "outdated" ? "only-remove" : ""}`}>
            {status === "outdated" ? null : recheck}
            {remove}
          </span>
        </> : checking ? <span className="readability-checking"><RefreshCw size={14} className="readability-spinning" aria-hidden="true" />{t("Checking section…")}</span> : error ?
          <button type="button" className="readability-action readability-recheck" onClick={() => void check()}><RefreshCw size={13} aria-hidden="true" />{t("Try again")}</button> :
          <button type="button" className="readability-action readability-recheck" onClick={confirmAndCheck}>{t("Send section and check")}</button>}
      </span>
    </span>, document.body)}
  </span>
}
