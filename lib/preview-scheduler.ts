export const SPLIT_PREVIEW_INTERVAL_MS = 50
export const SPLIT_PREVIEW_ENHANCEMENT_DELAY_MS = 200

export function createPreviewScheduler(
  intervalMs = SPLIT_PREVIEW_INTERVAL_MS,
) {
  let timer: ReturnType<typeof setTimeout> | null = null
  let pending: (() => void) | null = null

  return {
    schedule(callback: () => void) {
      pending = callback
      if (timer !== null) return
      timer = setTimeout(() => {
        timer = null
        const run = pending
        pending = null
        run?.()
      }, intervalMs)
    },
    cancel() {
      if (timer !== null) clearTimeout(timer)
      timer = null
      pending = null
    },
  }
}

export function createPreviewEnhancementScheduler(
  delayMs = SPLIT_PREVIEW_ENHANCEMENT_DELAY_MS,
) {
  let timer: ReturnType<typeof setTimeout> | null = null

  return {
    schedule(callback: () => void) {
      if (timer !== null) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = null
        callback()
      }, delayMs)
    },
    cancel() {
      if (timer !== null) clearTimeout(timer)
      timer = null
    },
  }
}
