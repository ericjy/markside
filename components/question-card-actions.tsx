import { Pencil, RefreshCw } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"

import type { QuestionCard } from "~lib/markdown"

// T opens the Something else composer, unless a card has that many options.
const TYPE_KEY = "T"
const SEND_KEYS = typeof navigator !== "undefined" && /Mac/.test(navigator.userAgent) ? "⌘⇧↵" : "Ctrl+Shift+Enter"

function isTypingTarget(target: EventTarget | null) {
  return target instanceof Element &&
    !!target.closest("input, textarea, select, [contenteditable=''], [contenteditable='true'], [role='dialog']")
}

/** Marks the comparison column of the hovered option, else of the chosen one; hovering fades the other columns. */
function highlightColumn(card: QuestionCard, hovered: string | null, chosen: string | null) {
  const value = hovered ?? chosen
  card.element.classList.toggle("question-column-hovering", hovered !== null)
  card.element.querySelectorAll<HTMLElement>("[data-question-column]").forEach((cell) => {
    cell.classList.toggle("question-column-highlight", cell.dataset.questionColumn === value)
  })
}

export type QuestionCardStatus = "ready" | "sending" | "sent"

function QuestionCardFooter({ status, onSend, onCheck }: {
  status: QuestionCardStatus
  onSend?: () => void
  onCheck?: () => Promise<boolean>
}) {
  const [check, setCheck] = useState<"idle" | "checking" | "unchanged" | "error">("idle")
  useEffect(() => setCheck("idle"), [status])
  if (status === "ready") {
    return (
      <>
        <p className="question-card-footer-text">All questions answered.</p>
        <button type="button" className="question-card-footer-button question-card-send" onClick={onSend}>
          Send review <kbd>{SEND_KEYS}</kbd>
        </button>
      </>
    )
  }
  if (status === "sending") return <p className="question-card-footer-text" role="status">Sending…</p>
  return (
    <>
      <p className="question-card-footer-text" role="status">
        <span className="question-card-waiting" aria-hidden="true" />
        {check === "unchanged" ? "No reply yet. The agent is still working." : check === "error" ? "Couldn’t check. Try again." : "Sent. The agent’s next question will appear here."}
      </p>
      {onCheck && (
        <button
          type="button"
          className="question-card-footer-button"
          disabled={check === "checking"}
          onClick={async () => {
            setCheck("checking")
            try {
              setCheck(await onCheck() ? "idle" : "unchanged")
            } catch {
              setCheck("error")
            }
          }}>
          <RefreshCw aria-hidden="true" className={check === "checking" ? "animate-spin" : ""} />
          {check === "checking" ? "Checking…" : "Check for reply"}
        </button>
      )}
    </>
  )
}

/** The first unanswered card after `from`, wrapping around; undefined when every other card is answered. */
export function nextQuestionCard<T>(cards: readonly T[], from: T, answered: (card: T) => boolean) {
  const index = cards.indexOf(from)
  return [...cards.slice(index + 1), ...cards.slice(0, index)].find((card) => !answered(card))
}

// The rendered options are the answer controls: this wires them and reflects the current answer.
export function QuestionCardActions({ card, answer, busy, composing, keyboard, status, onAnswer, onCompose, onSend, onCheck, onActivate, onAdvance, commentAt }: {
  card: QuestionCard
  /** The body of the question's current answer comment. */
  answer: string | null
  busy: boolean
  /** The composer is open on this question; the saved answer keeps its check until Save. */
  composing: boolean
  /** Letter keys choose an option; only one card on the page, the active one, may listen. */
  keyboard: boolean
  /** Shown just after the card: set only on the last card, while the round can be sent or is waiting on the agent. */
  status?: QuestionCardStatus
  onAnswer: (body: string) => void
  onCompose: (point: { x: number; y: number }) => void
  /** Sends the whole Review; absent without an active agent Review. */
  onSend?: () => void
  /** Rereads the document and Review; resolves true when the agent has replied. */
  onCheck?: () => Promise<boolean>
  /** Clicking or focusing into the card makes it the active one. */
  onActivate: () => void
  /** Set when several cards are answerable: the active card is outlined, and a letter answer moves on. */
  onAdvance?: () => void
  /** A Review Comment under the pointer takes the click instead of the option. */
  commentAt: (x: number, y: number) => boolean
}) {
  const chosen = answer?.trim() ?? null
  const latest = useRef({ chosen, busy, onAnswer, onCompose, onSend, onActivate, onAdvance, commentAt })
  latest.current = { chosen, busy, onAnswer, onCompose, onSend, onActivate, onAdvance, commentAt }
  const tile = useRef<HTMLButtonElement>(null)
  const hovered = useRef<string | null>(null)
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
      const onEnter = () => {
        hovered.current = value
        highlightColumn(card, value, latest.current.chosen)
      }
      const onLeave = () => {
        hovered.current = null
        highlightColumn(card, null, latest.current.chosen)
      }
      element.addEventListener("click", onClick)
      element.addEventListener("keydown", onKeyDown)
      element.addEventListener("pointerenter", onEnter)
      element.addEventListener("pointerleave", onLeave)
      element.addEventListener("focus", onEnter)
      element.addEventListener("blur", onLeave)
      return () => {
        element.removeEventListener("click", onClick)
        element.removeEventListener("keydown", onKeyDown)
        element.removeEventListener("pointerenter", onEnter)
        element.removeEventListener("pointerleave", onLeave)
        element.removeEventListener("focus", onEnter)
        element.removeEventListener("blur", onLeave)
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
    highlightColumn(card, hovered.current, chosen)
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
      if (!option && event.key.toUpperCase() === TYPE_KEY && tile.current) {
        event.preventDefault()
        if (latest.current.busy) return
        const rect = tile.current.getBoundingClientRect()
        latest.current.onCompose({ x: rect.left, y: rect.bottom })
        return
      }
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
  const letters = card.options.map(({ value }) => value)
  return (
    <>
      {createPortal(
        <button
          ref={tile}
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
      {status && createPortal(<QuestionCardFooter status={status} onSend={onSend} onCheck={onCheck} />, card.footerMount)}
      {keyboard && letters.length > 0 && (
        <p className="question-card-hint" aria-hidden="true">
          Press {letters.length > 4
            ? <><kbd>{letters[0]}</kbd> to <kbd>{letters.at(-1)}</kbd></>
            : letters.map((letter, index) => <span key={letter}>{index > 0 && " "}<kbd>{letter}</kbd></span>)} to choose
          {!letters.includes(TYPE_KEY) && <> or <kbd>{TYPE_KEY}</kbd> to type something else</>}
        </p>
      )}
    </>
  )
}
