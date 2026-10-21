import { Pencil } from "lucide-react"
import { useEffect, useRef } from "react"
import { createPortal } from "react-dom"

import type { QuestionCard } from "~lib/markdown"

const SEND_KEYS = typeof navigator !== "undefined" && /Mac/.test(navigator.userAgent) ? "⌘⇧↵" : "Ctrl+Shift+Enter"

function isTypingTarget(target: EventTarget | null) {
  return target instanceof Element &&
    !!target.closest("input, textarea, select, [contenteditable=''], [contenteditable='true'], [role='dialog']")
}

// The rendered options are the answer controls: this wires them and reflects the current answer.
export function QuestionCardActions({ card, answer, busy, composing, keyboard, onAnswer, onCompose, onSend, commentAt }: {
  card: QuestionCard
  /** The body of the question's current answer comment. */
  answer: string | null
  busy: boolean
  /** The composer is open on this question; the saved answer keeps its check until Save. */
  composing: boolean
  /** Letter keys choose an option; only one card on the page may listen. */
  keyboard: boolean
  onAnswer: (body: string) => void
  onCompose: (point: { x: number; y: number }) => void
  /** Sends the whole Review; absent without an active agent Review. */
  onSend?: () => void
  /** A Review Comment under the pointer takes the click instead of the option. */
  commentAt: (x: number, y: number) => boolean
}) {
  const chosen = answer?.trim() ?? null
  const latest = useRef({ chosen, busy, onAnswer, onSend, commentAt })
  latest.current = { chosen, busy, onAnswer, onSend, commentAt }
  const choose = (value: string) => {
    const { chosen, busy, onAnswer } = latest.current
    if (!busy && chosen !== value) onAnswer(value)
  }

  useEffect(() => {
    card.element.classList.add("question-card-interactive")
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
      option.element.focus({ preventScroll: true })
      choose(option.value)
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
            Answer or ask a question…
          </strong>
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
