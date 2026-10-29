import katexCssText from "data-text:~lib/katex-bundle.css"
import { useEffect, useRef } from "react"

import { parseFrontmatter, renderFrontmatterHTML } from "~lib/frontmatter"
import { addDefaultDetailsSummaries, getDetailsOpenStates, md, restoreDetailsOpenStates, sanitizeRenderedMarkdown } from "~lib/markdown"
import { getInterfaceLanguage, type InterfaceLanguage } from "~lib/i18n"
import { renderMermaidBlocks } from "~lib/mermaid"
import { highlightCodeBlocks } from "~lib/shiki"

interface Props {
  content: string
}

// Preview for Markdown without a file, so relative images, links, and HTML
// Embeds have nothing to resolve against.
export function MarkdownRenderer({ content }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const interfaceLanguage = getInterfaceLanguage()
  const previousRenderRef = useRef<{ content: string; language: InterfaceLanguage } | null>(null)

  useEffect(() => {
    const container = ref.current
    if (!container) return
    const previous = previousRenderRef.current
    const detailsOpenStates = previous?.content === content && previous.language !== interfaceLanguage
      ? getDetailsOpenStates(container) : null
    previousRenderRef.current = { content, language: interfaceLanguage }
    const { data, body } = parseFrontmatter(content)
    container.innerHTML = sanitizeRenderedMarkdown(renderFrontmatterHTML(data) + md.render(body))
    addDefaultDetailsSummaries(container)
    if (detailsOpenStates) restoreDetailsOpenStates(container, detailsOpenStates)
    if (container.querySelector(".katex") && !document.getElementById("markside-katex-styles")) {
      const style = document.createElement("style")
      style.id = "markside-katex-styles"
      style.textContent = katexCssText
      document.head.appendChild(style)
    }
    void highlightCodeBlocks(container)
    void renderMermaidBlocks(container)
  }, [content, interfaceLanguage])

  return (
    <div
      ref={ref}
      lang=""
      className="prose prose-neutral dark:prose-invert mx-auto max-w-3xl px-8 py-6"
    />
  )
}
