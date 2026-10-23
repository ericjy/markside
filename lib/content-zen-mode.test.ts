// @vitest-environment jsdom
import { act, createElement, useState } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ContentZenModeEdge } from "../components/content-zen-mode"
import { readZenModeSession, useContentZenMode } from "../hooks/use-content-zen-mode"
import { renderHook } from "./test-harness"

function useZen({ escapeClosesPanel }: { escapeClosesPanel: boolean }) {
  const [zenMode, setZenMode] = useState(readZenModeSession)
  return { zenMode, setZenMode, ...useContentZenMode({ zenMode, setZenMode, escapeClosesPanel }) }
}

function press(key: string, init: KeyboardEventInit = {}, target: EventTarget = document.body) {
  const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...init })
  act(() => { target.dispatchEvent(event) })
  return event
}

afterEach(() => {
  sessionStorage.clear()
  document.body.replaceChildren()
  vi.useRealTimers()
})

describe("useContentZenMode", () => {
  it("toggles with Cmd or Ctrl+period, including from the Source editor", () => {
    const hook = renderHook(useZen, { escapeClosesPanel: false })
    const editor = document.createElement("div")
    editor.className = "cm-editor"
    editor.setAttribute("contenteditable", "true")
    document.body.append(editor)
    expect(press(".", { metaKey: true }, editor).defaultPrevented).toBe(true)
    expect(hook.result.current.zenMode).toBe(true)
    press(".", { ctrlKey: true })
    expect(hook.result.current.zenMode).toBe(false)
    press(".", { ctrlKey: true, shiftKey: true })
    expect(hook.result.current.zenMode).toBe(false)
    hook.unmount()
  })

  it("leaves on Escape only when nothing else handles it", () => {
    const hook = renderHook(useZen, { escapeClosesPanel: false })
    const enter = () => act(() => hook.result.current.setZenMode(true))

    enter()
    hook.rerender({ escapeClosesPanel: true })
    press("Escape")
    expect(hook.result.current.zenMode).toBe(true)
    hook.rerender({ escapeClosesPanel: false })

    // A dialog that closes itself during the same key press still wins.
    const dialog = document.createElement("div")
    dialog.setAttribute("role", "dialog")
    document.body.append(dialog)
    const closeDialog = () => dialog.remove()
    document.addEventListener("keydown", closeDialog, true)
    press("Escape")
    document.removeEventListener("keydown", closeDialog, true)
    expect(hook.result.current.zenMode).toBe(true)

    const handled = document.createElement("div")
    handled.addEventListener("keydown", (event) => event.preventDefault())
    document.body.append(handled)
    press("Escape", {}, handled)
    expect(hook.result.current.zenMode).toBe(true)

    const textarea = document.createElement("textarea")
    document.body.append(textarea)
    press("Escape", {}, textarea)
    expect(hook.result.current.zenMode).toBe(true)

    press("Escape")
    expect(hook.result.current.zenMode).toBe(false)
    hook.unmount()
  })

  it("keeps a revealed toolbar until the pointer moves away with no menu open", () => {
    const hook = renderHook(useZen, { escapeClosesPanel: false })
    const move = (clientY: number) => act(() => { document.dispatchEvent(new MouseEvent("pointermove", { clientY })) })
    act(() => hook.result.current.setZenMode(true))
    act(() => hook.result.current.revealToolbar())
    move(40)
    expect(hook.result.current.toolbarRevealed).toBe(true)
    const menu = document.createElement("div")
    menu.setAttribute("role", "menu")
    document.body.append(menu)
    move(400)
    expect(hook.result.current.toolbarRevealed).toBe(true)
    menu.remove()
    const toolbar = document.createElement("div")
    toolbar.setAttribute("data-zen-toolbar", "")
    const button = document.createElement("button")
    toolbar.append(button)
    document.body.append(toolbar)
    button.focus()
    move(400)
    expect(hook.result.current.toolbarRevealed).toBe(false)
    expect(document.activeElement).not.toBe(button)
    act(() => hook.result.current.revealToolbar())
    act(() => hook.result.current.setZenMode(false))
    expect(hook.result.current.toolbarRevealed).toBe(false)
    hook.unmount()
  })

  it("shows the top-edge cue only while the pointer is near the top", () => {
    const hook = renderHook(useZen, { escapeClosesPanel: false })
    const move = (clientY: number) => act(() => { document.dispatchEvent(new MouseEvent("pointermove", { clientY })) })
    move(20)
    expect(hook.result.current.pointerNearTop).toBe(false)
    act(() => hook.result.current.setZenMode(true))
    move(40)
    expect(hook.result.current.pointerNearTop).toBe(true)
    move(200)
    expect(hook.result.current.pointerNearTop).toBe(false)
    hook.unmount()
  })

  it("remembers Zen mode for the tab across page loads", () => {
    const first = renderHook(useZen, { escapeClosesPanel: false })
    act(() => first.result.current.setZenMode(true))
    first.unmount()
    const reloaded = renderHook(useZen, { escapeClosesPanel: false })
    expect(reloaded.result.current.zenMode).toBe(true)
    act(() => reloaded.result.current.setZenMode(false))
    reloaded.unmount()
    const again = renderHook(useZen, { escapeClosesPanel: false })
    expect(again.result.current.zenMode).toBe(false)
    again.unmount()
  })

  it("shows the exit hint for two seconds each time it starts", () => {
    vi.useFakeTimers()
    const hook = renderHook(useZen, { escapeClosesPanel: false })
    expect(hook.result.current.hintVisible).toBe(false)
    act(() => hook.result.current.setZenMode(true))
    expect(hook.result.current.hintVisible).toBe(true)
    act(() => { vi.advanceTimersByTime(2000) })
    expect(hook.result.current.hintVisible).toBe(false)
    act(() => hook.result.current.setZenMode(false))
    act(() => hook.result.current.setZenMode(true))
    expect(hook.result.current.hintVisible).toBe(true)
    hook.unmount()
  })
})

it("reveals the toolbar from the top edge and announces the hint", () => {
  const container = document.createElement("div")
  document.body.append(container)
  const root = createRoot(container)
  const reveal = vi.fn()
  act(() => root.render(createElement(ContentZenModeEdge, { hintVisible: true, toolbarRevealed: false, pointerNearTop: true, rightInset: 16, onReveal: reveal })))
  act(() => { container.querySelector("[data-zen-edge]")!.dispatchEvent(new MouseEvent("pointerover", { bubbles: true })) })
  expect(reveal).toHaveBeenCalled()
  expect(container.querySelector("[data-zen-cue]")?.className).toContain("bg-foreground/25")
  expect(container.querySelector('[role="status"]')?.textContent).toContain("Press Escape to exit")
  act(() => root.unmount())
})
