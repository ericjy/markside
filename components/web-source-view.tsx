import { Check, Copy, WrapText } from "lucide-react"
import React, { useEffect, useRef, useState } from "react"
import { Button } from "~components/ui/button"
import { t } from "~lib/i18n"
import { highlightMarkdownSource } from "~lib/shiki"

export function WebSourceView({ source }: { source: string }) {
  const codeRef = useRef<HTMLElement>(null)
  const [wrap, setWrap] = useState(true)
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle")

  useEffect(() => {
    const code = codeRef.current
    if (!code) return
    const lines = source.split("\n")
    code.replaceChildren(...lines.flatMap((line, index) => {
      const span = document.createElement("span")
      span.className = "line"
      span.textContent = line
      return index < lines.length - 1 ? [span, document.createTextNode("\n")] : [span]
    }))
    void highlightMarkdownSource(code, source).catch(() => undefined)
  }, [source])

  return <section className="web-source-view min-w-0 flex-1 px-5 pb-20 pt-8 sm:px-8" aria-label={t("Source")}>
    <style>{`
      .web-source-code { counter-reset: source-line; margin: 0; padding: .5rem 0 .5rem calc(6ch + 2rem); color: hsl(var(--foreground)); background: transparent; font: .875rem/1.7 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; white-space: pre-wrap; overflow-wrap: anywhere; }
      .web-source-code .line { position: relative; counter-increment: source-line; }
      .web-source-code .line::before { content: counter(source-line); position: absolute; right: calc(100% + 1.75rem); width: 6ch; color: hsl(var(--muted-foreground) / .65); font-weight: 400; text-align: right; user-select: none; }
      .web-source-code.is-unwrapped { overflow-x: auto; white-space: pre; overflow-wrap: normal; }
    `}</style>
    <div className="flex flex-wrap items-center justify-between gap-3 pb-4 pl-5">
      <div className="flex items-center gap-2 text-[13px] font-semibold">{t("Source")}<span className="text-xs font-normal text-muted-foreground">{t("Read only")}</span></div>
      <div className="flex items-center gap-1">
        <Button type="button" variant="ghost" size="sm" className={`h-8 gap-1.5 px-2.5 text-xs ${wrap ? "bg-accent" : ""}`} aria-pressed={wrap} onClick={() => setWrap(!wrap)}><WrapText size={14} />{t("Wrap lines")}</Button>
        <Button type="button" variant="ghost" size="sm" className="h-8 gap-1.5 px-2.5 text-xs" onClick={() => void navigator.clipboard.writeText(source).then(() => setStatus("copied"), () => setStatus("error"))}>{status === "copied" ? <Check size={14} /> : <Copy size={14} />}{status === "copied" ? t("Copied") : t("Copy")}</Button>
        <span className="sr-only" role="status">{status === "error" ? t("Could not copy") : status === "copied" ? t("Copied") : ""}</span>
      </div>
    </div>
    <pre className={`web-source-code shiki${wrap ? "" : " is-unwrapped"}`} tabIndex={0} aria-label={`${t("Source")}, ${t("Read only")}`}><code ref={codeRef} /></pre>
  </section>
}
