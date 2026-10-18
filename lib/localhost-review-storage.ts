// Localhost Reviews live in extension storage rather than in the reviewed
// application's own storage, so a Review survives tab closure and browser
// restarts and never touches the application's data.

import {
  createEmptyLocalhostReview,
  getLocalhostReviewItemCount,
  resolveStoredLocalhostReview,
  type LocalhostReview,
} from "./localhost-review"
import type { LocalhostPoint } from "./localhost-review-layout"
import { groupLocalhostAnnotationsByPage } from "./localhost-review"
import { forgetReviewIndexEntry, recordReviewIndexEntry } from "./review-index-storage"

const LOCALHOST_REVIEW_KEY_PREFIX = "localhostReview:"
const LOCALHOST_REVIEW_PANEL_KEY_PREFIX = "localhostReviewPanel:"
const LOCALHOST_REVIEW_POSITION_KEY_PREFIX = "localhostReviewPanelPosition:"

export function localhostReviewKey(origin: string) {
  return `${LOCALHOST_REVIEW_KEY_PREFIX}${origin}`
}

export function localhostReviewPanelKey(origin: string) {
  return `${LOCALHOST_REVIEW_PANEL_KEY_PREFIX}${origin}`
}

export async function getStoredLocalhostReview(origin: string): Promise<LocalhostReview> {
  const key = localhostReviewKey(origin)
  const stored = await chrome.storage.local.get(key)
  return resolveStoredLocalhostReview(stored[key], origin) ?? createEmptyLocalhostReview(origin)
}

export async function saveLocalhostReview(review: LocalhostReview): Promise<void> {
  const key = localhostReviewKey(review.origin)
  const itemCount = getLocalhostReviewItemCount(review)
  if (itemCount === 0) {
    await chrome.storage.local.remove(key)
    await forgetReviewIndexEntry("localhost", review.origin)
    return
  }
  await chrome.storage.local.set({ [key]: review })
  await recordReviewIndexEntry({
    kind: "localhost",
    key: review.origin,
    label: review.origin.replace(/^https?:\/\//, ""),
    detail: groupLocalhostAnnotationsByPage(review.annotations)
      .map((page) => page.label)
      .join(", "),
    itemCount,
    updatedAt: review.updatedAt,
  })
}

export function localhostReviewPositionKey(origin: string) {
  return `${LOCALHOST_REVIEW_POSITION_KEY_PREFIX}${origin}`
}

export async function isLocalhostReviewPanelOpen(origin: string): Promise<boolean> {
  const key = localhostReviewPanelKey(origin)
  const stored = await chrome.storage.local.get(key)
  return stored[key] === true
}

export async function setLocalhostReviewPanelOpen(
  origin: string,
  open: boolean,
): Promise<void> {
  const key = localhostReviewPanelKey(origin)
  if (open) await chrome.storage.local.set({ [key]: true })
  else await chrome.storage.local.remove(key)
}

export async function getLocalhostReviewPanelPosition(
  origin: string,
): Promise<LocalhostPoint | null> {
  const key = localhostReviewPositionKey(origin)
  const stored = await chrome.storage.local.get(key)
  return resolveLocalhostPanelPosition(stored[key])
}

export async function setLocalhostReviewPanelPosition(
  origin: string,
  position: LocalhostPoint,
): Promise<void> {
  await chrome.storage.local.set({ [localhostReviewPositionKey(origin)]: position })
}

export function resolveLocalhostPanelPosition(value: unknown): LocalhostPoint | null {
  if (!value || typeof value !== "object") return null
  const stored = value as Partial<LocalhostPoint>
  if (!Number.isFinite(stored.left) || !Number.isFinite(stored.top)) return null
  return { left: stored.left as number, top: stored.top as number }
}

function watchStorageKey(key: string, onChange: (value: unknown) => void) {
  const listener = (
    changes: Record<string, chrome.storage.StorageChange>,
    areaName: string,
  ) => {
    if (areaName !== "local" || !(key in changes)) return
    onChange(changes[key].newValue)
  }
  chrome.storage.onChanged.addListener(listener)
  return () => chrome.storage.onChanged.removeListener(listener)
}

export function watchLocalhostReview(
  origin: string,
  onChange: (review: LocalhostReview) => void,
) {
  return watchStorageKey(localhostReviewKey(origin), (value) =>
    onChange(resolveStoredLocalhostReview(value, origin) ?? createEmptyLocalhostReview(origin))
  )
}

export function watchLocalhostReviewPanel(
  origin: string,
  onChange: (open: boolean) => void,
) {
  return watchStorageKey(localhostReviewPanelKey(origin), (value) => onChange(value === true))
}
