import { PeleError, render } from "pele"

let idCounter = 0

const MIN_SCALE = 0.5
const MAX_MANUAL_SCALE = 16
const SCALE_STEP = 0.25
const FALLBACK_DEFAULT_SCALE = 1.25
const MIN_DEFAULT_SCALE = 0.75
const MAX_EXPANDED_DEFAULT_SCALE = 4
const DEFAULT_WIDTH_RATIO = 0.96
const DEFAULT_HEIGHT_RATIO = 0.8
const MAX_DEFAULT_HEIGHT = 1100

const EXPAND_ICON = `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
  </svg>
`
const CLOSE_ICON = `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
`
const PAN_ICON = `
  <svg data-mermaid-icon="pan" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M18 11V6a2 2 0 0 0-4 0" />
    <path d="M14 10V4a2 2 0 0 0-4 0v2" />
    <path d="M10 10.5V6a2 2 0 0 0-4 0v8" />
    <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
  </svg>
`
const SELECT_ICON = `
  <svg data-mermaid-icon="select" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4.037 4.688a.495.495 0 0 1 .651-.651l16 6.5a.5.5 0 0 1-.063.947l-6.124 1.58a2 2 0 0 0-1.438 1.435l-1.579 6.126a.5.5 0 0 1-.947.063z" />
  </svg>
`

type MermaidView = {
  scale: number
  x: number
  y: number
}

type ExpandedState = {
  background: HTMLElement | null
  backgroundWasInert: boolean
  defaultScale: string | undefined
  placeholder: Comment
  rootOverflow: string
  view: MermaidView
  viewportHeight: string
}

const expandedStates = new WeakMap<HTMLElement, ExpandedState>()

function readDefaultScale(wrapper: HTMLElement): number {
  return (
    Number(wrapper.dataset.mermaidDefaultScale) || FALLBACK_DEFAULT_SCALE
  )
}

// An archived question keeps its card's diagram style in its Full question disclosure.
function inQuestionCard(element: HTMLElement): boolean {
  if (element.closest(".markdown-alert-question")) return true
  return element.closest("details")?.querySelector(":scope > summary")?.textContent?.trim() === "Full question"
}

// Pele parses `id@{ animate: true }` and `animation: slow|fast` on edges but does not draw them yet.
function readEdgeAnimations(code: string): Map<string, "slow" | "fast"> {
  const animations = new Map<string, "slow" | "fast">()
  for (const [, id, props] of code.matchAll(/^\s*([\w-]+)@\{([^}]*)\}/gm)) {
    const speed = /\banimation\s*:\s*["']?(slow|fast)/.exec(props)?.[1] as "slow" | "fast" | undefined
    const animate = /\banimate\s*:\s*(true|false)/.exec(props)?.[1]
    if (animate === "false") animations.delete(id)
    else if (speed || animate === "true") animations.set(id, speed ?? animations.get(id) ?? "fast")
  }
  return animations
}

function renderSvg(code: string, container: HTMLElement): string {
  const fontFamily = getComputedStyle(container).fontFamily || undefined
  const svg = render(code, { fontFamily, idPrefix: `mermaid-${++idCounter}-` }).svg
  const animations = readEdgeAnimations(code)
  if (animations.size === 0) return svg
  return svg.replace(/<g class="pele-edge( [^"]*)?" data-id="([^"]+)"/g, (tag, classes = "", id: string) => {
    const speed = animations.get(id)
    return speed ? `<g class="pele-edge${classes} mermaid-edge-animated" data-animation="${speed}" data-id="${id}"` : tag
  })
}

function readView(wrapper: HTMLElement): MermaidView {
  return {
    scale: Number(wrapper.dataset.mermaidScale) || readDefaultScale(wrapper),
    x: Number(wrapper.dataset.mermaidX) || 0,
    y: Number(wrapper.dataset.mermaidY) || 0,
  }
}

function updateView(wrapper: HTMLElement, next: MermaidView): void {
  const scale = Math.min(MAX_MANUAL_SCALE, Math.max(MIN_SCALE, next.scale))
  wrapper.dataset.mermaidScale = String(scale)
  wrapper.dataset.mermaidX = String(next.x)
  wrapper.dataset.mermaidY = String(next.y)

  const diagram = wrapper.querySelector<HTMLElement>(".mermaid-diagram")
  if (diagram) {
    diagram.style.transform = `translate(${next.x}px, ${next.y}px) scale(${scale})`
  }

  wrapper
    .querySelectorAll<HTMLButtonElement>("[data-mermaid-action]")
    .forEach((button) => {
      const action = button.dataset.mermaidAction
      button.disabled =
        (action === "zoom-out" && scale === MIN_SCALE) ||
        (action === "zoom-in" && scale === MAX_MANUAL_SCALE) ||
        (action === "reset" &&
          scale === readDefaultScale(wrapper) &&
          next.x === 0 &&
          next.y === 0)
    })
}

function zoom(wrapper: HTMLElement, delta: number): void {
  const current = readView(wrapper)
  updateView(wrapper, { ...current, scale: current.scale + delta })
}

function resetView(wrapper: HTMLElement): void {
  updateView(wrapper, { scale: readDefaultScale(wrapper), x: 0, y: 0 })
}

function fitViewportToDefaultScale(wrapper: HTMLElement): void {
  const viewport = wrapper.querySelector<HTMLElement>(".mermaid-viewport")
  const diagram = wrapper.querySelector<HTMLElement>(".mermaid-diagram")
  if (!viewport || !diagram) return

  const transform = diagram.style.transform
  const transition = diagram.style.transition
  viewport.style.height = "auto"
  // Measure the unscaled diagram immediately, without animating toward it.
  diagram.style.transition = "none"
  diagram.style.transform = "none"
  const naturalRect = diagram.getBoundingClientRect()
  const availableWidth = viewport.getBoundingClientRect().width
  diagram.style.transform = transform
  diagram.getBoundingClientRect()
  diagram.style.transition = transition

  const expanded = wrapper.classList.contains("is-expanded")
  const widthRatio = expanded ? 0.9 : DEFAULT_WIDTH_RATIO
  const availableHeight = expanded
    ? viewport.getBoundingClientRect().height * 0.9
    : Math.min(window.innerHeight * DEFAULT_HEIGHT_RATIO, MAX_DEFAULT_HEIGHT)
  // The SVG shrinks inside its flex box, so its viewBox gives the size Pele drew
  // it at. Pele draws labels near body text size, so inline diagrams stop there.
  const intrinsicWidth = diagram.querySelector("svg")?.viewBox.baseVal?.width ?? 0
  const maximumScale = expanded
    ? MAX_EXPANDED_DEFAULT_SCALE
    : intrinsicWidth > 0 && naturalRect.width > 0
      ? intrinsicWidth / naturalRect.width
      : 1
  const minimumScale = expanded ? MIN_SCALE : MIN_DEFAULT_SCALE

  let defaultScale = FALLBACK_DEFAULT_SCALE
  if (naturalRect.width > 0 && availableWidth > 0) {
    const widthScale =
      (availableWidth * widthRatio) / naturalRect.width
    const heightScale = naturalRect.height > 0
      ? availableHeight / naturalRect.height
      : maximumScale
    defaultScale = Math.min(
      maximumScale,
      Math.max(minimumScale, Math.min(widthScale, heightScale))
    )
  }
  wrapper.dataset.mermaidDefaultScale = String(defaultScale)

  if (!expanded && naturalRect.height > 0) {
    viewport.style.height = `${Math.ceil(naturalRect.height * defaultScale)}px`
  }
}

function updateExpandControl(wrapper: HTMLElement, expanded: boolean): void {
  const button = wrapper.querySelector<HTMLButtonElement>(
    "[data-mermaid-action='expand']"
  )
  if (!button) return
  const label = expanded ? "Close expanded diagram" : "Expand diagram"
  button.innerHTML = expanded ? CLOSE_ICON : EXPAND_ICON
  button.setAttribute("aria-label", label)
  button.setAttribute("aria-pressed", String(expanded))
  button.title = label
}

function setPanEnabled(wrapper: HTMLElement, enabled: boolean): void {
  const panButton = wrapper.querySelector<HTMLButtonElement>(
    "[data-mermaid-action='pan']"
  )
  const selectButton = wrapper.querySelector<HTMLButtonElement>(
    "[data-mermaid-action='select']"
  )
  wrapper.dataset.mermaidPanEnabled = String(enabled)
  wrapper.classList.toggle("is-pan-enabled", enabled)
  panButton?.setAttribute("aria-pressed", String(enabled))
  selectButton?.setAttribute("aria-pressed", String(!enabled))
}

function expandDiagram(wrapper: HTMLElement): void {
  if (expandedStates.has(wrapper)) return
  const viewport = wrapper.querySelector<HTMLElement>(".mermaid-viewport")
  if (!viewport) return

  const placeholder = document.createComment("mermaid-expanded")
  const background = document.getElementById("markside-mount")
  expandedStates.set(wrapper, {
    background,
    backgroundWasInert: background?.inert ?? false,
    defaultScale: wrapper.dataset.mermaidDefaultScale,
    placeholder,
    rootOverflow: document.documentElement.style.overflow,
    view: readView(wrapper),
    viewportHeight: viewport.style.height,
  })
  wrapper.replaceWith(placeholder)
  document.body.append(wrapper)
  wrapper.classList.add("is-expanded")
  wrapper.setAttribute("role", "dialog")
  wrapper.setAttribute("aria-modal", "true")
  wrapper.setAttribute("aria-label", "Expanded Mermaid diagram")
  if (background) background.inert = true
  document.documentElement.style.overflow = "hidden"
  fitViewportToDefaultScale(wrapper)
  resetView(wrapper)
  updateExpandControl(wrapper, true)
  viewport.focus()
}

function closeExpandedDiagram(wrapper: HTMLElement): void {
  const state = expandedStates.get(wrapper)
  if (!state) return
  const viewport = wrapper.querySelector<HTMLElement>(".mermaid-viewport")

  wrapper.classList.remove("is-expanded")
  wrapper.removeAttribute("role")
  wrapper.removeAttribute("aria-modal")
  wrapper.removeAttribute("aria-label")
  if (state.background) state.background.inert = state.backgroundWasInert
  if (state.defaultScale === undefined) {
    delete wrapper.dataset.mermaidDefaultScale
  } else {
    wrapper.dataset.mermaidDefaultScale = state.defaultScale
  }
  if (viewport) viewport.style.height = state.viewportHeight
  updateView(wrapper, state.view)
  document.documentElement.style.overflow = state.rootOverflow
  if (state.placeholder.isConnected) state.placeholder.replaceWith(wrapper)
  else wrapper.remove()
  expandedStates.delete(wrapper)
  updateExpandControl(wrapper, false)
  wrapper
    .querySelector<HTMLButtonElement>("[data-mermaid-action='expand']")
    ?.focus()
}

function createButton(
  action: string,
  label: string,
  text: string
): HTMLButtonElement {
  const button = document.createElement("button")
  button.type = "button"
  button.className = "mermaid-control"
  button.dataset.mermaidAction = action
  button.setAttribute("aria-label", label)
  button.title = label
  button.textContent = text
  return button
}

function installInteractions(wrapper: HTMLElement, viewport: HTMLElement): void {
  if (wrapper.dataset.mermaidInteractive === "true") return
  wrapper.dataset.mermaidInteractive = "true"

  wrapper.addEventListener("click", (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>(
      "[data-mermaid-action]"
    )
    if (!button) return
    if (button.dataset.mermaidAction === "zoom-in") zoom(wrapper, SCALE_STEP)
    if (button.dataset.mermaidAction === "zoom-out") zoom(wrapper, -SCALE_STEP)
    if (button.dataset.mermaidAction === "reset") resetView(wrapper)
    if (button.dataset.mermaidAction === "select") setPanEnabled(wrapper, false)
    if (button.dataset.mermaidAction === "pan") setPanEnabled(wrapper, true)
    if (button.dataset.mermaidAction === "expand") {
      if (expandedStates.has(wrapper)) closeExpandedDiagram(wrapper)
      else expandDiagram(wrapper)
    }
  })

  viewport.addEventListener(
    "wheel",
    (event) => {
      if (!event.ctrlKey && !event.metaKey) {
        if (expandedStates.has(wrapper)) event.preventDefault()
        return
      }
      event.preventDefault()
      zoom(wrapper, event.deltaY < 0 ? SCALE_STEP : -SCALE_STEP)
    },
    { passive: false }
  )

  let pointerId: number | null = null
  let startX = 0
  let startY = 0
  let originX = 0
  let originY = 0

  viewport.addEventListener("pointerdown", (event) => {
    const panEnabled = wrapper.dataset.mermaidPanEnabled === "true"
    if (event.button !== 0 || (!panEnabled && !event.shiftKey)) return
    event.preventDefault()
    const current = readView(wrapper)
    pointerId = event.pointerId
    startX = event.clientX
    startY = event.clientY
    originX = current.x
    originY = current.y
    viewport.classList.add("is-panning")
    viewport.setPointerCapture?.(event.pointerId)
  })

  viewport.addEventListener("pointermove", (event) => {
    if (pointerId !== event.pointerId) return
    updateView(wrapper, {
      ...readView(wrapper),
      x: originX + event.clientX - startX,
      y: originY + event.clientY - startY,
    })
  })

  const stopPanning = (event: PointerEvent) => {
    if (pointerId !== event.pointerId) return
    pointerId = null
    viewport.classList.remove("is-panning")
  }
  viewport.addEventListener("pointerup", stopPanning)
  viewport.addEventListener("pointercancel", stopPanning)
  viewport.addEventListener("lostpointercapture", stopPanning)

  viewport.addEventListener("keydown", (event) => {
    const current = readView(wrapper)
    const panStep = event.shiftKey ? 60 : 24
    let next: MermaidView | null = null
    if (event.key === "ArrowLeft") next = { ...current, x: current.x - panStep }
    if (event.key === "ArrowRight") next = { ...current, x: current.x + panStep }
    if (event.key === "ArrowUp") next = { ...current, y: current.y - panStep }
    if (event.key === "ArrowDown") next = { ...current, y: current.y + panStep }
    if (event.key === "+" || event.key === "=") {
      next = { ...current, scale: current.scale + SCALE_STEP }
    }
    if (event.key === "-") {
      next = { ...current, scale: current.scale - SCALE_STEP }
    }
    if (event.key === "Home" || event.key === "0") {
      next = { scale: readDefaultScale(wrapper), x: 0, y: 0 }
    }
    if (!next) return
    event.preventDefault()
    updateView(wrapper, next)
  })

  wrapper.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && expandedStates.has(wrapper)) {
      event.preventDefault()
      closeExpandedDiagram(wrapper)
    }
  })

  if (typeof ResizeObserver !== "undefined") {
    let lastWidth = wrapper.getBoundingClientRect().width
    const observer = new ResizeObserver(([entry]) => {
      if (Math.abs(entry.contentRect.width - lastWidth) < 1) return
      lastWidth = entry.contentRect.width
      const current = readView(wrapper)
      const wasAtDefault =
        current.scale === readDefaultScale(wrapper) &&
        current.x === 0 &&
        current.y === 0
      fitViewportToDefaultScale(wrapper)
      if (wasAtDefault) resetView(wrapper)
      else updateView(wrapper, current)
    })
    observer.observe(wrapper)
  }
}

function setMermaidSvg(
  wrapper: HTMLElement,
  svg: string,
  preserveView = false
): void {
  let viewport = wrapper.querySelector<HTMLElement>(".mermaid-viewport")
  let diagram = wrapper.querySelector<HTMLElement>(".mermaid-diagram")

  if (!viewport || !diagram) {
    const navigationControls = document.createElement("div")
    navigationControls.className =
      "mermaid-controls mermaid-navigation-controls"
    navigationControls.setAttribute("role", "group")
    navigationControls.setAttribute("aria-label", "Diagram interaction mode")
    const selectButton = createButton("select", "Select diagram text", "")
    selectButton.classList.add("mermaid-control-icon", "mermaid-mode-control")
    selectButton.innerHTML = SELECT_ICON
    selectButton.setAttribute("aria-pressed", "true")
    selectButton.removeAttribute("title")
    const selectTooltip = document.createElement("span")
    const selectTooltipId = `mermaid-select-tooltip-${idCounter}`
    selectTooltip.id = selectTooltipId
    selectTooltip.className = "mermaid-mode-tooltip"
    selectTooltip.setAttribute("role", "tooltip")
    selectTooltip.textContent =
      "Select diagram text. You can still Shift-drag to reposition the diagram."
    selectButton.setAttribute("aria-describedby", selectTooltipId)

    const panButton = createButton("pan", "Pan diagram", "")
    panButton.classList.add("mermaid-control-icon", "mermaid-mode-control")
    panButton.innerHTML = PAN_ICON
    panButton.setAttribute("aria-pressed", "false")
    panButton.removeAttribute("title")
    const panTooltip = document.createElement("span")
    const panTooltipId = `mermaid-pan-tooltip-${idCounter}`
    panTooltip.id = panTooltipId
    panTooltip.className = "mermaid-mode-tooltip"
    panTooltip.setAttribute("role", "tooltip")
    panTooltip.textContent = "Drag to reposition the diagram."
    panButton.setAttribute("aria-describedby", panTooltipId)
    navigationControls.append(
      selectButton,
      selectTooltip,
      panButton,
      panTooltip
    )

    const zoomControls = document.createElement("div")
    zoomControls.className = "mermaid-controls mermaid-zoom-controls"
    zoomControls.setAttribute("role", "group")
    zoomControls.setAttribute("aria-label", "Diagram zoom")
    zoomControls.append(
      createButton("zoom-out", "Zoom out", "−"),
      createButton("zoom-in", "Zoom in", "+"),
      createButton("reset", "Reset diagram view", "Reset")
    )

    const expandControls = document.createElement("div")
    expandControls.className = "mermaid-controls mermaid-expand-controls"
    expandControls.setAttribute("role", "group")
    expandControls.setAttribute("aria-label", "Diagram display")
    const expandButton = createButton("expand", "Expand diagram", "")
    expandButton.classList.add("mermaid-control-icon")
    expandButton.innerHTML = EXPAND_ICON
    expandButton.setAttribute("aria-pressed", "false")
    expandControls.append(expandButton)

    const toolbar = document.createElement("div")
    toolbar.className = "mermaid-toolbar"
    toolbar.append(navigationControls, zoomControls, expandControls)

    viewport = document.createElement("div")
    viewport.className = "mermaid-viewport"
    viewport.tabIndex = 0
    viewport.setAttribute(
      "aria-label",
      "Interactive Mermaid diagram. Use the Pan control, hold Shift while dragging, or use arrow keys to pan; hold Control or Command while scrolling, or use plus and minus to zoom."
    )
    diagram = document.createElement("div")
    diagram.className = "mermaid-diagram"
    viewport.append(diagram)
    wrapper.replaceChildren(toolbar, viewport)
  }

  diagram.innerHTML = svg
  installInteractions(wrapper, viewport)
  fitViewportToDefaultScale(wrapper)
  if (preserveView) updateView(wrapper, readView(wrapper))
  else resetView(wrapper)
}

function errorMessage(error: unknown): string {
  if (error instanceof PeleError && error.line > 0) {
    return `Mermaid error at line ${error.line}, column ${error.column}: ${error.message}`
  }
  return `Mermaid error: ${error instanceof Error ? error.message : String(error)}`
}

export async function renderMermaidBlocks(container: HTMLElement): Promise<void> {
  const blocks = Array.from(
    container.querySelectorAll<HTMLElement>("pre > code.language-mermaid")
  )
  if (!blocks.length) return

  for (const codeEl of blocks) {
    const pre = codeEl.parentElement!
    const question = inQuestionCard(pre)
    const code = (codeEl.textContent ?? "").trim()
    const sourceLine = pre.dataset.sourceLine

    try {
      const svg = renderSvg(code, container)
      const wrapper = document.createElement("div")
      wrapper.className = `mermaid-block not-prose${question ? " mermaid-question" : ""}`
      wrapper.dataset.mermaidSrc = code
      if (sourceLine) wrapper.dataset.sourceLine = sourceLine
      pre.replaceWith(wrapper)
      setMermaidSvg(wrapper, svg)
    } catch (e) {
      const errDiv = document.createElement("div")
      errDiv.className = "mermaid-error"
      errDiv.dataset.mermaidSrc = code
      if (sourceLine) errDiv.dataset.sourceLine = sourceLine
      errDiv.textContent = errorMessage(e)
      pre.replaceWith(errDiv)
    }
  }
}

// Pele measures labels in the document font, so a typeface change needs new layouts.
export async function rerenderMermaidBlocks(container: HTMLElement): Promise<void> {
  const wrappers = Array.from(
    container.querySelectorAll<HTMLElement>(".mermaid-block[data-mermaid-src], .mermaid-error[data-mermaid-src]")
  )
  if (!wrappers.length) return

  for (const wrapper of wrappers) {
    const code = (wrapper.dataset.mermaidSrc ?? "").trim()
    if (!code) continue
    const question = inQuestionCard(wrapper)
    try {
      const svg = renderSvg(code, container)
      if (wrapper.classList.contains("mermaid-error")) {
        wrapper.className = `mermaid-block not-prose${question ? " mermaid-question" : ""}`
        delete wrapper.dataset.mermaidInteractive
        setMermaidSvg(wrapper, svg)
      } else {
        setMermaidSvg(wrapper, svg, true)
      }
    } catch (e) {
      console.error("[mermaid] rerender failed", e)
      // leave existing SVG in place
    }
  }
}
