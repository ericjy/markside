// @vitest-environment jsdom
import { act, createElement, type ComponentProps } from "react"
import { createRoot } from "react-dom/client"
import { expect, it, vi } from "vitest"
import type { AgentReviewFile } from "../cli/review-file.mjs"
import { ContentReloadBar } from "../components/content-reload-bar"
import type { ActiveReview } from "./review"

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
    review: null, clearReview: vi.fn(), agentReviewFile: undefined, disabled: false,
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

it("offers Done and clear drafts only when an agent Review has unsent changes", () => {
  const container = document.createElement("div")
  document.body.append(container)
  const root = createRoot(container)
  const comment = {
    id: "c1", body: "Pick B", createdAt: 0, localStatus: "open" as const, reviewMode: "agent" as const,
    anchor: { exact: "Q1", prefix: "", suffix: "", start: 0, end: 2, headingPath: [] },
  }
  const sent = { id: "c1", quote: "Q1", body: "Pick B", status: "open" as const }
  const file = { version: 2, status: "pending", requestedAt: "", note: "", comments: [sent] } as unknown as AgentReviewFile
  const props: ComponentProps<typeof ContentReloadBar> = {
    diskChanged: false, reloadLoading: false, requestReloadFromDisk: vi.fn(),
    reloadNoticeOpen: false, hasReloadChanges: true, reloadComparison: { before: "a", after: "b" },
    changesVisible: false, closeSelectionComposer: vi.fn(), setShowChanges: vi.fn(),
    previewVisible: true, selectMode: vi.fn(), dismissReloadChanges: vi.fn(),
    review: { comments: [comment], note: "" } as unknown as ActiveReview, clearReview: vi.fn(),
    agentReviewFile: file, disabled: false,
  }
  const menuText = () => {
    act(() => {
      const trigger = container.querySelector<HTMLButtonElement>('[aria-label="Done options"]')!
      trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }))
    })
    const text = document.querySelector('[role="menu"]')?.textContent ?? ""
    act(() => { document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })) })
    return text
  }
  try {
    act(() => root.render(createElement(ContentReloadBar, props)))
    expect(menuText()).not.toContain("clear")
    act(() => root.render(createElement(ContentReloadBar, {
      ...props, review: { comments: [{ ...comment, body: "Pick A" }], note: "" } as unknown as ActiveReview,
    })))
    expect(menuText()).toContain("Done and clear drafts")
    act(() => root.render(createElement(ContentReloadBar, { ...props, agentReviewFile: undefined })))
    expect(menuText()).toContain("Done and clear comments")
  } finally {
    act(() => root.unmount())
    container.remove()
  }
})
