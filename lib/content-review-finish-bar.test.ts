// @vitest-environment jsdom
import { act, createElement, type ComponentProps } from "react"
import { createRoot } from "react-dom/client"
import { expect, it, vi } from "vitest"
import { ContentReviewFinishBar } from "../components/content-review-finish-bar"
import "./test-harness"

it("offers Finish review in the document only when the existing finish conditions allow it", () => {
  const finish = vi.fn()
  const props: ComponentProps<typeof ContentReviewFinishBar> = {
    agentHandoff: { canFinish: true, finish, sending: false, disabled: false, disabledReason: null, error: null, send: async () => true },
    panelOpen: false, diskChanged: false, questionsOpen: false, disabled: false,
  }
  const container = document.createElement("div")
  const root = createRoot(container)
  const render = (updates: Partial<typeof props> = {}) => act(() => root.render(createElement(ContentReviewFinishBar, { ...props, ...updates })))
  try {
    render()
    expect(container.textContent).toContain("Your agent is waiting")
    act(() => container.querySelector("button")!.click())
    expect(finish).toHaveBeenCalledOnce()
    for (const state of [{ panelOpen: true }, { diskChanged: true }, { questionsOpen: true }, { agentHandoff: undefined }, { agentHandoff: { ...props.agentHandoff!, canFinish: false } }]) {
      render(state)
      expect(container.querySelector("button")).toBeNull()
    }
    render({ agentHandoff: { ...props.agentHandoff!, finishing: true } })
    expect(container.querySelector("button")!.disabled).toBe(true)
    expect(container.textContent).toContain("Finishing review…")
    render({ agentHandoff: { ...props.agentHandoff!, error: "Could not finish the Review. Try again." } })
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("Try again.")
    expect(container.querySelector("button")!.disabled).toBe(false)
  } finally {
    act(() => root.unmount())
  }
})
