import { MessageSquareText } from "lucide-react"

import { Button } from "~components/ui/button"
import type { ReviewCommentStatus } from "~lib/agent-review"
import type { QuestionCard } from "~lib/markdown"

const ANSWER_STATUS: Record<Exclude<ReviewCommentStatus, "Resolved">, string> = {
  Open: "Saved as a Review Comment.",
  Draft: "Send the Review to share it with your agent.",
  Sent: "Sent. Waiting for the agent.",
  Addressed: "The agent replied.",
}

export function QuestionCardActions({ card, answer, busy, onAnswer, onCompose }: {
  card: QuestionCard
  answer: { body: string; status: Exclude<ReviewCommentStatus, "Resolved"> } | null
  busy: boolean
  onAnswer: (body: string) => void
  onCompose: (point: { x: number; y: number }) => void
}) {
  const chosen = answer?.body.trim()
  return (
    <div onMouseUp={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}>
      <div className="flex flex-col items-start gap-2">
        {card.options.length > 0 && (
          // A grid as wide as its widest option, so every option has the same width.
          <div role="radiogroup" aria-label="Answer options" className="grid w-fit max-w-full gap-2">
            {card.options.map(({ value, label }) => (
              <Button
                key={value}
                type="button"
                size="sm"
                role="radio"
                aria-checked={chosen === value}
                variant={chosen === value ? "default" : "outline"}
                disabled={busy}
                className="h-auto min-h-9 w-full justify-start whitespace-normal py-1.5 text-left"
                onClick={() => { if (chosen !== value) onAnswer(value) }}>
                {label}
                {value === card.recommended && <span className="ml-auto pl-2 text-xs font-normal opacity-70">Recommended</span>}
              </Button>
            ))}
          </div>
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
