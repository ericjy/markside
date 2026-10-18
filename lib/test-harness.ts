import { act,createElement } from "react"
import { createRoot } from "react-dom/client"
import { vi } from "vitest"

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true

// Renders a hook inside a real React root so its effects and state updates run.
export function renderHook<Props, Result>(hook: (props: Props) => Result, initialProps: Props) {
  const result = { current: undefined as Result }
  function Probe({ props }: { props: Props }) {
    result.current = hook(props)
    return null
  }
  const root = createRoot(document.createElement("div"))
  act(() => root.render(createElement(Probe, { props: initialProps })))
  return {
    result,
    rerender(props: Props) {
      act(() => root.render(createElement(Probe, { props })))
    },
    unmount() {
      act(() => root.unmount())
    },
  }
}

// Settles pending storage promises and the state updates they trigger.
export async function flush() {
  for (let i = 0; i < 5; i++) {
    await act(async () => {
      await Promise.resolve()
    })
  }
}

type StorageListener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => void

// An in-memory chrome.storage.local that reports changes like the real one.
export function stubChromeStorage(initial: Record<string, unknown> = {}) {
  const data: Record<string, unknown> = { ...initial }
  const listeners = new Set<StorageListener>()
  const pick = (keys: string | string[] | null | undefined) => {
    if (keys == null) return { ...data }
    const names = Array.isArray(keys) ? keys : [keys]
    return Object.fromEntries(names.filter((key) => key in data).map((key) => [key, data[key]]))
  }
  const set = async (items: Record<string, unknown>) => {
    const changes: Record<string, chrome.storage.StorageChange> = {}
    for (const [key, newValue] of Object.entries(items)) {
      changes[key] = { oldValue: data[key], newValue }
      data[key] = newValue
    }
    listeners.forEach((listener) => listener(changes, "local"))
  }
  vi.stubGlobal("chrome", {
    storage: {
      local: { get: vi.fn(async (keys?: string | string[]) => pick(keys)), set: vi.fn(set) },
      onChanged: {
        addListener: (listener: StorageListener) => listeners.add(listener),
        removeListener: (listener: StorageListener) => listeners.delete(listener),
      },
    },
  })
  return { data, set }
}

export function stubResizeObserver() {
  vi.stubGlobal("ResizeObserver", class {
    observe() {}
    unobserve() {}
    disconnect() {}
  })
}

export function stubMatchMedia(matches: boolean) {
  const listeners = new Set<(event: MediaQueryListEvent) => void>()
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches,
    media: query,
    addEventListener: (_: string, listener: (event: MediaQueryListEvent) => void) => listeners.add(listener),
    removeEventListener: (_: string, listener: (event: MediaQueryListEvent) => void) => listeners.delete(listener),
  }))
  return {
    change(nextMatches: boolean) {
      listeners.forEach((listener) => listener({ matches: nextMatches } as MediaQueryListEvent))
    },
  }
}
