import { inflateSync, strFromU8, strToU8 } from "fflate"
import { deflateSync } from "fflate"
import { describe, expect, it, vi } from "vitest"

import {
  buildHostedSnapshotUrl,
  DEFAULT_EXPIRY_DAYS,
  encryptSnapshotEnvelope,
  EXPIRY_DAY_OPTIONS,
  HOSTED_SNAPSHOT_BASE_URL,
  HOSTED_SNAPSHOT_UPLOAD_URL,
  HOSTED_SNAPSHOT_URL_CHARACTERS,
  loadHostedSnapshot,
  parseHostedSnapshotUrl,
  SNAPSHOT_ORIGIN,
  uploadHostedSnapshot,
} from "./hosted-snapshot"
import { buildSnapshotEnvelopeBytes } from "./link-snapshot"

const id = `261017${"A".repeat(22)}`

describe("expiry options", () => {
  it("offers 7, 30, and 90 days and defaults to 30", () => {
    expect(EXPIRY_DAY_OPTIONS).toEqual([7, 30, 90])
    expect(DEFAULT_EXPIRY_DAYS).toBe(30)
  })
})

describe("encryptSnapshotEnvelope", () => {
  it("returns a 43-character key and a blob that decrypts back to the envelope", async () => {
    const envelope = deflateSync(strToU8(JSON.stringify({ f: "a.md", m: "hello" })), { level: 9 })
    const { key, blob } = await encryptSnapshotEnvelope(envelope)

    expect(key).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(blob.length).toBe(12 + envelope.length + 16)

    const raw = Uint8Array.from(
      atob(key.replaceAll("-", "+").replaceAll("_", "/") + "="),
      (character) => character.charCodeAt(0),
    )
    const cryptoKey = await crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["decrypt"])
    const plaintext = new Uint8Array(await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: blob.subarray(0, 12) }, cryptoKey, blob.subarray(12),
    ))
    expect(strFromU8(inflateSync(plaintext))).toBe(JSON.stringify({ f: "a.md", m: "hello" }))
  })

  it("never reuses a key or an IV", async () => {
    const envelope = deflateSync(strToU8("{}"), { level: 9 })
    const first = await encryptSnapshotEnvelope(envelope)
    const second = await encryptSnapshotEnvelope(envelope)
    expect(first.key).not.toBe(second.key)
    expect(Array.from(first.blob.subarray(0, 12))).not.toEqual(Array.from(second.blob.subarray(0, 12)))
  })
})

describe("hosted URLs", () => {
  it("builds a 98-character URL against the default origin", () => {
    const url = buildHostedSnapshotUrl(id, "A".repeat(43))
    expect(url).toBe(`https://markside.app/s/${id}#h1.${"A".repeat(43)}`)
    expect(url).toHaveLength(98)
  })

  it("keeps the advertised length in step with the URL it actually builds", () => {
    const url = buildHostedSnapshotUrl(id, "A".repeat(43))
    expect(url).toHaveLength(HOSTED_SNAPSHOT_URL_CHARACTERS)
  })

  it("derives every endpoint from one origin", () => {
    expect(SNAPSHOT_ORIGIN).toBe("https://markside.app")
    expect(HOSTED_SNAPSHOT_BASE_URL).toBe(`${SNAPSHOT_ORIGIN}/s`)
    expect(HOSTED_SNAPSHOT_UPLOAD_URL).toBe(`${SNAPSHOT_ORIGIN}/api/snapshots`)
  })
})

describe("uploadHostedSnapshot", () => {
  it("sends the ciphertext and the expiry to the background worker", async () => {
    const sendMessage = vi.fn(async () => ({ id: `261017${"A".repeat(22)}` }))
    vi.stubGlobal("chrome", { runtime: { sendMessage } })

    const blob = new Uint8Array([1, 2, 3])
    expect(await uploadHostedSnapshot(blob, 30)).toBe(`261017${"A".repeat(22)}`)
    expect(sendMessage).toHaveBeenCalledWith({
      type: "upload-snapshot",
      days: 30,
      blob: [1, 2, 3],
    })
    vi.unstubAllGlobals()
  })

  it("throws when the worker reports an error", async () => {
    vi.stubGlobal("chrome", { runtime: { sendMessage: async () => ({ error: "Upload failed" }) } })
    await expect(uploadHostedSnapshot(new Uint8Array([1]), 7)).rejects.toThrow("Upload failed")
    vi.unstubAllGlobals()
  })
})

describe("parseHostedSnapshotUrl", () => {
  const key = "B".repeat(43)

  it("reads the id and key from a hosted link, with or without a heading", () => {
    expect(parseHostedSnapshotUrl(buildHostedSnapshotUrl(id, key))).toEqual({ id, key })
    expect(parseHostedSnapshotUrl(` ${buildHostedSnapshotUrl(id, key)}~intro \n`)).toEqual({ id, key })
  })

  it("rejects Link Snapshots and malformed hosted links", () => {
    expect(parseHostedSnapshotUrl("https://markside.app/s#x1.abc")).toBeNull()
    expect(parseHostedSnapshotUrl(`https://markside.app/s/${id}`)).toBeNull()
    expect(parseHostedSnapshotUrl(`https://markside.app/s/${id}#h1.short`)).toBeNull()
    expect(parseHostedSnapshotUrl(`https://markside.app/s/not-an-id#h1.${key}`)).toBeNull()
    expect(parseHostedSnapshotUrl("not a url")).toBeNull()
  })

  it("rejects hosted links from another server", () => {
    expect(parseHostedSnapshotUrl(`http://localhost:4321/s/${id}#h1.${key}`)).toBeNull()
  })
})

describe("loadHostedSnapshot", () => {
  const round = {
    id: "round-1",
    reviewerName: "Sam",
    note: "",
    comments: [],
    createdAt: "2026-10-28T00:00:00.000Z",
  }

  it("decrypts the downloaded ciphertext into the snapshot and its Review", async () => {
    const { key, blob } = await encryptSnapshotEnvelope(
      buildSnapshotEnvelopeBytes({ filename: "a.md", markdown: "hello", reviews: [round] }),
    )
    const sendMessage = vi.fn(async () => ({ status: 200, blob: Array.from(blob) }))
    vi.stubGlobal("chrome", { runtime: { sendMessage } })

    expect(await loadHostedSnapshot(id, key)).toEqual({
      status: "ready",
      snapshot: { filename: "a.md", markdown: "hello", reviews: [round] },
    })
    expect(sendMessage).toHaveBeenCalledWith({ type: "fetch-snapshot", id })
    vi.unstubAllGlobals()
  })

  it("reports expired or removed links as unavailable", async () => {
    for (const status of [404, 410]) {
      vi.stubGlobal("chrome", { runtime: { sendMessage: async () => ({ status }) } })
      expect(await loadHostedSnapshot(id, "A".repeat(43))).toEqual({ status: "unavailable" })
    }
    vi.unstubAllGlobals()
  })

  it("separates a failed download from a wrong key", async () => {
    vi.stubGlobal("chrome", { runtime: { sendMessage: async () => ({ error: "Failed to fetch" }) } })
    expect(await loadHostedSnapshot(id, "A".repeat(43))).toEqual({ status: "failed" })

    const { blob } = await encryptSnapshotEnvelope(buildSnapshotEnvelopeBytes({ filename: "a.md", markdown: "x" }))
    vi.stubGlobal("chrome", { runtime: { sendMessage: async () => ({ status: 200, blob: Array.from(blob) }) } })
    expect(await loadHostedSnapshot(id, "A".repeat(43))).toEqual({ status: "invalid" })
    vi.unstubAllGlobals()
  })
})
