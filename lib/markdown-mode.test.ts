import { beforeEach, describe, expect, it, vi } from "vitest"
import { stubChromeStorage } from "./test-harness"

import {
  clampSplitPercent,
  DEFAULT_PANE_WIDTH_PREFERENCES,
  DEFAULT_SPLIT_PERCENT,
  getMarkdownMode,
  getPaneWidthPreferences,
  getSplitMinWidth,
  getSplitPercent,
  getModeSurfaces,
  MARKDOWN_MODE_STORAGE_KEY,
  MIN_SPLIT_PANE_WIDTH,
  PREVIEW_FULL_WIDTH_STORAGE_KEY,
  PREVIEW_WIDTH_STORAGE_KEY,
  getOutlineOpenPreference,
  OUTLINE_OPEN_STORAGE_KEY,
  resolveInitialSidebarState,
  resolveModeTransition,
  setMarkdownMode,
  setPreviewWidthPreference,
  setSourceFullWidthPreference,
  setSplitPercent,
  SPLIT_PERCENT_STORAGE_KEY,
  SOURCE_FULL_WIDTH_STORAGE_KEY,
  shouldSyncDraftFromContent,
  toggleSourceMode,
  type MarkdownMode,
} from "./markdown-mode"

const storageGet = vi.fn()
const storageSet = vi.fn()

beforeEach(() => {
  storageGet.mockReset()
  storageSet.mockReset()
  vi.stubGlobal("chrome", {
    storage: {
      local: {
        get: storageGet,
        set: storageSet,
      },
    },
  })
})

describe("Markdown modes", () => {
  it("starts restored Split mode with sidebars closed before the first paint", () => {
    expect(resolveInitialSidebarState({
      mode: "split",
      isMarkdown: true,
      outlineOpenByDefault: true,
    })).toEqual({
      leftOpen: false,
      outlineOpen: false,
      stateBeforeSplit: {
        leftOpen: true,
        outlineOpen: true,
      },
      wasSplitView: true,
    })
  })

  it.each([
    [true, true],
    [false, false],
    [undefined, null],
    ["hidden", null],
  ])("restores a stored outline preference (%s) after a reload", async (stored, expected) => {
    storageGet.mockResolvedValue({ [OUTLINE_OPEN_STORAGE_KEY]: stored })

    await expect(getOutlineOpenPreference()).resolves.toBe(expected)
  })

  it("restores Split mode from browser storage after a reload", async () => {
    storageGet.mockResolvedValue({ [MARKDOWN_MODE_STORAGE_KEY]: "split" })

    await expect(getMarkdownMode()).resolves.toBe("split")
  })

  it.each([undefined, "side-by-side", null])(
    "defaults an invalid stored mode (%s) to Preview",
    async (storedMode) => {
      storageGet.mockResolvedValue({
        [MARKDOWN_MODE_STORAGE_KEY]: storedMode,
      })

      await expect(getMarkdownMode()).resolves.toBe("preview")
    },
  )

  it("restores a dragged split position after a reload", async () => {
    storageGet.mockResolvedValue({ [SPLIT_PERCENT_STORAGE_KEY]: 37.5 })

    await expect(getSplitPercent()).resolves.toBe(37.5)
  })

  it.each([undefined, null, "60", 0, 100, Number.NaN])(
    "falls back to an even split for an unusable stored position (%s)",
    async (stored) => {
      storageGet.mockResolvedValue({ [SPLIT_PERCENT_STORAGE_KEY]: stored })

      await expect(getSplitPercent()).resolves.toBe(DEFAULT_SPLIT_PERCENT)
    },
  )

  it("saves the split position for the next reload", async () => {
    storageSet.mockResolvedValue(undefined)

    await setSplitPercent(62)

    expect(storageSet).toHaveBeenCalledWith({ [SPLIT_PERCENT_STORAGE_KEY]: 62 })
  })

  it("saves the selected Markdown mode for the next reload", async () => {
    storageSet.mockResolvedValue(undefined)

    await setMarkdownMode("split")

    expect(storageSet).toHaveBeenCalledWith({
      [MARKDOWN_MODE_STORAGE_KEY]: "split",
    })
  })

  it("restores independent Preview and Source width preferences", async () => {
    storageGet.mockResolvedValue({
      [PREVIEW_FULL_WIDTH_STORAGE_KEY]: true,
      [SOURCE_FULL_WIDTH_STORAGE_KEY]: false,
    })

    await expect(getPaneWidthPreferences()).resolves.toEqual({
      previewWidth: "full",
      sourceFullWidth: false,
    })
    expect(storageGet).toHaveBeenCalledWith([
      PREVIEW_WIDTH_STORAGE_KEY,
      PREVIEW_FULL_WIDTH_STORAGE_KEY,
      SOURCE_FULL_WIDTH_STORAGE_KEY,
    ])
  })

  it("keeps the existing width defaults when preferences are missing or invalid", async () => {
    storageGet.mockResolvedValue({
      [PREVIEW_FULL_WIDTH_STORAGE_KEY]: "true",
      [SOURCE_FULL_WIDTH_STORAGE_KEY]: null,
    })

    await expect(getPaneWidthPreferences()).resolves.toEqual(
      DEFAULT_PANE_WIDTH_PREFERENCES,
    )
  })

  it("saves each pane width without overwriting the other", async () => {
    storageSet.mockResolvedValue(undefined)

    await setPreviewWidthPreference("narrow")
    await setSourceFullWidthPreference(false)

    expect(storageSet).toHaveBeenNthCalledWith(1, {
      [PREVIEW_WIDTH_STORAGE_KEY]: "narrow",
    })
    expect(storageSet).toHaveBeenNthCalledWith(2, {
      [SOURCE_FULL_WIDTH_STORAGE_KEY]: false,
    })
  })

  it.each<[MarkdownMode, boolean, boolean]>([
    ["preview", true, false],
    ["source", false, true],
    ["split", true, true],
  ])("%s exposes the intended surfaces", (mode, preview, source) => {
    expect(getModeSurfaces(mode)).toEqual({ preview, source })
  })

  it("toggles Preview and Source with Split returning to Preview", () => {
    expect(toggleSourceMode("preview")).toBe("source")
    expect(toggleSourceMode("source")).toBe("preview")
    expect(toggleSourceMode("split")).toBe("preview")
  })

  it("seeds Source from Preview content", () => {
    expect(resolveModeTransition({
      currentMode: "preview",
      nextMode: "source",
      content: "# Current",
      draft: "# Stale",
    })).toEqual({
      mode: "source",
      content: "# Current",
      draft: "# Current",
    })
  })

  it("applies the latest draft when Split or Preview becomes visible", () => {
    expect(resolveModeTransition({
      currentMode: "source",
      nextMode: "split",
      content: "# Old",
      draft: "# New",
    })).toEqual({
      mode: "split",
      content: "# New",
      draft: "# New",
    })

    expect(resolveModeTransition({
      currentMode: "split",
      nextMode: "preview",
      content: "# Slightly old",
      draft: "# Latest",
    })).toEqual({
      mode: "preview",
      content: "# Latest",
      draft: "# Latest",
    })
  })

  it("does not feed a Split preview update back into the active draft", () => {
    expect(shouldSyncDraftFromContent({
      content: "# Slightly old",
      isMarkdown: true,
      sourceVisible: true,
      isSplitView: true,
      hasPendingDraftSync: false,
    })).toBe(false)
  })

  it("syncs the draft when a file loads in Split mode", () => {
    expect(shouldSyncDraftFromContent({
      content: "# New file",
      isMarkdown: true,
      sourceVisible: true,
      isSplitView: true,
      hasPendingDraftSync: true,
    })).toBe(true)
  })

  it("keeps both panes at least 320px wide", () => {
    expect(clampSplitPercent(10, 1000)).toBe(32)
    expect(clampSplitPercent(90, 1000)).toBe(68)
    expect(clampSplitPercent(55, 1000)).toBe(55)
  })

  it("allows keyboard-sized divider steps within the bounds", () => {
    expect(clampSplitPercent(50 - 5, 1000)).toBe(45)
    expect(clampSplitPercent(50 + 5, 1000)).toBe(55)
  })

  it("centers panes when the container cannot fit both minimums", () => {
    expect(clampSplitPercent(75, 600)).toBe(50)
  })
})

describe("getSplitMinWidth", () => {
  it("fits both minimum panes at an even split", () => {
    expect(getSplitMinWidth(50)).toBe(MIN_SPLIT_PANE_WIDTH * 2)
  })

  it("grows so the narrower pane keeps its minimum width", () => {
    expect(getSplitMinWidth(25)).toBe(MIN_SPLIT_PANE_WIDTH * 4)
    expect(getSplitMinWidth(80)).toBe(MIN_SPLIT_PANE_WIDTH * 5)
  })
})

describe("Preview page width", () => {
  it.each([
    [true, "full"],
    [false, "standard"],
    [undefined, "standard"],
  ])("preserves the legacy Full width choice (%s)", async (legacy, expected) => {
    stubChromeStorage({ [PREVIEW_FULL_WIDTH_STORAGE_KEY]: legacy })

    expect((await getPaneWidthPreferences()).previewWidth).toBe(expected)
  })

  it.each(["narrow", "standard", "full"] as const)("remembers %s across loads without changing Source", async (width) => {
    const storage = stubChromeStorage({
      [PREVIEW_FULL_WIDTH_STORAGE_KEY]: true,
      [SOURCE_FULL_WIDTH_STORAGE_KEY]: false,
    })

    await setPreviewWidthPreference(width)

    expect(await getPaneWidthPreferences()).toEqual({ previewWidth: width, sourceFullWidth: false })
    expect(storage.data[SOURCE_FULL_WIDTH_STORAGE_KEY]).toBe(false)
  })

  it("falls back to the legacy choice when the new preference is invalid", async () => {
    stubChromeStorage({
      [PREVIEW_WIDTH_STORAGE_KEY]: "wide",
      [PREVIEW_FULL_WIDTH_STORAGE_KEY]: true,
    })

    expect((await getPaneWidthPreferences()).previewWidth).toBe("full")
  })
})
