import React from "react"
import { Button } from "~components/ui/button"
import type { AgentReviewHandoff } from "~hooks/use-content-agent-review"

interface Props {
  agentHandoff?: AgentReviewHandoff
  panelOpen: boolean
  diskChanged: boolean
  questionsOpen: boolean
  disabled: boolean
}

export function ContentReviewFinishBar({ agentHandoff, panelOpen, diskChanged, questionsOpen, disabled }: Props) {
  if (!agentHandoff?.canFinish || panelOpen || diskChanged || questionsOpen) return null
  const busy = agentHandoff.sending || agentHandoff.finishing || agentHandoff.resolvingAll || agentHandoff.updatingCommentId != null
  return (
    <div aria-label="Finish Review" className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b bg-background px-8 py-4 text-sm text-foreground print:hidden">
      <div role="status">
        <p className="font-semibold">Your agent is waiting</p>
        <p className="mt-0.5 text-muted-foreground">Keep commenting, or finish this review.</p>
      </div>
      <Button size="sm" className="shrink-0" onClick={agentHandoff.finish}
        disabled={disabled || busy} aria-busy={agentHandoff.finishing}>
        {agentHandoff.finishing ? "Finishing review…" : "Finish review"}
      </Button>
      {agentHandoff.error && <p role="alert" className="w-full text-xs text-destructive">{agentHandoff.error}</p>}
    </div>
  )
}
