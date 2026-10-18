import { deflateSync, inflateSync, strFromU8, strToU8 } from "fflate"

import type { ReviewAnchor, ReviewComment, ReviewRound } from "./review"

export const LINK_SNAPSHOT_BASE_URL = "https://markside.app/s"
// Chat clients refuse to send links well below the old 16,000-character
// budget, so a Link Snapshot is only offered as the default this far.
export const LINK_SNAPSHOT_COMFORTABLE_CHARACTERS = 2_000
export const MAX_LINK_SNAPSHOT_OUTPUT_BYTES = 256 * 1024

export interface LinkSnapshot {
  filename: string
  markdown: string
  reviews?: ReviewRound[]
}

export type LinkSnapshotCreation =
  | { status: "ready"; url: string; characters: number; words: number; oversized: boolean }
  | { status: "too-large"; characters: number; words: number; bytes: number; maxBytes: number }

export type LinkSnapshotDecodeResult =
  | { status: "ready"; snapshot: LinkSnapshot; headingId: string | null }
  | { status: "invalid" }

export function isLinkSnapshotWithinTransportBudget(characters: number): boolean {
  return characters <= LINK_SNAPSHOT_COMFORTABLE_CHARACTERS
}

function isValidBasename(filename: string): boolean {
  return filename.length > 0 &&
    !filename.includes("/") &&
    !filename.includes("\\") &&
    !/[\u0000-\u001f\u007f]/.test(filename)
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ""
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000))
  }
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "")
}

function base64UrlToBytes(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("Invalid Base64URL")
  const padding = "=".repeat((4 - value.length % 4) % 4)
  const binary = atob(value.replaceAll("-", "+").replaceAll("_", "/") + padding)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

function countWords(markdown: string): number {
  return markdown.match(/\S+/g)?.length ?? 0
}

function encodeAnchor(anchor: ReviewAnchor) {
  return {
    e: anchor.exact,
    p: anchor.prefix,
    s: anchor.suffix,
    x: anchor.start,
    y: anchor.end,
    h: anchor.headingPath,
    ...(anchor.removed ? { r: true } : {}),
  }
}

function decodeAnchor(value: unknown): ReviewAnchor {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid anchor")
  }
  const anchor = value as Record<string, unknown>
  if (
    typeof anchor.e !== "string" ||
    typeof anchor.p !== "string" ||
    typeof anchor.s !== "string" ||
    typeof anchor.x !== "number" ||
    typeof anchor.y !== "number" ||
    !Array.isArray(anchor.h) ||
    !anchor.h.every((segment) => typeof segment === "string")
  ) {
    throw new Error("Invalid anchor")
  }
  return {
    exact: anchor.e,
    prefix: anchor.p,
    suffix: anchor.s,
    start: anchor.x,
    end: anchor.y,
    headingPath: anchor.h as string[],
    ...(anchor.r === true ? { removed: true as const } : {}),
  }
}

function encodeComment(comment: ReviewComment) {
  return { i: comment.id, b: comment.body, d: comment.createdAt, a: encodeAnchor(comment.anchor) }
}

function decodeComment(value: unknown): ReviewComment {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid comment")
  }
  const comment = value as Record<string, unknown>
  if (
    typeof comment.i !== "string" ||
    typeof comment.b !== "string" ||
    typeof comment.d !== "string"
  ) {
    throw new Error("Invalid comment")
  }
  return { id: comment.i, body: comment.b, createdAt: comment.d, anchor: decodeAnchor(comment.a) }
}

function encodeReviewRound(round: ReviewRound) {
  return {
    i: round.id,
    n: round.reviewerName,
    t: round.note,
    c: round.comments.map(encodeComment),
    d: round.createdAt,
  }
}

function decodeReviewRound(value: unknown): ReviewRound {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid Review Round")
  }
  const round = value as Record<string, unknown>
  if (
    typeof round.i !== "string" ||
    typeof round.t !== "string" ||
    !Array.isArray(round.c) ||
    typeof round.d !== "string"
  ) {
    throw new Error("Invalid Review Round")
  }
  if (round.n !== null && typeof round.n !== "string") {
    throw new Error("Invalid Review Round")
  }
  const reviewerName: string | null = typeof round.n === "string" ? round.n : null
  return {
    id: round.i,
    reviewerName,
    note: round.t,
    comments: round.c.map(decodeComment),
    createdAt: round.d,
  }
}

function parseEnvelope(value: unknown): LinkSnapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid envelope")
  }
  const keys = Object.keys(value)
  const hasReviews = keys.includes("r")
  const allowedKeys = hasReviews ? ["f", "m", "r"] : ["f", "m"]
  if (
    keys.length !== allowedKeys.length ||
    !allowedKeys.every((key) => keys.includes(key))
  ) {
    throw new Error("Invalid envelope")
  }
  const envelope = value as Record<string, unknown>
  if (typeof envelope.f !== "string" || typeof envelope.m !== "string") {
    throw new Error("Invalid envelope")
  }
  if (!isValidBasename(envelope.f)) throw new Error("Invalid basename")
  if (!hasReviews) return { filename: envelope.f, markdown: envelope.m }
  if (!Array.isArray(envelope.r)) throw new Error("Invalid reviews")
  return {
    filename: envelope.f,
    markdown: envelope.m,
    reviews: envelope.r.map(decodeReviewRound),
  }
}

function snapshotEnvelopeJson(snapshot: LinkSnapshot): string {
  return JSON.stringify(
    snapshot.reviews && snapshot.reviews.length > 0
      ? { f: snapshot.filename, m: snapshot.markdown, r: snapshot.reviews.map(encodeReviewRound) }
      : { f: snapshot.filename, m: snapshot.markdown },
  )
}

// Shared with the hosted upload path so the envelope is DEFLATEd the same way
// on both the link-fragment and encrypted-upload paths.
export function buildSnapshotEnvelopeBytes(snapshot: LinkSnapshot): Uint8Array {
  return deflateSync(strToU8(snapshotEnvelopeJson(snapshot)), { level: 9 })
}

export function createLinkSnapshot(snapshot: LinkSnapshot): LinkSnapshotCreation {
  if (!isValidBasename(snapshot.filename)) {
    throw new Error("Link Snapshot filename must be a valid basename")
  }
  const envelopeBytes = strToU8(snapshotEnvelopeJson(snapshot))
  const payload = bytesToBase64Url(deflateSync(envelopeBytes, { level: 9 }))
  const url = `${LINK_SNAPSHOT_BASE_URL}#x1.${payload}`
  const characters = url.length
  const words = countWords(snapshot.markdown)
  if (envelopeBytes.length > MAX_LINK_SNAPSHOT_OUTPUT_BYTES) {
    return {
      status: "too-large",
      characters,
      words,
      bytes: envelopeBytes.length,
      maxBytes: MAX_LINK_SNAPSHOT_OUTPUT_BYTES,
    }
  }
  return {
    status: "ready",
    url,
    characters,
    words,
    oversized: !isLinkSnapshotWithinTransportBudget(characters),
  }
}

export function decodeLinkSnapshotFragment(fragment: string): LinkSnapshotDecodeResult {
  try {
    const value = fragment.startsWith("#") ? fragment.slice(1) : fragment
    const delimiter = value.indexOf("~")
    const encoded = delimiter === -1 ? value : value.slice(0, delimiter)
    const heading = delimiter === -1 ? null : decodeURIComponent(value.slice(delimiter + 1))
    if (!encoded.startsWith("x1.")) return { status: "invalid" }
    const compressed = base64UrlToBytes(encoded.slice(3))
    const output = inflateSync(compressed, { out: new Uint8Array(MAX_LINK_SNAPSHOT_OUTPUT_BYTES + 1) })
    if (output.length > MAX_LINK_SNAPSHOT_OUTPUT_BYTES) return { status: "invalid" }
    return {
      status: "ready",
      snapshot: parseEnvelope(JSON.parse(strFromU8(output))),
      headingId: heading || null,
    }
  } catch {
    return { status: "invalid" }
  }
}
