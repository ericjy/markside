import { t } from "./i18n"

// A small index of Active Reviews kept in extension storage so the popover can
// list pending agent hand-offs across tabs.
//
// Reviews themselves stay where they are written: document Reviews in the page
// origin's IndexedDB, which the popover cannot read, and localhost Reviews in
// extension storage. Only counts and labels are mirrored here — never reviewed
// content.

export const REVIEW_INDEX_KEY = "reviewIndex"

export type ReviewIndexKind = "document" | "localhost"

export interface ReviewIndexEntry {
  kind: ReviewIndexKind
  key: string
  label: string
  detail: string
  itemCount: number
  updatedAt: string
}

export function resolveReviewIndex(value: unknown): ReviewIndexEntry[] {
  if (!Array.isArray(value)) return []
  return value.filter((entry): entry is ReviewIndexEntry =>
    Boolean(entry) &&
    typeof entry === "object" &&
    (entry.kind === "document" || entry.kind === "localhost") &&
    typeof entry.key === "string" &&
    typeof entry.label === "string" &&
    typeof entry.itemCount === "number" &&
    entry.itemCount > 0
  )
}

export function upsertReviewIndexEntry(
  entries: ReviewIndexEntry[],
  entry: ReviewIndexEntry,
): ReviewIndexEntry[] {
  const others = entries.filter(
    (candidate) => candidate.kind !== entry.kind || candidate.key !== entry.key,
  )
  if (entry.itemCount === 0) return others
  return [...others, entry]
}

export function removeReviewIndexEntry(
  entries: ReviewIndexEntry[],
  kind: ReviewIndexKind,
  key: string,
): ReviewIndexEntry[] {
  return entries.filter((entry) => entry.kind !== kind || entry.key !== key)
}

export function sortReviewIndex(entries: ReviewIndexEntry[]): ReviewIndexEntry[] {
  return [...entries].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
}

// Saved localhost Reviews stay in storage while that feature is off, but are not shown.
export function documentReviewEntries(entries: ReviewIndexEntry[]): ReviewIndexEntry[] {
  return entries.filter((entry) => entry.kind === "document")
}

export function getReviewIndexTotal(entries: ReviewIndexEntry[]) {
  return entries.reduce((total, entry) => total + entry.itemCount, 0)
}

export function getReviewBadgeText(entries: ReviewIndexEntry[]) {
  const total = getReviewIndexTotal(entries)
  if (total === 0) return ""
  return total > 99 ? "99+" : String(total)
}

// "/Users/a/docs/spec.md" reads better in the popover as its filename plus the
// directory that distinguishes it from another file of the same name.
export function describeDocumentReview(sourcePath: string) {
  const separator = sourcePath.lastIndexOf("/")
  return {
    label: separator === -1 ? sourcePath : sourcePath.slice(separator + 1),
    detail: separator <= 0 ? "" : sourcePath.slice(0, separator),
  }
}

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

export function describeReviewAge(updatedAt: string, now: number) {
  const elapsed = now - new Date(updatedAt).getTime()
  if (!Number.isFinite(elapsed) || elapsed < MINUTE) return t("just now")
  if (elapsed < HOUR) return t("{0} min ago", [Math.floor(elapsed / MINUTE)])
  if (elapsed < DAY) {
    const hours = Math.floor(elapsed / HOUR)
    return t(hours === 1 ? "{0} hour ago" : "{0} hours ago", [hours])
  }
  const days = Math.floor(elapsed / DAY)
  if (days === 1) return t("yesterday")
  if (days < 30) return t("{0} days ago", [days])
  return new Date(updatedAt).toISOString().slice(0, 10)
}
