import { useEffect,useRef,useState } from "react"
import {
  claimReviewPrompt,
  recordReviewPromptEvent,
  stopAutomaticReviewPrompts,
  type ReviewPromptEvent,
} from "~lib/review-prompt"

// Activity is recorded throughout the app, so readiness is tracked separately
// from the prompt dialog, which is decided last once every dialog is known.
export function useReviewPromptActivity() {
  const [reviewPromptReady, setReviewPromptReady] = useState(false)

  const trackReviewPromptActivity = (
    event: ReviewPromptEvent,
    naturalPause = false,
  ) => {
    void recordReviewPromptEvent(event)
      .then((eligible) => {
        if (eligible && naturalPause) setReviewPromptReady(true)
      })
      .catch(() => undefined)
  }

  return { reviewPromptReady, setReviewPromptReady, trackReviewPromptActivity }
}

export type ReviewPromptActivity = ReturnType<typeof useReviewPromptActivity>

interface UseContentReviewPromptOptions {
  activity: ReviewPromptActivity
  fileUrl: string
  content: string | null
  error: string | null
  // True while another dialog or menu has the user's attention.
  blocked: boolean
}

export function useContentReviewPrompt({
  activity: { reviewPromptReady, setReviewPromptReady, trackReviewPromptActivity },
  fileUrl,
  content,
  error,
  blocked,
}: UseContentReviewPromptOptions) {
  const [reviewPromptOpen, setReviewPromptOpen] = useState(false)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const trackedFileUrlRef = useRef<string | null>(null)

  const dismissReviewPrompt = () => {
    setReviewPromptOpen(false)
    requestAnimationFrame(() => previousFocusRef.current?.focus())
  }

  const acceptReviewPrompt = () => {
    setReviewPromptOpen(false)
    void stopAutomaticReviewPrompts().catch(() => undefined)
  }

  useEffect(() => {
    if (content === null || error || trackedFileUrlRef.current === fileUrl) return
    trackedFileUrlRef.current = fileUrl
    trackReviewPromptActivity("file-open", true)
  }, [content, error, fileUrl])

  useEffect(() => {
    if (!reviewPromptReady || reviewPromptOpen || blocked) return
    setReviewPromptReady(false)
    void claimReviewPrompt()
      .then((claimed) => {
        if (!claimed) return
        previousFocusRef.current =
          document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null
        setReviewPromptOpen(true)
      })
      .catch(() => undefined)
  }, [blocked, reviewPromptOpen, reviewPromptReady])

  return { reviewPromptOpen, dismissReviewPrompt, acceptReviewPrompt }
}
