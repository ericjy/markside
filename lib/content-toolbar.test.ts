// @vitest-environment jsdom
import { act, createElement, useState, type ComponentProps } from "react"
import { createRoot } from "react-dom/client"
import { expect, it, vi } from "vitest"
import { ContentToolbar } from "../components/content-toolbar"
import { SidebarProvider } from "../components/ui/sidebar"
import { flush, stubChromeStorage, stubMatchMedia } from "./test-harness"
import { getPaneWidthPreferences } from "./markdown-mode"
import { getTypeface, TYPEFACES } from "./typeface"
import { useContentPreferences } from "../hooks/use-content-preferences"

function toolbarProps(): ComponentProps<typeof ContentToolbar> {
  const noop = vi.fn()
  return {
    leftOpen: false, hasMore: false, crumbs: ["PLAN.md"], crumbUrls: [],
    fileUrl: "file:///docs/PLAN.md", setCopied: noop, copied: false,
    isAddressBarSynced: true, navigateTabToFile: noop, currentFileName: "PLAN.md", addressBarFileName: "PLAN.md",
    sourceVisible: false, saveState: "idle", cancelScheduledSave: noop, doSave: async () => true,
    draftRef: { current: "" }, reloadTriggerRef: { current: null }, requestReloadFromDisk: noop,
    reloadLoading: false, content: "Plan", diskChanged: false, previewVisible: true, selectMode: noop,
    isMdFile: true, mode: "preview", dark: false, followsSystemThemeRef: { current: true }, setDark: noop,
    reviewTriggerRef: { current: null }, reviewOverlayOpen: false, closeReviewOverlay: noop,
    setReviewOverlayOpen: noop, reviewItemCount: 2, chooseOutlineOpen: noop, outlineOpen: false,
    requestLinkSnapshot: noop, fileMenuTriggerRef: { current: null }, fileMenuPointerInteractionRef: { current: false },
    typeface: "sans", previewWidth: "standard", setPreviewWidth: noop, numberHeadings: false, setNumberHeadings: noop,
    readabilityControlsVisible: false, setReadabilityControlsVisible: noop, copyRenderedPreview: async () => {},
    isPdfExportable: true, requestPdfExport: noop, zenMode: false, setZenMode: noop,
  }
}

it("announces replies and send failures without opening Review, and opens on request", () => {
  stubMatchMedia(false)
  const open = vi.fn()
  const props = { ...toolbarProps(), setReviewOverlayOpen: open }
  const container = document.createElement("div")
  document.body.append(container)
  const root = createRoot(container)
  const render = (updates: Partial<typeof props>) => act(() => root.render(
    createElement(SidebarProvider, null, createElement(ContentToolbar, { ...props, ...updates })),
  ))
  const trigger = () => container.querySelector<HTMLButtonElement>('[aria-controls="markside-review-overlay"]')!
  try {
    render({ reviewNotice: { kind: "reply", message: "2 replies to review" } })
    expect(trigger().getAttribute("aria-expanded")).toBe("false")
    expect(trigger().getAttribute("aria-label")).toContain("2 replies to review")
    expect(trigger().querySelector('[role="status"]')?.textContent).toBe("2 replies to review")
    expect(open).not.toHaveBeenCalled()
    act(() => trigger().click())
    expect(open).toHaveBeenCalledWith(true)
    render({ reviewItemCount: 0, reviewNotice: { kind: "error", message: "Could not send Review. Try again." } })
    expect(trigger().textContent).toContain("!")
    expect(trigger().title).toContain("Could not send Review")
    render({})
    expect(trigger().getAttribute("aria-label")).toBe("Toggle Review, 2 items")
    expect(trigger().querySelector('[role="status"]')?.textContent).toBe("")
  } finally {
    act(() => root.unmount())
    container.remove()
    vi.unstubAllGlobals()
  }
})

it.each(["preview", "split"] as const)("selects and remembers one Page width in %s", async (mode) => {
  stubMatchMedia(false)
  stubChromeStorage({ sourceFullWidth: false })
  const props = { ...toolbarProps(), mode, sourceVisible: mode === "split" }
  function Toolbar() {
    const [width, setWidth] = useState(props.previewWidth)
    return createElement(ContentToolbar, { ...props, previewWidth: width, setPreviewWidth: setWidth })
  }
  const container = document.createElement("div")
  document.body.append(container)
  const root = createRoot(container)
  const openMenu = () => act(() => {
    container.querySelector<HTMLButtonElement>('[aria-label="File actions"]')!
      .dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }))
  })
  try {
    act(() => root.render(createElement(SidebarProvider, null, createElement(Toolbar))))
    openMenu()
    expect(document.querySelectorAll('[role="menuitemradio"]')).toHaveLength(0)
    const widthTrigger = () => Array.from(document.querySelectorAll<HTMLElement>('[role="menuitem"][aria-haspopup="menu"]'))
      .find(item => item.textContent?.startsWith("Page width"))!
    const openWidths = () => act(() => {
      widthTrigger().dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }))
    })
    expect(widthTrigger().textContent).toContain("Standard")
    openWidths()
    let items = Array.from(document.querySelectorAll<HTMLElement>('[role="menuitemradio"]'))
    expect(items.map(item => item.textContent)).toEqual(["Narrow", "Standard", "Full width"])
    expect(items.filter(item => item.getAttribute("aria-checked") === "true").map(item => item.textContent)).toEqual(["Standard"])

    await act(async () => items[0].click())
    expect(await getPaneWidthPreferences()).toEqual({ previewWidth: "narrow", sourceFullWidth: false })

    openMenu()
    expect(widthTrigger().textContent).toContain("Narrow")
    openWidths()
    items = Array.from(document.querySelectorAll<HTMLElement>('[role="menuitemradio"]'))
    expect(items.filter(item => item.getAttribute("aria-checked") === "true").map(item => item.textContent)).toEqual(["Narrow"])
  } finally {
    act(() => root.unmount())
    container.remove()
    vi.unstubAllGlobals()
  }
})


it("restores Typeface in the file menu, applies a selection, and follows other tabs", async () => {
  stubMatchMedia(false)
  const storage = stubChromeStorage({ typeface: "charter", previewWidth: "narrow", sourceFullWidth: false })
  const props = toolbarProps()
  function Toolbar() {
    const { typeface } = useContentPreferences(false)
    return createElement(ContentToolbar, { ...props, typeface })
  }
  const container = document.createElement("div")
  document.body.append(container)
  const root = createRoot(container)
  const openMenu = () => act(() => {
    container.querySelector<HTMLButtonElement>('[aria-label="File actions"]')!
      .dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }))
  })
  const typefaceTrigger = () => Array.from(document.querySelectorAll<HTMLElement>('[role="menuitem"][aria-haspopup="menu"]'))
    .find(item => item.textContent?.startsWith("Typeface"))!
  try {
    act(() => root.render(createElement(SidebarProvider, null, createElement(Toolbar))))
    await flush()
    openMenu()
    expect(typefaceTrigger()?.textContent).toContain("Charter")
    act(() => typefaceTrigger().dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })))
    const items = Array.from(document.querySelectorAll<HTMLElement>('[role="menuitemradio"]'))
    expect(items.map(item => item.textContent)).toEqual(["Sans", "Serif", "Charter", "Iowan", "Avenir"])
    expect(items.filter(item => item.getAttribute("aria-checked") === "true").map(item => item.textContent)).toEqual(["Charter"])

    await act(async () => items[3].click())
    expect(await getTypeface()).toBe("iowan")
    expect(document.documentElement.style.getPropertyValue("--markside-prose-font")).toBe(TYPEFACES.iowan.stack)
    expect(await getPaneWidthPreferences()).toEqual({ previewWidth: "narrow", sourceFullWidth: false })
    openMenu()
    expect(typefaceTrigger().textContent).toContain("Iowan")
    await act(() => storage.set({ typeface: "serif" }))
    expect(typefaceTrigger().textContent).toContain("Serif")
  } finally {
    act(() => root.unmount())
    container.remove()
    document.documentElement.style.removeProperty("--markside-prose-font")
    vi.unstubAllGlobals()
  }
})

it.each(["preview", "source"] as const)("toggles Zen mode from the file menu in %s", (mode) => {
  stubMatchMedia(false)
  const setZenMode = vi.fn()
  const props = { ...toolbarProps(), mode, previewVisible: mode === "preview", sourceVisible: mode === "source", setZenMode }
  const container = document.createElement("div")
  document.body.append(container)
  const root = createRoot(container)
  const render = (zenMode: boolean) => act(() => root.render(
    createElement(SidebarProvider, null, createElement(ContentToolbar, { ...props, zenMode })),
  ))
  const menuItem = () => {
    act(() => {
      container.querySelector<HTMLButtonElement>('[aria-label="File actions"]')!
        .dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }))
    })
    return Array.from(document.querySelectorAll<HTMLElement>('[role="menuitem"]'))
      .find(element => /^(Exit )?Zen mode/.test(element.textContent ?? ""))!
  }
  try {
    render(false)
    expect(container.querySelector('[aria-label="Exit Zen mode"]')).toBeNull()
    let item = menuItem()
    expect(item.textContent).toMatch(/^Zen mode(⌘|Ctrl\+)\.$/)
    act(() => item.click())
    expect(setZenMode).toHaveBeenLastCalledWith(true)

    render(true)
    const exit = container.querySelector<HTMLButtonElement>('[aria-label="Exit Zen mode"]')!
    act(() => exit.click())
    expect(setZenMode).toHaveBeenLastCalledWith(false)
    item = menuItem()
    expect(item.textContent).toMatch(/^Exit Zen mode/)
    setZenMode.mockClear()
    act(() => item.click())
    expect(setZenMode).toHaveBeenLastCalledWith(false)
  } finally {
    act(() => root.unmount())
    container.remove()
    vi.unstubAllGlobals()
  }
})
