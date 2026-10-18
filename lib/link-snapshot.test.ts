import { deflateSync, inflateSync, strFromU8, strToU8 } from "fflate"
import { describe, expect, it } from "vitest"

import {
  buildSnapshotEnvelopeBytes,
  createLinkSnapshot,
  decodeLinkSnapshotFragment,
  LINK_SNAPSHOT_BASE_URL,
  isLinkSnapshotWithinTransportBudget,
  LINK_SNAPSHOT_COMFORTABLE_CHARACTERS,
  MAX_LINK_SNAPSHOT_OUTPUT_BYTES,
} from "./link-snapshot"

describe("Link Snapshot x1 codec", () => {
  const featureFixture = {
    filename: "示例.md",
    markdown: "# 示例 🌍\n\n```ts\nconst answer = 42\n```\n\n```mermaid\ngraph TD; A-->B\n```\n\nA note[^1]. ![local](./image.png) [[Plan]]\n\n[^1]: Footnote\n",
  }
  const featureFixtureUrl = "https://markside.app/s#x1.q1ZKU7JSer5k15N93Xq5KUo6SrlAvrICREThw_ye3pi8mLyEhISS4pi85Py84hKFxLzi8tQiBVsFEyOwDFRBbmpRbmJmSkxeelFiQYZCiIu1gqOurp0TXI2jQl5-SWp0nGGsnoJidE5-cmJOrIaefmZuYnqqXkFeuqZCdHRATmJebCxINUidlYJbfn4JSFdMnlItAA"

  it("matches the fixed x1 golden payload", () => {
    const result = createLinkSnapshot({
      filename: "note.md",
      markdown: "# Hello\n",
    })

    expect(result).toEqual({
      status: "ready",
      url: `${LINK_SNAPSHOT_BASE_URL}#x1.q1ZKU7JSyssvSdXLTVHSUcoF8pQVPFJzcvJj8pRqAQ`,
      characters: 68,
      words: 2,
      oversized: false,
    })
  })

  it("round trips Unicode Markdown and its basename", () => {
    const created = createLinkSnapshot({
      filename: "计划.md",
      markdown: "# 计划\n\nHello, 世界 🌍",
    })
    expect(created.status).toBe("ready")
    if (created.status !== "ready") return

    expect(decodeLinkSnapshotFragment(new URL(created.url).hash)).toEqual({
      status: "ready",
      snapshot: {
        filename: "计划.md",
        markdown: "# 计划\n\nHello, 世界 🌍",
      },
      headingId: null,
    })
  })

  it("matches the cross-repository rich Markdown fixture", () => {
    expect(createLinkSnapshot(featureFixture)).toMatchObject({
      status: "ready",
      url: featureFixtureUrl,
    })
    expect(decodeLinkSnapshotFragment(new URL(featureFixtureUrl).hash)).toEqual({
      status: "ready",
      snapshot: featureFixture,
      headingId: null,
    })
  })

  it("still creates a link past the reserved base-URL length, flagged as oversized", () => {
    let markdown = ""
    let result = createLinkSnapshot({ filename: "random.md", markdown })
    while (result.status === "ready" && result.characters <= LINK_SNAPSHOT_COMFORTABLE_CHARACTERS) {
      markdown += crypto.randomUUID()
      result = createLinkSnapshot({ filename: "random.md", markdown })
    }

    expect(result).toMatchObject({ status: "ready", oversized: true })
  })

  it("enforces the exact base URL boundary", () => {
    expect(LINK_SNAPSHOT_COMFORTABLE_CHARACTERS).toBe(2_000)
    expect(isLinkSnapshotWithinTransportBudget(2_000)).toBe(true)
    expect(isLinkSnapshotWithinTransportBudget(2_001)).toBe(false)
  })

  it.each(["../secret.md", "folder/note.md", "folder\\note.md", "bad\u0000.md"])(
    "rejects an invalid basename: %s",
    (filename) => {
      expect(() => createLinkSnapshot({ filename, markdown: "Hello" })).toThrow(
        "valid basename",
      )
    },
  )

  it("rejects an unsupported or malformed fragment", () => {
    expect(decodeLinkSnapshotFragment("#v1.anything")).toEqual({ status: "invalid" })
    expect(decodeLinkSnapshotFragment("#x1.not-base64!"))
      .toEqual({ status: "invalid" })
  })

  it("blocks creation when the decompressed envelope exceeds the decode limit", () => {
    const created = createLinkSnapshot({
      filename: "large.md",
      markdown: "a".repeat(300 * 1024),
    })

    expect(created).toMatchObject({
      status: "too-large",
      maxBytes: MAX_LINK_SNAPSHOT_OUTPUT_BYTES,
    })
    if (created.status !== "too-large") return
    expect(created.bytes).toBeGreaterThan(MAX_LINK_SNAPSHOT_OUTPUT_BYTES)
  })

  it("rejects a fragment whose decompressed payload exceeds the decode limit", () => {
    const envelope = JSON.stringify({ f: "large.md", m: "a".repeat(300 * 1024) })
    const compressed = deflateSync(strToU8(envelope), { level: 9 })
    let binary = ""
    for (let offset = 0; offset < compressed.length; offset += 0x8000) {
      binary += String.fromCharCode(...compressed.subarray(offset, offset + 0x8000))
    }
    const payload = btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "")

    expect(decodeLinkSnapshotFragment(`#x1.${payload}`)).toEqual({ status: "invalid" })
  })

  it("round trips Review Rounds embedded in a Reviewed Snapshot", () => {
    const rounds = [
      {
        id: "round-1",
        reviewerName: "Alex",
        note: "Keep the rollout reversible.",
        comments: [
          {
            id: "comment-1",
            body: "Clarify the consequence.",
            createdAt: "2026-08-09T12:00:00.000Z",
            anchor: {
              exact: "The migration is safe.",
              prefix: "Context before. ",
              suffix: " Context after.",
              start: 16,
              end: 38,
              headingPath: ["Migration"],
            },
          },
        ],
        createdAt: "2026-08-15T09:00:00.000Z",
      },
      {
        id: "round-2",
        reviewerName: null,
        note: "",
        comments: [],
        createdAt: "2026-08-16T10:00:00.000Z",
      },
    ]
    const created = createLinkSnapshot({
      filename: "plan.md",
      markdown: "# Plan\n",
      reviews: rounds,
    })
    expect(created.status).toBe("ready")
    if (created.status !== "ready") return

    expect(decodeLinkSnapshotFragment(new URL(created.url).hash)).toEqual({
      status: "ready",
      snapshot: {
        filename: "plan.md",
        markdown: "# Plan\n",
        reviews: rounds,
      },
      headingId: null,
    })
  })

  it("omits the reviews key entirely when there are no Review Rounds, preserving the plain x1 envelope", () => {
    const created = createLinkSnapshot({
      filename: "note.md",
      markdown: "# Hello\n",
      reviews: [],
    })
    expect(created).toMatchObject({
      status: "ready",
      url: `${LINK_SNAPSHOT_BASE_URL}#x1.q1ZKU7JSyssvSdXLTVHSUcoF8pQVPFJzcvJj8pRqAQ`,
    })
  })

  it("rejects a fragment with an unknown envelope field", () => {
    const envelope = JSON.stringify({ f: "note.md", m: "hi", z: "unexpected" })
    const compressed = deflateSync(strToU8(envelope), { level: 9 })
    let binary = ""
    for (let offset = 0; offset < compressed.length; offset += 0x8000) {
      binary += String.fromCharCode(...compressed.subarray(offset, offset + 0x8000))
    }
    const payload = btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "")

    expect(decodeLinkSnapshotFragment(`#x1.${payload}`)).toEqual({ status: "invalid" })
  })

  it("rejects a fragment with a malformed reviews field", () => {
    const envelope = JSON.stringify({ f: "note.md", m: "hi", r: "not-an-array" })
    const compressed = deflateSync(strToU8(envelope), { level: 9 })
    let binary = ""
    for (let offset = 0; offset < compressed.length; offset += 0x8000) {
      binary += String.fromCharCode(...compressed.subarray(offset, offset + 0x8000))
    }
    const payload = btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "")

    expect(decodeLinkSnapshotFragment(`#x1.${payload}`)).toEqual({ status: "invalid" })
  })

  it("exposes the same DEFLATEd envelope the link encoder uses", () => {
    const bytes = buildSnapshotEnvelopeBytes({ filename: "a.md", markdown: "hello" })
    expect(JSON.parse(strFromU8(inflateSync(bytes)))).toEqual({ f: "a.md", m: "hello" })
  })
})
