import React, { useEffect, useRef, useState } from "react"
import { isZenModeShortcut } from "~lib/content-app-policy"

const ZEN_HINT_MS = 2000
// Session storage lasts for the tab, across reloads and links, but not into new tabs.
const ZEN_MODE_SESSION_KEY = "markside:zenMode"
// The revealed toolbar hides once the pointer moves this far from the top.
const TOOLBAR_REVEAL_DEPTH = 64
// Within this distance of the top, a faint bar shows where to reveal the toolbar.
const REVEAL_CUE_DEPTH = 48
// Open layers that close on Escape before Zen mode does.
const ESCAPE_LAYERS = "[role='dialog'], [role='alertdialog'], [role='menu'], [role='listbox'], .mermaid-block.is-expanded"

export function readZenModeSession() {
  return sessionStorage.getItem(ZEN_MODE_SESSION_KEY) === "on"
}

interface UseContentZenModeOptions {
  zenMode: boolean
  setZenMode: React.Dispatch<React.SetStateAction<boolean>>
  /** True while the Review panel or quick file switcher would consume Escape. */
  escapeClosesPanel: boolean
}

export function useContentZenMode({ zenMode, setZenMode, escapeClosesPanel }: UseContentZenModeOptions) {
  const [hintVisible, setHintVisible] = useState(false)
  const [toolbarRevealed, setToolbarRevealed] = useState(false)
  const [pointerNearTop, setPointerNearTop] = useState(false)
  const escapeClosesPanelRef = useRef(escapeClosesPanel)
  escapeClosesPanelRef.current = escapeClosesPanel

  useEffect(() => {
    if (zenMode) sessionStorage.setItem(ZEN_MODE_SESSION_KEY, "on")
    else sessionStorage.removeItem(ZEN_MODE_SESSION_KEY)
    setHintVisible(zenMode)
    setToolbarRevealed(false)
    setPointerNearTop(false)
    if (!zenMode) return
    const timer = window.setTimeout(() => setHintVisible(false), ZEN_HINT_MS)
    return () => window.clearTimeout(timer)
  }, [zenMode])

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!isZenModeShortcut(event)) return
      event.preventDefault()
      setZenMode((current) => !current)
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  useEffect(() => {
    if (!zenMode) return
    // Other Escape handlers may close their layer before this bubble listener
    // runs, so decide in the capture phase whether one was open.
    let layerOpen = false
    const capture = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      layerOpen = escapeClosesPanelRef.current ||
        document.querySelector(ESCAPE_LAYERS) !== null ||
        (event.target instanceof Element && event.target.closest("input, textarea, select") !== null)
    }
    const bubble = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented || layerOpen) return
      setZenMode(false)
    }
    window.addEventListener("keydown", capture, true)
    window.addEventListener("keydown", bubble)
    return () => {
      window.removeEventListener("keydown", capture, true)
      window.removeEventListener("keydown", bubble)
    }
  }, [zenMode])

  useEffect(() => {
    if (!zenMode || toolbarRevealed) return
    const handler = (event: PointerEvent) => setPointerNearTop(event.clientY <= REVEAL_CUE_DEPTH)
    document.addEventListener("pointermove", handler)
    return () => document.removeEventListener("pointermove", handler)
  }, [zenMode, toolbarRevealed])

  useEffect(() => {
    if (!toolbarRevealed) return
    const handler = (event: PointerEvent) => {
      // Keep the toolbar while one of its menus is open.
      if (event.clientY <= TOOLBAR_REVEAL_DEPTH || document.querySelector("[role='menu']")) return
      setToolbarRevealed(false)
      // Focus left on a toolbar button, such as after Escape closes its menu, would keep it shown.
      const active = document.activeElement
      if (active instanceof HTMLElement && active.closest("[data-zen-toolbar]")) active.blur()
    }
    document.addEventListener("pointermove", handler)
    return () => document.removeEventListener("pointermove", handler)
  }, [toolbarRevealed])

  return { hintVisible, toolbarRevealed, pointerNearTop, revealToolbar: () => setToolbarRevealed(true) }
}
