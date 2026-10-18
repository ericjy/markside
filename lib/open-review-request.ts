// The popover can start a Review on the tab you are looking at. A localhost
// Review is a lasting per-origin flag, but a document Review overlay belongs to
// the mounted session, so the popover leaves a one-shot request that the content
// script consumes.

export const OPEN_REVIEW_REQUEST_KEY = "openReviewRequest"

// A request older than this was meant for a page the user has since left.
export const OPEN_REVIEW_REQUEST_TTL_MS = 60_000

export interface OpenReviewRequest {
  url: string
  requestedAt: number
}

export function shouldOpenReview(value: unknown, url: string, now: number): boolean {
  if (!value || typeof value !== "object") return false
  const request = value as Partial<OpenReviewRequest>
  if (request.url !== url) return false
  if (typeof request.requestedAt !== "number" || !Number.isFinite(request.requestedAt)) return false
  return now - request.requestedAt <= OPEN_REVIEW_REQUEST_TTL_MS
}

export async function requestOpenReview(url: string): Promise<void> {
  await chrome.storage.local.set({
    [OPEN_REVIEW_REQUEST_KEY]: { url, requestedAt: Date.now() } satisfies OpenReviewRequest,
  })
}

async function clearOpenReviewRequest(): Promise<void> {
  await chrome.storage.local.remove(OPEN_REVIEW_REQUEST_KEY)
}

export async function consumeOpenReviewRequest(url: string): Promise<boolean> {
  const stored = await chrome.storage.local.get(OPEN_REVIEW_REQUEST_KEY)
  if (!shouldOpenReview(stored[OPEN_REVIEW_REQUEST_KEY], url, Date.now())) return false
  await clearOpenReviewRequest()
  return true
}

export function watchOpenReviewRequest(url: string, onRequest: () => void) {
  const listener = (
    changes: Record<string, chrome.storage.StorageChange>,
    areaName: string,
  ) => {
    if (areaName !== "local" || !(OPEN_REVIEW_REQUEST_KEY in changes)) return
    if (!shouldOpenReview(changes[OPEN_REVIEW_REQUEST_KEY].newValue, url, Date.now())) return
    void clearOpenReviewRequest().catch(() => undefined)
    onRequest()
  }
  chrome.storage.onChanged.addListener(listener)
  return () => chrome.storage.onChanged.removeListener(listener)
}
