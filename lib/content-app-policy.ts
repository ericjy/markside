import { classifyMarksideFileUrl } from "./file-types"
import { getModeSurfaces, type MarkdownMode } from "./markdown-mode"

export function getContentFileSurfaces(fileUrl: string, mode: MarkdownMode) {
  const isMdFile = classifyMarksideFileUrl(fileUrl) === "markdown"
  const isImageFile = /\.(png|jpe?g|gif|webp|svg|bmp|ico|tiff?)$/i.test(fileUrl)
  const modeSurfaces = getModeSurfaces(mode)
  const isSplitView = isMdFile && mode === "split"
  const sourceVisible =
    !isImageFile && (!isMdFile || modeSurfaces.source)
  const previewVisible =
    isMdFile && modeSurfaces.preview
  return { isImageFile, modeSurfaces, isSplitView, sourceVisible, previewVisible }
}

export function getSavePathParts(url: string, rootUrl: string): string[] | null {
  const decodedFile = decodeURIComponent(url.split("#")[0])
  const decodedRoot = decodeURIComponent(rootUrl)
  if (!decodedFile.startsWith(decodedRoot)) return null
  const parts = decodedFile.slice(decodedRoot.length).split("/").filter(Boolean)
  if (parts.length === 0) return null
  return parts
}

type ShortcutEvent = Pick<KeyboardEvent, "key" | "metaKey" | "ctrlKey">

export function isSaveShortcut(event: ShortcutEvent) {
  return (event.metaKey || event.ctrlKey) && event.key === "s"
}

export function isToggleSourceShortcut(event: ShortcutEvent, isMdFile: boolean) {
  return event.key === "e" && event.ctrlKey && !event.metaKey && isMdFile
}

export function isZenModeShortcut(event: ShortcutEvent & Pick<KeyboardEvent, "shiftKey" | "altKey">) {
  return (event.metaKey || event.ctrlKey) && !event.shiftKey && !event.altKey && event.key === "."
}

export function isFilePaletteShortcut(event: ShortcutEvent, status: string) {
  return (event.metaKey || event.ctrlKey) && event.key === "p" && status === "granted"
}
