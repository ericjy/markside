export interface RenderedClipboardPayload {
  html: string
  text: string
}

export function createRenderedClipboardPayload(
  root: HTMLElement,
): RenderedClipboardPayload {
  const clone = root.cloneNode(true) as HTMLElement
  clone.querySelectorAll(".header-anchor, .code-block-header, .pdf-export-title, [data-reload-removed], [data-readability-ui]").forEach((element) => {
    element.remove()
  })
  clone.querySelectorAll(".readability-heading-label").forEach((element) => {
    element.replaceWith(...element.childNodes)
  })
  clone.querySelectorAll("ins.reload-added").forEach((element) => element.replaceWith(...element.childNodes))
  clone.querySelectorAll<HTMLElement>("[data-source-line], [data-wikilink], [data-mermaid-src]")
    .forEach((element) => {
      element.removeAttribute("data-source-line")
      element.removeAttribute("data-wikilink")
      element.removeAttribute("data-mermaid-src")
    })

  return {
    html: clone.innerHTML,
    text: (clone.innerText || clone.textContent || "").trim(),
  }
}

export async function copyRenderedContent(root: HTMLElement): Promise<void> {
  const payload = createRenderedClipboardPayload(root)
  if (typeof ClipboardItem !== "undefined" && navigator.clipboard.write) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([payload.html], { type: "text/html" }),
          "text/plain": new Blob([payload.text], { type: "text/plain" }),
        }),
      ])
      return
    } catch {
      // Some file-page contexts allow text clipboard writes but reject rich writes.
    }
  }
  await navigator.clipboard.writeText(payload.text)
}
