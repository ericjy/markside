import { describe, expect, it } from "vitest"

import {
  CHROME_WEB_STORE_ITEM_ID,
  completeReviewPrompt,
  createReviewPromptState,
  DAILY_ACTION_TYPE_LIMIT,
  getReviewPromptActionTotal,
  getStoreReviewUrl,
  markReviewPromptShown,
  recordReviewPromptActivity,
  REVIEW_PROMPT_SNOOZE_MS,
  shouldShowReviewPrompt,
} from "./review-prompt"

const START = new Date(2026, 8, 1, 9).getTime()

function record(
  state: ReturnType<typeof createReviewPromptState>,
  event: Parameters<typeof recordReviewPromptActivity>[1],
  minutes: number,
  day?: string,
) {
  return recordReviewPromptActivity(state, event, START + minutes * 60_000, day)
}

describe("review prompt policy", () => {
  it("never qualifies on the first active day, however much is used", () => {
    let state = createReviewPromptState(START, "2026-09-01")
    for (let minute = 0; minute < DAILY_ACTION_TYPE_LIMIT; minute += 1) {
      state = record(state, "file-open", minute, "2026-09-01")
      state = record(state, "save", minute, "2026-09-01")
      state = record(state, "pdf-export", minute, "2026-09-01")
    }

    expect(shouldShowReviewPrompt(state, START + 24 * 60 * 60_000 - 1)).toBe(false)
  })

  it("qualifies five actions across two types once the user returns on a second day", () => {
    let state = createReviewPromptState(START, "2026-09-01")
    state = record(state, "file-open", 0, "2026-09-01")
    state = record(state, "file-open", 1, "2026-09-01")
    state = record(state, "save", 2, "2026-09-01")
    state = record(state, "save", 3, "2026-09-01")
    expect(shouldShowReviewPrompt(state, START + 4 * 60_000)).toBe(false)

    state = record(state, "file-open", 24 * 60, "2026-09-02")
    expect(shouldShowReviewPrompt(state, START + 24 * 60 * 60_000)).toBe(true)
  })

  it("does not qualify repeated activity from only one action type", () => {
    let state = createReviewPromptState(START, "2026-09-01")
    for (let index = 0; index < DAILY_ACTION_TYPE_LIMIT + 3; index += 1) {
      state = record(state, "save", index, "2026-09-01")
    }

    state = { ...state, activeDays: ["2026-09-01", "2026-09-02"] }

    expect(getReviewPromptActionTotal(state)).toBe(DAILY_ACTION_TYPE_LIMIT)
    expect(shouldShowReviewPrompt(state, START)).toBe(false)
  })

  it("qualifies a returning user on the third active day", () => {
    let state = createReviewPromptState(START, "2026-09-01")
    state = record(state, "file-open", 0, "2026-09-01")
    state = record(state, "file-open", 24 * 60, "2026-09-02")
    state = record(state, "file-open", 2 * 24 * 60, "2026-09-03")

    expect(shouldShowReviewPrompt(state, START + 2 * 24 * 60 * 60_000)).toBe(true)
  })

  it("snoozes the first shown prompt for 14 days and resets its action count", () => {
    let state = createReviewPromptState(START, "2026-09-01")
    state = record(state, "file-open", 0, "2026-09-01")
    state = record(state, "file-open", 1, "2026-09-01")
    state = record(state, "save", 3, "2026-09-01")
    state = record(state, "save", 20, "2026-09-01")
    state = record(state, "file-open", 24 * 60, "2026-09-02")

    const shownAt = START + 24 * 60 * 60_000
    state = markReviewPromptShown(state, shownAt)

    expect(state.promptsShown).toBe(1)
    expect(state.snoozedUntil).toBe(shownAt + REVIEW_PROMPT_SNOOZE_MS)
    expect(getReviewPromptActionTotal(state)).toBe(0)
    expect(shouldShowReviewPrompt(state, shownAt + REVIEW_PROMPT_SNOOZE_MS)).toBe(false)
  })

  it("requires both the snooze period and five more actions for the second prompt", () => {
    let state = createReviewPromptState(START, "2026-09-01")
    state = { ...state, activeDays: ["2026-09-01", "2026-09-02", "2026-09-03"] }
    state = markReviewPromptShown(state, START)
    state = recordReviewPromptActivity(state, "file-open", START + 1, "2026-09-01")
    state = recordReviewPromptActivity(state, "file-open", START + 2, "2026-09-01")
    state = recordReviewPromptActivity(state, "file-open", START + 3, "2026-09-01")
    state = recordReviewPromptActivity(state, "save", START + 4, "2026-09-01")
    state = recordReviewPromptActivity(state, "save", START + 5, "2026-09-01")

    expect(shouldShowReviewPrompt(state, START + REVIEW_PROMPT_SNOOZE_MS - 1)).toBe(false)
    expect(shouldShowReviewPrompt(state, START + REVIEW_PROMPT_SNOOZE_MS)).toBe(true)
  })

  it("stops automatic prompts after the second display or a review action", () => {
    const secondEligible = {
      ...createReviewPromptState(START),
      actionTotals: { save: 5 },
      promptsShown: 1 as const,
      snoozedUntil: START,
    }
    const shown = markReviewPromptShown(secondEligible, START)

    expect(shown.promptsShown).toBe(2)
    expect(shown.completed).toBe(true)
    expect(shouldShowReviewPrompt(shown, START + REVIEW_PROMPT_SNOOZE_MS)).toBe(false)

    const completed = completeReviewPrompt(createReviewPromptState(START))
    expect(shouldShowReviewPrompt(completed, START + 365 * 24 * 60 * 60_000)).toBe(false)
  })
})

describe("store review URL", () => {
  const CHROME_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
  const EDGE_UA = `${CHROME_UA} Edg/130.0.0.0`
  const EDGE_ITEM_ID = "abcdefghijklmnopabcdefghijklmnop"

  it("rates a Chrome Web Store install on the Chrome Web Store, even in Edge", () => {
    const url = `https://chromewebstore.google.com/detail/markside/${CHROME_WEB_STORE_ITEM_ID}/reviews`
    expect(getStoreReviewUrl(CHROME_WEB_STORE_ITEM_ID, CHROME_UA)).toBe(url)
    expect(getStoreReviewUrl(CHROME_WEB_STORE_ITEM_ID, EDGE_UA)).toBe(url)
  })

  it("rates an Edge Add-ons install on Edge Add-ons", () => {
    expect(getStoreReviewUrl(EDGE_ITEM_ID, EDGE_UA))
      .toBe(`https://microsoftedge.microsoft.com/addons/detail/${EDGE_ITEM_ID}`)
  })
})
