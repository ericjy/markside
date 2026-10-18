import React,{ useEffect,useMemo,useRef,useState } from "react"
import {
  extractReadabilitySections,
  formatReadabilityComment,
  resolveReadabilityResult,
  type ReadabilityDimension,
  type ReadabilityResult,
  type ReadabilitySection,
} from "~lib/readability"
import { checkReadability,locateReadability } from "~lib/readability-service"
import { anchorForTextBlock,type ActiveReview } from "~lib/review"
import { type RenderedTextIndex } from "~lib/review-dom"
import { type ReviewPromptEvent } from "~lib/review-prompt"

const READABILITY_SOURCE_LIMIT_BYTES = 20_000

export type ReadabilityMount = {
  heading: HTMLElement
  mount: HTMLSpanElement
  section: ReadabilitySection
}

interface UseContentReadabilityOptions {
  fileUrl: string
  content: string | null
  review: ActiveReview | null
  updateReview: (mutate: (current: ActiveReview | null) => ActiveReview | null) => void
  reviewForMutation: (current: ActiveReview | null) => ActiveReview
  currentReviewDocument: () => RenderedTextIndex | null
  setSelectedReviewId: React.Dispatch<React.SetStateAction<string | null>>
  setReviewOverlayOpen: React.Dispatch<React.SetStateAction<boolean>>
  trackReviewPromptActivity: (event: ReviewPromptEvent) => void
}

export function useContentReadability({
  fileUrl,
  content,
  review,
  updateReview,
  reviewForMutation,
  currentReviewDocument,
  setSelectedReviewId,
  setReviewOverlayOpen,
  trackReviewPromptActivity,
}: UseContentReadabilityOptions) {
  const [readabilityMounts, setReadabilityMounts] = useState<ReadabilityMount[]>([])
  const [results, setResults] = useState<ReadabilityResult[]>([])
  const [resultsFileUrl, setResultsFileUrl] = useState<string | null>(null)
  const readabilityResultsRef = useRef<ReadabilityResult[]>([])
  const [readabilityControlsVisible, setReadabilityControlsVisible] = useState(true)
  const [readabilityConsentGranted, setReadabilityConsentGranted] = useState(false)
  const consentRef = useRef(false)
  const fileUrlRef = useRef(fileUrl)
  fileUrlRef.current = fileUrl

  useEffect(() => {
    let active = true
    void chrome.storage.local.get(["readabilityControlsVisible", "readabilityConsentGranted"]).then((stored) => {
      if (!active) return
      setReadabilityControlsVisible(stored.readabilityControlsVisible !== false)
      consentRef.current = stored.readabilityConsentGranted === true
      setReadabilityConsentGranted(consentRef.current)
    })
    const onChange = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area !== "local") return
      if (changes.readabilityControlsVisible) setReadabilityControlsVisible(changes.readabilityControlsVisible.newValue !== false)
      if (changes.readabilityConsentGranted) {
        consentRef.current = changes.readabilityConsentGranted.newValue === true
        setReadabilityConsentGranted(consentRef.current)
      }
    }
    chrome.storage.onChanged.addListener(onChange)
    return () => {
      active = false
      chrome.storage.onChanged.removeListener(onChange)
    }
  }, [])

  useEffect(() => {
    const key = `readability:${fileUrl}`
    let active = true
    readabilityResultsRef.current = []
    setResults([])
    setResultsFileUrl(fileUrl)
    void chrome.storage.local.get(key).then((stored) => {
      if (!active) return
      const next = Array.isArray(stored[key]) ? stored[key] as ReadabilityResult[] : []
      readabilityResultsRef.current = next
      setResults(next)
    }).catch(() => undefined)
    const onChange = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (!active || area !== "local" || !changes[key]) return
      const next = Array.isArray(changes[key].newValue) ? changes[key].newValue as ReadabilityResult[] : []
      readabilityResultsRef.current = next
      setResults(next)
    }
    chrome.storage.onChanged.addListener(onChange)
    return () => { active = false; chrome.storage.onChanged.removeListener(onChange) }
  }, [fileUrl])

  const readabilitySections = useMemo(() => extractReadabilitySections(content ?? ""), [content])
  const hasSingleH1 = useMemo(
    () => readabilitySections.filter((section) => section.level === 1).length === 1,
    [readabilitySections],
  )
  const resolvedResults = useMemo(
    () => resultsFileUrl === fileUrl
      ? results.map((result) => resolveReadabilityResult(result, readabilitySections))
      : [],
    [results, resultsFileUrl, readabilitySections, fileUrl],
  )

  const saveReadabilityResults = (next: ReadabilityResult[]) => {
    readabilityResultsRef.current = next
    setResults(next)
    setResultsFileUrl(fileUrl)
    void chrome.storage.local.set({ [`readability:${fileUrl}`]: next })
  }

  const matchingReadabilityResult = (section: ReadabilitySection) =>
    resolvedResults.find((resolved) =>
      resolved?.section.sourceLine === section.sourceLine && resolved.section.level === section.level
    ) ?? null

  const runReadabilityCheck = async (section: ReadabilitySection) => {
    if (!consentRef.current) throw new Error("Confirm before sending this section")
    if (new TextEncoder().encode(section.source).length > READABILITY_SOURCE_LIMIT_BYTES) throw new Error("This section is too long to check (limit is about 3,000 words). Nested subsections count, so try a heading with fewer subsections.")
    const checkedFileUrl = fileUrl
    const previous = matchingReadabilityResult(section)?.result
    const scores = await checkReadability(section.source)
    if (fileUrlRef.current !== checkedFileUrl) return
    const result: ReadabilityResult = {
      id: previous?.id ?? crypto.randomUUID(),
      level: section.level,
      path: section.path,
      samePathCount: section.samePathCount,
      sourceLine: section.sourceLine,
      sourceHash: section.sourceHash,
      documentHash: section.documentHash,
      scores,
      createdAt: new Date().toISOString(),
      commentId: previous?.commentId,
    }
    saveReadabilityResults([...readabilityResultsRef.current.filter((item) => item.id !== previous?.id), result])
  }

  const runReadabilityLocate = async (section: ReadabilitySection, result: ReadabilityResult, dimensions: ReadabilityDimension[]) => {
    if (!consentRef.current) throw new Error("Confirm before sending this section")
    const locatedFileUrl = fileUrl
    const findings = await locateReadability(section.source, dimensions)
    if (fileUrlRef.current !== locatedFileUrl) return
    if (!readabilityResultsRef.current.some((item) => item.id === result.id)) return
    saveReadabilityResults(readabilityResultsRef.current.map((item) => item.id === result.id ? { ...item, findings } : item))
  }

  const confirmReadabilityConsent = () => {
    consentRef.current = true
    setReadabilityConsentGranted(true)
    void chrome.storage.local.set({ readabilityConsentGranted: true })
  }

  const addReadabilityComment = (section: ReadabilitySection, result: ReadabilityResult) => {
    if (result.commentId && review?.comments.some((comment) => comment.id === result.commentId)) {
      setSelectedReviewId(result.commentId)
      setReviewOverlayOpen(true)
      return
    }
    const mount = readabilityMounts.find((item) => item.section.sourceLine === section.sourceLine && item.section.level === section.level)
    const index = currentReviewDocument()
    const block = index?.blocks.find((item) => item.element === mount?.heading)
    if (!index || !block) return
    const anchor = anchorForTextBlock(index.text, block, section.path)
    const commentId = crypto.randomUUID()
    const createdAt = new Date().toISOString()
    const body = formatReadabilityComment(result)
    const isFirstComment = (review?.comments.length ?? 0) === 0
    updateReview((current) => ({
      ...reviewForMutation(current),
      updatedAt: createdAt,
      comments: [...(current?.comments ?? []), { id: commentId, body, anchor, createdAt }],
    }))
    setSelectedReviewId(commentId)
    setReviewOverlayOpen(true)
    if (isFirstComment) trackReviewPromptActivity("review-comment")
    saveReadabilityResults(readabilityResultsRef.current.map((item) =>
      item.id === result.id ? { ...item, commentId } : item
    ))
  }

  return {
    readabilitySections,
    readabilityMounts,
    setReadabilityMounts,
    readabilityResultsRef,
    saveReadabilityResults,
    readabilityControlsVisible,
    setReadabilityControlsVisible,
    readabilityConsentGranted,
    confirmReadabilityConsent,
    hasSingleH1,
    matchingReadabilityResult,
    runReadabilityCheck,
    runReadabilityLocate,
    addReadabilityComment,
  }
}
