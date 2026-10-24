// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest"

// Pele measures labels with a canvas, which jsdom lacks.
vi.mock("pele", async (importOriginal) => ({
  ...(await importOriginal<typeof import("pele")>()),
  render: vi.fn(),
}))

import { PeleError, render } from "pele"
import { renderMermaidBlocks, rerenderMermaidBlocks } from "./mermaid"

const mockRender = render as unknown as ReturnType<typeof vi.fn>

describe("renderMermaidBlocks", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRender.mockReturnValue({ svg: "<svg><text>diagram</text></svg>" })
  })

  it("returns early without rendering when no mermaid code blocks exist", async () => {
    const div = document.createElement("div")
    div.innerHTML = "<pre><code class='language-typescript'>const x = 1</code></pre>"
    await renderMermaidBlocks(div)
    expect(mockRender).not.toHaveBeenCalled()
  })

  it("lays out labels in the document font with a unique ID prefix per diagram", async () => {
    const div = document.createElement("div")
    div.style.fontFamily = "Charter, serif"
    div.innerHTML = "<pre><code class='language-mermaid'>graph TD; A-->B</code></pre><pre><code class='language-mermaid'>graph TD; C-->D</code></pre>"
    await renderMermaidBlocks(div)
    const [first, second] = mockRender.mock.calls.map(([, options]) => options)
    expect(first.fontFamily).toBe("Charter, serif")
    expect(first.idPrefix).toMatch(/^mermaid-\d+-$/)
    expect(second.idPrefix).not.toBe(first.idPrefix)
  })

  it("marks diagrams in a Question Card or archived question", async () => {
    const div = document.createElement("div")
    div.innerHTML = '<div class="markdown-alert-question"><pre><code class="language-mermaid">graph TD; A-->B</code></pre></div><details open><summary>Full question</summary><pre><code class="language-mermaid">graph TD; A-->B</code></pre></details><details open><summary>Notes</summary><pre><code class="language-mermaid">graph TD; C-->D</code></pre></details>'
    await renderMermaidBlocks(div)
    expect([...div.querySelectorAll(".mermaid-block")].map((block) => block.classList.contains("mermaid-question"))).toEqual([true, true, false])
  })

  it("marks edges whose source asks for animation", async () => {
    mockRender.mockReturnValue({
      svg: '<svg><g class="pele-edges"><g class="pele-edge" data-id="e1"><path/></g><g class="pele-edge" data-id="e2"><path/></g><g class="pele-edge" data-id="e3"><path/></g><g class="pele-edge" data-id="e4"><path/></g></g></svg>',
    })
    const div = document.createElement("div")
    div.innerHTML = `<pre><code class='language-mermaid'>flowchart LR
  A e1@--> B e2@--> C e3@--> D e4@--> E
  e1@{ animate: true }
  e2@{ animation: slow }
  e3@{ animate: true }
  e3@{ animate: false }
</code></pre>`
    await renderMermaidBlocks(div)
    const edges = [...div.querySelectorAll<SVGGElement>(".pele-edge")].map((edge) => [
      edge.dataset.id,
      edge.classList.contains("mermaid-edge-animated"),
      edge.dataset.animation,
    ])
    expect(edges).toEqual([
      ["e1", true, "fast"],
      ["e2", true, "slow"],
      ["e3", false, undefined],
      ["e4", false, undefined],
    ])
  })

  it("replaces the pre element with a mermaid-block div containing the SVG", async () => {
    const div = document.createElement("div")
    div.innerHTML = "<pre><code class='language-mermaid'>graph TD; A-->B</code></pre>"
    await renderMermaidBlocks(div)
    expect(div.querySelector("pre")).toBeNull()
    const wrapper = div.querySelector(".mermaid-block") as HTMLElement
    expect(wrapper).not.toBeNull()
    expect(wrapper.innerHTML).toContain("<svg>")
    expect(wrapper.classList.contains("not-prose")).toBe(true)
  })

  it("adds accessible zoom and reset controls", async () => {
    const div = document.createElement("div")
    div.innerHTML = "<pre><code class='language-mermaid'>graph TD; A-->B</code></pre>"
    await renderMermaidBlocks(div)

    expect(div.querySelector("[aria-label='Zoom out']")).not.toBeNull()
    expect(div.querySelector("[aria-label='Zoom in']")).not.toBeNull()
    expect(div.querySelector("[aria-label='Reset diagram view']")).not.toBeNull()
    expect(div.querySelector("[aria-label='Select diagram text']")).not.toBeNull()
    expect(div.querySelector("[aria-label='Pan diagram']")).not.toBeNull()
    expect(
      div.querySelector("[aria-label='Select diagram text'] [data-mermaid-icon='select']")
    ).not.toBeNull()
    expect(
      div.querySelector("[aria-label='Pan diagram'] [data-mermaid-icon='pan']")
    ).not.toBeNull()
    expect(
      (div.querySelector("[aria-label='Pan diagram']") as HTMLButtonElement)
        .title
    ).toBe("")
    expect(
      div.querySelector("[aria-label='Pan diagram'] + .mermaid-mode-tooltip")?.textContent
    ).toContain("reposition")
    expect(
      div.querySelector("[aria-label='Select diagram text']")?.getAttribute("aria-pressed")
    ).toBe("true")
    expect(
      div.querySelector("[aria-label='Pan diagram']")?.getAttribute("aria-pressed")
    ).toBe("false")
    expect(div.querySelector("[aria-label='Expand diagram']")).not.toBeNull()
    const toolbar = div.querySelector(".mermaid-toolbar")
    expect(toolbar).not.toBeNull()
    expect(toolbar?.nextElementSibling?.classList.contains("mermaid-viewport")).toBe(true)
    expect(toolbar?.querySelectorAll("[data-mermaid-action]")).toHaveLength(6)
    expect(
      div.querySelector("[aria-label='Pan diagram']")?.parentElement
        ?.classList.contains("mermaid-navigation-controls")
    ).toBe(true)
    expect(
      div.querySelector("[aria-label='Expand diagram']")?.parentElement
        ?.classList.contains("mermaid-expand-controls")
    ).toBe(true)
    expect(
      div.querySelector("[aria-label='Zoom in']")?.parentElement?.classList.contains(
        "mermaid-zoom-controls"
      )
    ).toBe(true)
    expect(
      div.querySelector(".mermaid-viewport")?.getAttribute("tabindex")
    ).toBe("0")
  })

  it("keeps a narrow diagram at its natural size", async () => {
    const rectSpy = vi
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockImplementation(function (this: HTMLElement) {
        const isDiagram = this.classList.contains("mermaid-diagram")
        const width = isDiagram ? 400 : 1000
        const height = isDiagram ? 200 : 400
        return {
          bottom: height,
          height,
          left: 0,
          right: width,
          top: 0,
          width,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        }
      })
    const div = document.createElement("div")
    div.innerHTML = "<pre><code class='language-mermaid'>graph TD; A-->B</code></pre>"

    await renderMermaidBlocks(div)

    const wrapper = div.querySelector(".mermaid-block") as HTMLElement
    const viewport = div.querySelector(".mermaid-viewport") as HTMLElement
    expect(wrapper.dataset.mermaidScale).toBe("1")
    expect(wrapper.dataset.mermaidDefaultScale).toBe("1")
    expect(viewport.style.height).toBe("200px")
    rectSpy.mockRestore()
  })

  it("renders a column-width diagram across nearly all of the column", async () => {
    const rectSpy = vi
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockImplementation(function (this: HTMLElement) {
        const isDiagram = this.classList.contains("mermaid-diagram")
        const width = 1000
        const height = isDiagram ? 300 : 400
        return {
          bottom: height,
          height,
          left: 0,
          right: width,
          top: 0,
          width,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        }
      })
    const div = document.createElement("div")
    div.innerHTML = "<pre><code class='language-mermaid'>graph TD; A-->B</code></pre>"

    await renderMermaidBlocks(div)

    const wrapper = div.querySelector(".mermaid-block") as HTMLElement
    const viewport = div.querySelector(".mermaid-viewport") as HTMLElement
    expect(wrapper.dataset.mermaidDefaultScale).toBe("0.96")
    expect(viewport.style.height).toBe("288px")
    rectSpy.mockRestore()
  })

  it("does not enlarge compact diagrams", async () => {
    const rectSpy = vi
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockImplementation(function (this: HTMLElement) {
        const isDiagram = this.classList.contains("mermaid-diagram")
        const width = isDiagram ? 100 : 1000
        const height = isDiagram ? 100 : 400
        return {
          bottom: height,
          height,
          left: 0,
          right: width,
          top: 0,
          width,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        }
      })
    const div = document.createElement("div")
    div.innerHTML = "<pre><code class='language-mermaid'>graph TD; A-->B</code></pre>"

    await renderMermaidBlocks(div)

    const wrapper = div.querySelector(".mermaid-block") as HTMLElement
    const viewport = div.querySelector(".mermaid-viewport") as HTMLElement
    expect(wrapper.dataset.mermaidScale).toBe("1")
    expect(wrapper.dataset.mermaidDefaultScale).toBe("1")
    expect(viewport.style.height).toBe("100px")
    rectSpy.mockRestore()
  })

  it("limits tall diagrams by the available viewport height", async () => {
    const heightSpy = vi.spyOn(window, "innerHeight", "get").mockReturnValue(1000)
    const rectSpy = vi
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockImplementation(function (this: HTMLElement) {
        const isDiagram = this.classList.contains("mermaid-diagram")
        const width = isDiagram ? 300 : 1000
        const height = isDiagram ? 1000 : 400
        return {
          bottom: height,
          height,
          left: 0,
          right: width,
          top: 0,
          width,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        }
      })
    const div = document.createElement("div")
    div.innerHTML = "<pre><code class='language-mermaid'>flowchart TD; A-->B</code></pre>"

    await renderMermaidBlocks(div)

    const wrapper = div.querySelector(".mermaid-block") as HTMLElement
    const viewport = div.querySelector(".mermaid-viewport") as HTMLElement
    expect(wrapper.dataset.mermaidScale).toBe("0.8")
    expect(viewport.style.height).toBe("800px")
    rectSpy.mockRestore()
    heightSpy.mockRestore()
  })

  it("zooms with controls and resets the diagram view", async () => {
    const div = document.createElement("div")
    div.innerHTML = "<pre><code class='language-mermaid'>graph TD; A-->B</code></pre>"
    await renderMermaidBlocks(div)
    const wrapper = div.querySelector(".mermaid-block") as HTMLElement
    const diagram = div.querySelector(".mermaid-diagram") as HTMLElement
    const zoomIn = div.querySelector(
      "[data-mermaid-action='zoom-in']"
    ) as HTMLButtonElement
    const reset = div.querySelector(
      "[data-mermaid-action='reset']"
    ) as HTMLButtonElement

    expect(wrapper.dataset.mermaidScale).toBe("1.25")
    expect(diagram.style.transform).toBe("translate(0px, 0px) scale(1.25)")
    expect(reset.disabled).toBe(true)
    zoomIn.click()
    expect(wrapper.dataset.mermaidScale).toBe("1.5")
    expect(diagram.style.transform).toContain("scale(1.5)")
    expect(reset.disabled).toBe(false)

    reset.click()
    expect(wrapper.dataset.mermaidScale).toBe("1.25")
    expect(diagram.style.transform).toBe("translate(0px, 0px) scale(1.25)")
    expect(reset.disabled).toBe(true)
  })

  it("zooms with the mouse wheel and pans with arrow keys", async () => {
    const div = document.createElement("div")
    div.innerHTML = "<pre><code class='language-mermaid'>graph TD; A-->B</code></pre>"
    await renderMermaidBlocks(div)
    const wrapper = div.querySelector(".mermaid-block") as HTMLElement
    const viewport = div.querySelector(".mermaid-viewport") as HTMLElement

    viewport.dispatchEvent(
      new WheelEvent("wheel", {
        deltaY: -1,
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      })
    )
    expect(wrapper.dataset.mermaidScale).toBe("1.5")

    viewport.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })
    )
    viewport.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "ArrowDown",
        shiftKey: true,
        bubbles: true,
      })
    )
    expect(wrapper.dataset.mermaidX).toBe("24")
    expect(wrapper.dataset.mermaidY).toBe("60")
  })

  it("pans by dragging when the Pan control is enabled", async () => {
    const div = document.createElement("div")
    div.innerHTML = "<pre><code class='language-mermaid'>graph TD; A-->B</code></pre>"
    await renderMermaidBlocks(div)
    const wrapper = div.querySelector(".mermaid-block") as HTMLElement
    const viewport = div.querySelector(".mermaid-viewport") as HTMLElement
    const pan = div.querySelector(
      "[data-mermaid-action='pan']"
    ) as HTMLButtonElement
    const select = div.querySelector(
      "[data-mermaid-action='select']"
    ) as HTMLButtonElement
    const pointerEvent = (
      type: string,
      clientX: number,
      clientY: number,
      shiftKey = false
    ) => {
      const event = new Event(type, { bubbles: true })
      Object.defineProperties(event, {
        button: { value: 0 },
        pointerId: { value: 7 },
        clientX: { value: clientX },
        clientY: { value: clientY },
        shiftKey: { value: shiftKey },
      })
      return event
    }

    pan.click()
    expect(pan.getAttribute("aria-pressed")).toBe("true")
    expect(select.getAttribute("aria-pressed")).toBe("false")
    expect(wrapper.classList.contains("is-pan-enabled")).toBe(true)
    viewport.dispatchEvent(pointerEvent("pointerdown", 10, 20))
    viewport.dispatchEvent(pointerEvent("pointermove", 42, 55))
    viewport.dispatchEvent(pointerEvent("pointerup", 42, 55))

    expect(wrapper.dataset.mermaidX).toBe("32")
    expect(wrapper.dataset.mermaidY).toBe("35")
    expect(viewport.classList.contains("is-panning")).toBe(false)

    select.click()
    expect(select.getAttribute("aria-pressed")).toBe("true")
    expect(pan.getAttribute("aria-pressed")).toBe("false")
    expect(wrapper.classList.contains("is-pan-enabled")).toBe(false)
  })

  it("leaves ordinary dragging available for text selection", async () => {
    const div = document.createElement("div")
    div.innerHTML = "<pre><code class='language-mermaid'>graph TD; A-->B</code></pre>"
    await renderMermaidBlocks(div)
    const wrapper = div.querySelector(".mermaid-block") as HTMLElement
    const viewport = div.querySelector(".mermaid-viewport") as HTMLElement
    const pointerEvent = (type: string, clientX: number) => {
      const event = new Event(type, { bubbles: true })
      Object.defineProperties(event, {
        button: { value: 0 },
        pointerId: { value: 8 },
        clientX: { value: clientX },
        clientY: { value: 10 },
        shiftKey: { value: false },
      })
      return event
    }

    viewport.dispatchEvent(pointerEvent("pointerdown", 10))
    viewport.dispatchEvent(pointerEvent("pointermove", 50))
    viewport.dispatchEvent(pointerEvent("pointerup", 50))

    expect(wrapper.dataset.mermaidX).toBe("0")
    expect(wrapper.dataset.mermaidY).toBe("0")
    expect(viewport.classList.contains("is-panning")).toBe(false)
  })

  it("expands into the document viewport and restores the inline view", async () => {
    const div = document.createElement("div")
    document.body.append(div)
    div.innerHTML = "<pre><code class='language-mermaid'>graph TD; A-->B</code></pre>"
    await renderMermaidBlocks(div)
    const wrapper = div.querySelector(".mermaid-block") as HTMLElement
    const zoomIn = wrapper.querySelector(
      "[data-mermaid-action='zoom-in']"
    ) as HTMLButtonElement
    const expand = wrapper.querySelector(
      "[data-mermaid-action='expand']"
    ) as HTMLButtonElement
    zoomIn.click()
    const inlineScale = wrapper.dataset.mermaidScale

    expand.click()

    expect(wrapper.parentElement).toBe(document.body)
    expect(wrapper.classList.contains("is-expanded")).toBe(true)
    expect(wrapper.getAttribute("role")).toBe("dialog")
    expect(wrapper.getAttribute("aria-modal")).toBe("true")
    expect(document.documentElement.style.overflow).toBe("hidden")
    expect(expand.getAttribute("aria-label")).toBe("Close expanded diagram")
    expect(expand.querySelector("svg")).not.toBeNull()
    expect(expand.getAttribute("aria-pressed")).toBe("true")

    wrapper.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
    )

    expect(wrapper.parentElement).toBe(div)
    expect(wrapper.classList.contains("is-expanded")).toBe(false)
    expect(wrapper.hasAttribute("role")).toBe(false)
    expect(wrapper.dataset.mermaidScale).toBe(inlineScale)
    expect(document.documentElement.style.overflow).toBe("")
    expect(expand.getAttribute("aria-label")).toBe("Expand diagram")
    expect(expand.querySelector("svg")).not.toBeNull()
    expect(expand.getAttribute("aria-pressed")).toBe("false")
    div.remove()
  })

  it("refits an expanded diagram to the larger canvas", async () => {
    const rectSpy = vi
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockImplementation(function (this: HTMLElement) {
        const isDiagram = this.classList.contains("mermaid-diagram")
        const isExpandedViewport = this.classList.contains("mermaid-viewport") &&
          this.parentElement?.classList.contains("is-expanded")
        if (isDiagram && this.style.transform === "none") {
          expect(this.style.transition).toBe("none")
        }
        const width = isDiagram ? 400 : 1000
        const height = isDiagram ? 200 : isExpandedViewport ? 900 : 400
        return {
          bottom: height,
          height,
          left: 0,
          right: width,
          top: 0,
          width,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        }
      })
    const div = document.createElement("div")
    document.body.append(div)
    div.innerHTML = "<pre><code class='language-mermaid'>graph TD; A-->B</code></pre>"
    await renderMermaidBlocks(div)
    const wrapper = div.querySelector(".mermaid-block") as HTMLElement
    const expand = wrapper.querySelector(
      "[data-mermaid-action='expand']"
    ) as HTMLButtonElement

    expect(wrapper.dataset.mermaidScale).toBe("1")
    expand.click()
    expect(Number(wrapper.dataset.mermaidScale)).toBeCloseTo(2.25)
    expand.click()
    expect(wrapper.dataset.mermaidScale).toBe("1")
    expect(
      wrapper.querySelector<HTMLElement>(".mermaid-diagram")!.style.transition
    ).toBe("")

    div.remove()
    rectSpy.mockRestore()
  })

  it("allows manual zoom beyond the expanded auto-fit scale", async () => {
    const rectSpy = vi
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockImplementation(function (this: HTMLElement) {
        const isDiagram = this.classList.contains("mermaid-diagram")
        const isExpandedViewport = this.classList.contains("mermaid-viewport") &&
          this.parentElement?.classList.contains("is-expanded")
        const width = isDiagram ? 100 : 1000
        const height = isDiagram ? 100 : isExpandedViewport ? 900 : 400
        return {
          bottom: height,
          height,
          left: 0,
          right: width,
          top: 0,
          width,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        }
      })
    const div = document.createElement("div")
    document.body.append(div)
    div.innerHTML = "<pre><code class='language-mermaid'>graph TD; A-->B</code></pre>"
    await renderMermaidBlocks(div)
    const wrapper = div.querySelector(".mermaid-block") as HTMLElement
    const zoomIn = wrapper.querySelector(
      "[data-mermaid-action='zoom-in']"
    ) as HTMLButtonElement
    const expand = wrapper.querySelector(
      "[data-mermaid-action='expand']"
    ) as HTMLButtonElement

    expand.click()

    expect(wrapper.dataset.mermaidScale).toBe("4")
    expect(zoomIn.disabled).toBe(false)
    zoomIn.click()
    expect(wrapper.dataset.mermaidScale).toBe("4.25")

    expand.click()
    div.remove()
    rectSpy.mockRestore()
  })

  it("stores original source code in data-mermaid-src attribute", async () => {
    const div = document.createElement("div")
    div.innerHTML = "<pre><code class='language-mermaid'>graph TD; A-->B</code></pre>"
    await renderMermaidBlocks(div)
    const wrapper = div.querySelector(".mermaid-block") as HTMLElement
    expect(wrapper.dataset.mermaidSrc).toBe("graph TD; A-->B")
    expect(mockRender).toHaveBeenCalledWith("graph TD; A-->B", expect.any(Object))
  })

  it("replaces pre with an error block that locates a syntax error", async () => {
    mockRender.mockImplementation(() => {
      throw new PeleError("Parse error: unexpected token", "syntax", { line: 3, column: 7 })
    })
    const div = document.createElement("div")
    div.innerHTML = "<pre><code class='language-mermaid'>invalid diagram</code></pre>"
    await renderMermaidBlocks(div)
    expect(div.querySelector("pre")).toBeNull()
    expect(div.querySelector(".mermaid-error")?.textContent).toBe(
      "Mermaid error at line 3, column 7: Parse error: unexpected token"
    )
  })

  it("omits the location when Pele cannot detect the diagram type", async () => {
    mockRender.mockImplementation(() => {
      throw new PeleError("No diagram type detected for the given text.", "unsupported-diagram")
    })
    const div = document.createElement("div")
    div.innerHTML = "<pre><code class='language-mermaid'>zenuml</code></pre>"
    await renderMermaidBlocks(div)
    expect(div.querySelector(".mermaid-error")?.textContent).toBe(
      "Mermaid error: No diagram type detected for the given text."
    )
  })

  it("processes multiple mermaid blocks in one call", async () => {
    const div = document.createElement("div")
    div.innerHTML = `
      <pre><code class='language-mermaid'>graph TD; A-->B</code></pre>
      <pre><code class='language-mermaid'>sequenceDiagram; A->>B: Hello</code></pre>
    `
    await renderMermaidBlocks(div)
    expect(mockRender).toHaveBeenCalledTimes(2)
    expect(div.querySelectorAll(".mermaid-block")).toHaveLength(2)
  })
})

describe("rerenderMermaidBlocks", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRender.mockReturnValue({ svg: "<svg><text>updated</text></svg>" })
  })

  it("returns early without rendering when no mermaid-block wrappers exist", async () => {
    const div = document.createElement("div")
    div.innerHTML = "<p>no mermaid here</p>"
    await rerenderMermaidBlocks(div)
    expect(mockRender).not.toHaveBeenCalled()
  })

  it("re-renders existing blocks with new layouts", async () => {
    const div = document.createElement("div")
    div.innerHTML = `<div class="mermaid-block not-prose" data-mermaid-src="graph TD; A-->B"><svg><text>old</text></svg></div>`
    await rerenderMermaidBlocks(div)
    expect(mockRender).toHaveBeenCalledTimes(1)
    const wrapper = div.querySelector(".mermaid-block") as HTMLElement
    expect(wrapper.innerHTML).toContain("<text>updated</text>")
  })

  it("preserves zoom and pan when re-rendering an interactive block", async () => {
    const div = document.createElement("div")
    div.innerHTML = "<pre><code class='language-mermaid'>graph TD; A-->B</code></pre>"
    await renderMermaidBlocks(div)
    const wrapper = div.querySelector(".mermaid-block") as HTMLElement
    const viewport = div.querySelector(".mermaid-viewport") as HTMLElement
    const zoomIn = div.querySelector(
      "[data-mermaid-action='zoom-in']"
    ) as HTMLButtonElement
    zoomIn.click()
    viewport.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })
    )

    mockRender.mockReturnValue({ svg: "<svg><text>relaid</text></svg>" })
    await rerenderMermaidBlocks(div)

    expect(wrapper.dataset.mermaidScale).toBe("1.5")
    expect(wrapper.dataset.mermaidX).toBe("24")
    expect(div.querySelector(".mermaid-diagram")?.innerHTML).toContain("relaid")
  })

  it("retries error blocks and promotes them to mermaid-block on success", async () => {
    const div = document.createElement("div")
    div.innerHTML = `<div class="mermaid-error" data-mermaid-src="graph TD; A-->B">Mermaid error: Parse error</div>`
    await rerenderMermaidBlocks(div)
    expect(mockRender).toHaveBeenCalledTimes(1)
    const wrapper = div.querySelector(".mermaid-block") as HTMLElement
    expect(wrapper).not.toBeNull()
    expect(div.querySelector(".mermaid-error")).toBeNull()
    expect(wrapper.innerHTML).toContain("<text>updated</text>")
  })

  it("leaves existing SVG in place when re-render fails", async () => {
    mockRender.mockImplementation(() => {
      throw new Error("render failed")
    })
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    const div = document.createElement("div")
    div.innerHTML = `<div class="mermaid-block not-prose" data-mermaid-src="graph TD; A-->B"><svg><text>old</text></svg></div>`
    await rerenderMermaidBlocks(div)
    const wrapper = div.querySelector(".mermaid-block") as HTMLElement
    expect(wrapper.innerHTML).toContain("<text>old</text>")
    consoleSpy.mockRestore()
  })
})
