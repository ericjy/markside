import { afterEach, describe, expect, it, vi } from "vitest"

import {
  createPreviewEnhancementScheduler,
  createPreviewScheduler,
} from "./preview-scheduler"

describe("preview scheduler", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("coalesces rapid edits without starving continuous updates", () => {
    vi.useFakeTimers()
    const scheduler = createPreviewScheduler()
    const updates: string[] = []

    scheduler.schedule(() => updates.push("first"))
    vi.advanceTimersByTime(25)
    scheduler.schedule(() => updates.push("latest"))
    vi.advanceTimersByTime(25)
    expect(updates).toEqual(["latest"])

    scheduler.schedule(() => updates.push("next"))
    vi.advanceTimersByTime(50)
    expect(updates).toEqual(["latest", "next"])
  })

  it("cancels a pending preview update", () => {
    vi.useFakeTimers()
    const scheduler = createPreviewScheduler()
    const updates: string[] = []

    scheduler.schedule(() => updates.push("stale"))
    scheduler.cancel()
    vi.advanceTimersByTime(50)

    expect(updates).toEqual([])
  })

  it("waits for typing to pause before enhancing the preview", () => {
    vi.useFakeTimers()
    const scheduler = createPreviewEnhancementScheduler()
    const enhancements: string[] = []

    scheduler.schedule(() => enhancements.push("first"))
    vi.advanceTimersByTime(150)
    scheduler.schedule(() => enhancements.push("latest"))
    vi.advanceTimersByTime(199)
    expect(enhancements).toEqual([])

    vi.advanceTimersByTime(1)
    expect(enhancements).toEqual(["latest"])
  })

  it("cancels a pending preview enhancement", () => {
    vi.useFakeTimers()
    const scheduler = createPreviewEnhancementScheduler()
    const enhancements: string[] = []

    scheduler.schedule(() => enhancements.push("stale"))
    scheduler.cancel()
    vi.advanceTimersByTime(200)

    expect(enhancements).toEqual([])
  })
})
