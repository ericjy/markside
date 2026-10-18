import { describe, expect, it } from "vitest"
import { rankMatch, fuzzySearch } from "./fuzzy"

describe("rankMatch", () => {
  it("returns 0 when filename starts with query", () => {
    expect(rankMatch("read", { name: "README.md", path: "README.md" })).toBe(0)
  })

  it("returns 1 when filename contains query as substring (not prefix)", () => {
    expect(rankMatch("side", { name: "markside.tsx", path: "src/markside.tsx" })).toBe(1)
  })

  it("returns 2 when path matches by char sequence but not as substring", () => {
    expect(rankMatch("sc/si", { name: "sidebar.tsx", path: "src/sidebar.tsx" })).toBe(2)
  })

  it("returns null when no match", () => {
    expect(rankMatch("zzz", { name: "README.md", path: "README.md" })).toBeNull()
  })

  it("is case-insensitive", () => {
    expect(rankMatch("readme", { name: "README.md", path: "README.md" })).toBe(0)
  })
})

describe("fuzzySearch", () => {
  const files = [
    { name: "README.md", path: "README.md" },
    { name: "sidebar.tsx", path: "src/sidebar.tsx" },
    { name: "index.ts", path: "src/index.ts" },
  ]

  it("returns all files sorted alphabetically by path when query is empty", () => {
    const results = fuzzySearch("", files)
    expect(results).toHaveLength(3)
    expect(results[0].path).toBe("README.md")
    expect(results[1].path).toBe("src/index.ts")
    expect(results[2].path).toBe("src/sidebar.tsx")
  })

  it("returns prefix matches before substring matches", () => {
    const results = fuzzySearch("side", files)
    expect(results[0].name).toBe("sidebar.tsx")
  })

  it("excludes files with no match", () => {
    expect(fuzzySearch("zzz", files)).toHaveLength(0)
  })

  it("matches by char sequence across the full path", () => {
    const results = fuzzySearch("sc/si", files)
    expect(results.some((r) => r.name === "sidebar.tsx")).toBe(true)
  })

  it("preserves extra properties from extended entries (e.g. handle)", () => {
    const fakeHandle = { kind: "file" } as unknown as FileSystemFileHandle
    const extended = [{ name: "README.md", path: "README.md", handle: fakeHandle }]
    const results = fuzzySearch("read", extended)
    expect(results[0].handle).toBe(fakeHandle)
  })

  it("is case-insensitive", () => {
    const results = fuzzySearch("README", files)
    expect(results).toHaveLength(1)
    expect(results[0].name).toBe("README.md")
  })

  it("sorts ties alphabetically by path", () => {
    const tied = [
      { name: "b.md", path: "b.md" },
      { name: "a.md", path: "a.md" },
    ]
    const results = fuzzySearch("m", tied) // both have "m" as substring
    expect(results[0].path).toBe("a.md")
    expect(results[1].path).toBe("b.md")
  })
})
