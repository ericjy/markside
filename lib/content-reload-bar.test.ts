// @vitest-environment jsdom
import { act, createElement, type ComponentProps } from "react"
import { createRoot } from "react-dom/client"
import { expect, it, vi } from "vitest"
import { ContentReloadBar } from "../components/content-reload-bar"

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

it("keeps Reload and comparison controls in one surface and uses the protected reload callback", () => {
  const container = document.createElement("div")
  document.body.append(container)
  const root = createRoot(container)
  const props: ComponentProps<typeof ContentReloadBar> = {
    diskChanged: true, reloadLoading: false, requestReloadFromDisk: vi.fn(),
    reloadNoticeOpen: false, hasReloadChanges: false, reloadComparison: null,
    changesVisible: false, closeSelectionComposer: vi.fn(), setShowChanges: vi.fn(),
    previewVisible: false, selectMode: vi.fn(), dismissReloadChanges: vi.fn(),
    review: null, clearReview: vi.fn(), disabled: false,
  }
  try {
    act(() => root.render(createElement(ContentReloadBar, props)))
    expect(container.textContent).toContain("Document changed on disk")
    act(() => container.querySelector("button")!.click())
    expect(props.requestReloadFromDisk).toHaveBeenCalledOnce()
    act(() => root.render(createElement(ContentReloadBar, { ...props, diskChanged: false, hasReloadChanges: true })))
    expect(container.textContent).not.toContain("Document changed on disk")
    act(() => container.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click())
    expect(props.closeSelectionComposer).toHaveBeenCalledOnce()
    expect(props.setShowChanges).toHaveBeenCalledWith(true)
    expect(props.selectMode).toHaveBeenCalledWith("preview")
    act(() => container.querySelector<HTMLButtonElement>('[title="Done reviewing the changes"]')!.click())
    expect(props.dismissReloadChanges).toHaveBeenCalledOnce()
    expect(props.clearReview).not.toHaveBeenCalled()
  } finally {
    act(() => root.unmount())
    container.remove()
  }
})
