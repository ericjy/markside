import { decodeSnapshotEnvelopeBytes, type LinkSnapshot } from "./link-snapshot"

// The server that stores Hosted Snapshots. Production builds use markside.app;
// a build can point elsewhere with PLASMO_PUBLIC_SNAPSHOT_ORIGIN, which also
// feeds the manifest's host_permissions so the upload is actually allowed.
export const SNAPSHOT_ORIGIN =
  process.env.PLASMO_PUBLIC_SNAPSHOT_ORIGIN ?? "https://markside.app"
export const HOSTED_SNAPSHOT_BASE_URL = `${SNAPSHOT_ORIGIN}/s`
export const HOSTED_SNAPSHOT_UPLOAD_URL = `${SNAPSHOT_ORIGIN}/api/snapshots`
export const EXPIRY_DAY_OPTIONS = [7, 30, 90] as const
export const DEFAULT_EXPIRY_DAYS = 30

const SNAPSHOT_ID_CHARACTERS = 28
const SNAPSHOT_KEY_CHARACTERS = 43

export const HOSTED_SNAPSHOT_URL_CHARACTERS =
  HOSTED_SNAPSHOT_BASE_URL.length + "/".length + SNAPSHOT_ID_CHARACTERS +
  "#h1.".length + SNAPSHOT_KEY_CHARACTERS

export type ExpiryDays = (typeof EXPIRY_DAY_OPTIONS)[number]

export const MAX_HOSTED_SNAPSHOT_OUTPUT_BYTES = 6 * 1024 * 1024
export const MAX_HOSTED_SNAPSHOT_UPLOAD_BYTES = 4 * 1000 * 1000

const IV_BYTES = 12
const TAG_BYTES = 16

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "")
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - value.length % 4) % 4)
  const binary = atob(value.replaceAll("-", "+").replaceAll("_", "/") + padding)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

export async function encryptSnapshotEnvelope(
  envelope: Uint8Array,
): Promise<{ key: string; blob: Uint8Array<ArrayBuffer> }> {
  const cryptoKey = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt"],
  )
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES))
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, cryptoKey, new Uint8Array(envelope)),
  )
  const raw = new Uint8Array(await crypto.subtle.exportKey("raw", cryptoKey))

  const blob = new Uint8Array(iv.length + ciphertext.length)
  blob.set(iv, 0)
  blob.set(ciphertext, iv.length)

  return { key: bytesToBase64Url(raw), blob }
}

export function buildHostedSnapshotUrl(id: string, key: string): string {
  return `${HOSTED_SNAPSHOT_BASE_URL}/${id}#h1.${key}`
}

// The ciphertext crosses the extension message boundary as a plain number
// array: structured clone of a Uint8Array is not dependable across every
// Chrome messaging path, so background.ts reconstructs it on the other side.
export async function uploadHostedSnapshot(blob: Uint8Array, days: ExpiryDays): Promise<string> {
  const response = await chrome.runtime.sendMessage({
    type: "upload-snapshot",
    days,
    blob: Array.from(blob),
  }) as { id?: string; error?: string }
  if (!response?.id) throw new Error(response?.error ?? "Upload failed")
  return response.id
}

export function isHostedSnapshotId(id: string): boolean {
  return new RegExp(`^\\d{6}[A-Za-z0-9_-]{${SNAPSHOT_ID_CHARACTERS - 6}}$`).test(id)
}

// Only links from SNAPSHOT_ORIGIN count, since it is the one server holding
// their ciphertext that the extension may reach.
export function parseHostedSnapshotUrl(url: string): { id: string; key: string } | null {
  let parsed: URL
  try {
    parsed = new URL(url.trim())
  } catch {
    return null
  }
  if (parsed.origin !== SNAPSHOT_ORIGIN) return null
  const id = /^\/s\/([^/]+)$/.exec(parsed.pathname)?.[1]
  if (!id || !isHostedSnapshotId(id)) return null
  const key = new RegExp(`^#h1\\.([A-Za-z0-9_-]{${SNAPSHOT_KEY_CHARACTERS}})(?:~|$)`).exec(parsed.hash)?.[1]
  return key ? { id, key } : null
}

export type HostedSnapshotLoadResult =
  | { status: "ready"; snapshot: LinkSnapshot }
  | { status: "unavailable" }
  | { status: "invalid" }
  | { status: "failed" }

export async function loadHostedSnapshot(id: string, key: string): Promise<HostedSnapshotLoadResult> {
  let response: { status?: number; blob?: number[]; error?: string }
  try {
    response = await chrome.runtime.sendMessage({ type: "fetch-snapshot", id })
  } catch {
    return { status: "failed" }
  }
  // The server answers 410 after expiry and 404 once the sweep removes it.
  if (response?.status === 404 || response?.status === 410) return { status: "unavailable" }
  if (!response?.blob) return { status: "failed" }
  try {
    const blob = new Uint8Array(response.blob)
    if (blob.length <= IV_BYTES + TAG_BYTES) return { status: "invalid" }
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      base64UrlToBytes(key),
      { name: "AES-GCM" },
      false,
      ["decrypt"],
    )
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: blob.subarray(0, IV_BYTES) },
      cryptoKey,
      blob.subarray(IV_BYTES),
    )
    return { status: "ready", snapshot: decodeSnapshotEnvelopeBytes(new Uint8Array(plaintext), MAX_HOSTED_SNAPSHOT_OUTPUT_BYTES) }
  } catch {
    return { status: "invalid" }
  }
}
