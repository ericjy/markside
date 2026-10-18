// @vitest-environment jsdom

import {
  act,
  createElement,
  forwardRef,
  type ComponentProps,
  type HTMLAttributes,
} from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { SidebarLeft } from "../components/sidebar-left"

vi.mock("~components/file-tree", () => ({
  FileTree: () => null,
}))

vi.mock("~components/ui/sidebar", () => {
  const MockSidebarPart = forwardRef<
    HTMLDivElement,
    HTMLAttributes<HTMLDivElement>
  >(({ children, ...props }, ref) => createElement("div", { ...props, ref }, children))

  return {
    Sidebar: MockSidebarPart,
    SidebarContent: MockSidebarPart,
    SidebarGroup: MockSidebarPart,
    SidebarGroupContent: MockSidebarPart,
    SidebarGroupLabel: MockSidebarPart,
    SidebarHeader: MockSidebarPart,
  }
})

vi.mock("~hooks/use-file-tree", () => ({
  useFileTree: () => ({
    tree: [],
    expandDir: () => {},
    collapseDir: () => {},
  }),
}))

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true

describe("SidebarLeft", () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    container = document.createElement("div")
    document.body.append(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    vi.unstubAllGlobals()
  })

  function renderSidebar() {
    const props: ComponentProps<typeof SidebarLeft> = {
      currentFileUrl: "file:///Users/eric/Code/markside/README.md",
      sidebarWidth: 256,
      onResize: () => {},
      onFileSelect: () => {},
      handle: null,
      rootUrl: null,
      status: "idle",
      openDirectory: async () => false,
      reauthorize: async () => {},
      folderError: null,
      onOpenPalette: () => {},
      reviewCounts: {},
    }

    act(() => root.render(createElement(SidebarLeft, props)))
  }

  it("keeps rendering after the extension context is invalidated", () => {
    const getManifest = vi.fn(() => {
      throw new Error("Extension context invalidated.")
    })
    vi.stubGlobal("chrome", {
      runtime: {
        getManifest,
      },
    })

    expect(renderSidebar).not.toThrow()
    expect(container.textContent).toContain("Markside")
    expect(container.textContent).not.toContain("v1.2.0")
    expect(getManifest).toHaveBeenCalledOnce()
  })

  it("shows the manifest version while the extension context is connected", () => {
    vi.stubGlobal("chrome", {
      runtime: {
        getManifest: () => ({ version: "1.2.0" }),
      },
    })

    renderSidebar()

    expect(container.textContent).toContain("v1.2.0")
  })
})
