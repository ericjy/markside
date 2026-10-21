// @vitest-environment jsdom

import { act, createElement, type ComponentProps } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { QuestionCardActions } from "../components/question-card-actions"
import { md, mountQuestionCard, type QuestionCard } from "./markdown"

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement
let root: Root
let card: QuestionCard

beforeEach(() => {
  container = document.createElement("div")
  container.innerHTML = md.render("> [!QUESTION]\n> ### Q1. Which?\n>\n> - **A. First.** One.\n> - **B. Second.** Two.\n>\n> **Recommended: A.** Why.")
  document.body.append(container)
  card = mountQuestionCard(container.querySelector<HTMLElement>(".markdown-alert-question")!)!
  root = createRoot(card.mount)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

function render(props: Partial<ComponentProps<typeof QuestionCardActions>> = {}) {
  const all: ComponentProps<typeof QuestionCardActions> = {
    card, answer: null, busy: false, keyboard: true, onAnswer: vi.fn(), onCompose: vi.fn(), commentAt: () => false, ...props,
  }
  act(() => root.render(createElement(QuestionCardActions, all)))
  return all
}

const option = (value: string) => container.querySelector<HTMLElement>(`li[data-question-option="${value}"]`)!
const key = (init: KeyboardEventInit) => act(() => { window.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...init })) })

describe("question card options", () => {
  it("answers when an option is clicked, without a send control on the card", () => {
    const { onAnswer } = render()
    act(() => option("B").click())
    expect(onAnswer).toHaveBeenCalledWith("B")
    expect(container.textContent).not.toContain("Send answer")
    expect(card.element.classList.contains("question-card-interactive")).toBe(true)
  })

  it("leaves a click to text selection or to a Review Comment under the pointer", () => {
    const { onAnswer } = render({ commentAt: () => true })
    act(() => option("B").click())
    expect(onAnswer).not.toHaveBeenCalled()

    const selected = render({ onAnswer: vi.fn() })
    const range = document.createRange()
    range.selectNodeContents(option("B"))
    window.getSelection()!.addRange(range)
    act(() => option("B").click())
    window.getSelection()!.removeAllRanges()
    expect(selected.onAnswer).not.toHaveBeenCalled()
  })

  it("marks the current answer as the checked option and ignores choosing it again", () => {
    const { onAnswer } = render({ answer: "A" })
    expect(option("A").getAttribute("aria-checked")).toBe("true")
    expect(option("A").classList.contains("question-option-selected")).toBe(true)
    expect(option("B").getAttribute("aria-checked")).toBe("false")
    act(() => option("A").click())
    expect(onAnswer).not.toHaveBeenCalled()
  })

  it("chooses with letter keys and Enter, but not while typing or busy", () => {
    const { onAnswer } = render()
    key({ key: "b" })
    expect(onAnswer).toHaveBeenLastCalledWith("B")
    act(() => { option("A").dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })) })
    expect(onAnswer).toHaveBeenLastCalledWith("A")

    const input = document.createElement("textarea")
    document.body.append(input)
    act(() => { input.dispatchEvent(new KeyboardEvent("keydown", { key: "b", bubbles: true })) })
    input.remove()
    expect(onAnswer).toHaveBeenCalledTimes(2)

    const busy = render({ busy: true, onAnswer: vi.fn() })
    key({ key: "b" })
    expect(busy.onAnswer).not.toHaveBeenCalled()
  })

  it("sends the Review with the send shortcut only during an agent Review", () => {
    const onSend = vi.fn()
    render({ onSend })
    expect(container.textContent).toContain("to send review")
    key({ key: "Enter", metaKey: true, shiftKey: true })
    expect(onSend).toHaveBeenCalledOnce()

    render({ onSend: undefined })
    expect(container.textContent).not.toContain("to send review")
  })

  it("does not listen for letter keys when another card owns the keyboard", () => {
    const { onAnswer } = render({ keyboard: false })
    key({ key: "b" })
    expect(onAnswer).not.toHaveBeenCalled()
    expect(container.textContent).not.toContain("to choose")
  })
})
