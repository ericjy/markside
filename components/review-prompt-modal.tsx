import { Check, Mail, X } from "lucide-react"
import { useRef } from "react"

import { Button } from "~components/ui/button"
import {
  CHROME_WEB_STORE_REVIEW_URL,
  MARKSIDE_FEEDBACK_URL,
} from "~lib/review-prompt"

interface ReviewPromptModalProps {
  onDismiss: () => void
  onReview: () => void
}

function PaperCardArtwork() {
  return (
    <div className="relative h-full min-h-[22rem] overflow-hidden bg-[#f6eee2]" aria-hidden="true">
      <div className="absolute -bottom-20 -left-16 h-52 w-52 rounded-full bg-[#f5b83d]" />
      <div className="absolute -bottom-24 -right-20 h-72 w-72 rounded-full bg-[#d9eef0]" />

      <div className="absolute left-7 top-12 h-52 w-32 -rotate-[9deg] rounded-xl border border-black/10 bg-[#fffdf8] p-4 shadow-[0_12px_28px_rgba(64,49,31,0.15)]">
        <div className="space-y-3 font-mono text-2xl font-semibold text-[#35322e]">
          <div>#</div>
          <div>**</div>
          <div>[ ]</div>
          <div>&gt;</div>
        </div>
      </div>

      <div className="absolute left-[5.6rem] top-9 h-60 w-36 rotate-[2deg] rounded-xl border border-black/10 bg-[#fffdf8] p-4 shadow-[0_12px_28px_rgba(64,49,31,0.16)]">
        <div className="h-2.5 w-24 rounded-full bg-[#171717]" />
        <div className="mt-3 h-2.5 w-14 rounded-full bg-[#171717]" />
        <div className="mt-7 space-y-2">
          <div className="h-1.5 rounded-full bg-black/15" />
          <div className="h-1.5 w-5/6 rounded-full bg-black/15" />
          <div className="h-1.5 w-3/4 rounded-full bg-black/15" />
        </div>
        <div className="mt-7 grid grid-cols-2 gap-1">
          {Array.from({ length: 6 }).map((_, index) => (
            <span key={index} className="h-5 border border-black/10" />
          ))}
        </div>
      </div>

      <div className="absolute left-[8.2rem] top-[5.4rem] h-56 w-36 rotate-[8deg] rounded-xl border border-black/10 bg-[#fffdf8] p-4 shadow-[0_12px_28px_rgba(64,49,31,0.18)]">
        <div className="h-2.5 w-24 rounded-full bg-[#171717]" />
        <div className="mt-3 h-2.5 w-16 rounded-full bg-[#171717]" />
        <div className="mt-7 space-y-2">
          <div className="h-1.5 rounded-full bg-black/15" />
          <div className="h-1.5 rounded-full bg-black/15" />
          <div className="h-1.5 w-4/5 rounded-full bg-black/15" />
        </div>
        <div className="mt-7 flex items-center justify-between rounded-lg bg-[#dcebd7] px-3 py-2 text-[#315b35]">
          <span className="h-1.5 w-12 rounded-full bg-[#315b35]/40" />
          <Check size={16} strokeWidth={2.5} />
        </div>
        <svg className="ml-auto mt-7 h-8 w-20 text-[#25231f]" viewBox="0 0 80 28" fill="none">
          <path d="M2 21c12-15 15-15 18-1 3 11 8-13 15-10 7 3 4 12 12 11 8-1 11-8 16-5 5 3 7 6 15 2" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  )
}

export function ReviewPromptModal({ onDismiss, onReview }: ReviewPromptModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 p-4" role="presentation">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-prompt-title"
        aria-describedby="review-prompt-description"
        onKeyDown={(event) => {
          if (event.key !== "Tab") return
          const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
          )
          if (!focusable?.length) return
          const first = focusable[0]
          const last = focusable[focusable.length - 1]
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault()
            last.focus()
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault()
            first.focus()
          }
        }}
        className="relative grid w-full max-w-[640px] overflow-hidden rounded-2xl border border-black/10 bg-background shadow-2xl sm:grid-cols-[3fr_2fr]">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onDismiss}
          className="absolute right-3 top-3 z-10 h-8 w-8 rounded-full bg-background/90 shadow-sm backdrop-blur"
          aria-label="Not now">
          <X size={15} />
        </Button>

        <div className="flex min-h-[22rem] flex-col p-8 pr-9 sm:p-9">
          <div className="my-auto py-8">
            <h2 id="review-prompt-title" className="text-2xl font-semibold tracking-tight">
              Leave a Chrome Web Store review
            </h2>
            <p id="review-prompt-description" className="mt-4 text-sm leading-6 text-muted-foreground">
              Markside is free. Your honest review shapes what we improve and helps others find it.
            </p>
          </div>
          <div className="space-y-2">
            <Button asChild className="w-full shadow-[0_0_0_1px_#078a52]">
              <a
                href={CHROME_WEB_STORE_REVIEW_URL}
                target="_blank"
                rel="noreferrer"
                autoFocus
                onClick={onReview}>
                Leave a review
              </a>
            </Button>
            <Button type="button" variant="outline" className="w-full" onClick={onDismiss}>
              Not now
            </Button>
            <a
              href={MARKSIDE_FEEDBACK_URL}
              onClick={onDismiss}
              className="mx-auto flex w-fit items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              <Mail size={13} aria-hidden="true" />
              Send feedback by email
            </a>
          </div>
        </div>

        <div className="hidden sm:block">
          <PaperCardArtwork />
        </div>
      </div>
    </div>
  )
}
