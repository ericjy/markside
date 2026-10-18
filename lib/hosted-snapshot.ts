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

const IV_BYTES = 12

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "")
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
