import {
  removeReviewIndexEntry,
  resolveReviewIndex,
  REVIEW_INDEX_KEY,
  upsertReviewIndexEntry,
  type ReviewIndexEntry,
  type ReviewIndexKind,
} from "./review-index"

// Content scripts reach extension storage even though their IndexedDB belongs to
// the page origin, which is what lets a document Review appear in the popover.
function storage() {
  return typeof chrome !== "undefined" && chrome.storage?.local ? chrome.storage.local : null
}

export async function readReviewIndex(): Promise<ReviewIndexEntry[]> {
  const local = storage()
  if (!local) return []
  const stored = await local.get(REVIEW_INDEX_KEY)
  return resolveReviewIndex(stored[REVIEW_INDEX_KEY])
}

async function writeReviewIndex(current: ReviewIndexEntry[], next: ReviewIndexEntry[]) {
  const local = storage()
  if (!local) return
  if (current.length === 0 && next.length === 0) return
  await local.set({ [REVIEW_INDEX_KEY]: next })
}

export async function recordReviewIndexEntry(entry: ReviewIndexEntry): Promise<void> {
  const current = await readReviewIndex()
  await writeReviewIndex(current, upsertReviewIndexEntry(current, entry))
}

export async function forgetReviewIndexEntry(
  kind: ReviewIndexKind,
  key: string,
): Promise<void> {
  const current = await readReviewIndex()
  await writeReviewIndex(current, removeReviewIndexEntry(current, kind, key))
}

export async function forgetReviewIndexKind(kind: ReviewIndexKind): Promise<void> {
  const current = await readReviewIndex()
  await writeReviewIndex(current, current.filter((entry) => entry.kind !== kind))
}
