// @vitest-environment jsdom

import { act, createElement, type ComponentProps } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { QuestionCardActions } from "../components/question-card-actions"
import { md, mountQuestionCard } from "./markdown"

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement("div")
  container.innerHTML = md.render("> [!QUESTION]\n> ### Q1. Which?\n>\n> - **A. First.** One.\n> - **B. Second.** Two.\n>\n> **Recommended: A.** Why.")
  document.body.append(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

function render(props: Partial<ComponentProps<typeof QuestionCardActions>> = {}) {
  const card = mountQuestionCard(container.querySelector<HTMLElement>(".markdown-alert-question")!)!
  const onAnswer = vi.fn()
  root = createRoot(card.mount)
  act(() => root.render(createElement(QuestionCardActions, {
    card, answer: null, busy: false, onAnswer, onCompose: vi.fn(), ...props,
  })))
  const button = (name: string) => Array.from(container.querySelectorAll("button"))
    .find((candidate) => candidate.textContent?.startsWith(name))!
  return { onAnswer, button }
}

describe("question card answers", () => {
  it("records each selected option as the answer, with no send control of its own", () => {
    const { onAnswer, button } = render()
    expect(button("Send answer")).toBeUndefined()
    act(() => button("B. Second.").click())
    expect(onAnswer).toHaveBeenCalledWith("B")
  })

  it("marks the recommendation without selecting it", () => {
    const { button } = render()
    expect(button("A. First.").textContent).toContain("Recommended")
    expect(button("A. First.").getAttribute("aria-checked")).toBe("false")
  })

  it("shows the current answer as selected and changes it only for another option", () => {
    const { onAnswer, button } = render({ answer: { body: "A", status: "Draft" } })
    expect(button("A. First.").getAttribute("aria-checked")).toBe("true")
    expect(container.textContent).toContain("Send the Review to share it with your agent.")
    act(() => button("A. First.").click())
    expect(onAnswer).not.toHaveBeenCalled()
    act(() => button("B. Second.").click())
    expect(onAnswer).toHaveBeenCalledWith("B")
  })
})
