import { useCallback, useEffect, useRef, useState } from "react"

import {
  ACTIVE_REVIEW_CHANNEL,
  getActiveReview,
  mutateActiveReview,
} from "~lib/db"
import { getReviewItemCount, type ActiveReview } from "~lib/review"
import { documentReviewEntries, resolveReviewIndex, REVIEW_INDEX_KEY } from "~lib/review-index"
import { readReviewIndex } from "~lib/review-index-storage"

export function useActiveReview(sourceUrl: string, enabled: boolean) {
  const [review, setReview] = useState<ActiveReview | null>(null)
  const [reviewCounts, setReviewCounts] = useState<Record<string, number>>({})
  const [persistenceError, setPersistenceError] = useState(false)
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null)
  type ReviewMutation = (current: ActiveReview | null) => ActiveReview | null
  const reviewRef = useRef(review)
  const persistQueueRef = useRef(Promise.resolve())
  const loadSequenceRef = useRef(0)
  const persistenceErrorRef = useRef(false)
  const pendingMutationsByUrlRef = useRef(new Map<string, ReviewMutation[]>())
  const sourceUrlRef = useRef(sourceUrl)
  reviewRef.current = review
  sourceUrlRef.current = sourceUrl

  useEffect(() => {
    let active = true
    const updateCounts = (value: unknown) => setReviewCounts(Object.fromEntries(
      documentReviewEntries(resolveReviewIndex(value)).map((entry) => [entry.key, entry.itemCount]),
    ))
    void readReviewIndex().then((entries) => { if (active) updateCounts(entries) })
    const onChange = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === "local" && changes[REVIEW_INDEX_KEY]) updateCounts(changes[REVIEW_INDEX_KEY].newValue)
    }
    chrome.storage.onChanged.addListener(onChange)
    return () => {
      active = false
      chrome.storage.onChanged.removeListener(onChange)
    }
  }, [])

  const load = useCallback(async () => {
    const sequence = ++loadSequenceRef.current
    const pendingForSource = pendingMutationsByUrlRef.current.get(sourceUrl)
    if (
      (pendingForSource?.length ?? 0) > 0 ||
      (persistenceErrorRef.current && reviewRef.current)
    ) return
    if (!enabled) {
      setReview(null)
      setLoadedUrl(sourceUrl)
      return
    }
    try {
      const stored = await getActiveReview(sourceUrl)
      if (sequence !== loadSequenceRef.current) return
      setReview(stored)
      setLoadedUrl(sourceUrl)
      setPersistenceError(false)
      persistenceErrorRef.current = false
    } catch {
      if (sequence === loadSequenceRef.current) {
        setLoadedUrl(sourceUrl)
        setPersistenceError(true)
        persistenceErrorRef.current = true
      }
    }
  }, [enabled, sourceUrl])

  useEffect(() => {
    setReview(null)
    reviewRef.current = null
    setPersistenceError(false)
    persistenceErrorRef.current = false
    void load()
  }, [enabled, sourceUrl]) // load also runs on focus without clearing the visible Review

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return
    const channel = new BroadcastChannel(ACTIVE_REVIEW_CHANNEL)
    channel.onmessage = (event: MessageEvent<{ sourceUrl?: string }>) => {
      if (!event.data.sourceUrl || event.data.sourceUrl === sourceUrl) void load()
    }
    const refreshOnFocus = () => void load()
    window.addEventListener("focus", refreshOnFocus)
    return () => {
      channel.close()
      window.removeEventListener("focus", refreshOnFocus)
    }
  }, [load, sourceUrl])

  useEffect(() => {
    const warnIfUnpersisted = (event: BeforeUnloadEvent) => {
      const hasPending = (pendingMutationsByUrlRef.current.get(sourceUrl)?.length ?? 0) > 0
      if (
        (!persistenceError && !hasPending) ||
        !reviewRef.current ||
        getReviewItemCount(reviewRef.current) === 0
      ) return
      event.preventDefault()
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", warnIfUnpersisted)
    return () => window.removeEventListener("beforeunload", warnIfUnpersisted)
  }, [persistenceError, sourceUrl])

  const updateReview = useCallback((mutate: ReviewMutation) => {
    const pendingForSource = pendingMutationsByUrlRef.current.get(sourceUrl) ?? []
    pendingForSource.push(mutate)
    pendingMutationsByUrlRef.current.set(sourceUrl, pendingForSource)
    const next = mutate(reviewRef.current)
    setReview(next)
    reviewRef.current = next
    persistQueueRef.current = persistQueueRef.current
      .then(async () => {
        const pending = pendingMutationsByUrlRef.current.get(sourceUrl)
        if (!pending?.length) return
        const batch = [...pending]
        const stored = await mutateActiveReview(
          sourceUrl,
          (current) => batch.reduce((value, operation) => operation(value), current),
        )
        pending.splice(0, batch.length)
        if (pending.length === 0) pendingMutationsByUrlRef.current.delete(sourceUrl)
        if (
          sourceUrlRef.current === sourceUrl &&
          !pendingMutationsByUrlRef.current.has(sourceUrl)
        ) {
          setReview(stored)
          reviewRef.current = stored
        }
        if (sourceUrlRef.current === sourceUrl) {
          setPersistenceError(false)
          persistenceErrorRef.current = false
        }
      })
      .catch(() => {
        if (sourceUrlRef.current === sourceUrl) {
          setPersistenceError(true)
          persistenceErrorRef.current = true
        }
      })
  }, [sourceUrl])

  const waitForReviewPersistence = useCallback(async () => {
    await persistQueueRef.current
    return (
      !pendingMutationsByUrlRef.current.has(sourceUrl) &&
      !persistenceErrorRef.current
    )
  }, [sourceUrl])

  const discardUnpersistedReview = useCallback(() => {
    pendingMutationsByUrlRef.current.delete(sourceUrl)
    setPersistenceError(false)
    persistenceErrorRef.current = false
  }, [sourceUrl])

  return {
    review,
    reviewLoaded: loadedUrl === sourceUrl,
    reviewCounts,
    persistenceError,
    updateReview,
    reloadReview: load,
    waitForReviewPersistence,
    discardUnpersistedReview,
  }
}
