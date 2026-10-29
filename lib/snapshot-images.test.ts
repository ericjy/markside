import { describe, expect, it } from "vitest"
import { canCompressSnapshotImage, snapshotImageMediaType } from "./snapshot-images"

describe("snapshot image policies", () => {
  it("accepts supported media types with parameters", () => {
    expect(snapshotImageMediaType("image/png; charset=binary")).toBe("image/png")
    expect(snapshotImageMediaType("text/html")).toBeNull()
  })

  it("does not flatten animated images or SVGs", () => {
    expect(canCompressSnapshotImage("image/gif", new Uint8Array())).toBe(false)
    expect(canCompressSnapshotImage("image/svg+xml", new Uint8Array())).toBe(false)
    expect(canCompressSnapshotImage("image/webp", new Uint8Array())).toBe(false)
    expect(canCompressSnapshotImage("image/jpeg", new Uint8Array())).toBe(true)
    const animated = new Uint8Array([0, 0, 0, 0, 97, 99, 84, 76])
    expect(canCompressSnapshotImage("image/png", animated)).toBe(false)
  })
})
