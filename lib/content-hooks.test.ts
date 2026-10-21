// @vitest-environment jsdom

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { act,useState,type RefObject } from "react"
import { afterEach,beforeEach,describe,expect,it,vi } from "vitest"

import { useContentPreferences } from "../hooks/use-content-preferences"
import { useContentReadability } from "../hooks/use-content-readability"
import { useContentReload } from "../hooks/use-content-reload"
import {
  REVIEW_OVERLAY_OPEN_KEY_PREFIX,
  REVIEW_OVERLAY_POSITION_KEY_PREFIX,
  useContentReviewOverlay
} from "../hooks/use-content-review-overlay"
import { useContentReviewPrompt,useReviewPromptActivity } from "../hooks/use-content-review-prompt"
import { useContentSave } from "../hooks/use-content-save"
import { useContentSelection } from "../hooks/use-content-selection"
import { useContentSplitPane } from "../hooks/use-content-split-pane"
import { readFileFromDisk } from "./file-reload"
import { SPLIT_PERCENT_STORAGE_KEY } from "./markdown-mode"
import type { ReadabilityResult } from "./readability"
import { claimReviewPrompt,recordReviewPromptEvent } from "./review-prompt"
import {
  flush,
  renderHook,
  stubChromeStorage,
  stubMatchMedia,
  stubResizeObserver
} from "./test-harness"
import { TYPEFACE_STORAGE_KEY,TYPEFACES } from "./typeface"

vi.mock("./review-prompt", () => ({
  recordReviewPromptEvent: vi.fn(async () => true),
  claimReviewPrompt: vi.fn(async () => true),
  stopAutomaticReviewPrompts: vi.fn(async () => undefined),
}))

vi.mock("./file-reload", () => ({
  readFileFromDisk: vi.fn(),
}))

const FILE_A = "file:///docs/a.md"
const FILE_B = "file:///docs/b.md"

function elementWithWidth(width: number) {
  const element = document.createElement("div")
  element.getBoundingClientRect = () => ({ width, height: 600, left: 0, top: 0, right: width, bottom: 600, x: 0, y: 0, toJSON: () => ({}) })
  return element
}

function refTo<T>(current: T) {
  return { current } as RefObject<T>
}

beforeEach(() => {
  stubResizeObserver()
  stubMatchMedia(false)
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callback(0)
    return 0
  })
})

afterEach(() => {
  vi.clearAllMocks()
  vi.useRealTimers()
  document.documentElement.className = ""
})

describe("useContentPreferences", () => {
  it("follows the system theme only when no theme was chosen", () => {
    stubChromeStorage()
    const media = stubMatchMedia(true)
    const followed = renderHook(useContentPreferences, null)
    expect(followed.result.current.dark).toBe(true)
    expect(document.documentElement.classList.contains("dark")).toBe(true)
    act(() => media.change(false))
    expect(followed.result.current.dark).toBe(false)
    expect(document.documentElement.classList.contains("dark")).toBe(false)
    followed.unmount()

    const chosen = renderHook(useContentPreferences, true)
    act(() => media.change(false))
    expect(chosen.result.current.dark).toBe(true)
  })

  it("applies stored heading numbering and typeface, then later changes", async () => {
    const storage = stubChromeStorage({ numberHeadings: true, [TYPEFACE_STORAGE_KEY]: "serif" })
    const { result } = renderHook(useContentPreferences, null)
    await flush()
    expect(result.current.numberHeadings).toBe(true)
    expect(document.documentElement.style.getPropertyValue("--markside-prose-font")).toBe(TYPEFACES.serif.stack)

    await act(() => storage.set({ numberHeadings: false, [TYPEFACE_STORAGE_KEY]: "sans" }))
    expect(result.current.numberHeadings).toBe(false)
    expect(document.documentElement.style.getPropertyValue("--markside-prose-font")).toBe(TYPEFACES.sans.stack)
  })
})

describe("useContentReviewOverlay", () => {
  const options = (overrides: Partial<Parameters<typeof useContentReviewOverlay>[0]> = {}) => ({
    fileUrl: FILE_A,
    isMdFile: true,
    isSplitView: false,
    outlineOpen: false,
    rightSidebarWidth: 300,
    sidebarInsetRef: refTo(elementWithWidth(2000)),
    ...overrides,
  })

  it("restores the open state and position saved for each file", async () => {
    stubChromeStorage({
      [`${REVIEW_OVERLAY_OPEN_KEY_PREFIX}${FILE_A}`]: true,
      [`${REVIEW_OVERLAY_POSITION_KEY_PREFIX}${FILE_A}`]: { x: 12, y: 34 },
    })
    const { result, rerender } = renderHook(useContentReviewOverlay, options())
    await flush()
    expect(result.current.reviewOverlayOpen).toBe(true)
    expect(result.current.reviewOverlayPosition).toEqual({ x: 12, y: 34 })

    rerender(options({ fileUrl: FILE_B }))
    await flush()
    expect(result.current.reviewOverlayOpen).toBe(false)
    expect(result.current.reviewOverlayPosition).toBeNull()
  })

  it("remembers whether the overlay is open for Markdown files only", async () => {
    const storage = stubChromeStorage()
    const markdown = renderHook(useContentReviewOverlay, options())
    await flush()
    act(() => markdown.result.current.setReviewOverlayOpen(true))
    await flush()
    expect(storage.data[`${REVIEW_OVERLAY_OPEN_KEY_PREFIX}${FILE_A}`]).toBe(true)
    markdown.unmount()

    const code = renderHook(useContentReviewOverlay, options({ fileUrl: "file:///docs/a.ts", isMdFile: false }))
    await flush()
    act(() => code.result.current.setReviewOverlayOpen(true))
    await flush()
    expect(storage.data).not.toHaveProperty(`${REVIEW_OVERLAY_OPEN_KEY_PREFIX}file:///docs/a.ts`)
  })

  it("floats by default and remembers explicit docking and width across files", async () => {
    const storage = stubChromeStorage()
    const wide = renderHook(useContentReviewOverlay, options())
    await flush()
    act(() => wide.result.current.setReviewOverlayOpen(true))
    expect(wide.result.current.reviewOverlayDocked).toBe(false)
    act(() => wide.result.current.toggleReviewDock())
    act(() => wide.result.current.resizeReviewDock(460))
    act(() => wide.result.current.saveReviewDockWidth(460))
    await flush()
    expect(wide.result.current.reviewOverlayDocked).toBe(true)
    expect(storage.data.reviewLayout).toBe("docked")
    expect(storage.data.reviewDockWidth).toBe(460)
    wide.rerender(options({ fileUrl: FILE_B, isSplitView: true, outlineOpen: true }))
    await flush()
    act(() => wide.result.current.setReviewOverlayOpen(true))
    expect(wide.result.current.reviewOverlayDocked).toBe(true)
    expect(wide.result.current.reviewDockWidth).toBe(460)
    wide.unmount()

    const restored = renderHook(useContentReviewOverlay, options())
    await flush()
    act(() => restored.result.current.setReviewOverlayOpen(true))
    expect(restored.result.current.reviewOverlayDocked).toBe(true)
    expect(restored.result.current.reviewDockWidth).toBe(460)
  })

  it("temporarily floats in narrow layouts without clearing the docking preference", async () => {
    const storage = stubChromeStorage({ reviewLayout: "docked", reviewDockWidth: 448 })
    const narrow = renderHook(useContentReviewOverlay, options({ sidebarInsetRef: refTo(elementWithWidth(900)) }))
    await flush()
    act(() => narrow.result.current.setReviewOverlayOpen(true))
    expect(narrow.result.current.reviewOverlayDocked).toBe(false)
    expect(narrow.result.current.reviewLayout).toBe("docked")
    expect(storage.data.reviewLayout).toBe("docked")
  })

  it("returns focus to the Review button when closed from the keyboard", async () => {
    stubChromeStorage()
    const { result } = renderHook(useContentReviewOverlay, options())
    await flush()
    const trigger = document.createElement("button")
    document.body.append(trigger)
    result.current.reviewTriggerRef.current = trigger
    act(() => result.current.setReviewOverlayOpen(true))
    act(() => result.current.closeReviewOverlay(true))
    expect(result.current.reviewOverlayOpen).toBe(false)
    expect(document.activeElement).toBe(trigger)
    trigger.remove()
  })

  it("cycles the overlay size", async () => {
    stubChromeStorage()
    const { result } = renderHook(useContentReviewOverlay, options())
    expect(result.current.reviewOverlaySize).toBe("compact")
    act(() => result.current.setReviewOverlaySize(result.current.nextReviewOverlaySize))
    expect(result.current.reviewOverlaySize).toBe("standard")
  })
})

describe("useContentSplitPane", () => {
  function useSplitWithSidebars({ isSplitView }: { isSplitView: boolean }) {
    const [leftOpen, setLeftOpen] = useState(true)
    const [outlineOpen, setOutlineOpen] = useState(true)
    const split = useContentSplitPane({
      initialSplitPercent: 50,
      initialSidebarState: { stateBeforeSplit: null, wasSplitView: false },
      isSplitView,
      leftOpen,
      setLeftOpen,
      outlineOpen,
      setOutlineOpen,
    })
    return { split, leftOpen, outlineOpen, setLeftOpen }
  }

  it("closes both sidebars in Split and restores them afterwards", () => {
    stubChromeStorage()
    const { result, rerender } = renderHook(useSplitWithSidebars, { isSplitView: false })
    act(() => result.current.setLeftOpen(false))
    rerender({ isSplitView: true })
    expect(result.current).toMatchObject({ leftOpen: false, outlineOpen: false })
    rerender({ isSplitView: false })
    expect(result.current).toMatchObject({ leftOpen: false, outlineOpen: true })
  })

  it("stores the keyboard-adjusted split within the pane limits", async () => {
    const storage = stubChromeStorage()
    const { result } = renderHook(useSplitWithSidebars, { isSplitView: true })
    ;(result.current.split.splitContainerRef as { current: HTMLDivElement }).current =
      elementWithWidth(1000) as HTMLDivElement
    act(() => result.current.split.adjustSplitBy(10))
    await flush()
    expect(result.current.split.previewPercent).toBe(60)
    expect(storage.data[SPLIT_PERCENT_STORAGE_KEY]).toBe(60)
    act(() => result.current.split.adjustSplitBy(50))
    expect(result.current.split.previewPercent).toBe(68)
  })
})

describe("useContentReviewPrompt", () => {
  function usePrompt({ fileUrl, blocked }: { fileUrl: string; blocked: boolean }) {
    const activity = useReviewPromptActivity()
    return useContentReviewPrompt({ activity, fileUrl, content: "# Plan", error: null, blocked })
  }

  it("waits until no other dialog is open before claiming the prompt", async () => {
    const { result, rerender } = renderHook(usePrompt, { fileUrl: FILE_A, blocked: true })
    await flush()
    expect(recordReviewPromptEvent).toHaveBeenCalledWith("file-open")
    expect(claimReviewPrompt).not.toHaveBeenCalled()
    expect(result.current.reviewPromptOpen).toBe(false)

    rerender({ fileUrl: FILE_A, blocked: false })
    await flush()
    expect(claimReviewPrompt).toHaveBeenCalledTimes(1)
    expect(result.current.reviewPromptOpen).toBe(true)

    act(() => result.current.dismissReviewPrompt())
    expect(result.current.reviewPromptOpen).toBe(false)
  })

  it("records one file-open per file", async () => {
    const { rerender } = renderHook(usePrompt, { fileUrl: FILE_A, blocked: true })
    rerender({ fileUrl: FILE_A, blocked: true })
    rerender({ fileUrl: FILE_B, blocked: true })
    await flush()
    expect(recordReviewPromptEvent).toHaveBeenCalledTimes(2)
  })
})

describe("useContentReadability", () => {
  const result = (id: string) => ({ id }) as ReadabilityResult
  const options = (overrides: Partial<Parameters<typeof useContentReadability>[0]> = {}) => ({
    fileUrl: FILE_A,
    content: "# Plan\n\nBody",
    review: null,
    updateReview: vi.fn(),
    reviewForMutation: vi.fn(),
    currentReviewDocument: () => null,
    setSelectedReviewId: vi.fn(),
    setReviewOverlayOpen: vi.fn(),
    trackReviewPromptActivity: vi.fn(),
    ...overrides,
  })

  it("loads and saves results for the current file only", async () => {
    const storage = stubChromeStorage({
      [`readability:${FILE_A}`]: [result("a")],
      [`readability:${FILE_B}`]: [result("b")],
    })
    const hook = renderHook(useContentReadability, options())
    await flush()
    expect(hook.result.current.readabilityResultsRef.current).toEqual([result("a")])

    hook.rerender(options({ fileUrl: FILE_B }))
    await flush()
    expect(hook.result.current.readabilityResultsRef.current).toEqual([result("b")])

    act(() => hook.result.current.saveReadabilityResults([result("b2")]))
    expect(storage.data[`readability:${FILE_B}`]).toEqual([result("b2")])
    expect(storage.data[`readability:${FILE_A}`]).toEqual([result("a")])
  })

  it("sends nothing until the user consents", async () => {
    const storage = stubChromeStorage()
    const { result: hook } = renderHook(useContentReadability, options())
    await flush()
    const [section] = hook.current.readabilitySections
    await expect(hook.current.runReadabilityCheck(section)).rejects.toThrow("Confirm before sending")
    act(() => hook.current.confirmReadabilityConsent())
    expect(storage.data.readabilityConsentGranted).toBe(true)
    expect(hook.current.readabilityConsentGranted).toBe(true)
  })

  it("detects a single top-level heading", () => {
    stubChromeStorage()
    const single = renderHook(useContentReadability, options())
    expect(single.result.current.hasSingleH1).toBe(true)
    single.rerender(options({ content: "# One\n\n# Two" }))
    expect(single.result.current.hasSingleH1).toBe(false)
  })
})

describe("useContentReload", () => {
  function setup(overrides: { mode?: "preview" | "source" } = {}) {
    stubChromeStorage()
    const refs = {
      draftRef: { current: "old" },
      fileUrlRef: { current: FILE_A },
      fileHandleRef: { current: null },
      diskContentRef: { current: "old" as string | null },
      diskLastModifiedRef: { current: 0 },
      hasUnsavedDraftRef: { current: false },
    }
    const setters = {
      setMode: vi.fn(),
      setContent: vi.fn(),
      setDraft: vi.fn(),
      setError: vi.fn(),
      setImageObjectUrl: vi.fn(),
      setImageReloadVersion: vi.fn(),
      setSaveState: vi.fn(),
      setConflict: vi.fn(),
      setCopyReviewStatus: vi.fn(),
      cancelPreviewUpdate: vi.fn(),
      cancelScheduledSave: vi.fn(),
      closeSelectionComposer: vi.fn(),
    }
    const options = (content: string, fileUrl = FILE_A) => ({
      fileUrl,
      isMdFile: true,
      isImageFile: false,
      mode: overrides.mode ?? "preview",
      content,
      ...refs,
      ...setters,
    })
    const hook = renderHook(useContentReload, options("old"))
    return { hook, refs, setters, options }
  }

  it("asks before replacing an unsaved draft", () => {
    const { hook, refs } = setup()
    refs.hasUnsavedDraftRef.current = true
    act(() => hook.result.current.requestReloadFromDisk())
    expect(hook.result.current.reloadConfirmOpen).toBe(true)
    expect(readFileFromDisk).not.toHaveBeenCalled()
  })

  it("increments the explicit reload version even when the source text is unchanged", async () => {
    vi.mocked(readFileFromDisk).mockResolvedValue({ text: "old", buffer: null, type: "", lastModified: 7 })
    const { hook } = setup()
    expect(hook.result.current.reloadVersion).toBe(0)
    await act(() => hook.result.current.handleReloadFromDisk())
    expect(hook.result.current.reloadVersion).toBe(1)
    vi.mocked(readFileFromDisk).mockRejectedValueOnce(new Error("File unavailable"))
    await act(() => hook.result.current.handleReloadFromDisk())
    expect(hook.result.current.reloadVersion).toBe(1)
    hook.unmount()
  })

  it("replaces the draft with disk text and shows what changed", async () => {
    vi.mocked(readFileFromDisk).mockResolvedValue({ text: "new", buffer: null, type: "", lastModified: 7 })
    const { hook, refs, setters, options } = setup({ mode: "source" })
    await act(() => hook.result.current.handleReloadFromDisk())
    expect(setters.setContent).toHaveBeenCalledWith("new")
    expect(setters.setDraft).toHaveBeenCalledWith("new")
    expect(setters.setMode).toHaveBeenCalledWith("preview")
    expect(refs.draftRef.current).toBe("new")
    expect(refs.diskContentRef.current).toBe("new")
    expect(refs.diskLastModifiedRef.current).toBe(7)
    expect(hook.result.current.reloadComparison).toEqual({ before: "old", after: "new" })

    hook.rerender(options("new"))
    expect(hook.result.current.changesVisible).toBe(true)
    act(() => hook.result.current.clearReloadChanges())
    expect(hook.result.current.changesVisible).toBe(false)
  })

  it("keeps a draft that changed while the file was reloading", async () => {
    const { hook, refs, setters } = setup()
    vi.mocked(readFileFromDisk).mockImplementation(async () => {
      refs.draftRef.current = "typed during reload"
      return { text: "new", buffer: null, type: "", lastModified: 7 }
    })
    await act(() => hook.result.current.handleReloadFromDisk())
    expect(setters.setContent).not.toHaveBeenCalled()
    expect(setters.setError).toHaveBeenCalledWith("The draft changed while reloading. Try Reload again.")
    expect(refs.draftRef.current).toBe("typed during reload")
  })

  it("flags a file that changed on disk when the tab regains focus", async () => {
    vi.mocked(readFileFromDisk).mockResolvedValue({ text: "old", buffer: null, type: "", lastModified: 7 })
    const { hook, refs, setters } = setup()
    act(() => { window.dispatchEvent(new Event("focus")) })
    await flush()
    expect(hook.result.current.diskChanged).toBe(false)

    vi.mocked(readFileFromDisk).mockResolvedValue({ text: "new", buffer: null, type: "", lastModified: 7 })
    act(() => { window.dispatchEvent(new Event("focus")) })
    await flush()
    expect(hook.result.current.diskChanged).toBe(true)
    expect(setters.setContent).not.toHaveBeenCalled()
    expect(refs.diskContentRef.current).toBe("old")

    await act(() => hook.result.current.handleReloadFromDisk())
    expect(hook.result.current.diskChanged).toBe(false)
    hook.unmount()
  })

  it("ignores a focus check that finishes after the file was saved", async () => {
    const { hook, refs } = setup()
    vi.mocked(readFileFromDisk).mockImplementation(async () => {
      refs.diskContentRef.current = "saved"
      return { text: "saved", buffer: null, type: "", lastModified: 7 }
    })
    act(() => { window.dispatchEvent(new Event("focus")) })
    await flush()
    expect(hook.result.current.diskChanged).toBe(false)
    hook.unmount()
  })

  it("clears the comparison when another file opens", async () => {
    vi.mocked(readFileFromDisk).mockResolvedValue({ text: "new", buffer: null, type: "", lastModified: 7 })
    const { hook, options } = setup()
    await act(() => hook.result.current.handleReloadFromDisk())
    hook.rerender(options("new", FILE_B))
    expect(hook.result.current.reloadComparison).toBeNull()
    expect(hook.result.current.hasReloadChanges).toBe(false)
  })
})

describe("useContentSave", () => {
  function options(overrides: Partial<Parameters<typeof useContentSave>[0]> = {}) {
    return {
      saveState: "idle" as const,
      setSaveState: vi.fn(),
      fileHandleRef: { current: null },
      setSaveFolderDialogOpen: vi.fn(),
      diskLastModifiedRef: { current: 0 },
      setConflict: vi.fn(),
      diskContentRef: { current: null },
      draftRef: { current: "" },
      fileUrlRef: { current: FILE_A },
      hasUnsavedDraftRef: { current: false },
      trackReviewPromptActivity: vi.fn(),
      setReviewPromptReady: vi.fn(),
      ...overrides,
    }
  }

  it("warns before leaving the page with an unsaved draft", () => {
    stubChromeStorage()
    const hasUnsavedDraftRef = { current: false }
    renderHook(useContentSave, options({ hasUnsavedDraftRef }))
    const leave = () => {
      const event = new Event("beforeunload", { cancelable: true })
      window.dispatchEvent(event)
      return event.defaultPrevented
    }
    expect(leave()).toBe(false)
    hasUnsavedDraftRef.current = true
    expect(leave()).toBe(true)
  })

  it("settles Saved back to idle and offers the Review prompt", () => {
    vi.useFakeTimers()
    stubChromeStorage()
    const setSaveState = vi.fn()
    const setReviewPromptReady = vi.fn()
    renderHook(useContentSave, options({ saveState: "saved", setSaveState, setReviewPromptReady }))
    act(() => vi.advanceTimersByTime(900))
    expect(setReviewPromptReady).toHaveBeenCalledWith(true)
    act(() => vi.advanceTimersByTime(900))
    const settle = setSaveState.mock.calls.at(-1)?.[0] as (current: string) => string
    expect(settle("saved")).toBe("idle")
    expect(settle("unsaved")).toBe("unsaved")
  })
})

describe("useContentSelection", () => {
  const options = (fileUrl = FILE_A) => ({
    fileUrl,
    content: "# Plan",
    isMdFile: true,
    previewVisible: true,
    contentRef: refTo(document.createElement("div") as HTMLDivElement),
    previewScrollRef: refTo(document.createElement("div") as HTMLDivElement),
  })

  it("inserts a preset at the cursor and clears it all on close", () => {
    const { result } = renderHook(useContentSelection, options())
    act(() => result.current.openSelectionComposer())
    act(() => result.current.insertSelectionComposerPreset("Explain this."))
    expect(result.current.selectionComposerOpen).toBe(true)
    expect(result.current.selectionComposerBody).toBe("Explain this.")

    act(() => result.current.closeSelectionComposer())
    expect(result.current.selectionComposerOpen).toBe(false)
    expect(result.current.selectionComposerBody).toBe("")
    expect(result.current.selectionAction).toBeNull()
  })

  it("closes the composer when another file opens", () => {
    const { result, rerender } = renderHook(useContentSelection, options())
    act(() => result.current.openSelectionComposer())
    act(() => result.current.setSelectionComposerBody("Draft"))
    rerender(options(FILE_B))
    expect(result.current.selectionComposerOpen).toBe(false)
    expect(result.current.selectionComposerBody).toBe("")
  })
})

describe("content app hook order", () => {
  const source = readFileSync(join(process.cwd(), "components/content-app.tsx"), "utf8")
  const callIndex = (hook: string) => {
    const index = source.indexOf(`= ${hook}(`) >= 0 ? source.indexOf(`= ${hook}(`) : source.indexOf(`  ${hook}(`)
    expect(index, `${hook} is called in content-app.tsx`).toBeGreaterThan(-1)
    return index
  }

  // These hooks' effects read the preview DOM, so React must run them after
  // the preview render effect in the same commit.
  it.each([
    "useContentReviewHighlights",
    "useContentPdfExport",
    "useContentReview",
    "useWikilinkNavigation",
  ])("calls %s after useContentPreview", (hook) => {
    expect(callIndex(hook)).toBeGreaterThan(callIndex("useContentPreview"))
  })

  it("calls useContentReview after the highlights it reads", () => {
    expect(callIndex("useContentReview")).toBeGreaterThan(callIndex("useContentReviewHighlights"))
  })
})
