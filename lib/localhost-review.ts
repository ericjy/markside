// Domain policy for reviewing a running localhost application.
//
// A localhost Active Review is scoped to one origin, including port. Each
// annotation records the page URL it was captured on, so one Review spans the
// routes of a single application and copies as one prompt.

import { REVIEW_SELECTION_LIMIT, type ReviewAnchor } from "./review"

// Localhost Review is paused and off in every build unless this is set to "true".
export const LOCALHOST_REVIEW_ENABLED = process.env.PLASMO_PUBLIC_LOCALHOST_REVIEW === "true"

export const LOCALHOST_REVIEW_SCHEMA_VERSION = 1 as const

export interface LocalhostElementDescriptor {
  tagName: string
  id: string | null
  testId: string | null
  role: string | null
  ariaLabel: string | null
  name: string | null
  classNames: string[]
  // Readable ancestor chain kept for the agent's benefit. Targets never resolve
  // through it. See ADR-0006.
  ancestorPath: string
}

export interface LocalhostTarget {
  kind: "text" | "element"
  anchor: ReviewAnchor
  element: LocalhostElementDescriptor
}

interface LocalhostAnnotationBase {
  id: string
  url: string
  createdAt: string
  target: LocalhostTarget
}

export type LocalhostAnnotation =
  | (LocalhostAnnotationBase & { kind: "comment"; body: string })
  | (LocalhostAnnotationBase & { kind: "replacement"; replacement: string })

export interface LocalhostReview {
  schemaVersion: typeof LOCALHOST_REVIEW_SCHEMA_VERSION
  origin: string
  note: string
  annotations: LocalhostAnnotation[]
  updatedAt: string
}

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1"])

export function getLocalhostReviewOrigin(url: string) {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null
  const hostname = parsed.hostname.toLowerCase()
  if (!LOCAL_HOSTNAMES.has(hostname) && !hostname.endsWith(".localhost")) return null
  return parsed.origin
}

// A fragment scrolls within the same rendered page, so it never starts a
// separate page group.
export function getLocalhostPageUrl(url: string) {
  const parsed = new URL(url)
  parsed.hash = ""
  return parsed.href
}

export function getLocalhostPageLabel(url: string) {
  const parsed = new URL(url)
  return `${parsed.pathname}${parsed.search}` || "/"
}

export function createEmptyLocalhostReview(
  origin: string,
  updatedAt = new Date().toISOString(),
): LocalhostReview {
  return {
    schemaVersion: LOCALHOST_REVIEW_SCHEMA_VERSION,
    origin,
    note: "",
    annotations: [],
    updatedAt,
  }
}

export function getLocalhostReviewItemCount(review: LocalhostReview) {
  return review.annotations.length + (review.note.trim() ? 1 : 0)
}

export function getLocalhostAnnotationText(annotation: LocalhostAnnotation) {
  return annotation.kind === "comment" ? annotation.body : annotation.replacement
}

export function resolveStoredLocalhostReview(
  value: unknown,
  origin: string,
): LocalhostReview | null {
  if (!value || typeof value !== "object") return null
  const stored = value as Partial<LocalhostReview>
  if (stored.schemaVersion !== LOCALHOST_REVIEW_SCHEMA_VERSION) return null
  if (!Array.isArray(stored.annotations)) return null
  return {
    schemaVersion: LOCALHOST_REVIEW_SCHEMA_VERSION,
    origin: stored.origin ?? origin,
    note: typeof stored.note === "string" ? stored.note : "",
    annotations: stored.annotations,
    updatedAt: typeof stored.updatedAt === "string"
      ? stored.updatedAt
      : new Date().toISOString(),
  }
}

export function normalizeReviewText(value: string) {
  return value.replace(/\s+/g, " ").trim()
}

function targetSignature(target: LocalhostTarget) {
  return [
    target.kind,
    target.element.tagName,
    target.element.id ?? "",
    target.element.testId ?? "",
    target.element.ancestorPath,
    normalizeReviewText(target.anchor.exact),
    normalizeReviewText(target.anchor.prefix),
    normalizeReviewText(target.anchor.suffix),
  ].join(" ")
}

export type AddLocalhostAnnotationRequest = {
  id: string
  url: string
  createdAt: string
  target: LocalhostTarget
} & ({ kind: "comment"; body: string } | { kind: "replacement"; replacement: string })

export type AddLocalhostAnnotationResult =
  | { outcome: "invalid"; reason: "empty" | "too-long" | "unchanged" | "no-text" }
  | { outcome: "duplicate"; annotationId: string }
  | { outcome: "added"; review: LocalhostReview; annotationId: string }

export function addLocalhostAnnotation(
  review: LocalhostReview,
  request: AddLocalhostAnnotationRequest,
): AddLocalhostAnnotationResult {
  const exact = normalizeReviewText(request.target.anchor.exact)
  if (exact.length > REVIEW_SELECTION_LIMIT) {
    return { outcome: "invalid", reason: "too-long" }
  }

  const url = getLocalhostPageUrl(request.url)
  let annotation: LocalhostAnnotation
  if (request.kind === "comment") {
    const body = request.body.trim()
    if (!body) return { outcome: "invalid", reason: "empty" }
    annotation = {
      id: request.id,
      kind: "comment",
      body,
      url,
      createdAt: request.createdAt,
      target: request.target,
    }
  } else {
    if (!exact) return { outcome: "invalid", reason: "no-text" }
    const replacement = request.replacement.trim()
    if (replacement === exact) return { outcome: "invalid", reason: "unchanged" }
    annotation = {
      id: request.id,
      kind: "replacement",
      replacement,
      url,
      createdAt: request.createdAt,
      target: request.target,
    }
  }

  const signature = targetSignature(request.target)
  const duplicate = review.annotations.find((candidate) =>
    candidate.kind === request.kind &&
    candidate.url === url &&
    targetSignature(candidate.target) === signature
  )
  if (duplicate) return { outcome: "duplicate", annotationId: duplicate.id }

  return {
    outcome: "added",
    annotationId: annotation.id,
    review: {
      ...review,
      annotations: [...review.annotations, annotation],
      updatedAt: request.createdAt,
    },
  }
}

export function updateLocalhostAnnotation(
  review: LocalhostReview,
  id: string,
  text: string,
  updatedAt = new Date().toISOString(),
): LocalhostReview {
  return {
    ...review,
    updatedAt,
    annotations: review.annotations.map((annotation) => {
      if (annotation.id !== id) return annotation
      return annotation.kind === "comment"
        ? { ...annotation, body: text }
        : { ...annotation, replacement: text }
    }),
  }
}

export function removeLocalhostAnnotation(
  review: LocalhostReview,
  id: string,
  updatedAt = new Date().toISOString(),
): LocalhostReview {
  return {
    ...review,
    updatedAt,
    annotations: review.annotations.filter((annotation) => annotation.id !== id),
  }
}

export function setLocalhostReviewNote(
  review: LocalhostReview,
  note: string,
  updatedAt = new Date().toISOString(),
): LocalhostReview {
  return { ...review, note, updatedAt }
}

export interface LocalhostReviewPage {
  url: string
  // The route, as the copied prompt names it. The panel shows the whole URL.
  label: string
  annotations: LocalhostAnnotation[]
}

export function groupLocalhostAnnotationsByPage(
  annotations: LocalhostAnnotation[],
): LocalhostReviewPage[] {
  const pages: LocalhostReviewPage[] = []
  for (const annotation of annotations) {
    const page = pages.find((candidate) => candidate.url === annotation.url)
    if (page) page.annotations.push(annotation)
    else {
      pages.push({
        url: annotation.url,
        label: getLocalhostPageLabel(annotation.url),
        annotations: [annotation],
      })
    }
  }
  return pages
}

// Short label for the reviewed content, used wherever a target is shown to the
// user. An element that renders no text falls back to its identity.
export function labelLocalhostTarget(target: LocalhostTarget) {
  const exact = target.anchor.exact.trim()
  if (exact) return exact
  const { tagName, ariaLabel, id } = target.element
  return `<${tagName}>${ariaLabel ? ` "${ariaLabel}"` : id ? ` #${id}` : ""}`
}

export function describeLocalhostTarget(target: LocalhostTarget) {
  const { element } = target
  const identity = element.ancestorPath
  const attributes = [
    element.testId ? `data-testid "${element.testId}"` : null,
    element.role ? `role "${element.role}"` : null,
    element.ariaLabel ? `aria-label "${element.ariaLabel}"` : null,
    element.name ? `name "${element.name}"` : null,
  ].filter((part): part is string => part !== null)
  return attributes.length ? `\`${identity}\` (${attributes.join(", ")})` : `\`${identity}\``
}

const TARGET_NOT_FOUND_WARNING =
  "> Warning: Markside could not locate this content on the page when the Review was copied. Find the described content in the source before making the change; do not guess its location."

function quote(value: string) {
  return value.split("\n").map((line) => `> ${line}`).join("\n")
}

function formatLocalhostAnnotation(
  annotation: LocalhostAnnotation,
  displayNumber: number,
  targetFound: boolean,
) {
  const title = annotation.kind === "comment"
    ? `Comment ${displayNumber}`
    : annotation.replacement
      ? `Text replacement ${displayNumber}`
      : `Deletion ${displayNumber}`
  const parts = [`### ${title}`]
  if (!targetFound) parts.push(TARGET_NOT_FOUND_WARNING)
  parts.push(`Element: ${describeLocalhostTarget(annotation.target)}`)
  // A target Markside could not find is described in full, since the agent has
  // nothing on the page to check it against.
  const heading = annotation.target.anchor.headingPath.join(" > ")
  if (!targetFound && heading) parts.push(`Section: \`${heading}\``)
  const prefix = annotation.target.anchor.prefix.trim()
  const suffix = annotation.target.anchor.suffix.trim()
  if (prefix || suffix) {
    parts.push(`Nearby text:\n\n${quote(`...${prefix} [reviewed content] ${suffix}...`)}`)
  }
  const exact = annotation.target.anchor.exact.trim()
  if (annotation.kind === "comment") {
    if (exact) parts.push(`Reviewed content:\n\n${quote(exact)}`)
    parts.push(`Comment:\n\n${annotation.body.trim()}`)
  } else if (annotation.replacement) {
    parts.push(`Replace:\n\n${quote(exact)}`)
    parts.push(`With:\n\n${quote(annotation.replacement)}`)
  } else {
    parts.push(`Delete:\n\n${quote(exact)}`)
  }
  return parts.join("\n\n")
}

export function formatLocalhostReviewPrompt(
  review: LocalhostReview,
  options: { missingTargetIds?: ReadonlySet<string>; annotationId?: string } = {},
) {
  const missing = options.missingTargetIds ?? new Set<string>()
  const annotations = options.annotationId
    ? review.annotations.filter(({ id }) => id === options.annotationId)
    : review.annotations
  const sections = [
    "Address this review of pages served on localhost. Find the source that renders each item and make the change: apply text replacements exactly as written, act on comments, and answer any questions in your response. Leave unmentioned content alone.",
  ]
  // Each page heading carries the whole URL, so the origin only needs saying
  // when the Review is overall feedback with nothing anchored to a page.
  if (annotations.length === 0) sections.push(`Served at: \`${review.origin}\``)
  if (review.note.trim()) {
    sections.push(`## Overall feedback\n\n${review.note.trim()}`)
  }
  let displayNumber = 0
  for (const page of groupLocalhostAnnotationsByPage(annotations)) {
    sections.push(`## Page \`${page.url}\``)
    for (const annotation of page.annotations) {
      displayNumber += 1
      sections.push(
        formatLocalhostAnnotation(annotation, displayNumber, !missing.has(annotation.id)),
      )
    }
  }
  return `${sections.join("\n\n")}\n`
}
