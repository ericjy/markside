import DOMPurify from "dompurify"
import { useEffect, useRef } from "react"

import { md } from "~lib/markdown"
import { highlightCodeBlocks } from "~lib/shiki"

interface Props {
  content: string
}

export function MarkdownRenderer({ content }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    ref.current.innerHTML = DOMPurify.sanitize(md.render(content))
    highlightCodeBlocks(ref.current)
  }, [content])

  return (
    <div
      ref={ref}
      className="prose prose-neutral dark:prose-invert max-w-none px-8 py-6"
    />
  )
}
