// @vitest-environment jsdom

import { act, createElement, type ComponentProps } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ReviewCopyReloadDialog } from "../components/review-copy-reload-dialog"

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true

describe("Review copy reload dialog", () => {
  let container: HTMLDivElement
  let root: Root
  let onCancel: ReturnType<typeof vi.fn<() => void>>
  let onReload: ReturnType<typeof vi.fn<() => void>>

  beforeEach(() => {
    container = document.createElement("div")
    document.body.append(container)
    root = createRoot(container)
    onCancel = vi.fn()
    onReload = vi.fn()
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  function render(overrides: Partial<ComponentProps<typeof ReviewCopyReloadDialog>> = {}) {
    act(() => root.render(createElement(ReviewCopyReloadDialog, {
      comment: true,
      loading: false,
      error: null,
      onCancel,
      onReload,
      ...overrides,
    })))
  }

  function button(text: string) {
    const result = Array.from(document.querySelectorAll("[role='dialog'] button"))
      .find((candidate) => candidate.textContent === text)
    expect(result).toBeDefined()
    return result as HTMLButtonElement
  }

  it("explains the failed copy, focuses Cancel, and reloads only when chosen", () => {
    render()
    const dialog = document.querySelector("[role='dialog']")!
    expect(dialog.textContent).toContain("Couldn't copy comment")
    expect(dialog.textContent).toContain("This file changed on disk")
    expect(dialog.textContent).toContain("before copying again")
    expect(document.activeElement).toBe(button("Cancel"))
    expect(onReload).not.toHaveBeenCalled()

    act(() => button("Reload file").click())
    expect(onReload).toHaveBeenCalledOnce()
  })

  it("cancels without reloading and supports Escape", () => {
    render()
    act(() => button("Cancel").click())
    expect(onCancel).toHaveBeenCalledOnce()
    onCancel.mockClear()

    act(() => document.activeElement?.dispatchEvent(new KeyboardEvent("keydown", {
      key: "Escape", bubbles: true,
    })))
    expect(onCancel).toHaveBeenCalledOnce()
    expect(onReload).not.toHaveBeenCalled()
  })

  it("prevents duplicate reloads and dismissal while the reload is running", () => {
    render({ loading: true })
    expect(button("Reloading…").disabled).toBe(true)
    expect(button("Cancel").disabled).toBe(true)
    act(() => {
      button("Reloading…").click()
      document.querySelector("[role='dialog']")?.dispatchEvent(new KeyboardEvent("keydown", {
        key: "Escape", bubbles: true,
      }))
    })
    expect(onReload).not.toHaveBeenCalled()
    expect(onCancel).not.toHaveBeenCalled()
  })

  it("keeps reload errors visible and allows another attempt", () => {
    render({ comment: false, error: "Couldn't reload the file. Nothing was copied. Try again or cancel." })
    expect(document.querySelector("[role='dialog']")?.textContent).toContain("Couldn't copy Review")
    expect(document.querySelector("[role='alert']")?.textContent).toContain("Nothing was copied")
    expect(button("Reload file").disabled).toBe(false)
    act(() => button("Reload file").click())
    expect(onReload).toHaveBeenCalledOnce()
  })
})
