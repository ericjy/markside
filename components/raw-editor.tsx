// components/raw-editor.tsx
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react"
import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import {
  ArrowDown,
  ArrowUp,
  BadgeAlert,
  Bold,
  Check,
  Code2,
  Copy,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Info,
  Italic,
  Link,
  Lightbulb,
  List,
  ListChevronsUpDown,
  ListChecks,
  MessageSquareWarning,
  Minus,
  MoreHorizontal,
  OctagonAlert,
  Quote,
  SmilePlus,
  SquareCode,
  Strikethrough,
  Superscript,
  Table2,
  TriangleAlert,
} from "lucide-react"
import { Compartment, EditorState, Transaction } from "@codemirror/state"
import { EditorView, keymap } from "@codemirror/view"
import { markdown } from "@codemirror/lang-markdown"
import { oneDark } from "@codemirror/theme-one-dark"
import { basicSetup } from "codemirror"
import { javascript } from "@codemirror/lang-javascript"
import { json } from "@codemirror/lang-json"
import { css } from "@codemirror/lang-css"
import { html } from "@codemirror/lang-html"
import { python } from "@codemirror/lang-python"
import { yamlLang, shellLang, sqlLang, defaultHighlighting, inlineCodeHighlighting, headingHighlighting, headingTheme, darkHeadingTheme } from "~lib/codemirror-bundle.mjs"
import { type MarkdownInsert } from "~lib/markdown-toolbar"
import {
  applyMarkdownEdit,
  clearRevealedEditorLine,
  handleMarkdownHeadingShortcut,
  markdownFormattingKeymap,
  revealEditorLine,
  revealedEditorLineExtension,
  shiftMarkdownHeadings,
  type HeadingShiftDirection,
} from "~lib/markdown-shortcuts"

const commonEmojis = [
  "🔴",
  "🟠",
  "🟡",
  "🟢",
  "●",
  "○",
  "◐",
  "◑",
  "☆",
  "✅",
  "✓",
  "❌",
  "✗",
  "⚠️",
  "ℹ️",
  "💡",
  "📌",
  "📝",
  "🚀",
] as const

const primaryMarkdownActions = [
  ["heading-1", "Heading 1", Heading1],
  ["heading-2", "Heading 2", Heading2],
  ["heading-3", "Heading 3", Heading3],
  ["bold", "Bold", Bold],
  ["italic", "Italic", Italic],
  ["link", "Link", Link],
] as const

const additionalMarkdownActions = [
  ["strikethrough", "Strikethrough", Strikethrough],
  ["quote", "Quote", Quote],
  ["code", "Inline code", Code2],
  ["fenced-code", "Fenced code block", SquareCode],
  ["footnote", "Footnote", Superscript],
  ["bullet-list", "Bulleted list", List],
  ["task-list", "Task list", ListChecks],
  ["horizontal-rule", "Horizontal rule", Minus],
  ["table", "Table", Table2],
  ["image", "Image", ImageIcon],
] as const

const githubAlertActions = [
  ["alert-note", "Note", Info],
  ["alert-tip", "Tip", Lightbulb],
  ["alert-important", "Important", BadgeAlert],
  ["alert-warning", "Warning", TriangleAlert],
  ["alert-caution", "Caution", OctagonAlert],
] as const

const markdownHeadingShortcuts = EditorView.domEventHandlers({
  keydown: handleMarkdownHeadingShortcut,
})

function getMarkdownCodeLanguage(info: string) {
  const language = info.trim().split(/\s+/, 1)[0].toLowerCase()
  switch (language) {
    case "js": case "javascript": case "jsx": case "mjs": case "cjs": return javascript({ jsx: true }).language
    case "ts": case "typescript": case "tsx": return javascript({ typescript: true, jsx: true }).language
    case "json": case "jsonc": return json().language
    case "css": case "scss": case "less": return css().language
    case "html": case "htm": case "svelte": case "vue": case "astro": case "svg": case "xml": return html().language
    case "py": case "python": return python().language
    case "yaml": case "yml": return yamlLang
    case "sh": case "bash": case "zsh": case "shell": return shellLang
    case "sql": return sqlLang
    default: return null
  }
}

const markdownLanguage = markdown({
  codeLanguages: getMarkdownCodeLanguage,
})

function getLanguage(fileName: string) {
  const ext = fileName.slice(fileName.lastIndexOf(".") + 1).toLowerCase()
  switch (ext) {
    case "js": case "jsx": case "mjs": case "cjs": return javascript({ jsx: true })
    case "ts": case "tsx":                          return javascript({ typescript: true, jsx: true })
    case "json": case "jsonc":                      return json()
    case "css": case "scss": case "less":           return css()
    case "html": case "htm": case "svelte": case "vue": case "astro": case "svg": case "xml": return html()
    case "py":                                      return python()
    case "yaml": case "yml":                        return yamlLang
    case "sh": case "bash": case "zsh":             return shellLang
    case "sql":                                     return sqlLang
    case "md": case "mdx": case "markdown":         return markdownLanguage
    default:                                        return []
  }
}

// ─── Themes ──────────────────────────────────────────────────────────────────

// Applied in both modes: content breathing room, line height, and gutter sizing.
const baseTheme = EditorView.theme({
  ".cm-content": {
    padding: "0 1.25rem",
    lineHeight: "1.8",
    fontFamily: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace",
    fontSize: "13.5px",
  },
  // Consistent gutter sizing in both themes (oneDark doesn't set these)
  ".cm-gutters": { paddingRight: "4px" },
  ".cm-lineNumbers .cm-gutterElement": { minWidth: "2.5rem" },
  // Suppress heading/link underlines added by defaultHighlightStyle
  ".cm-content span": { textDecoration: "none" },
})

// Dark-mode override — strips oneDark's own background so the editor blends with
// the app's dark surface. Applied on top of oneDark; syntax colours are preserved.
const darkOverride = EditorView.theme(
  {
    "&": {
      backgroundColor: "transparent",
      "--cm-inline-code": "#7dd3fc",
    },
    ".cm-scroller": { backgroundColor: "transparent" },
    ".cm-gutters": {
      backgroundColor: "transparent !important",
      border: "none",
      color: "#4b5563",           // slate-600
    },
    ".cm-activeLineGutter": { backgroundColor: "transparent" },
    ".cm-activeLine": {
      backgroundColor: "rgba(255,255,255,0.04)",
      borderRadius: "3px",
    },
  },
  { dark: true }
)

// Light-mode chrome — colours drawn from Tailwind slate palette to match the app.
const lightTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: "transparent",
      "--cm-inline-code": "#0369a1",
    },
    ".cm-scroller": { backgroundColor: "transparent" },
    // Gutters: no border, muted slate numbers (sizing is in baseTheme)
    ".cm-gutters": {
      backgroundColor: "hsl(var(--background))",
      border: "none",
      color: "#94a3b8",       // slate-400
    },
    ".cm-activeLineGutter": {
      backgroundColor: "transparent",
      color: "#334155",       // slate-700
    },
    // Subtle warm tint on the active line
    ".cm-activeLine": {
      backgroundColor: "rgba(15,23,42,0.04)",
      borderRadius: "3px",
    },
    // Sky-blue selection (macOS-native feel)
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
      backgroundColor: "#bae6fd", // sky-200
    },
    // Crisp dark cursor
    "&.cm-focused .cm-cursor": {
      borderLeftColor: "#0f172a", // slate-900
      borderLeftWidth: "2px",
    },
  },
  { dark: false }
)

function isMdFileName(fileName: string) {
  const ext = fileName.slice(fileName.lastIndexOf(".") + 1).toLowerCase()
  return ext === "md" || ext === "mdx" || ext === "markdown"
}

interface Props {
  autoFocus?: boolean
  fullWidth: boolean
  onToggleFullWidth: () => void
  content: string
  dark: boolean
  fileName: string
  onChange: (value: string, sourceLine: number) => void
}

export interface RawEditorHandle {
  revealLine: (line: number) => void
}

export const RawEditor = forwardRef<RawEditorHandle, Props>(function RawEditor(
  { content, dark, fileName, onChange, fullWidth, onToggleFullWidth, autoFocus = false },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const revealLineTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Ref so the updateListener closure always sees the latest onChange without re-init
  const onChangeRef = useRef(onChange)
  const themeCompartmentRef = useRef(new Compartment())
  const langCompartmentRef = useRef(new Compartment())
  const wrapCompartmentRef = useRef(new Compartment())
  const shortcutCompartmentRef = useRef(new Compartment())
  const [lineWrap, setLineWrap] = useState(() => isMdFileName(fileName))
  const [copied, setCopied] = useState(false)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const isMarkdown = isMdFileName(fileName)

  useEffect(() => {
    onChangeRef.current = onChange
  })

  // Initialise editor once on mount
  useEffect(() => {
    if (!containerRef.current) return
    const compartment = themeCompartmentRef.current
    const view = new EditorView({
      state: EditorState.create({
        doc: content,
        extensions: [
          basicSetup,
          langCompartmentRef.current.of(getLanguage(fileName)),
          wrapCompartmentRef.current.of(lineWrap ? EditorView.lineWrapping : []),
          shortcutCompartmentRef.current.of(
            isMarkdown
              ? [keymap.of(markdownFormattingKeymap), markdownHeadingShortcuts]
              : [],
          ),
          baseTheme,
          revealedEditorLineExtension,
          compartment.of(dark
            ? [oneDark, darkOverride, inlineCodeHighlighting, headingHighlighting, darkHeadingTheme]
            : [lightTheme, defaultHighlighting, inlineCodeHighlighting, headingHighlighting, headingTheme]),
          EditorView.updateListener.of((update) => {
            // Only fire onChange for user-initiated edits (typing, paste, undo, etc.).
            // Programmatic dispatches (content sync on mode switch) have no userEvent
            // annotation and must NOT trigger onChange — that would spuriously mark the
            // draft as unsaved and kick off the autosave debounce.
            if (
              update.docChanged &&
              update.transactions.some(
                (tr) => tr.annotation(Transaction.userEvent) != null
              )
            ) {
              const value = update.state.doc.toString()
              const sourceLine = update.state.doc.lineAt(
                update.state.selection.main.head
              ).number
              onChangeRef.current(value, sourceLine)
            }
          }),
        ],
      }),
      parent: containerRef.current,
    })
    viewRef.current = view
    if (autoFocus) view.focus()
    return () => {
      if (revealLineTimeoutRef.current !== null) {
        clearTimeout(revealLineTimeoutRef.current)
      }
      view.destroy()
      viewRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps — intentional one-time init

  // Hot-swap theme when dark prop changes
  useEffect(() => {
    if (!viewRef.current) return
    viewRef.current.dispatch({
      effects: themeCompartmentRef.current.reconfigure(dark
        ? [oneDark, darkOverride, inlineCodeHighlighting, headingHighlighting, darkHeadingTheme]
        : [lightTheme, defaultHighlighting, inlineCodeHighlighting, headingHighlighting, headingTheme]),
    })
  }, [dark])

  // Hot-swap language when file changes
  useEffect(() => {
    if (!viewRef.current) return
    viewRef.current.dispatch({
      effects: [
        langCompartmentRef.current.reconfigure(getLanguage(fileName)),
        shortcutCompartmentRef.current.reconfigure(
          isMarkdown
            ? [keymap.of(markdownFormattingKeymap), markdownHeadingShortcuts]
            : [],
        ),
      ],
    })
  }, [fileName])

  // Reset line wrap to auto-default when switching files
  useEffect(() => {
    setLineWrap(isMdFileName(fileName))
  }, [fileName])

  // Hot-swap line wrapping when lineWrap state changes
  useEffect(() => {
    if (!viewRef.current) return
    viewRef.current.dispatch({
      effects: wrapCompartmentRef.current.reconfigure(lineWrap ? EditorView.lineWrapping : []),
    })
  }, [lineWrap])

  // Sync externally-changed content (e.g. file reload) into the editor.
  // Full-document replacement resets cursor to 0 — acceptable for reload scenarios.
  useEffect(() => {
    if (!viewRef.current) return
    const currentDoc = viewRef.current.state.doc.toString()
    if (currentDoc === content) return
    viewRef.current.dispatch({
      changes: { from: 0, to: currentDoc.length, insert: content },
    })
  }, [content])

  const handleCopy = () => {
    const text = viewRef.current?.state.doc.toString() ?? content
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  const insertMarkdown = (action: MarkdownInsert) => {
    const view = viewRef.current
    if (!view) return
    applyMarkdownEdit(view, action)
  }

  const insertEmoji = (emoji: string) => {
    const view = viewRef.current
    if (!view) return

    const { from, to } = view.state.selection.main
    view.dispatch({
      changes: { from, to, insert: emoji },
      selection: { anchor: from + emoji.length },
      annotations: Transaction.userEvent.of("input"),
      scrollIntoView: true,
    })
    view.focus()
  }

  const shiftHeadings = (direction: HeadingShiftDirection) => {
    const view = viewRef.current
    if (!view) return
    shiftMarkdownHeadings(view, direction)
  }

  useImperativeHandle(ref, () => ({
    revealLine(line: number) {
      const view = viewRef.current
      if (!view) return
      if (revealLineTimeoutRef.current !== null) {
        clearTimeout(revealLineTimeoutRef.current)
      }
      revealEditorLine(view, line)
      revealLineTimeoutRef.current = setTimeout(() => {
        revealLineTimeoutRef.current = null
        if (viewRef.current === view) clearRevealedEditorLine(view)
      }, 1800)
    },
  }), [])

  const toolbarButtonClass =
    "flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
  const editorActions = (
    <div className="markdown-toolbar-editor-actions ml-auto flex shrink-0 items-center gap-1 pl-2 text-xs text-muted-foreground">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button type="button" aria-label="Source options" title="Source options" className={toolbarButtonClass}>
            <MoreHorizontal size={14} />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={6}
            style={{ minWidth: "10rem", zIndex: 99999 }}
            className="rounded-md border bg-background p-1 text-foreground shadow-md">
            <DropdownMenu.CheckboxItem
              checked={lineWrap}
              onCheckedChange={setLineWrap}
              onSelect={(event) => event.preventDefault()}
              className="flex cursor-pointer select-none items-center justify-between gap-4 rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent">
              Word wrap
              <span
                aria-hidden="true"
                className={`flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors ${lineWrap ? "bg-green-600" : "bg-muted-foreground/30"}`}>
                <span className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${lineWrap ? "translate-x-4" : "translate-x-0"}`} />
              </span>
            </DropdownMenu.CheckboxItem>
            <DropdownMenu.CheckboxItem
              checked={fullWidth}
              onCheckedChange={onToggleFullWidth}
              onSelect={(event) => event.preventDefault()}
              className="flex cursor-pointer select-none items-center justify-between gap-4 rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent">
              Full width
              <span
                aria-hidden="true"
                className={`flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors ${fullWidth ? "bg-green-600" : "bg-muted-foreground/30"}`}>
                <span className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${fullWidth ? "translate-x-4" : "translate-x-0"}`} />
              </span>
            </DropdownMenu.CheckboxItem>
            <DropdownMenu.Item
              aria-label="Copy file contents"
              onSelect={(event) => {
                event.preventDefault()
                handleCopy()
              }}
              className="flex cursor-pointer select-none items-center justify-between gap-4 rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent">
              {copied ? "Copied" : "Copy"}
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  )

  return (
    <div className="raw-editor h-full flex flex-col">
      {isMarkdown ? (
        <>
          <div
            role="toolbar"
            aria-label="Markdown formatting"
            className="markdown-toolbar flex min-h-10 shrink-0 items-center gap-0.5 overflow-x-hidden px-3 py-1">
            {primaryMarkdownActions.map(([action, label, Icon], index) => (
              <span key={action} className="contents">
                {index === 3 && (
                  <span aria-hidden="true" className="mx-1 h-4 w-px shrink-0 bg-border" />
                )}
                <button
                  type="button"
                  title={
                    action === "bold"
                      ? "Bold (Cmd+B / Ctrl+B)"
                      : label
                  }
                  aria-label={`Insert ${label.toLowerCase()}`}
                  className={toolbarButtonClass}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => insertMarkdown(action)}>
                  <Icon size={14} strokeWidth={1.8} />
                </button>
              </span>
            ))}
            <span data-toolbar-additional className="contents">
              <span aria-hidden="true" className="mx-1 h-4 w-px shrink-0 bg-border" />
              {additionalMarkdownActions.map(([action, label, Icon], index) => (
                <span key={action} className="contents">
                  {(index === 1 || index === 5 || index === 8) && (
                    <span aria-hidden="true" className="mx-1 h-4 w-px shrink-0 bg-border" />
                  )}
                  <button
                    type="button"
                    title={label}
                    aria-label={`Insert ${label.toLowerCase()}`}
                    className={toolbarButtonClass}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => insertMarkdown(action)}>
                    <Icon size={14} strokeWidth={1.8} />
                  </button>
                </span>
              ))}
            </span>
            <span aria-hidden="true" className="mx-1 h-4 w-px shrink-0 bg-border" />
            <button
              type="button"
              title="Common emoji"
              aria-label="Show common emoji"
              aria-expanded={emojiOpen}
              className={`${toolbarButtonClass} ${emojiOpen ? "bg-accent text-foreground" : ""}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => setEmojiOpen((open) => !open)}>
              <SmilePlus size={14} strokeWidth={1.8} />
            </button>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  title="GitHub alerts"
                  aria-label="Insert GitHub alert"
                  className={toolbarButtonClass}>
                  <MessageSquareWarning size={14} strokeWidth={1.8} />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="start"
                  sideOffset={4}
                  style={{ minWidth: "10rem", zIndex: 99999 }}
                  className="rounded-md border bg-background p-1 text-foreground shadow-md">
                  {githubAlertActions.map(([action, label, Icon]) => (
                    <DropdownMenu.Item
                      key={action}
                      className="flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground"
                      onSelect={() => insertMarkdown(action)}>
                      <Icon size={14} strokeWidth={1.8} aria-hidden="true" />
                      {label}
                    </DropdownMenu.Item>
                  ))}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  title="Heading actions"
                  aria-label="Heading actions"
                  className={toolbarButtonClass}>
                  <ListChevronsUpDown size={14} strokeWidth={1.8} />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="start"
                  sideOffset={4}
                  style={{ minWidth: "11rem", zIndex: 99999 }}
                  className="rounded-md border bg-background p-1 text-foreground shadow-md">
                  <DropdownMenu.Item
                    className="flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground"
                    onSelect={() => shiftHeadings("promote")}>
                    <ArrowUp size={14} strokeWidth={1.8} />
                    Promote headings
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    className="flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground"
                    onSelect={() => shiftHeadings("demote")}>
                    <ArrowDown size={14} strokeWidth={1.8} />
                    Demote headings
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  title="More formatting"
                  aria-label="More formatting"
                  className={`markdown-toolbar-more ${toolbarButtonClass}`}>
                  <MoreHorizontal size={14} strokeWidth={1.8} />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="start"
                  sideOffset={4}
                  style={{ minWidth: "11rem", zIndex: 99999 }}
                  className="rounded-md border bg-background p-1 text-foreground shadow-md">
                  {additionalMarkdownActions.map(([action, label, Icon]) => (
                    <DropdownMenu.Item
                      key={action}
                      className="flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground"
                      onSelect={() => insertMarkdown(action)}>
                      <Icon size={14} strokeWidth={1.8} />
                      {label}
                    </DropdownMenu.Item>
                  ))}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
            {editorActions}
          </div>
          {emojiOpen && (
            <div
              role="group"
              aria-label="Common emoji"
              className="flex min-h-9 shrink-0 items-center gap-1 overflow-x-auto border-b border-border/60 bg-muted/30 px-3 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <span className="mr-1 shrink-0 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Insert
              </span>
              {commonEmojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  title={`Insert ${emoji}`}
                  aria-label={`Insert ${emoji}`}
                  className="flex h-7 w-8 shrink-0 items-center justify-center rounded-md text-base transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => insertEmoji(emoji)}>
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <div
          role="toolbar"
          aria-label="Editor actions"
          className="flex min-h-9 shrink-0 items-center px-3 py-1">
          <div className="flex h-7 min-w-0 items-center text-xs text-muted-foreground">
            <span className="truncate" title={decodeURIComponent(fileName)}>
              {decodeURIComponent(fileName)}
            </span>
          </div>
          {editorActions}
        </div>
      )}
      <div
        ref={containerRef}
        aria-label={isMarkdown ? "Markdown editor" : "Code editor"}
        className="flex-1 min-h-0 pt-2 text-sm [&_.cm-editor]:h-full [&_.cm-editor]:outline-none [&_.cm-editor]:!bg-transparent [&_.cm-scroller]:overflow-auto [&_.cm-scroller]:!bg-transparent"
      />
    </div>
  )
})
