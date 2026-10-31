import katexCssText from "data-text:~lib/katex-bundle.css"
import React, { useEffect, useRef, useState } from "react"
import { SidebarRight } from "~components/sidebar-right"
import { SidebarProvider } from "~components/ui/sidebar"
import { WebPreviewToolbar } from "~components/web-preview-toolbar"
import { WebSourceView } from "~components/web-source-view"
import { ContentZenModeEdge } from "~components/content-zen-mode"
import { useContentPreferences } from "~hooks/use-content-preferences"
import { useContentZenMode } from "~hooks/use-content-zen-mode"
import { parseFrontmatter, renderFrontmatterHTML } from "~lib/frontmatter"
import { hasDocumentH1, resolvePdfExportTitle } from "~lib/pdf-export"
import { applyHeadingNumbers, headingNumbers } from "~lib/heading-numbering"
import { resolveActiveOutlineHeading, type Heading } from "~lib/headings"
import { getPaneWidthPreferences, type PreviewWidth } from "~lib/markdown-mode"
import { t } from "~lib/i18n"
import { addDefaultDetailsSummaries, md, sanitizeRenderedMarkdown } from "~lib/markdown"
import { renderMermaidBlocks } from "~lib/mermaid"
import { copyRenderedContent } from "~lib/rendered-copy"
import { highlightCodeBlocks } from "~lib/shiki"
import { getThemePreference, setThemePreference } from "~lib/theme-preference"

function persistWebZenMode(enabled: boolean) {
  void chrome.runtime.sendMessage({ type: "set-web-zen-mode", enabled }).catch(() => undefined)
}

export function WebPreview({ source, url, initialZenMode }: { source: string; url: string; initialZenMode: boolean }) {
  const root = useRef<HTMLDivElement>(null)
  const [raw, setRaw] = useState(false)
  const [previewWidth, setPreviewWidth] = useState<PreviewWidth>("standard")
  const [outline, setOutline] = useState<Heading[]>([])
  const [outlineOpen, setOutlineOpen] = useState(() => window.innerWidth >= 1280)
  const [zenMode, setZenMode] = useState(initialZenMode)
  const [zenOutlineOpen, setZenOutlineOpen] = useState(false)
  const toolbarRef = useRef<HTMLDivElement>(null)
  const [outlineWidth, setOutlineWidth] = useState(300)
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState("")
  const { dark, setDark, followsSystemThemeRef, numberHeadings, setNumberHeadings, typeface } = useContentPreferences(null)
  const zen = useContentZenMode({ zenMode, setZenMode, escapeClosesPanel: false, persistZenMode: persistWebZenMode })
  const outlineShown = zenMode ? zenOutlineOpen : outlineOpen
  const setShownOutline = zenMode ? setZenOutlineOpen : setOutlineOpen

  useEffect(() => {
    if (!zenMode) setZenOutlineOpen(false)
    const active = document.activeElement
    if (zenMode && active instanceof HTMLElement && toolbarRef.current?.contains(active)) active.blur()
  }, [zenMode])
  useEffect(() => { void getPaneWidthPreferences().then(prefs => setPreviewWidth(prefs.previewWidth)) }, [])
  useEffect(() => { void getThemePreference().then(value => { if (value !== null) { followsSystemThemeRef.current = false; setDark(value) } }) }, [])
  useEffect(() => {
    const element = root.current
    if (!element || raw) return
    const { data, body } = parseFrontmatter(source)
    element.innerHTML = sanitizeRenderedMarkdown(renderFrontmatterHTML(data) + md.render(body))
    addDefaultDetailsSummaries(element)
    element.querySelectorAll<HTMLImageElement>("img[src]").forEach(image => {
      const src = image.getAttribute("src")
      if (src) {
        try { image.src = new URL(src, url).href } catch { return }
        image.addEventListener("error", () => {
          const link = document.createElement("a")
          link.href = image.src
          link.textContent = image.alt || image.src
          image.replaceWith(link)
        }, { once: true })
      }
    })
    element.querySelectorAll<HTMLAnchorElement>("a[href]").forEach(link => {
      const href = link.getAttribute("href")
      if (href) { try { link.href = new URL(href, url).href } catch { /* Keep the original link. */ } }
    })
    applyHeadingNumbers(element, numberHeadings)
    const headings = Array.from(element.querySelectorAll<HTMLElement>("h1,h2,h3,h4"), heading => ({ id: heading.id, text: heading.textContent?.trim() ?? "", level: Number(heading.tagName[1]) }))
    setOutline(headings)
    setActiveHeadingId(headings[0]?.id ?? null)
    void Promise.all([highlightCodeBlocks(element), renderMermaidBlocks(element)])
  }, [raw, source, url, numberHeadings])

  const numbers = numberHeadings ? headingNumbers(outline) : []
  const previewWidthClass = previewWidth === "full" ? "max-w-none" : previewWidth === "extended" ? "mx-auto max-w-5xl" : "mx-auto max-w-3xl"
  const syncOutline = () => {
    const threshold = (scroller.current?.getBoundingClientRect().top ?? 0) + 80
    const headings = Array.from(root.current?.querySelectorAll<HTMLElement>("h1,h2,h3,h4") ?? [], heading => ({ id: heading.id, top: heading.getBoundingClientRect().top }))
    setActiveHeadingId(resolveActiveOutlineHeading(headings, threshold))
  }
  const print = () => {
    const previousTitle = document.title
    document.title = resolvePdfExportTitle(source, new URL(url).pathname.split("/").pop() || "document.md")
    const title = document.createElement("h1")
    if (!hasDocumentH1(source) && root.current) {
      title.className = "pdf-export-title"
      title.textContent = document.title
      root.current.prepend(title)
    }
    document.documentElement.dataset.pdfExport = "true"
    window.addEventListener("afterprint", () => { title.remove(); document.title = previousTitle; delete document.documentElement.dataset.pdfExport }, { once: true })
    window.print()
  }

  return <>
    <style>{katexCssText + `
      @media print { .web-preview, .web-preview-scroll, .web-preview-layout { height:auto !important; overflow:visible !important; min-height:0 !important; } .web-preview-layout { display:block !important; } }
    `}</style>
    <SidebarProvider className="web-preview min-h-0 h-svh bg-background text-foreground print:h-auto">
      <div className="relative flex h-svh min-w-0 flex-1 flex-col overflow-hidden print:h-auto print:overflow-visible">
        {zenMode && <ContentZenModeEdge hintVisible={zen.hintVisible} toolbarRevealed={zen.toolbarRevealed} pointerNearTop={zen.pointerNearTop} rightInset={16} onReveal={zen.revealToolbar} />}
        <div ref={toolbarRef} data-zen-toolbar className={!zenMode ? "contents" : `absolute inset-x-0 top-0 z-[60] bg-background shadow-sm ${zen.toolbarRevealed ? "" : "pointer-events-none opacity-0 has-[:focus-visible]:pointer-events-auto has-[:focus-visible]:opacity-100"}`}>
        <WebPreviewToolbar url={url} raw={raw} setRaw={setRaw} dark={dark} toggleTheme={() => { followsSystemThemeRef.current = false; setDark(!dark); void setThemePreference(!dark) }}
          outlineOpen={outlineShown} setOutlineOpen={setShownOutline} typeface={typeface} previewWidth={previewWidth} setPreviewWidth={setPreviewWidth} zenMode={zenMode} setZenMode={setZenMode}
          numberHeadings={numberHeadings} setNumberHeadings={value => { setNumberHeadings(value); void chrome.storage.local.set({ numberHeadings: value }) }}
          copy={() => { if (root.current) void copyRenderedContent(root.current).then(() => setStatus(t("Copied")), () => setStatus(t("Could not copy"))) }} print={print} status={status} />
        </div>
        {zenMode && <div className="h-5 shrink-0" />}
        <main className="web-preview-scroll min-h-0 flex-1 overflow-y-auto" ref={scroller} onScroll={syncOutline}>
          <div className="web-preview-layout flex min-h-full min-w-0 items-start">
            {raw ? <WebSourceView source={source} /> : <div className="min-w-0 flex-1 px-8 pb-28 pt-10 md:pl-20 print:p-0">
              <div className={`prose prose-neutral dark:prose-invert ${previewWidthClass}`} ref={root} />
            </div>}
            {!raw && <div className={zenMode && !zenOutlineOpen ? "hidden" : "contents"}><SidebarRight open={outlineShown} headings={outline.map((heading, index) => ({ ...heading, text: numbers[index] ? `${numbers[index]} ${heading.text}` : heading.text }))}
              activeHeadingId={activeHeadingId} width={outlineWidth} onResize={setOutlineWidth} onClose={() => setShownOutline(false)} onHeadingClick={id => {
                document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
                setActiveHeadingId(id)
                if (window.innerWidth < 1280) setShownOutline(false)
              }} /></div>}
          </div>
        </main>
      </div>
    </SidebarProvider>
  </>
}
