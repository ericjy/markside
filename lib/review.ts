export const REVIEW_SCHEMA_VERSION = 1 as const
export const REVIEW_SELECTION_LIMIT = 2_000

export interface ReviewAnchor {
  removed?: true
  exact: string
  prefix: string
  suffix: string
  start: number
  end: number
  headingPath: string[]
}

export interface ReviewComment {
  localStatus?: "open" | "resolved"
  reviewMode?: "local" | "agent"
  id: string
  body: string
  createdAt: string
  anchor: ReviewAnchor
}

export function isSameReviewAnchor(left: ReviewAnchor, right: ReviewAnchor) {
  return left.removed === right.removed && left.start === right.start && left.end === right.end && left.exact === right.exact
}

export interface ReviewRound {
  id: string
  reviewerName: string | null
  note: string
  comments: ReviewComment[]
  createdAt: string
}

export interface ActiveReview {
  schemaVersion: typeof REVIEW_SCHEMA_VERSION
  sourceUrl: string
  sourceHash: string
  note: string
  updatedAt: string
  comments: ReviewComment[]
  // Read-only Review Rounds pulled in from a pasted Reviewed Snapshot link.
  // Absent on records written before this field existed.
  importedRounds?: ReviewRound[]
}

export interface ReviewHeadingSpan {
  path: string[]
  start: number
  end: number
}

export interface ReviewDocument {
  sourceHash: string
  text: string
  headings: ReviewHeadingSpan[]
}

export function findReviewHeadingFallback(
  headings: ReviewHeadingSpan[],
  headingPath: string[],
) {
  for (let depth = headingPath.length; depth > 0; depth -= 1) {
    const candidate = headingPath.slice(0, depth)
    const matches = headings.filter(({ path }) =>
      path.length === candidate.length &&
      path.every((segment, index) => segment === candidate[index])
    )
    if (matches.length === 1) return matches[0]
  }
  return null
}

export function createEmptyReview(
  sourceUrl: string,
  sourceHash: string,
  updatedAt = new Date().toISOString(),
): ActiveReview {
  return {
    schemaVersion: REVIEW_SCHEMA_VERSION,
    sourceUrl,
    sourceHash,
    note: "",
    comments: [],
    importedRounds: [],
    updatedAt,
  }
}

export function anchorForTextBlock(
  text: string,
  block: { start: number; end: number },
  headingPath: string[],
): ReviewAnchor {
  const end = Math.min(block.end, block.start + REVIEW_SELECTION_LIMIT)
  return {
    exact: text.slice(block.start, end),
    prefix: text.slice(Math.max(0, block.start - 80), block.start).replace(/\s+/g, " "),
    suffix: text.slice(end, end + 80).replace(/\s+/g, " "),
    start: block.start,
    end,
    headingPath,
  }
}

// Nested comments overlap, so the narrowest range under the pointer wins.
export function findInnermostCommentAt(
  comments: Iterable<{ id: string } & ResolvedAnchor>,
  offset: number,
): string | null {
  let closest: { id: string; range: { start: number; end: number } } | null = null
  for (const comment of comments) {
    if (
      comment.status !== "anchored" ||
      offset < comment.range.start ||
      offset > comment.range.end
    ) continue
    if (
      !closest ||
      comment.range.end - comment.range.start < closest.range.end - closest.range.start
    ) {
      closest = comment
    }
  }
  return closest?.id ?? null
}

export function getReviewItemCount(review: ActiveReview) {
  const importedCount = (review.importedRounds ?? []).reduce(
    (sum, round) => sum + round.comments.length + (round.note.trim() ? 1 : 0),
    0,
  )
  return review.comments.length + (review.note.trim() ? 1 : 0) + importedCount
}

export function hashReviewSource(source: string) {
  let hash = 0x811c9dc5
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, "0")
}

export type ResolvedReviewComment = ReviewComment & { displayNumber: number } & (
  | { status: "anchored"; range: { start: number; end: number } }
  | { status: "unanchored"; range: null }
)

type ReattachReviewPolicyInput = {
  review: ActiveReview
  document: ReviewDocument
  request: { type: "reattach" }
}

type AddCommentReviewPolicyInput = {
  review: ActiveReview
  document: ReviewDocument
  request: {
    type: "add-comment"
    id: string
    body: string
    createdAt: string
    anchor: ReviewAnchor
  }
}

type ExportReviewPolicyInput = {
  review: ActiveReview
  document: ReviewDocument
  request: {
    type: "export"
    verification: "verified" | "unverified"
    sourceUnavailable?: boolean
    commentId?: string
  }
}

type CheckCopyReviewPolicyInput = {
  review: ActiveReview
  document: ReviewDocument
  request: {
    type: "check-copy"
    draftState: "saved" | "unsaved"
    diskState: "current" | "changed" | "failed"
    allowUnverified: boolean
  }
}

type SelectAtOffsetReviewPolicyInput = {
  review: ActiveReview
  document: ReviewDocument
  request: { type: "select-at-offset"; offset: number }
}

type SummarizeReviewPolicyInput = {
  review: ActiveReview
  document: ReviewDocument
  request: { type: "summarize" }
}

type CreateRoundReviewPolicyInput = {
  review: ActiveReview
  document: ReviewDocument
  request: {
    type: "create-round"
    id: string
    reviewerName: string | null
    createdAt: string
  }
}

type ImportRoundsReviewPolicyInput = {
  review: ActiveReview
  document: ReviewDocument
  request: {
    type: "import-rounds"
    rounds: ReviewRound[]
    updatedAt: string
  }
}

type ReviewPolicyInput =
  | ReattachReviewPolicyInput
  | AddCommentReviewPolicyInput
  | ExportReviewPolicyInput
  | CheckCopyReviewPolicyInput
  | SelectAtOffsetReviewPolicyInput
  | SummarizeReviewPolicyInput
  | CreateRoundReviewPolicyInput
  | ImportRoundsReviewPolicyInput

export type ReviewPolicyResult =
  | { type: "reattach"; comments: ResolvedReviewComment[] }
  | { type: "add-comment"; outcome: "invalid"; reason: "empty" | "too-long" }
  | { type: "add-comment"; outcome: "duplicate"; commentId: string }
  | { type: "add-comment"; outcome: "added"; review: ActiveReview; commentId: string }
  | { type: "export"; markdown: string }
  | { type: "check-copy"; outcome: "blocked"; reason: "empty" | "unsaved-draft" | "external-change" | "verification-failed" }
  | { type: "check-copy"; outcome: "allowed"; verification: "verified" | "unverified" }
  | { type: "select-at-offset"; commentId: string | null }
  | { type: "summarize"; itemCount: number; copyable: boolean; clearDescription: string }
  | { type: "create-round"; outcome: "empty" }
  | { type: "create-round"; outcome: "created"; round: ReviewRound }
  | { type: "import-rounds"; outcome: "empty" }
  | { type: "import-rounds"; outcome: "imported"; review: ActiveReview; addedCount: number }

function findNormalizedQuoteRanges(text: string, quote: string) {
  const pattern = quote
    .trim()
    .split(/\s+/)
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("\\s+")
  if (!pattern) return []
  return Array.from(text.matchAll(new RegExp(pattern, "gu")), (match) => ({
    start: match.index,
    end: match.index + match[0].length,
  }))
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim()
}

function formatReviewComment(comment: ReviewComment) {
  const heading = comment.anchor.headingPath.join(" › ") || "Document"
  const quote = comment.anchor.exact
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n")
  return `Section: \`${heading}\`\n\n${comment.anchor.removed ? "Removed passage, from a previous version" : "Reviewed passage"}:\n\n${quote}\n\nComment:\n\n${comment.body.trim()}`
}

function formatReviewRound(round: ReviewRound, index: number) {
  const label = round.reviewerName?.trim() || "Reviewer"
  const date = round.createdAt.slice(0, 10)
  const parts = [`### Review Round ${index} — ${label} (${date})`]
  if (round.note.trim()) {
    parts.push(`Overall feedback:\n\n${round.note.trim()}`)
  }
  round.comments.forEach((comment, commentIndex) => {
    parts.push(`#### Comment ${commentIndex + 1}\n\n${formatReviewComment(comment)}`)
  })
  return parts.join("\n\n")
}

function formatReviewHistory(importedRounds: ReviewRound[]) {
  if (importedRounds.length === 0) return null
  const rounds = importedRounds.map((round, index) => formatReviewRound(round, index + 1))
  return `## Review History\n\n${rounds.join("\n\n")}`
}

export function getReviewSourcePath(sourceUrl: string) {
  const pathname = decodeURIComponent(new URL(sourceUrl).pathname)
  return /^\/[a-zA-Z]:\//.test(pathname) ? pathname.slice(1) : pathname
}

function disambiguateRanges(
  document: ReviewDocument,
  anchor: ReviewAnchor,
  ranges: Array<{ start: number; end: number }>,
) {
  const prefix = normalizeText(anchor.prefix)
  const suffix = normalizeText(anchor.suffix)
  const contextual = ranges.filter((range) => {
    const before = normalizeText(document.text.slice(0, range.start))
    const after = normalizeText(document.text.slice(range.end))
    return (!prefix || before.endsWith(prefix)) && (!suffix || after.startsWith(suffix))
  })
  if (contextual.length === 1) return contextual

  // Stored prefix/suffix context that fails to confirm any candidate is a signal
  // the passage moved, not a reason to fall back to an unverified raw match.
  const hasStoredContext = Boolean(prefix || suffix)
  const unverified = hasStoredContext && contextual.length === 0
  const candidates = contextual.length > 0 ? contextual : ranges
  if (anchor.headingPath.length === 0) return unverified ? [] : candidates
  const heading = anchor.headingPath.join("\u0000")
  const withinHeading = candidates.filter((range) => document.headings.some(
    (span) =>
      range.start >= span.start &&
      range.end <= span.end &&
      span.path.join("\u0000") === heading,
  ))
  if (withinHeading.length > 0) return withinHeading
  return unverified ? [] : candidates
}

export type ResolvedAnchor =
  | { status: "anchored"; range: { start: number; end: number } }
  | { status: "unanchored"; range: null }

// Imported Review Rounds carry no sourceHash of their own (they were written
// against a document Markside never had), so they always resolve through
// fuzzy quote matching rather than the cheap offset-equality fast path below.
export function resolveImportedCommentAnchor(
  anchor: ReviewAnchor,
  document: ReviewDocument,
): ResolvedAnchor {
  if (anchor.removed) return { status: "unanchored", range: null }
  const matches = findNormalizedQuoteRanges(document.text, anchor.exact)
  const candidates = disambiguateRanges(document, anchor, matches)
  if (candidates.length === 1) return { status: "anchored", range: candidates[0] }
  return { status: "unanchored", range: null }
}

export function resolveReviewPolicy<T extends ReviewPolicyInput["request"]["type"]>(
  input: ReviewPolicyInput & { request: { type: T } },
): Extract<ReviewPolicyResult, { type: T }>
export function resolveReviewPolicy(input: ReviewPolicyInput): ReviewPolicyResult {
  if (input.request.type === "summarize") {
    const hasNote = Boolean(input.review.note.trim())
    const commentCount = input.review.comments.length
    const commentLabel = `${commentCount} Review Comment${commentCount === 1 ? "" : "s"}`
    const importedRounds = input.review.importedRounds ?? []
    const roundLabel = importedRounds.length > 0
      ? `${importedRounds.length} imported Review Round${importedRounds.length === 1 ? "" : "s"}`
      : null
    const ownLabel = hasNote ? `the Review Note and ${commentLabel}` : commentLabel
    const itemCount = getReviewItemCount(input.review)
    return {
      type: "summarize",
      itemCount,
      copyable: itemCount > 0,
      clearDescription: roundLabel ? `${ownLabel} and ${roundLabel}` : ownLabel,
    }
  }

  if (input.request.type === "create-round") {
    if (!input.review.note.trim() && input.review.comments.length === 0) {
      return { type: "create-round", outcome: "empty" }
    }
    return {
      type: "create-round",
      outcome: "created",
      round: {
        id: input.request.id,
        reviewerName: input.request.reviewerName?.trim() || null,
        note: input.review.note,
        comments: input.review.comments,
        createdAt: input.request.createdAt,
      },
    }
  }

  if (input.request.type === "import-rounds") {
    if (input.request.rounds.length === 0) {
      return { type: "import-rounds", outcome: "empty" }
    }
    return {
      type: "import-rounds",
      outcome: "imported",
      addedCount: input.request.rounds.length,
      review: {
        ...input.review,
        importedRounds: input.request.rounds,
        updatedAt: input.request.updatedAt,
      },
    }
  }

  if (input.request.type === "add-comment") {
    const request = input.request
    const body = input.request.body.trim()
    if (!body) {
      return { type: "add-comment", outcome: "invalid", reason: "empty" }
    }
    if (normalizeText(request.anchor.exact).length > REVIEW_SELECTION_LIMIT) {
      return { type: "add-comment", outcome: "invalid", reason: "too-long" }
    }
    const storedDuplicate = input.review.comments.find((comment) =>
      isSameReviewAnchor(comment.anchor, request.anchor)
    )
    const reattached = resolveReviewPolicy({
      review: input.review,
      document: input.document,
      request: { type: "reattach" },
    })
    const currentDuplicate = !request.anchor.removed && reattached.type === "reattach"
      ? reattached.comments.find((comment) =>
          comment.status === "anchored" &&
          comment.range.start === request.anchor.start &&
          comment.range.end === request.anchor.end
        )
      : undefined
    const duplicate = storedDuplicate ?? currentDuplicate
    if (duplicate) {
      return {
        type: "add-comment",
        outcome: "duplicate",
        commentId: duplicate.id,
      }
    }
    const comment: ReviewComment = {
      id: input.request.id,
      body,
      createdAt: input.request.createdAt,
      anchor: request.anchor,
    }
    return {
      type: "add-comment",
      outcome: "added",
      commentId: comment.id,
      review: {
        ...input.review,
        updatedAt: input.request.createdAt,
        comments: [...input.review.comments, comment],
      },
    }
  }

  if (input.request.type === "check-copy") {
    if (getReviewItemCount(input.review) === 0) {
      return { type: "check-copy", outcome: "blocked", reason: "empty" }
    }
    if (input.request.draftState === "unsaved") {
      return { type: "check-copy", outcome: "blocked", reason: "unsaved-draft" }
    }
    if (input.request.diskState === "changed") {
      return { type: "check-copy", outcome: "blocked", reason: "external-change" }
    }
    if (input.request.diskState === "failed" && !input.request.allowUnverified) {
      return { type: "check-copy", outcome: "blocked", reason: "verification-failed" }
    }
    return {
      type: "check-copy",
      outcome: "allowed",
      verification: input.request.diskState === "current" ? "verified" : "unverified",
    }
  }

  if (input.request.type === "select-at-offset") {
    const { offset } = input.request
    const resolution = resolveReviewPolicy({
      review: input.review,
      document: input.document,
      request: { type: "reattach" },
    })
    if (resolution.type !== "reattach") {
      return { type: "select-at-offset", commentId: null }
    }
    const selected = resolution.comments
      .filter((comment): comment is ResolvedReviewComment & { status: "anchored" } =>
        comment.status === "anchored" &&
        offset >= comment.range.start &&
        offset <= comment.range.end
      )
      .sort((left, right) =>
        (left.range.end - left.range.start) - (right.range.end - right.range.start)
      )[0]
    return { type: "select-at-offset", commentId: selected?.id ?? null }
  }

  if (input.request.type === "export") {
    const resolution: ReviewPolicyResult = input.request.sourceUnavailable
      ? {
          type: "reattach",
          comments: input.review.comments.map((comment, index) => ({
            ...comment,
            status: "anchored" as const,
            range: { start: comment.anchor.start, end: comment.anchor.end },
            displayNumber: index + 1,
          })),
        }
      : resolveReviewPolicy({
          review: input.review,
          document: input.document,
          request: { type: "reattach" },
        })
    if (resolution.type !== "reattach") {
      throw new Error("Review reattachment did not complete")
    }
    const sourcePath = getReviewSourcePath(input.review.sourceUrl)
    const reviewHistory = formatReviewHistory(input.review.importedRounds ?? [])
    if (input.request.commentId) {
      const { commentId } = input.request
      const comment = resolution.comments.find(({ id }) => id === commentId)
      if (!comment) throw new Error("Review Comment not found")
      const sections = [
        "Address this review of the source. Make each requested edit, and answer any questions in your response. Leave unmentioned content alone.",
        `Source: \`${sourcePath}\``,
      ]
      if (input.request.verification === "unverified") {
        sections.push(
          "> Warning: Markside could not verify the current source. Verify the reviewed passage against the file before addressing the comment.",
        )
      }
      if (comment.anchor.removed) {
        sections.push(
          "> This comment refers to text removed in a previous file reload. The quote is historical context, not text currently in the file.",
        )
      } else if (comment.status === "unanchored") {
        sections.push(
          "> Warning: Markside could not locate this passage uniquely in the current document. Verify the reviewed passage against the source before addressing the comment; do not guess its location.",
        )
      }
      if (reviewHistory) sections.push(reviewHistory)
      if (input.review.note.trim()) {
        sections.push(`## Overall feedback\n\n${input.review.note.trim()}`)
      }
      sections.push(`## Comment 1\n\n${formatReviewComment(comment)}`)
      return { type: "export", markdown: `${sections.join("\n\n")}\n` }
    }
    const anchored = resolution.comments
      .filter((comment): comment is ResolvedReviewComment & { status: "anchored" } =>
        comment.status === "anchored"
      )
      .sort((left, right) => left.range.start - right.range.start)
    const unanchored = resolution.comments
      .filter((comment) => comment.status === "unanchored")
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
    const sections = [
      "Address this review of the source. Make each requested edit, and answer any questions in your response. Leave unmentioned content alone.",
      `Source: \`${sourcePath}\``,
    ]
    if (input.request.verification === "unverified") {
      sections.push(
        "> Warning: Markside could not verify the current source. Check every reviewed passage against the file before addressing the comments.",
      )
    }
    if (reviewHistory) sections.push(reviewHistory)
    if (input.review.note.trim()) {
      sections.push(`## Overall feedback\n\n${input.review.note.trim()}`)
    }
    if (anchored.length > 0) {
      sections.push(...anchored.map((comment) =>
        `## Comment ${comment.displayNumber}\n\n${formatReviewComment(comment)}`
      ))
    }
    if (unanchored.length > 0) {
      sections.push(...unanchored.map((comment) =>
        comment.anchor.removed
          ? `## Comment ${comment.displayNumber} on removed text\n\n> This text was removed in a previous file reload. The quote is historical context, not text currently in the file.\n\n${formatReviewComment(comment)}`
          : `## Unanchored comment ${comment.displayNumber}\n\n> Warning: Markside could not locate this passage uniquely in the current document. Verify the reviewed passage against the source before addressing the comment; do not guess its location.\n\n${formatReviewComment(comment)}`
      ))
    }
    return { type: "export", markdown: `${sections.join("\n\n")}\n` }
  }

  const unnumbered: Array<ReviewComment & (
    | { status: "anchored"; range: { start: number; end: number } }
    | { status: "unanchored"; range: null }
  )> = input.review.comments.map((comment) => {
      if (comment.anchor.removed) return { ...comment, status: "unanchored", range: null }
      const { start, end, exact } = comment.anchor
      if (
        input.review.sourceHash === input.document.sourceHash &&
        input.document.text.slice(start, end) === exact
      ) {
        return { ...comment, status: "anchored", range: { start, end } }
      }
      if (input.review.sourceHash !== input.document.sourceHash) {
        const matches = findNormalizedQuoteRanges(input.document.text, exact)
        const candidates = disambiguateRanges(input.document, comment.anchor, matches)
        if (candidates.length === 1) {
          return { ...comment, status: "anchored", range: candidates[0] }
        }
      }
      return { ...comment, status: "unanchored", range: null }
    })
  unnumbered.sort((left, right) => {
    if (left.status === "anchored" && right.status === "anchored") {
      return left.range.start - right.range.start || left.createdAt.localeCompare(right.createdAt)
    }
    if (left.status === "anchored") return -1
    if (right.status === "anchored") return 1
    return left.createdAt.localeCompare(right.createdAt)
  })
  const comments: ResolvedReviewComment[] = unnumbered.map((comment, index) => ({
    ...comment,
    displayNumber: index + 1,
  }))
  return {
    type: "reattach",
    comments,
  }
}
