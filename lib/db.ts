// lib/db.ts
// Thin IndexedDB wrapper.
// v1: "directory" store — one FileSystemDirectoryHandle + rootUrl
// v2: "file-handles" store — FileSystemFileHandle keyed by file URL
// v3: (reserved — TAB_HANDLES_STORE was created but the feature was dropped)
// v4: "directories" store — directory entries keyed by root URL

import {
  type DirectoryEntry,
  mergeLegacyDirectoryEntry,
  selectDirectoryEntry,
} from "./directory-catalog"
import { getReviewItemCount, getReviewSourcePath, type ActiveReview } from "./review"
import { describeDocumentReview } from "./review-index"
import {
  forgetReviewIndexEntry,
  forgetReviewIndexKind,
  recordReviewIndexEntry,
} from "./review-index-storage"

const DB_NAME = "markside"
const DIRECTORY_STORE = "directory"
const DIRECTORIES_STORE = "directories"
const FILE_HANDLES_STORE = "file-handles"
const REVIEWS_STORE = "reviews"
const DIRECTORY_KEY = "current"
export const ACTIVE_REVIEW_CHANNEL = "markside-active-reviews"

// The popover cannot read this database — it belongs to the page origin — so the
// content app mirrors pending counts and labels into the extension-scoped Review
// index. Resolved comments can live in the agent's sidecar, which only it reads.
export function indexActiveReview(sourceUrl: string, updatedAt: string, pendingCount: number) {
  const promise = pendingCount === 0
    ? forgetReviewIndexEntry("document", sourceUrl)
    : recordReviewIndexEntry({
        kind: "document",
        key: sourceUrl,
        ...describeDocumentReview(getReviewSourcePath(sourceUrl)),
        itemCount: pendingCount,
        updatedAt,
      })
  void promise.catch(() => {
    // The Review itself is saved; a stale popover entry is not worth failing for.
  })
}

function broadcastReviewChange(sourceUrl?: string) {
  if (typeof BroadcastChannel === "undefined") return
  const channel = new BroadcastChannel(ACTIVE_REVIEW_CHANNEL)
  channel.postMessage({ sourceUrl })
  channel.close()
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 5)
    req.onupgradeneeded = (event) => {
      const db = req.result
      if (event.oldVersion < 1) {
        db.createObjectStore(DIRECTORY_STORE)
      }
      if (event.oldVersion < 2) {
        db.createObjectStore(FILE_HANDLES_STORE)
      }
      if (event.oldVersion < 4) {
        db.createObjectStore(DIRECTORIES_STORE)
      }
      if (event.oldVersion < 5) {
        db.createObjectStore(REVIEWS_STORE)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function readLegacyDirectoryEntry(
  db: IDBDatabase,
): Promise<DirectoryEntry | null> {
  return new Promise((resolve, reject) => {
    const req = db
      .transaction(DIRECTORY_STORE, "readonly")
      .objectStore(DIRECTORY_STORE)
      .get(DIRECTORY_KEY)
    req.onsuccess = () => resolve((req.result as DirectoryEntry) ?? null)
    req.onerror = () => reject(req.error)
  })
}

function readDirectoryEntries(db: IDBDatabase): Promise<DirectoryEntry[]> {
  return new Promise((resolve, reject) => {
    const req = db
      .transaction(DIRECTORIES_STORE, "readonly")
      .objectStore(DIRECTORIES_STORE)
      .getAll()
    req.onsuccess = () => resolve(req.result as DirectoryEntry[])
    req.onerror = () => reject(req.error)
  })
}

function writeDirectoryEntry(
  db: IDBDatabase,
  entry: DirectoryEntry,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = db
      .transaction(DIRECTORIES_STORE, "readwrite")
      .objectStore(DIRECTORIES_STORE)
      .put(entry, entry.rootUrl)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

export async function getDirectoryEntries(): Promise<DirectoryEntry[]> {
  try {
    const db = await openDB()
    const [stored, legacy] = await Promise.all([
      readDirectoryEntries(db),
      readLegacyDirectoryEntry(db),
    ])
    const merged = mergeLegacyDirectoryEntry(stored, legacy)

    if (merged.imported) {
      try {
        await writeDirectoryEntry(db, merged.imported)
      } catch {
        // The legacy entry remains readable and the idempotent import retries.
      }
    }

    return merged.entries
  } catch {
    return []
  }
}

export async function getDirectoryEntryForUrl(
  fileUrl: string,
): Promise<DirectoryEntry | null> {
  return selectDirectoryEntry(await getDirectoryEntries(), fileUrl)
}

export async function upsertDirectoryEntry(
  entry: DirectoryEntry,
): Promise<void> {
  const db = await openDB()
  await writeDirectoryEntry(db, entry)
}

export async function getFileHandle(
  url: string
): Promise<FileSystemFileHandle | null> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const req = db
        .transaction(FILE_HANDLES_STORE, "readonly")
        .objectStore(FILE_HANDLES_STORE)
        .get(url)
      req.onsuccess = () => resolve((req.result as FileSystemFileHandle) ?? null)
      req.onerror = () => reject(req.error)
    })
  } catch {
    return null
  }
}

export async function setFileHandle(
  url: string,
  handle: FileSystemFileHandle
): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(FILE_HANDLES_STORE, "readwrite")
    transaction.objectStore(FILE_HANDLES_STORE).put(handle, url)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error ?? new Error("Could not remember the saved file."))
  })
}

export async function getActiveReview(
  sourceUrl: string,
): Promise<ActiveReview | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const req = db
      .transaction(REVIEWS_STORE, "readonly")
      .objectStore(REVIEWS_STORE)
      .get(sourceUrl)
    req.onsuccess = () => resolve((req.result as ActiveReview) ?? null)
    req.onerror = () => reject(req.error)
  })
}

export async function getActiveReviews(): Promise<ActiveReview[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const req = db
      .transaction(REVIEWS_STORE, "readonly")
      .objectStore(REVIEWS_STORE)
      .getAll()
    req.onsuccess = () => resolve(req.result as ActiveReview[])
    req.onerror = () => reject(req.error)
  })
}

export async function mutateActiveReview(
  sourceUrl: string,
  mutate: (current: ActiveReview | null) => ActiveReview | null,
): Promise<ActiveReview | null> {
  const db = await openDB()
  const next = await new Promise<ActiveReview | null>((resolve, reject) => {
    const transaction = db.transaction(REVIEWS_STORE, "readwrite")
    const store = transaction.objectStore(REVIEWS_STORE)
    const read = store.get(sourceUrl)
    let result: ActiveReview | null = null
    read.onsuccess = () => {
      try {
        result = mutate((read.result as ActiveReview) ?? null)
        if (result && getReviewItemCount(result) > 0) store.put(result, sourceUrl)
        else store.delete(sourceUrl)
      } catch (error) {
        transaction.abort()
        reject(error)
      }
    }
    read.onerror = () => reject(read.error)
    transaction.oncomplete = () => resolve(result)
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error ?? new Error("Review mutation aborted"))
  })
  broadcastReviewChange(sourceUrl)
  return next
}

export async function deleteActiveReview(sourceUrl: string): Promise<void> {
  const db = await openDB()
  await new Promise<void>((resolve, reject) => {
    const req = db
      .transaction(REVIEWS_STORE, "readwrite")
      .objectStore(REVIEWS_STORE)
      .delete(sourceUrl)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
  indexActiveReview(sourceUrl, "", 0)
  broadcastReviewChange(sourceUrl)
}

export async function clearActiveReviews(): Promise<void> {
  const db = await openDB()
  await new Promise<void>((resolve, reject) => {
    const req = db
      .transaction(REVIEWS_STORE, "readwrite")
      .objectStore(REVIEWS_STORE)
      .clear()
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
  void forgetReviewIndexKind("document").catch(() => undefined)
  broadcastReviewChange()
}
