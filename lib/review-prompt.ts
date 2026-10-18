export const REVIEW_PROMPT_STORAGE_KEY = "reviewPromptState"

export const CHROME_WEB_STORE_REVIEW_URL =
  "https://chromewebstore.google.com/detail/markside/ccokohfaicfjkilcakhnlckbbkhhknhj/reviews"

export const MARKSIDE_FEEDBACK_EMAIL = "hello@zhuge.app"
export const MARKSIDE_FEEDBACK_URL =
  `mailto:${MARKSIDE_FEEDBACK_EMAIL}?subject=Markside%20feedback`

export const FIRST_PROMPT_ACTION_THRESHOLD = 5
export const FIRST_PROMPT_MIN_AGE_MS = 20 * 60 * 1000
export const REVIEW_PROMPT_SNOOZE_MS = 14 * 24 * 60 * 60 * 1000
export const DAILY_ACTION_TYPE_LIMIT = 3

export const REVIEW_PROMPT_EVENTS = [
  "file-open",
  "save",
  "review-comment",
  "review-copy",
  "link-snapshot",
  "pdf-export",
] as const

export type ReviewPromptEvent = typeof REVIEW_PROMPT_EVENTS[number]

type ActionCounts = Partial<Record<ReviewPromptEvent, number>>

export interface ReviewPromptState {
  version: 1
  firstUsedAt: number
  activeDays: string[]
  actionTotals: ActionCounts
  dailyActions: {
    day: string
    counts: ActionCounts
  }
  promptsShown: 0 | 1 | 2
  snoozedUntil: number | null
  completed: boolean
}

function emptyActionCounts(): ActionCounts {
  return {}
}

export function getLocalDayKey(timestamp: number): string {
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function createReviewPromptState(
  now: number,
  day = getLocalDayKey(now),
): ReviewPromptState {
  return {
    version: 1,
    firstUsedAt: now,
    activeDays: [],
    actionTotals: emptyActionCounts(),
    dailyActions: { day, counts: emptyActionCounts() },
    promptsShown: 0,
    snoozedUntil: null,
    completed: false,
  }
}

function normalizeCounts(value: unknown): ActionCounts {
  if (!value || typeof value !== "object") return {}
  const source = value as Record<string, unknown>
  return REVIEW_PROMPT_EVENTS.reduce<ActionCounts>((counts, event) => {
    const count = source[event]
    if (typeof count === "number" && Number.isFinite(count) && count > 0) {
      counts[event] = Math.floor(count)
    }
    return counts
  }, {})
}

export function resolveReviewPromptState(
  value: unknown,
  now: number,
): ReviewPromptState {
  if (!value || typeof value !== "object") return createReviewPromptState(now)
  const stored = value as Partial<ReviewPromptState>
  if (stored.version !== 1) return createReviewPromptState(now)

  const promptsShown = stored.promptsShown === 1 || stored.promptsShown === 2
    ? stored.promptsShown
    : 0
  const daily = stored.dailyActions
  const day = daily && typeof daily.day === "string"
    ? daily.day
    : getLocalDayKey(now)

  return {
    version: 1,
    firstUsedAt:
      typeof stored.firstUsedAt === "number" && Number.isFinite(stored.firstUsedAt)
        ? stored.firstUsedAt
        : now,
    activeDays: Array.isArray(stored.activeDays)
      ? stored.activeDays.filter((entry): entry is string => typeof entry === "string").slice(-3)
      : [],
    actionTotals: normalizeCounts(stored.actionTotals),
    dailyActions: {
      day,
      counts: normalizeCounts(daily?.counts),
    },
    promptsShown,
    snoozedUntil:
      typeof stored.snoozedUntil === "number" && Number.isFinite(stored.snoozedUntil)
        ? stored.snoozedUntil
        : null,
    completed: stored.completed === true || promptsShown === 2,
  }
}

export function getReviewPromptActionTotal(state: ReviewPromptState): number {
  return REVIEW_PROMPT_EVENTS.reduce(
    (total, event) => total + (state.actionTotals[event] ?? 0),
    0,
  )
}

function getReviewPromptActionTypeCount(state: ReviewPromptState): number {
  return REVIEW_PROMPT_EVENTS.filter((event) => (state.actionTotals[event] ?? 0) > 0).length
}

export function recordReviewPromptActivity(
  state: ReviewPromptState,
  event: ReviewPromptEvent,
  now: number,
  day = getLocalDayKey(now),
): ReviewPromptState {
  if (state.completed) return state

  const activeDays = event === "file-open" && !state.activeDays.includes(day)
    ? [...state.activeDays, day].slice(-3)
    : state.activeDays
  const dailyActions = state.dailyActions.day === day
    ? state.dailyActions
    : { day, counts: emptyActionCounts() }
  const dailyCount = dailyActions.counts[event] ?? 0

  if (dailyCount >= DAILY_ACTION_TYPE_LIMIT) {
    return activeDays === state.activeDays ? state : { ...state, activeDays }
  }

  return {
    ...state,
    activeDays,
    actionTotals: {
      ...state.actionTotals,
      [event]: (state.actionTotals[event] ?? 0) + 1,
    },
    dailyActions: {
      day,
      counts: {
        ...dailyActions.counts,
        [event]: dailyCount + 1,
      },
    },
  }
}

export function shouldShowReviewPrompt(
  state: ReviewPromptState,
  now: number,
): boolean {
  if (state.completed || state.promptsShown >= 2) return false

  const actionTotal = getReviewPromptActionTotal(state)
  if (state.promptsShown === 0) {
    const returnedEnough = state.activeDays.length >= 3
    const usedEnough =
      now - state.firstUsedAt >= FIRST_PROMPT_MIN_AGE_MS &&
      actionTotal >= FIRST_PROMPT_ACTION_THRESHOLD &&
      getReviewPromptActionTypeCount(state) >= 2
    return returnedEnough || usedEnough
  }

  return state.snoozedUntil !== null &&
    now >= state.snoozedUntil &&
    actionTotal >= FIRST_PROMPT_ACTION_THRESHOLD
}

export function markReviewPromptShown(
  state: ReviewPromptState,
  now: number,
): ReviewPromptState {
  if (!shouldShowReviewPrompt(state, now)) return state

  if (state.promptsShown === 0) {
    return {
      ...state,
      actionTotals: emptyActionCounts(),
      promptsShown: 1,
      snoozedUntil: now + REVIEW_PROMPT_SNOOZE_MS,
    }
  }

  return {
    ...state,
    promptsShown: 2,
    completed: true,
  }
}

export function completeReviewPrompt(state: ReviewPromptState): ReviewPromptState {
  return { ...state, completed: true }
}

async function readReviewPromptState(now: number): Promise<ReviewPromptState> {
  const stored = await chrome.storage.local.get(REVIEW_PROMPT_STORAGE_KEY)
  return resolveReviewPromptState(stored[REVIEW_PROMPT_STORAGE_KEY], now)
}

async function writeReviewPromptState(state: ReviewPromptState): Promise<void> {
  await chrome.storage.local.set({ [REVIEW_PROMPT_STORAGE_KEY]: state })
}

export async function recordReviewPromptEvent(
  event: ReviewPromptEvent,
  now = Date.now(),
): Promise<boolean> {
  const state = await readReviewPromptState(now)
  const next = recordReviewPromptActivity(state, event, now)
  await writeReviewPromptState(next)
  return shouldShowReviewPrompt(next, now)
}

export async function claimReviewPrompt(now = Date.now()): Promise<boolean> {
  const state = await readReviewPromptState(now)
  if (!shouldShowReviewPrompt(state, now)) return false
  await writeReviewPromptState(markReviewPromptShown(state, now))
  return true
}

export async function stopAutomaticReviewPrompts(now = Date.now()): Promise<void> {
  const state = await readReviewPromptState(now)
  await writeReviewPromptState(completeReviewPrompt(state))
}
