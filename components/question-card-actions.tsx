import { Pencil } from "lucide-react"
import { useEffect, useRef } from "react"
import { createPortal } from "react-dom"

import type { QuestionCard } from "~lib/markdown"

const SEND_KEYS = typeof navigator !== "undefined" && /Mac/.test(navigator.userAgent) ? "⌘⇧↵" : "Ctrl+Shift+Enter"

function isTypingTarget(target: EventTarget | null) {
  return target instanceof Element &&
    !!target.closest("input, textarea, select, [contenteditable=''], [contenteditable='true'], [role='dialog']")
}

/** The first unanswered card after `from`, wrapping around; undefined when every other card is answered. */
export function nextQuestionCard<T>(cards: readonly T[], from: T, answered: (card: T) => boolean) {
  const index = cards.indexOf(from)
  return [...cards.slice(index + 1), ...cards.slice(0, index)].find((card) => !answered(card))
}

// The rendered options are the answer controls: this wires them and reflects the current answer.
export function QuestionCardActions({ card, answer, busy, composing, keyboard, onAnswer, onCompose, onSend, onActivate, onAdvance, commentAt }: {
  card: QuestionCard
  /** The body of the question's current answer comment. */
  answer: string | null
  busy: boolean
  /** The composer is open on this question; the saved answer keeps its check until Save. */
  composing: boolean
  /** Letter keys choose an option; only one card on the page, the active one, may listen. */
  keyboard: boolean
  onAnswer: (body: string) => void
  onCompose: (point: { x: number; y: number }) => void
  /** Sends the whole Review; absent without an active agent Review. */
  onSend?: () => void
  /** Clicking or focusing into the card makes it the active one. */
  onActivate: () => void
  /** Set when several cards are answerable: the active card is outlined, and a letter answer moves on. */
  onAdvance?: () => void
  /** A Review Comment under the pointer takes the click instead of the option. */
  commentAt: (x: number, y: number) => boolean
}) {
  const chosen = answer?.trim() ?? null
  const latest = useRef({ chosen, busy, onAnswer, onSend, onActivate, onAdvance, commentAt })
  latest.current = { chosen, busy, onAnswer, onSend, onActivate, onAdvance, commentAt }
  const choose = (value: string) => {
    const { chosen, busy, onAnswer } = latest.current
    if (!busy && chosen !== value) onAnswer(value)
  }

  useEffect(() => {
    card.element.classList.add("question-card-interactive")
    const activate = () => latest.current.onActivate()
    card.element.addEventListener("pointerdown", activate)
    card.element.addEventListener("focusin", activate)
    const removers = card.options.map(({ value, element }) => {
      const onClick = (event: MouseEvent) => {
        // Dragging selects option text to comment on it; a link keeps its own click.
        if (!window.getSelection()?.isCollapsed || (event.target as Element).closest("a")) return
        if (latest.current.commentAt(event.clientX, event.clientY)) return
        choose(value)
      }
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key !== "Enter" && event.key !== " ") return
        if (event.metaKey || event.ctrlKey) return
        event.preventDefault()
        choose(value)
      }
      element.addEventListener("click", onClick)
      element.addEventListener("keydown", onKeyDown)
      return () => {
        element.removeEventListener("click", onClick)
        element.removeEventListener("keydown", onKeyDown)
      }
    })
    return () => {
      card.element.classList.remove("question-card-interactive")
      card.element.removeEventListener("pointerdown", activate)
      card.element.removeEventListener("focusin", activate)
      removers.forEach((remove) => remove())
    }
  }, [card])

  useEffect(() => {
    for (const { value, element } of card.options) {
      element.classList.toggle("question-option-selected", value === chosen)
      element.setAttribute("aria-checked", String(value === chosen))
      element.setAttribute("aria-disabled", String(busy))
    }
  }, [card, chosen, busy])

  const outlined = keyboard && !!onAdvance
  useEffect(() => {
    card.element.classList.toggle("question-card-active", outlined)
    return () => card.element.classList.remove("question-card-active")
  }, [card, outlined])

  useEffect(() => {
    if (!keyboard) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || isTypingTarget(event.target)) return
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && event.shiftKey) {
        if (!latest.current.onSend) return
        event.preventDefault()
        latest.current.onSend()
        return
      }
      if (event.metaKey || event.ctrlKey || event.shiftKey) return
      const option = card.options.find(({ value }) => value === event.key.toUpperCase())
      if (!option) return
      event.preventDefault()
      if (latest.current.busy) return
      choose(option.value)
      if (latest.current.onAdvance) latest.current.onAdvance()
      else option.element.focus({ preventScroll: true })
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [card, keyboard])

  const customChosen = !!chosen && !card.options.some(({ value }) => value === chosen)
  const first = card.options[0]?.value
  const last = card.options.at(-1)?.value
  return (
    <>
      {createPortal(
        <button
          type="button"
          disabled={busy}
          aria-pressed={customChosen}
          aria-expanded={composing}
          className={`question-option question-custom-answer${customChosen ? " question-option-selected" : ""}${composing ? " question-option-composing" : ""}`}
          onMouseUp={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation()
            const rect = event.currentTarget.getBoundingClientRect()
            onCompose({ x: rect.left, y: rect.bottom })
          }}>
          <strong>
            <span className="question-option-key"><Pencil aria-hidden="true" /></span>
            Something else…
          </strong>
          {customChosen
            ? <span className="question-custom-answer-text">{chosen}</span>
            : <span className="question-custom-answer-hint">Write your answer, or ask to clarify, skip, get fewer questions, or stop</span>}
        </button>,
        card.composeMount,
      )}
      {keyboard && first && (
        <p className="question-card-hint" aria-hidden="true">
          <kbd>{first}</kbd>{first !== last && <>–<kbd>{last}</kbd></>} to choose
          {onSend && <> · <kbd>{SEND_KEYS}</kbd> to send review</>}
        </p>
      )}
    </>
  )
}
