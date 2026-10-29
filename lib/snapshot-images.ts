import { readFileFromDisk } from "./file-reload"
import { findLocalSnapshotImages } from "./link-snapshot-resources"
import { resolveImageSrc } from "./url"

const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp", "image/avif", "image/svg+xml"])

export function snapshotImageMediaType(type: string): string | null {
  const value = type.split(";")[0].trim().toLowerCase()
  return IMAGE_TYPES.has(value) ? value : null
}

export function canCompressSnapshotImage(type: string, bytes: Uint8Array): boolean {
  if (type === "image/jpeg") return true
  if (type !== "image/png") return false
  for (let i = 0; i + 3 < bytes.length; i++) {
    if (bytes[i] === 97 && bytes[i + 1] === 99 && bytes[i + 2] === 84 && bytes[i + 3] === 76) return false
  }
  return true
}

function encodeBase64(bytes: Uint8Array): string {
  let binary = ""
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(binary)
}

export async function readSnapshotImages(markdown: string, fileUrl: string): Promise<{ images: Record<string, string>, missing: string[] }> {
  const images: Record<string, string> = {}
  const missing: string[] = []
  const cache = new Map<string, Promise<string>>()
  for (const src of findLocalSnapshotImages(markdown)) {
    try {
      const url = resolveImageSrc(src, fileUrl)
      if (new URL(url).protocol !== "file:") throw new Error("Not a local file")
      let promise = cache.get(url)
      if (!promise) {
        promise = readFileFromDisk(null, url, true).then(file => {
          const type = snapshotImageMediaType(file.type)
          if (!file.buffer || !type) throw new Error("Unsupported image")
          return `data:${type};base64,${encodeBase64(new Uint8Array(file.buffer))}`
        })
        cache.set(url, promise)
      }
      images[src] = await promise
    } catch {
      missing.push(src)
    }
  }
  return { images, missing }
}

export async function compressSnapshotImages(images: Record<string, string>): Promise<Record<string, string>> {
  const result: Record<string, string> = {}
  for (const [src, data] of Object.entries(images)) {
    const match = /^data:([^;]+);base64,(.+)$/.exec(data)
    if (!match) { result[src] = data; continue }
    const binary = atob(match[2])
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0))
    if (!canCompressSnapshotImage(match[1], bytes)) { result[src] = data; continue }
    try {
      const image = await createImageBitmap(new Blob([bytes], { type: match[1] }))
      const canvas = document.createElement("canvas")
      canvas.width = Math.max(1, Math.round(image.width * 0.7))
      canvas.height = Math.max(1, Math.round(image.height * 0.7))
      const context = canvas.getContext("2d")
      if (!context) throw new Error("Canvas unavailable")
      context.drawImage(image, 0, 0, canvas.width, canvas.height)
      image.close()
      const compressed = canvas.toDataURL(match[1], 0.75)
      result[src] = compressed.length < data.length ? compressed : data
    } catch { result[src] = data }
  }
  return result
}
