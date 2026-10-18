import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  getThemePreference,
  setThemePreference,
  THEME_PREFERENCE_STORAGE_KEY,
} from "./theme-preference"

const storageGet = vi.fn()
const storageSet = vi.fn()

vi.stubGlobal("chrome", {
  storage: {
    local: {
      get: storageGet,
      set: storageSet,
    },
  },
})

beforeEach(() => {
  storageGet.mockReset()
  storageSet.mockReset()
})

describe("theme preference", () => {
  it("restores the selected dark theme after a reload", async () => {
    storageGet.mockResolvedValue({
      [THEME_PREFERENCE_STORAGE_KEY]: "dark",
    })

    await expect(getThemePreference()).resolves.toBe(true)
  })

  it("restores the selected light theme after a reload", async () => {
    storageGet.mockResolvedValue({
      [THEME_PREFERENCE_STORAGE_KEY]: "light",
    })

    await expect(getThemePreference()).resolves.toBe(false)
  })

  it("falls back to the system theme without a saved selection", async () => {
    storageGet.mockResolvedValue({})

    await expect(getThemePreference()).resolves.toBeNull()
  })

  it("saves the selected theme for the next reload", async () => {
    storageSet.mockResolvedValue(undefined)

    await setThemePreference(true)

    expect(storageSet).toHaveBeenCalledWith({
      [THEME_PREFERENCE_STORAGE_KEY]: "dark",
    })
  })
})
