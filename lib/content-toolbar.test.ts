// @vitest-environment jsdom
import { act, createElement, useState, type ComponentProps } from "react"
import { createRoot } from "react-dom/client"
import { expect, it, vi } from "vitest"
import { ContentToolbar } from "../components/content-toolbar"
import { SidebarProvider } from "../components/ui/sidebar"
import { stubChromeStorage, stubMatchMedia } from "./test-harness"
import { getPaneWidthPreferences } from "./markdown-mode"

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
    previewWidth: "standard", setPreviewWidth: noop, numberHeadings: false, setNumberHeadings: noop,
    readabilityControlsVisible: false, setReadabilityControlsVisible: noop, copyRenderedPreview: async () => {},
    isPdfExportable: true, requestPdfExport: noop,
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
    const openWidths = () => act(() => {
      const trigger = document.querySelector<HTMLElement>('[role="menuitem"][aria-haspopup="menu"]')!
      expect(trigger.textContent).toContain("Page width")
      trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }))
    })
    expect(document.querySelector('[role="menuitem"][aria-haspopup="menu"]')?.textContent).toContain("Standard")
    openWidths()
    let items = Array.from(document.querySelectorAll<HTMLElement>('[role="menuitemradio"]'))
    expect(items.map(item => item.textContent)).toEqual(["Narrow", "Standard", "Full width"])
    expect(items.filter(item => item.getAttribute("aria-checked") === "true").map(item => item.textContent)).toEqual(["Standard"])

    await act(async () => items[0].click())
    expect(await getPaneWidthPreferences()).toEqual({ previewWidth: "narrow", sourceFullWidth: false })

    openMenu()
    expect(document.querySelector('[role="menuitem"][aria-haspopup="menu"]')?.textContent).toContain("Narrow")
    openWidths()
    items = Array.from(document.querySelectorAll<HTMLElement>('[role="menuitemradio"]'))
    expect(items.filter(item => item.getAttribute("aria-checked") === "true").map(item => item.textContent)).toEqual(["Narrow"])
  } finally {
    act(() => root.unmount())
    container.remove()
    vi.unstubAllGlobals()
  }
})
