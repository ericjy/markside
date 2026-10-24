import React from "react"
import { Button } from "~components/ui/button"
import type { AgentReviewHandoff } from "~hooks/use-content-agent-review"
import { currentAgentReview, getReviewCommentStatus, hasReviewDrafts } from "~lib/agent-review"
import type { ActiveReview } from "~lib/review"

interface Props {
  agentHandoff?: AgentReviewHandoff
  review?: ActiveReview | null
  panelOpen: boolean
  diskChanged: boolean
  questionsOpen: boolean
  disabled: boolean
}

export function ContentReviewFinishBar({ agentHandoff, review = null, panelOpen, diskChanged, questionsOpen, disabled }: Props) {
  if (!agentHandoff || agentHandoff.completed || panelOpen || diskChanged) return null
  const file = agentHandoff.file
  const sendOffered = !!file && hasReviewDrafts(review, file)
  const finishOffered = agentHandoff.canFinish && !questionsOpen
  if (!sendOffered && !finishOffered) return null
  const current = file ? currentAgentReview(review, file) : null
  const draftCount = current?.comments.filter((comment) => comment.localStatus !== "resolved" && comment.reviewMode !== "local" &&
    getReviewCommentStatus(comment, file?.comments.find(({ id }) => id === comment.id), true) === "Draft").length ?? 0
  const noteChanged = !!current?.note.trim() && current.note !== (file?.note ?? "")
  const status = sendOffered
    ? draftCount > 0
      ? `${draftCount} ${draftCount === 1 ? "comment" : "comments"}${noteChanged ? " and review note" : ""} ready to send`
      : "Review note ready to send"
    : "Your agent is waiting. Keep commenting, or finish."
  const busy = agentHandoff.sending || agentHandoff.finishing || agentHandoff.resolvingAll || agentHandoff.updatingCommentId != null
  return (
    <div aria-label="Review actions" className="sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b bg-background px-8 py-2 text-sm text-foreground print:hidden">
      <p role="status">{status}</p>
      <Button size="sm" className="shrink-0" onClick={sendOffered ? () => void agentHandoff.send() : agentHandoff.finish}
        disabled={disabled || busy || (sendOffered && agentHandoff.disabled)} aria-busy={sendOffered ? agentHandoff.sending : agentHandoff.finishing}
        title={sendOffered ? agentHandoff.disabledReason ?? undefined : undefined}>
        {sendOffered ? agentHandoff.sending ? "Sending review…" : "Send review" : agentHandoff.finishing ? "Finishing review…" : "Finish review"}
      </Button>
      {agentHandoff.error && <p role="alert" className="w-full text-xs text-destructive">{agentHandoff.error}</p>}
    </div>
  )
}
