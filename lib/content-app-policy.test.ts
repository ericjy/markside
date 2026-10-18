import { describe, expect, it } from "vitest"

import {
  getContentFileSurfaces,
  getSavePathParts,
  isFilePaletteShortcut,
  isSaveShortcut,
  isToggleSourceShortcut,
} from "./content-app-policy"
import { resolveModeTransition, toggleSourceMode } from "./markdown-mode"

describe("content application characterization", () => {
  it("copies the preview into Source and preserves the edited draft when returning", () => {
    expect(resolveModeTransition({ currentMode: "preview", nextMode: "source", content: "disk", draft: "old" }))
      .toEqual({ mode: "source", content: "disk", draft: "disk" })
    expect(resolveModeTransition({ currentMode: "source", nextMode: "preview", content: "disk", draft: "edited" }))
      .toEqual({ mode: "preview", content: "edited", draft: "edited" })
    expect(resolveModeTransition({ currentMode: "source", nextMode: "split", content: "disk", draft: "edited" }))
      .toEqual({ mode: "split", content: "edited", draft: "edited" })
    expect(toggleSourceMode("split")).toBe("preview")
  })

  it.each([
    ["file:///docs/a.md", "preview", false, true, false],
    ["file:///docs/a.md", "source", false, false, true],
    ["file:///docs/a.md", "split", false, true, true],
    ["file:///docs/a.ts", "preview", false, false, true],
    ["file:///docs/a.pdf", "split", false, false, true],
    ["file:///docs/a.PNG", "source", true, false, false],
    ["file:///docs/a.MD", "preview", false, false, true],
  ] as const)("routes %s in %s", (url, mode, image, preview, source) => {
    expect(getContentFileSurfaces(url, mode)).toMatchObject({ isImageFile: image, previewVisible: preview, sourceVisible: source })
  })

  it("resolves the decoded save path inside the matching folder", () => {
    expect(getSavePathParts("file:///docs/nested/a%20b.md#heading", "file:///docs/"))
      .toEqual(["nested", "a b.md"])
    expect(getSavePathParts("file:///docs-other/a.md", "file:///docs/")).toBeNull()
    expect(getSavePathParts("file:///docs/", "file:///docs/")).toBeNull()
    expect(getSavePathParts("file:///docs/%23notes/a%3Fb.md", "file:///docs/%23notes/"))
      .toEqual(["a?b.md"])
  })

  it("keeps shortcut modifier and case behavior", () => {
    const key = { key: "s", ctrlKey: true, metaKey: false }
    expect(isSaveShortcut(key)).toBe(true)
    expect(isSaveShortcut({ ...key, ctrlKey: false, metaKey: true })).toBe(true)
    expect(isSaveShortcut({ ...key, key: "S" })).toBe(false)
    expect(isSaveShortcut({ ...key, ctrlKey: false })).toBe(false)
    expect(isToggleSourceShortcut({ ...key, key: "e" }, true)).toBe(true)
    expect(isToggleSourceShortcut({ ...key, key: "e", metaKey: true }, true)).toBe(false)
    expect(isToggleSourceShortcut({ ...key, key: "e" }, false)).toBe(false)
    expect(isFilePaletteShortcut({ ...key, key: "p" }, "granted")).toBe(true)
    expect(isFilePaletteShortcut({ ...key, key: "p" }, "prompt")).toBe(false)
  })
})
