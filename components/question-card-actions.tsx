import { MessageSquareText, Send } from "lucide-react"
import { useState } from "react"

import { Button } from "~components/ui/button"
import type { ReviewCommentStatus } from "~lib/agent-review"
import type { QuestionCard } from "~lib/markdown"

const ANSWER_STATUS: Record<Exclude<ReviewCommentStatus, "Resolved">, string> = {
  Open: "Saved as a Review Comment.",
  Draft: "Not sent yet.",
  Sent: "Sent. Waiting for the agent.",
  Addressed: "The agent replied.",
}

export function QuestionCardActions({ card, answer, agentReview, busy, onAnswer, onCompose }: {
  card: QuestionCard
  answer: { body: string; status: Exclude<ReviewCommentStatus, "Resolved"> } | null
  agentReview: boolean
  busy: boolean
  onAnswer: (body: string) => void
  onCompose: (point: { x: number; y: number }) => void
}) {
  const [selected, setSelected] = useState<string | null>(null)
  const current = answer?.body.trim()
  const chosen = selected ?? current
  // Re-sending the recorded answer would change nothing; an unsent Draft can still be sent.
  const unchanged = !selected || (selected === current && answer?.status !== "Draft")
  return (
    <div onMouseUp={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}>
      <div className="flex flex-wrap items-center gap-2">
        {card.options.length > 0 && (
          <div role="radiogroup" aria-label="Answer options" className="flex flex-wrap gap-2">
            {card.options.map(({ value, label }) => (
              <Button
                key={value}
                type="button"
                size="sm"
                role="radio"
                aria-checked={chosen === value}
                variant={chosen === value ? "default" : "outline"}
                disabled={busy}
                className="h-auto min-h-9 whitespace-normal py-1.5 text-left"
                onClick={() => setSelected(value)}>
                {label}
                {value === card.recommended && <span className="text-xs font-normal opacity-70">Recommended</span>}
              </Button>
            ))}
          </div>
        )}
        {card.options.length > 0 && (
          <Button
            type="button"
            size="sm"
            disabled={busy || unchanged}
            onClick={() => {
              onAnswer(selected!)
              setSelected(null)
            }}>
            <Send aria-hidden="true" />
            {agentReview ? "Send answer" : "Save answer"}
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={busy}
          onClick={(event) => {
            const rect = event.currentTarget.getBoundingClientRect()
            onCompose({ x: rect.left, y: rect.bottom })
          }}>
          <MessageSquareText aria-hidden="true" />
          {card.options.length ? "Other answer…" : "Answer…"}
        </Button>
      </div>
      {answer && (
        <p className="question-card-status" role="status">
          Your answer: <strong>{answer.body.length > 80 ? `${answer.body.slice(0, 80)}…` : answer.body}</strong>. {ANSWER_STATUS[answer.status]}
        </p>
      )}
    </div>
  )
}
