import katexCssText from "data-text:~lib/katex-bundle.css"
import DOMPurify from "dompurify"
import React,{ useEffect } from "react"
import { parseFrontmatter,renderFrontmatterHTML } from "~lib/frontmatter"
import { applyHeadingNumbers } from "~lib/heading-numbering"
import { headingIdFromHash,resolveActiveOutlineHeading,type Heading } from "~lib/headings"
import { addDefaultDetailsSummaries,md,mountQuestionCard,type QuestionCard } from "~lib/markdown"
import {
  resolveModeTransition,
  setMarkdownMode,
  type MarkdownMode
} from "~lib/markdown-mode"
import { renderMermaidBlocks } from "~lib/mermaid"
import {
  type ReadabilitySection
} from "~lib/readability"
import { READABILITY_CHECK_ENABLED } from "~lib/readability-service"
import { showReloadChanges } from "~lib/reload-changes"
import { highlightCodeBlocks } from "~lib/shiki"
import {
  resolveDocumentLinkHref,
  resolveImageSrc
} from "~lib/url"

function injectKatexStyles() {
  if (document.getElementById("markside-katex-styles")) return
  const styleEl = document.createElement("style")
  styleEl.id = "markside-katex-styles"
  styleEl.textContent = katexCssText
  document.head.appendChild(styleEl)
}

interface UseContentPreviewOptions {
  mode: MarkdownMode
  cancelPreviewUpdate: () => void
  pendingDraftSyncRef: React.MutableRefObject<boolean>
  draftRef: React.MutableRefObject<string>
  content: string | null
  setContent: React.Dispatch<React.SetStateAction<string | null>>
  setDraft: React.Dispatch<React.SetStateAction<string>>
  setMode: React.Dispatch<React.SetStateAction<MarkdownMode>>
  contentRef: React.RefObject<HTMLDivElement>
  cancelPreviewEnhancement: () => void
  setHeadings: React.Dispatch<React.SetStateAction<Heading[]>>
  setReadabilityMounts: React.Dispatch<React.SetStateAction<{ heading: HTMLElement; mount: HTMLSpanElement; section: ReadabilitySection; }[]>>
  setQuestionCards: React.Dispatch<React.SetStateAction<QuestionCard[]>>
  renderedFileUrlRef: React.MutableRefObject<string | null>
  fileUrl: string
  imageReloadVersion: number
  previewEnhancementRef: React.MutableRefObject<number | null>
  setReviewRenderVersion: React.Dispatch<React.SetStateAction<number>>
  changesVisible: boolean
  reloadComparison: { before: string; after: string; } | null
  isSplitView: boolean
  previewEnhancementSchedulerRef: React.MutableRefObject<{ schedule(callback: () => void): void; cancel(): void; } | null>
  readabilitySections: ReadabilitySection[]
  readabilityMounts: { heading: HTMLElement; mount: HTMLSpanElement; section: ReadabilitySection; }[]
  previewFollowPausedRef: React.MutableRefObject<boolean>
  pendingPreviewSourceLineRef: React.MutableRefObject<number | null>
  previewScrollRef: React.RefObject<HTMLDivElement>
  numberHeadings: boolean
  previewVisible: boolean
  setActiveHeadingId: React.Dispatch<React.SetStateAction<string | null>>
  headings: Heading[]
}

export function useContentPreview({
  mode,
  cancelPreviewUpdate,
  pendingDraftSyncRef,
  draftRef,
  content,
  setContent,
  setDraft,
  setMode,
  contentRef,
  cancelPreviewEnhancement,
  setHeadings,
  setReadabilityMounts,
  setQuestionCards,
  renderedFileUrlRef,
  fileUrl,
  imageReloadVersion,
  previewEnhancementRef,
  setReviewRenderVersion,
  changesVisible,
  reloadComparison,
  isSplitView,
  previewEnhancementSchedulerRef,
  readabilitySections,
  readabilityMounts,
  previewFollowPausedRef,
  pendingPreviewSourceLineRef,
  previewScrollRef,
  numberHeadings,
  previewVisible,
  setActiveHeadingId,
  headings,
}: UseContentPreviewOptions) {
  const selectMode = (nextMode: MarkdownMode) => {
    if (nextMode === mode) return
    cancelPreviewUpdate()
    pendingDraftSyncRef.current = false
    const next = resolveModeTransition({
      currentMode: mode,
      nextMode,
      content,
      draft: draftRef.current,
    })
    if (next.content !== content) setContent(next.content)
    if (next.draft !== draftRef.current) {
      setDraft(next.draft)
      draftRef.current = next.draft
    }
    setMode(next.mode)
    void setMarkdownMode(next.mode).catch(() => undefined)
  }

  useEffect(() => {
    if (!contentRef.current) return
    cancelPreviewEnhancement()
    if (content === null) {
      contentRef.current.replaceChildren()
      setHeadings([])
      setReadabilityMounts([])
      setQuestionCards([])
      return
    }
    const isNewFile = renderedFileUrlRef.current !== fileUrl
    const { data, body } = parseFrontmatter(content)
    const fmHTML = renderFrontmatterHTML(data)
    const bodyStart = content.length - body.length
    const sourceLineOffset =
      content.slice(0, bodyStart).split("\n").length - 1
    contentRef.current.innerHTML = DOMPurify.sanitize(
      fmHTML + md.render(body, { sourceLineOffset }),
      { ADD_ATTR: ["data-wikilink", "data-source-line"] }
    )
    addDefaultDetailsSummaries(contentRef.current)
    if (contentRef.current.querySelector(".katex")) injectKatexStyles()

    // Re-resolve image src attributes against the rendered file's directory.
    // The browser resolves relative paths against the address bar URL, which may
    // differ from the file being rendered when navigating via the sidebar.
    contentRef.current.querySelectorAll<HTMLImageElement>("img").forEach(img => {
      const src = img.getAttribute("src")
      if (src) img.src = resolveImageSrc(src, fileUrl, imageReloadVersion)
    })
    contentRef.current.querySelectorAll<HTMLAnchorElement>("a[href]").forEach(anchor => {
      const href = anchor.getAttribute("href")
      if (href) anchor.href = resolveDocumentLinkHref(href, fileUrl)
    })

    const renderedContent = contentRef.current
    const scheduleEnhancement = () => {
      previewEnhancementRef.current = window.requestIdleCallback(
        () => {
          previewEnhancementRef.current = null
          void Promise.all([
            highlightCodeBlocks(renderedContent),
            renderMermaidBlocks(
              renderedContent,
              document.documentElement.classList.contains("dark")
            ),
          ]).then(() => setReviewRenderVersion((version) => version + 1))
        },
        { timeout: 250 }
      )
    }
    if (changesVisible) {
      const beforeRoot = document.createElement("div")
      const previous = parseFrontmatter(reloadComparison!.before)
      beforeRoot.innerHTML = DOMPurify.sanitize(renderFrontmatterHTML(previous.data) + md.render(previous.body))
      addDefaultDetailsSummaries(beforeRoot)
      if (beforeRoot.querySelector(".katex")) injectKatexStyles()
      showReloadChanges(renderedContent, beforeRoot)
    } else if (isSplitView) {
      previewEnhancementSchedulerRef.current?.schedule(scheduleEnhancement)
    } else {
      scheduleEnhancement()
    }

    const els = contentRef.current.querySelectorAll("h1,h2,h3,h4,h5,h6")
    setHeadings(
      Array.from(els).filter((el) => !el.closest("[data-reload-removed]")).map((el) => ({
        id: el.id,
        text: (() => {
          const clean = el.cloneNode(true) as Element
          clean.querySelectorAll(".header-anchor, [data-reload-removed], [data-readability-ui]").forEach((node) => node.remove())
          return clean.textContent?.trim() ?? ""
        })(),
        level: parseInt(el.tagName[1])
      }))
    )
    const available = READABILITY_CHECK_ENABLED ? [...readabilitySections] : []
    const mounts: typeof readabilityMounts = []
    for (const heading of Array.from(els) as HTMLElement[]) {
      if (heading.closest("[data-reload-removed]")) continue
      const line = Number(heading.dataset.sourceLine)
      const index = available.findIndex((section) => section.sourceLine === line && Number(heading.tagName[1]) === section.level)
      if (index < 0) continue
      const section = available.splice(index, 1)[0]
      const label = document.createElement("span")
      label.className = "readability-heading-label"
      label.append(...Array.from(heading.childNodes))
      const mount = document.createElement("span")
      mount.dataset.readabilityUi = ""
      heading.append(label, mount)
      mounts.push({ heading, mount, section })
    }
    setReadabilityMounts(mounts)
    setQuestionCards(Array.from(contentRef.current.querySelectorAll<HTMLElement>(".markdown-alert-question"))
      .filter((card) => !card.closest("[data-reload-removed]"))
      .map(mountQuestionCard)
      .filter((card): card is QuestionCard => card !== null))

    if (isNewFile) {
      renderedFileUrlRef.current = fileUrl
      contentRef.current.closest(".overflow-y-auto")?.scrollTo(0, 0)
      const hash = headingIdFromHash(window.location.hash)
      if (hash) {
        setTimeout(
          () =>
            document.getElementById(hash)?.scrollIntoView({ behavior: "auto" }),
          50
        )
      }
    } else if (
      isSplitView &&
      !previewFollowPausedRef.current &&
      pendingPreviewSourceLineRef.current !== null
    ) {
      const sourceLine = pendingPreviewSourceLineRef.current
      pendingPreviewSourceLineRef.current = null
      const scroller = previewScrollRef.current
      const blocks = Array.from(
        contentRef.current.querySelectorAll<HTMLElement>("[data-source-line]")
      )
      let target = blocks[0] ?? null
      let targetLine = target
        ? Number(target.dataset.sourceLine)
        : Number.NEGATIVE_INFINITY

      for (const block of blocks) {
        const blockLine = Number(block.dataset.sourceLine)
        if (
          Number.isFinite(blockLine) &&
          blockLine <= sourceLine &&
          blockLine >= targetLine
        ) {
          target = block
          targetLine = blockLine
        }
      }

      if (scroller && target) {
        const scrollerRect = scroller.getBoundingClientRect()
        const targetRect = target.getBoundingClientRect()
        const targetTop =
          targetRect.top - scrollerRect.top + scroller.scrollTop
        const visibleTop = scroller.scrollTop + scroller.clientHeight * 0.2
        const visibleBottom = scroller.scrollTop + scroller.clientHeight * 0.65

        if (targetTop < visibleTop || targetTop > visibleBottom) {
          scroller.scrollTo({
            top: Math.max(0, targetTop - scroller.clientHeight * 0.32),
            behavior: "auto",
          })
        }
      }
    }
  }, [content, fileUrl, changesVisible, reloadComparison, imageReloadVersion])

  useEffect(() => {
    if (contentRef.current) applyHeadingNumbers(contentRef.current, numberHeadings)
  }, [content, fileUrl, numberHeadings, changesVisible, reloadComparison])

  useEffect(() => {
    const scroller = previewScrollRef.current
    const rendered = contentRef.current
    if (!previewVisible || !scroller || !rendered) {
      setActiveHeadingId(null)
      return
    }

    const syncActiveHeading = () => {
      const threshold = scroller.getBoundingClientRect().top + 80
      const positions = Array.from(
        rendered.querySelectorAll<HTMLElement>("h1,h2,h3,h4"),
      ).map((heading) => ({
        id: heading.id,
        top: heading.getBoundingClientRect().top,
      }))
      const nextId = resolveActiveOutlineHeading(positions, threshold)
      setActiveHeadingId((currentId) => currentId === nextId ? currentId : nextId)
    }

    syncActiveHeading()
    scroller.addEventListener("scroll", syncActiveHeading, { passive: true })
    window.addEventListener("resize", syncActiveHeading)
    const observer = new ResizeObserver(syncActiveHeading)
    observer.observe(rendered)
    return () => {
      scroller.removeEventListener("scroll", syncActiveHeading)
      window.removeEventListener("resize", syncActiveHeading)
      observer.disconnect()
    }
  }, [headings, previewVisible, numberHeadings])

  return { selectMode }
}
