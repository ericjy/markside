import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  createEmptyLocalhostReview,
  setLocalhostReviewNote,
} from "./localhost-review"
import {
  getLocalhostReviewPanelPosition,
  getStoredLocalhostReview,
  isLocalhostReviewPanelOpen,
  localhostReviewKey,
  localhostReviewPanelKey,
  localhostReviewPositionKey,
  resolveLocalhostPanelPosition,
  saveLocalhostReview,
  setLocalhostReviewPanelOpen,
  setLocalhostReviewPanelPosition,
  watchLocalhostReview,
  watchLocalhostReviewPanel,
} from "./localhost-review-storage"

type ChangeListener = (
  changes: Record<string, { newValue?: unknown; oldValue?: unknown }>,
  areaName: string,
) => void

let store: Record<string, unknown>
let listeners: ChangeListener[]

beforeEach(() => {
  store = {}
  listeners = []
  Object.assign(globalThis, {
    chrome: {
      storage: {
        local: {
          get: vi.fn(async (key: string) => (key in store ? { [key]: store[key] } : {})),
          set: vi.fn(async (values: Record<string, unknown>) => Object.assign(store, values)),
          remove: vi.fn(async (key: string) => {
            delete store[key]
          }),
        },
        onChanged: {
          addListener: (listener: ChangeListener) => listeners.push(listener),
          removeListener: (listener: ChangeListener) => {
            listeners = listeners.filter((candidate) => candidate !== listener)
          },
        },
      },
    },
  })
})

const origin = "http://localhost:3000"

describe("localhost review storage", () => {
  it("scopes stored keys to the origin including port", () => {
    expect(localhostReviewKey(origin)).toBe("localhostReview:http://localhost:3000")
    expect(localhostReviewKey("http://localhost:4000")).not.toBe(localhostReviewKey(origin))
    expect(localhostReviewPanelKey(origin)).toBe("localhostReviewPanel:http://localhost:3000")
  })

  it("returns an empty Review when nothing is stored", async () => {
    const review = await getStoredLocalhostReview(origin)
    expect(review.origin).toBe(origin)
    expect(review.annotations).toEqual([])
  })

  it("round-trips a saved Review", async () => {
    const review = setLocalhostReviewNote(createEmptyLocalhostReview(origin), "Keep it plain.")
    await saveLocalhostReview(review)
    expect(await getStoredLocalhostReview(origin)).toEqual(review)
  })

  it("removes the stored Review once it holds nothing", async () => {
    await saveLocalhostReview(setLocalhostReviewNote(createEmptyLocalhostReview(origin), "note"))
    await saveLocalhostReview(createEmptyLocalhostReview(origin))
    expect(store[localhostReviewKey(origin)]).toBeUndefined()
  })

  it("tracks whether the Review panel is open for the origin", async () => {
    expect(await isLocalhostReviewPanelOpen(origin)).toBe(false)
    await setLocalhostReviewPanelOpen(origin, true)
    expect(await isLocalhostReviewPanelOpen(origin)).toBe(true)
    await setLocalhostReviewPanelOpen(origin, false)
    expect(await isLocalhostReviewPanelOpen(origin)).toBe(false)
  })

  it("remembers where the user moved the Review panel", async () => {
    expect(await getLocalhostReviewPanelPosition(origin)).toBeNull()
    await setLocalhostReviewPanelPosition(origin, { left: 120, top: 240 })
    expect(store[localhostReviewPositionKey(origin)]).toEqual({ left: 120, top: 240 })
    expect(await getLocalhostReviewPanelPosition(origin)).toEqual({ left: 120, top: 240 })
  })

  it("ignores a stored position that is not a point", () => {
    expect(resolveLocalhostPanelPosition({ left: "12", top: 4 })).toBeNull()
    expect(resolveLocalhostPanelPosition({ left: Number.NaN, top: 4 })).toBeNull()
    expect(resolveLocalhostPanelPosition(null)).toBeNull()
  })

  it("notifies watchers about Review and panel changes for its own origin", () => {
    const onReviewChange = vi.fn()
    const onPanelChange = vi.fn()
    const stopReview = watchLocalhostReview(origin, onReviewChange)
    const stopPanel = watchLocalhostReviewPanel(origin, onPanelChange)
    const review = setLocalhostReviewNote(createEmptyLocalhostReview(origin), "note")

    const notify = (changes: Record<string, { newValue?: unknown }>, area: string) => {
      for (const listener of [...listeners]) listener(changes, area)
    }
    notify({ [localhostReviewKey(origin)]: { newValue: review } }, "local")
    notify({ [localhostReviewPanelKey(origin)]: { newValue: true } }, "local")
    notify({ [localhostReviewKey("http://localhost:4000")]: { newValue: review } }, "local")
    notify({ [localhostReviewKey(origin)]: { newValue: review } }, "sync")

    expect(onReviewChange).toHaveBeenCalledTimes(1)
    expect(onReviewChange).toHaveBeenCalledWith(review)
    expect(onPanelChange).toHaveBeenCalledWith(true)

    stopReview()
    stopPanel()
    expect(listeners).toHaveLength(0)
  })

  it("reports a cleared Review as empty", () => {
    const onReviewChange = vi.fn()
    watchLocalhostReview(origin, onReviewChange)
    listeners[0]({ [localhostReviewKey(origin)]: { newValue: undefined } }, "local")
    expect(onReviewChange.mock.calls[0][0].annotations).toEqual([])
  })
})
