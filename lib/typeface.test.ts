import { describe, expect, it } from "vitest"

import { resolveTypeface, TYPEFACES } from "./typeface"

describe("resolveTypeface", () => {
  it("keeps known typefaces", () => {
    expect(resolveTypeface("charter")).toBe("charter")
    expect(resolveTypeface("iowan")).toBe("iowan")
  })

  it("defaults missing and invalid preferences to sans", () => {
    expect(resolveTypeface(undefined)).toBe("sans")
    expect(resolveTypeface("comic")).toBe("sans")
    expect(resolveTypeface(1)).toBe("sans")
    expect(resolveTypeface("toString")).toBe("sans")
  })
})

describe("TYPEFACES", () => {
  it("ends every stack in a generic family", () => {
    for (const { stack } of Object.values(TYPEFACES)) {
      expect(stack).toMatch(/, (sans-serif|serif)$/)
    }
  })
})
