export function readInitialFileContent(body: HTMLElement): string | null {
  return body.querySelector(":scope > pre")?.textContent ?? null
}

export function resolveFetchedFileContent(
  response: { text?: string; error?: string } | null,
): { content: string | null; error: string | null } {
  if (typeof response?.text === "string") {
    return { content: response.text, error: null }
  }
  return {
    content: null,
    error: response?.error ?? "Failed to load file",
  }
}

/**
 * Resolves a potentially relative image src against the directory of the
 * currently rendered file. Absolute URLs (http/https/file with full path)
 * are returned unchanged. Only applies when fileUrl is a file:// URL.
 *
 * A nonzero reloadVersion is added to local image URLs as a query. Chrome
 * keeps decoded images per URL for the life of the page, so without a new URL
 * Reload would keep showing an image that changed on disk.
 */
export function resolveImageSrc(
  src: string,
  fileUrl: string,
  reloadVersion = 0,
): string {
  if (!fileUrl.startsWith("file:///")) return src
  const dir = fileUrl.slice(0, fileUrl.lastIndexOf("/") + 1)
  try {
    const url = new URL(src, dir)
    if (reloadVersion > 0 && url.protocol === "file:") {
      url.searchParams.set("v", String(reloadVersion))
    }
    return url.href
  } catch {
    return src
  }
}

/**
 * Returns the folder containing a file URL as a path the user can paste into
 * an operating-system folder picker.
 */
export function fileFolderPath(fileUrl: string): string {
  return decodeURIComponent(new URL(".", fileUrl).pathname).replace(/^\/(?=[A-Za-z]:)/, "")
}

/**
 * Resolves a rendered document link against the file currently shown by
 * Markside. The browser address bar can still point at an earlier file after
 * in-app navigation, so it is not a reliable base for relative links.
 */
export function resolveDocumentLinkHref(
  href: string,
  fileUrl: string,
): string {
  if (!fileUrl.startsWith("file:///")) return href
  try {
    return new URL(href, fileUrl).href
  } catch {
    return href
  }
}

/**
 * Given a picked directory name and the current file:// URL,
 * returns the file:// URL of that directory (with trailing slash).
 *
 * Finds the rightmost path segment matching dirName.
 * Falls back to stripping the filename if dirName is not found.
 */
export function deriveRootUrl(dirName: string, href: string): string {
  const url = new URL(href)
  // Split pathname into segments, drop empty strings
  const all = url.pathname.split("/").filter(Boolean)
  // Drop the filename (last segment) to get directory segments
  const segments = all.slice(0, -1)

  // Find rightmost segment matching dirName (decode segments for comparison so
  // percent-encoded names like "my%20docs" match the raw dirName "my docs")
  let idx = -1
  for (let i = segments.length - 1; i >= 0; i--) {
    if (decodeURIComponent(segments[i]) === dirName) {
      idx = i
      break
    }
  }

  if (idx === -1) {
    // dirName not found in the current URL — the user picked a directory that is
    // unrelated to the current file. Fall back to just the directory name so that
    // file URLs constructed from this root (e.g. file:///markside-landing/src/...)
    // are at least semantically correct rather than pointing inside the wrong folder.
    return "file:///" + encodeURIComponent(dirName) + "/"
  }

  return "file:///" + segments.slice(0, idx + 1).join("/") + "/"
}

const VISIBLE_BREADCRUMBS = 6

export function resolveFileBreadcrumbs(fileUrl: string) {
  const segments = decodeURIComponent(fileUrl.replace(/^file:\/\//, "")).split("/").filter(Boolean)
  const urls = segments.map((_, i) => "file:///" + segments.slice(0, i + 1).join("/") + "/")
  const start = Math.max(0, segments.length - VISIBLE_BREADCRUMBS)
  return {
    fileName: segments.at(-1) as string | undefined,
    crumbs: segments.slice(start),
    crumbUrls: urls.slice(start),
    hasMore: start > 0,
  }
}

const WIKILINK_EXTENSIONS = [".md", ".mdx", ".markdown"] as const

export function resolveWikilinkCandidates(fileUrl: string, name: string): string[] {
  if (!name || !fileUrl.startsWith("file:///")) return []
  const dir = fileUrl.slice(0, fileUrl.lastIndexOf("/") + 1)
  return WIKILINK_EXTENSIONS.map((ext) => dir + name + ext)
}
