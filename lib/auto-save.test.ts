import { describe, expect, it } from "vitest"

import {
  resolveAutoSaveEnabled,
  resolveUnsavedNavigationPolicy,
} from "./auto-save"

describe("resolveAutoSaveEnabled", () => {
  it("defaults missing and invalid preferences to off", () => {
    expect(resolveAutoSaveEnabled(undefined)).toBe(false)
    expect(resolveAutoSaveEnabled("true")).toBe(false)
    expect(resolveAutoSaveEnabled(true)).toBe(true)
  })
})

describe("resolveUnsavedNavigationPolicy", () => {
  it("navigates immediately when there is no unsaved draft", () => {
    expect(resolveUnsavedNavigationPolicy({
      autoSaveEnabled: false,
      hasUnsavedDraft: false,
    })).toBe("navigate")
  })

  it("saves before navigating when Auto Save is enabled", () => {
    expect(resolveUnsavedNavigationPolicy({
      autoSaveEnabled: true,
      hasUnsavedDraft: true,
    })).toBe("save")
  })

  it("asks the user when Auto Save is disabled", () => {
    expect(resolveUnsavedNavigationPolicy({
      autoSaveEnabled: false,
      hasUnsavedDraft: true,
    })).toBe("confirm")
  })
})
