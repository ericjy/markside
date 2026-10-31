import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import { Check, ChevronRight, Copy, Eye, Globe, Maximize2, Minimize2, Moon, MoreHorizontal, MoveHorizontal, Pencil, Printer, Sun, TableOfContents, Type } from "lucide-react"
import React, { useRef } from "react"
import { Button } from "~components/ui/button"
import { ZEN_MODE_SHORTCUT } from "~components/content-zen-mode"
import { t } from "~lib/i18n"
import { setPreviewWidthPreference, type PreviewWidth } from "~lib/markdown-mode"
import { setTypeface, TYPEFACES, type Typeface } from "~lib/typeface"
import { webDocumentIdentity } from "~lib/web-preview"

type Props = {
  url: string
  raw: boolean
  setRaw: (raw: boolean) => void
  dark: boolean
  toggleTheme: () => void
  outlineOpen: boolean
  setOutlineOpen: (open: boolean) => void
  typeface: Typeface
  previewWidth: PreviewWidth
  setPreviewWidth: (width: PreviewWidth) => void
  numberHeadings: boolean
  setNumberHeadings: (value: boolean) => void
  copy: () => void
  print: () => void
  status: string
  zenMode: boolean
  setZenMode: (enabled: boolean) => void
}

const menuItem = "flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent data-[state=open]:bg-accent"
const menuContent = "rounded-md border bg-background p-1 text-foreground shadow-md"

const brandPaths = {
  github: "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12",
  gitlab: "m23.6004 9.5927-.0337-.0862L20.3.9814a.851.851 0 0 0-.3362-.405.8748.8748 0 0 0-.9997.0539.8748.8748 0 0 0-.29.4399l-2.2055 6.748H7.5375l-2.2057-6.748a.8573.8573 0 0 0-.29-.4412.8748.8748 0 0 0-.9997-.0537.8585.8585 0 0 0-.3362.4049L.4332 9.5015l-.0325.0862a6.0657 6.0657 0 0 0 2.0119 7.0105l.0113.0087.03.0213 4.976 3.7264 2.462 1.8633 1.4995 1.1321a1.0085 1.0085 0 0 0 1.2197 0l1.4995-1.1321 2.4619-1.8633 5.006-3.7489.0125-.01a6.0682 6.0682 0 0 0 2.0094-7.003z",
  bitbucket: "M.778 1.213a.768.768 0 00-.768.892l3.263 19.81c.084.5.515.868 1.022.873H19.95a.772.772 0 00.77-.646l3.27-20.03a.768.768 0 00-.768-.891zM14.52 15.53H9.522L8.17 8.466h7.561z",
}

export function WebPreviewToolbar(props: Props) {
  const { url, raw, setRaw, dark, toggleTheme, outlineOpen, setOutlineOpen, typeface, previewWidth, setPreviewWidth, numberHeadings, setNumberHeadings, copy, print, status, zenMode, setZenMode } = props
  const { filename, source, kind } = webDocumentIdentity(url)
  const separator = source.lastIndexOf("/")
  const enteringZenMode = useRef(false)
  return <header data-markside-toolbar className="flex h-12 shrink-0 items-center gap-2 border-b px-4 dark:bg-sidebar">
    {zenMode && <Button variant="ghost" size="icon" className="-ml-1 h-7 w-7" onClick={() => setZenMode(false)} aria-label={t("Exit Zen mode")} title={t("Exit Zen mode ({0})", [ZEN_MODE_SHORTCUT])}><Minimize2 size={16} /></Button>}
    <nav className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden font-mono text-xs" title={url}>
      {kind === "website" ? <Globe size={14} className="shrink-0 text-muted-foreground" aria-hidden="true" /> : <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 text-foreground/75" fill="currentColor" aria-hidden="true"><path d={brandPaths[kind]} /></svg>}
      <span className="min-w-0 truncate text-muted-foreground">{kind === "website" ? source : <>{source.slice(0, separator)}<span className="px-0.5 text-muted-foreground/50">/</span><span className="font-medium text-foreground/75">{source.slice(separator + 1)}</span></>}</span>
      <span className="shrink-0 text-muted-foreground/50">·</span>
      <span className="max-w-[45%] shrink-0 truncate font-medium text-foreground">{filename}</span>
    </nav>
    <div role="group" aria-label={t("Markdown display mode")} className="flex items-center overflow-hidden rounded-md border text-xs font-medium">
      {([[false, "Preview", Eye], [true, "Source", Pencil]] as const).map(([isRaw, label, Icon], index) => <button key={label} type="button" aria-label={t("{0} mode", [t(label)])} aria-pressed={raw === isRaw} onClick={() => setRaw(isRaw)} className={`flex items-center gap-1.5 px-2.5 py-1 transition-colors ${index ? "border-l" : ""} ${raw === isRaw ? "bg-accent text-foreground" : "hover:bg-accent/50"}`}>
        <Icon size={13} strokeWidth={1.8} /><span className="hidden lg:inline">{t(label)}</span>
      </button>)}
    </div>
    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggleTheme} aria-label={t("Toggle theme")}>{dark ? <Sun size={14} /> : <Moon size={14} />}</Button>
    <Button variant="ghost" size="icon" className={`h-7 w-7 ${outlineOpen && !raw ? "bg-accent" : ""}`} onClick={() => setOutlineOpen(!outlineOpen)} disabled={raw} aria-label={t("Toggle outline")} aria-pressed={outlineOpen && !raw}><TableOfContents size={16} /></Button>
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild><Button type="button" variant="ghost" size="icon" className="h-7 w-7" aria-label={t("File actions")} title={t("File actions")}><MoreHorizontal size={16} /></Button></DropdownMenu.Trigger>
      <DropdownMenu.Portal><DropdownMenu.Content align="end" sideOffset={8} style={{ minWidth: "11rem", zIndex: 100000 }} className={menuContent} onCloseAutoFocus={event => {
        if (enteringZenMode.current) { enteringZenMode.current = false; event.preventDefault() }
      }}>
        <DropdownMenu.Sub>
          <DropdownMenu.SubTrigger disabled={raw} className={menuItem}><Type size={14} className="mr-2 w-3.5 shrink-0" />{t("Typeface")}<span className="ml-auto pl-4 text-xs text-muted-foreground">{t(TYPEFACES[typeface].label)}</span><ChevronRight size={14} /></DropdownMenu.SubTrigger>
          <DropdownMenu.Portal><DropdownMenu.SubContent sideOffset={4} alignOffset={-4} style={{ minWidth: "10rem", zIndex: 100000 }} className={menuContent}>
            <DropdownMenu.RadioGroup value={typeface} aria-label={t("Typeface")} onValueChange={value => void setTypeface(value as Typeface)}>
              {(Object.keys(TYPEFACES) as Typeface[]).map(id => <DropdownMenu.RadioItem key={id} value={id} style={{ fontFamily: TYPEFACES[id].stack }} className={menuItem}>{t(TYPEFACES[id].label)}<span className="ml-auto"><DropdownMenu.ItemIndicator><Check size={13} /></DropdownMenu.ItemIndicator></span></DropdownMenu.RadioItem>)}
            </DropdownMenu.RadioGroup>
          </DropdownMenu.SubContent></DropdownMenu.Portal>
        </DropdownMenu.Sub>
        <DropdownMenu.Sub>
          <DropdownMenu.SubTrigger disabled={raw} className={menuItem}><MoveHorizontal size={14} className="mr-2 w-3.5 shrink-0" />{t("Page width")}<span className="ml-auto pl-4 text-xs text-muted-foreground">{t(previewWidth === "standard" ? "Standard" : previewWidth === "extended" ? "Extended" : "Full width")}</span><ChevronRight size={14} /></DropdownMenu.SubTrigger>
          <DropdownMenu.Portal><DropdownMenu.SubContent sideOffset={4} alignOffset={-4} style={{ minWidth: "10rem", zIndex: 100000 }} className={menuContent}>
            <DropdownMenu.RadioGroup value={previewWidth} aria-label={t("Page width")} onValueChange={value => { const width = value as PreviewWidth; setPreviewWidth(width); void setPreviewWidthPreference(width) }}>
              {([["standard", "Standard"], ["extended", "Extended"], ["full", "Full width"]] as const).map(([width, label]) => <DropdownMenu.RadioItem key={width} value={width} className={menuItem}>{t(label)}<span className="ml-auto"><DropdownMenu.ItemIndicator><Check size={13} /></DropdownMenu.ItemIndicator></span></DropdownMenu.RadioItem>)}
            </DropdownMenu.RadioGroup>
          </DropdownMenu.SubContent></DropdownMenu.Portal>
        </DropdownMenu.Sub>
        <DropdownMenu.CheckboxItem checked={numberHeadings} disabled={raw} onCheckedChange={setNumberHeadings} className={menuItem}><span className="mr-2 w-3.5 text-center font-mono text-[10px]">1.2</span>{t("Number headings")}<span className="ml-auto"><DropdownMenu.ItemIndicator><Check size={13} /></DropdownMenu.ItemIndicator></span></DropdownMenu.CheckboxItem>
        <DropdownMenu.Item onSelect={() => { enteringZenMode.current = !zenMode; setZenMode(!zenMode) }} className={menuItem}>
          {zenMode ? <Minimize2 size={14} className="mr-2 shrink-0" /> : <Maximize2 size={14} className="mr-2 shrink-0" />}
          {zenMode ? t("Exit Zen mode") : t("Zen mode")}<kbd className="ml-auto pl-4 font-mono text-xs text-muted-foreground">{ZEN_MODE_SHORTCUT}</kbd>
        </DropdownMenu.Item>
        <DropdownMenu.Item disabled={raw} onSelect={copy} className={menuItem}><Copy size={14} className="mr-2" />{t("Copy rendered content")}</DropdownMenu.Item>
        <DropdownMenu.Item disabled={raw} onSelect={print} className={menuItem}><Printer size={14} className="mr-2" />{t("Print or save as PDF")}</DropdownMenu.Item>
      </DropdownMenu.Content></DropdownMenu.Portal>
    </DropdownMenu.Root>
    <span role="status" className="sr-only">{status}</span>
  </header>
}
