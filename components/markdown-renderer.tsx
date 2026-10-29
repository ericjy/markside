import katexCssText from "data-text:~lib/katex-bundle.css"
import { useEffect, useRef } from "react"

import { parseFrontmatter, renderFrontmatterHTML } from "~lib/frontmatter"
import { addDefaultDetailsSummaries, md, sanitizeRenderedMarkdown } from "~lib/markdown"
import { renderMermaidBlocks } from "~lib/mermaid"
import { highlightCodeBlocks } from "~lib/shiki"

interface Props {
  content: string
}

// Preview for Markdown without a file, so relative images, links, and HTML
// Embeds have nothing to resolve against.
export function MarkdownRenderer({ content }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = ref.current
    if (!container) return
    const { data, body } = parseFrontmatter(content)
    container.innerHTML = sanitizeRenderedMarkdown(renderFrontmatterHTML(data) + md.render(body))
    addDefaultDetailsSummaries(container)
    if (container.querySelector(".katex") && !document.getElementById("markside-katex-styles")) {
      const style = document.createElement("style")
      style.id = "markside-katex-styles"
      style.textContent = katexCssText
      document.head.appendChild(style)
    }
    void highlightCodeBlocks(container)
    void renderMermaidBlocks(container)
  }, [content])

  return (
    <div
      ref={ref}
      lang=""
      className="prose prose-neutral dark:prose-invert mx-auto max-w-3xl px-8 py-6"
    />
  )
}
