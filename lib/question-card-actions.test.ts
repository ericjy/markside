// @vitest-environment jsdom

import { act, createElement, type ComponentProps } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { nextQuestionCard, QuestionCardActions } from "../components/question-card-actions"
import { md, mountQuestionCard, type QuestionCard } from "./markdown"
import { buildRenderedTextIndex } from "./review-dom"

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement
let root: Root
let card: QuestionCard

beforeEach(() => {
  container = document.createElement("div")
  container.innerHTML = md.render("```question\n### Q1. Which?\n\n- **A. First.** One.\n- **B. Second.** Two.\n\n**Recommended: A.** Why.\n\n<details open>\n<summary>Compare tradeoffs</summary>\n\n| Criterion | A. First | B. Second |\n|---|---|---|\n| Speed | ✓ Fast | ✕ Slow |\n\n</details>\n```")
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
    card, answer: null, busy: false, composing: false, keyboard: true, onAnswer: vi.fn(), onCompose: vi.fn(), onActivate: vi.fn(), commentAt: () => false, ...props,
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

  it("opens a custom answer from a tile after the options and marks only saved custom answers", () => {
    const { onCompose, onAnswer } = render()
    const tile = container.querySelector<HTMLButtonElement>(".question-custom-answer")!
    expect(tile.closest(".question-card-actions")?.previousElementSibling?.className).toBe("question-options")
    expect(tile.closest(".question-card-actions")?.nextElementSibling?.className).toBe("question-recommendation")
    expect(tile.getAttribute("aria-pressed")).toBe("false")
    act(() => tile.click())
    expect(onCompose).toHaveBeenCalledOnce()
    expect(onAnswer).not.toHaveBeenCalled()
    expect(tile.querySelector("strong")?.textContent).toBe("Something else…")
    expect(tile.querySelector(".question-custom-answer-hint")?.textContent).toBe("Write your answer, or ask to clarify, skip, delegate the rest, or stop")
    expect(buildRenderedTextIndex(container).text).not.toContain("Something else")
    expect(tile.classList.contains("question-option-selected")).toBe(false)

    render({ answer: "I want a different approach." })
    expect(tile.getAttribute("aria-pressed")).toBe("true")
    expect(tile.classList.contains("question-option-selected")).toBe(true)
    expect(tile.querySelector(".question-custom-answer-text")?.textContent).toBe("I want a different approach.")
    expect(tile.querySelector(".question-custom-answer-hint")).toBeNull()
    expect(buildRenderedTextIndex(container).text).not.toContain("different approach")
    expect(option("A").getAttribute("aria-checked")).toBe("false")
    expect(option("B").getAttribute("aria-checked")).toBe("false")

    render({ answer: "B" })
    expect(tile.getAttribute("aria-pressed")).toBe("false")
    expect(tile.querySelector(".question-custom-answer-text")).toBeNull()
    expect(option("B").getAttribute("aria-checked")).toBe("true")
    render({ busy: true })
    expect(tile.disabled).toBe(true)
  })

  it("highlights the custom answer while composing but keeps the saved option checked", () => {
    render({ answer: "A", composing: true })
    const tile = container.querySelector<HTMLButtonElement>(".question-custom-answer")!
    expect(tile.classList.contains("question-option-composing")).toBe(true)
    expect(tile.getAttribute("aria-expanded")).toBe("true")
    expect(tile.classList.contains("question-option-selected")).toBe(false)
    expect(option("A").getAttribute("aria-checked")).toBe("true")

    render({ answer: "A", composing: false })
    expect(tile.classList.contains("question-option-composing")).toBe(false)
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

  it("sends the Review with the send shortcut, which the card's hint leaves to the Send button", () => {
    const onSend = vi.fn()
    render({ onSend })
    expect(container.querySelector(".question-card-hint")?.textContent).toBe("Press A B to choose or T to type something else")
    key({ key: "Enter", metaKey: true, shiftKey: true })
    expect(onSend).toHaveBeenCalledOnce()
  })

  it("opens the Something else composer with T", () => {
    const { onCompose, onAnswer } = render()
    key({ key: "t" })
    expect(onCompose).toHaveBeenCalledOnce()
    expect(onAnswer).not.toHaveBeenCalled()
  })

  it("does not listen for letter keys when another card owns the keyboard", () => {
    const { onAnswer } = render({ keyboard: false })
    key({ key: "b" })
    expect(onAnswer).not.toHaveBeenCalled()
    expect(container.textContent).not.toContain("to choose")
  })

  it("in a round, outlines the active card and moves on after a letter answer", () => {
    const onAdvance = vi.fn()
    const { onAnswer } = render({ onAdvance })
    expect(card.element.classList.contains("question-card-active")).toBe(true)
    key({ key: "b" })
    expect(onAnswer).toHaveBeenLastCalledWith("B")
    expect(onAdvance).toHaveBeenCalledOnce()
    act(() => option("A").click())
    expect(onAdvance).toHaveBeenCalledOnce()

    render({ onAdvance, keyboard: false })
    expect(card.element.classList.contains("question-card-active")).toBe(false)
    render({ onAdvance: undefined })
    expect(card.element.classList.contains("question-card-active")).toBe(false)
  })

  it("becomes active when clicked or focused into", () => {
    const { onActivate } = render({ keyboard: false })
    act(() => { option("A").dispatchEvent(new Event("pointerdown", { bubbles: true })) })
    act(() => { option("B").dispatchEvent(new FocusEvent("focusin", { bubbles: true })) })
    expect(onActivate).toHaveBeenCalledTimes(2)
  })
})

describe("next question card", () => {
  const answered = new Set(["Q1", "Q3"])
  const next = (from: string, cards = ["Q1", "Q2", "Q3", "Q4"]) => nextQuestionCard(cards, from, (card) => answered.has(card))

  it("moves to the next unanswered card, wrapping to earlier ones", () => {
    expect(next("Q2")).toBe("Q4")
    expect(next("Q4")).toBe("Q2")
    expect(next("Q1")).toBe("Q2")
  })

  it("finds none when every other card is answered", () => {
    expect(next("Q2", ["Q1", "Q2", "Q3"])).toBeUndefined()
  })
})

describe("question card comparison and footer", () => {
  const highlighted = () => Array.from(container.querySelectorAll<HTMLElement>(".question-column-highlight"), (cell) => cell.textContent)

  it("lights the hovered option's column, falling back to the chosen one", () => {
    render({ answer: "B" })
    expect(highlighted()).toEqual(["B. Second", "✕ Slow"])
    expect(card.element.classList.contains("question-column-hovering")).toBe(false)
    act(() => { option("A").dispatchEvent(new Event("pointerenter")) })
    expect(highlighted()).toEqual(["A. First", "✓ Fast"])
    expect(card.element.classList.contains("question-column-hovering")).toBe(true)
    act(() => { option("A").dispatchEvent(new Event("pointerleave")) })
    expect(highlighted()).toEqual(["B. Second", "✕ Slow"])
    expect(card.element.classList.contains("question-column-hovering")).toBe(false)
  })

  it("offers Send below the last card once everything is answered", () => {
    const onSend = vi.fn()
    render({ answer: "A", status: "ready", onSend })
    expect(card.footerMount.textContent).toContain("All questions answered.")
    act(() => card.footerMount.querySelector<HTMLButtonElement>(".question-card-send")!.click())
    expect(onSend).toHaveBeenCalledOnce()
    expect(buildRenderedTextIndex(container).text).not.toContain("All questions answered")
  })

  it("waits for the agent after sending and reports a check with no reply", async () => {
    const onCheck = vi.fn().mockResolvedValue(false)
    render({ answer: "A", status: "sent", onCheck })
    expect(card.footerMount.textContent).toContain("Sent. The agent’s next question will appear here.")
    await act(async () => card.footerMount.querySelector<HTMLButtonElement>("button")!.click())
    expect(onCheck).toHaveBeenCalledOnce()
    expect(card.footerMount.textContent).toContain("No reply yet.")
  })

  it("shows no footer without a status", () => {
    render({ answer: "A" })
    expect(card.footerMount.childElementCount).toBe(0)
  })
})
