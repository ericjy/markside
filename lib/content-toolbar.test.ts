// @vitest-environment jsdom
import { act, createElement, type ComponentProps } from "react"
import { createRoot } from "react-dom/client"
import { expect, it, vi } from "vitest"
import { ContentToolbar } from "../components/content-toolbar"
import { SidebarProvider } from "../components/ui/sidebar"
import { stubMatchMedia } from "./test-harness"

it("announces replies and send failures without opening Review, and opens on request", () => {
  stubMatchMedia(false)
  const noop = vi.fn()
  const open = vi.fn()
  const props: ComponentProps<typeof ContentToolbar> = {
    leftOpen: false, hasMore: false, crumbs: ["PLAN.md"], crumbUrls: [],
    fileUrl: "file:///docs/PLAN.md", setCopied: noop, copied: false,
    isAddressBarSynced: true, navigateTabToFile: noop, currentFileName: "PLAN.md", addressBarFileName: "PLAN.md",
    sourceVisible: false, saveState: "idle", cancelScheduledSave: noop, doSave: async () => true,
    draftRef: { current: "" }, reloadTriggerRef: { current: null }, requestReloadFromDisk: noop,
    reloadLoading: false, content: "Plan", diskChanged: false, previewVisible: true, selectMode: noop,
    isMdFile: true, mode: "preview", dark: false, followsSystemThemeRef: { current: true }, setDark: noop,
    reviewTriggerRef: { current: null }, reviewOverlayOpen: false, closeReviewOverlay: noop,
    setReviewOverlayOpen: open, reviewItemCount: 2, chooseOutlineOpen: noop, outlineOpen: false,
    requestLinkSnapshot: noop, fileMenuTriggerRef: { current: null }, fileMenuPointerInteractionRef: { current: false },
    previewFullWidth: false, setPreviewFullWidth: noop, numberHeadings: false, setNumberHeadings: noop,
    readabilityControlsVisible: false, setReadabilityControlsVisible: noop, copyRenderedPreview: async () => {},
    isPdfExportable: true, requestPdfExport: noop,
  }
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
