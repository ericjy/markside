import MarkdownIt from "markdown-it"
import anchor from "markdown-it-anchor"
import footnote from "markdown-it-footnote"
import katex from "katex"

import {
  COPY_ICON,
  getCodeBlockWrapPreference,
  getCodeBlockLanguageLabel,
  WRAP_ICON,
} from "./code-block"

export const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true
}).use(footnote).use(anchor, {
  permalink: anchor.permalink.linkInsideHeader({
    symbol: "",
    renderAttrs: () => ({ "aria-hidden": "true" })
  })
})

export function addDefaultDetailsSummaries(root: ParentNode) {
  root.querySelectorAll("details").forEach((details) => {
    const hasSummary = Array.from(details.children).some(
      (child) => child.tagName === "SUMMARY"
    )
    if (hasSummary) return

    const summary = details.ownerDocument.createElement("summary")
    summary.textContent = "Details"
    details.prepend(summary)
  })
}

const renderFence =
  md.renderer.rules.fence ??
  ((tokens, idx, options, _env, self) =>
    self.renderToken(tokens, idx, options))

function renderMath(tex: string, displayMode: boolean) {
  return katex.renderToString(tex, { displayMode, throwOnError: false })
}

function renderMathBlock(tex: string, sourceLine: string | null) {
  const sourceAttr = sourceLine ? ` data-source-line="${sourceLine}"` : ""
  return `<div class="math-block"${sourceAttr}>${renderMath(tex, true)}</div>\n`
}

md.renderer.rules.fence = (tokens, idx, options, env, self) => {
  const language =
    tokens[idx].info.trim().split(/\s+/, 1)[0].toLowerCase() || "text"
  const sourceLine = tokens[idx].attrGet("data-source-line")
  if (language === "math") return renderMathBlock(tokens[idx].content, sourceLine)
  const fence = renderFence(tokens, idx, options, env, self)
  if (language === "mermaid") return fence
  const label = md.utils.escapeHtml(getCodeBlockLanguageLabel(language))
  const sourceAttr = sourceLine ? ` data-source-line="${sourceLine}"` : ""
  const wrapped = getCodeBlockWrapPreference()
  const wrapLabel = wrapped ? "Don't wrap lines" : "Wrap lines"

  return `<div class="code-block${wrapped ? " code-block-wrapped" : ""}"${sourceAttr}><div class="code-block-header"><span class="code-block-lang">${label}</span><div class="code-block-actions"><button type="button" class="code-block-wrap" aria-label="${wrapLabel}" title="${wrapLabel}" aria-pressed="${wrapped}" disabled>${WRAP_ICON}</button><button type="button" class="code-block-copy" aria-label="Copy code" title="Copy code" disabled>${COPY_ICON}</button></div></div>${fence}</div>`
}

// Display math: `$$` opens a block that ends at the first line ending in `$$`.
md.block.ruler.before("fence", "math_block", (state, startLine, endLine, silent) => {
  if (state.sCount[startLine] - state.blkIndent >= 4) return false
  const start = state.bMarks[startLine] + state.tShift[startLine]
  if (!state.src.startsWith("$$", start)) return false
  const firstLine = state.src.slice(start + 2, state.eMarks[startLine]).trim()
  let lastLine = ""
  let line = startLine
  if (firstLine.endsWith("$$")) {
    lastLine = firstLine.slice(0, -2)
  } else {
    if (firstLine.includes("$$")) return false
    for (line = startLine + 1; line < endLine; line++) {
      const pos = state.bMarks[line] + state.tShift[line]
      const max = state.eMarks[line]
      if (pos < max && state.sCount[line] < state.blkIndent) return false
      const text = state.src.slice(pos, max).trim()
      if (text.endsWith("$$")) {
        lastLine = text.slice(0, -2)
        break
      }
    }
    if (line === endLine) return false
  }
  if (silent) return true

  const token = state.push("math_block", "div", 0)
  token.block = true
  token.map = [startLine, line + 1]
  token.content =
    line === startLine
      ? lastLine
      : [firstLine, state.getLines(startLine + 1, line, state.blkIndent, false), lastLine].join("\n")
  state.line = line + 1
  return true
})

md.renderer.rules.math_block = (tokens, idx) =>
  renderMathBlock(tokens[idx].content, tokens[idx].attrGet("data-source-line"))

// Inline math: `$...$` must not start or end with whitespace and the closing
// `$` must not precede a digit, so currency like "$5 and $10" stays text.
// `$$...$$` inside a paragraph renders in display mode.
md.inline.ruler.after("escape", "math_inline", (state, silent) => {
  const src = state.src
  const start = state.pos
  if (src[start] !== "$") return false
  const displayMode = src[start + 1] === "$"
  const delimiter = displayMode ? "$$" : "$"
  const contentStart = start + delimiter.length
  if (!displayMode && /\s/.test(src[contentStart] ?? " ")) return false

  let end = contentStart
  while ((end = src.indexOf(delimiter, end)) !== -1) {
    const escaped = src[end - 1] === "\\"
    const looksLikeCurrency =
      !displayMode && (/\s/.test(src[end - 1]) || /\d/.test(src[end + 1] ?? ""))
    if (!escaped && !looksLikeCurrency) break
    end++
  }
  if (end === -1 || end === contentStart) return false

  if (!silent) {
    const token = state.push("math_inline", "math", 0)
    token.content = src.slice(contentStart, end)
    token.meta = { displayMode }
  }
  state.pos = end + delimiter.length
  return true
})

md.renderer.rules.math_inline = (tokens, idx) =>
  renderMath(tokens[idx].content, tokens[idx].meta.displayMode)

// Task list support: transform `- [x]` and `- [ ]` list items into checkboxes.
// Handles both tight lists (list_item_open → inline) and loose lists
// (list_item_open → paragraph_open → inline).
md.core.ruler.push("task_list", (state) => {
  const tokens = state.tokens
  for (let i = 1; i < tokens.length; i++) {
    if (tokens[i].type !== "inline") continue
    const prev = tokens[i - 1].type
    // loose list: inline is preceded by paragraph_open
    // tight list: inline is preceded directly by list_item_open
    const listItemIdx = prev === "paragraph_open" ? i - 2 : prev === "list_item_open" ? i - 1 : -1
    if (listItemIdx < 0 || tokens[listItemIdx].type !== "list_item_open") continue
    const content = tokens[i].content
    const checked = /^\[x\] /i.test(content)
    const unchecked = /^\[ \] /.test(content)
    if (!checked && !unchecked) continue
    tokens[listItemIdx].attrSet("class", "task-list-item")
    tokens[i].content = content.slice(4)
    if (tokens[i].children) {
      const first = tokens[i].children![0]
      if (first && first.type === "text") first.content = first.content.slice(4)
    }
    const checkbox = new state.Token("html_inline", "", 0)
    checkbox.content = `<input type="checkbox" disabled${checked ? " checked" : ""}>`
    tokens[i].children!.unshift(checkbox)
  }
})

const MARKDOWN_ALERT = /^\[!(NOTE|IMPORTANT|WARNING|TIP|CAUTION|QUESTION)\][ \t]*(?:\n|$)/i
const QUESTION_OPTION = /^\*\*([A-Z])\.(?:\s|\*\*)/
const QUESTION_RECOMMENDED = /^\*\*Recommended:\s*([A-Z])\b/i
const MARKDOWN_ALERT_ICONS: Record<string, string> = {
  note: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  important: '<path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/><path d="M12 7v4"/><path d="M12 15h.01"/>',
  warning: '<path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  tip: '<path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.65.66-1.17 1.22-1.61A6 6 0 1 0 7.69 12.4c.55.43 1.03.94 1.22 1.6"/>',
  question: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
  caution: '<path d="M15.312 2a2 2 0 0 1 1.414.586l4.688 4.688A2 2 0 0 1 22 8.688v6.624a2 2 0 0 1-.586 1.414l-4.688 4.688a2 2 0 0 1-1.414.586H8.688a2 2 0 0 1-1.414-.586l-4.688-4.688A2 2 0 0 1 2 15.312V8.688a2 2 0 0 1 .586-1.414l4.688-4.688A2 2 0 0 1 8.688 2z"/><path d="M12 8v4"/><path d="M12 16h.01"/>'
}

md.core.ruler.push("markdown_alerts", (state) => {
  const tokens = state.tokens

  for (let i = 0; i < tokens.length - 2; i++) {
    if (
      tokens[i].type !== "blockquote_open" ||
      tokens[i + 1].type !== "paragraph_open" ||
      tokens[i + 2].type !== "inline"
    ) {
      continue
    }

    const inline = tokens[i + 2]
    const match = MARKDOWN_ALERT.exec(inline.content)
    if (!match) continue

    const type = match[1].toLowerCase()
    tokens[i].type = "markdown_alert_open"
    tokens[i].tag = "div"
    tokens[i].attrJoin("class", `markdown-alert markdown-alert-${type}`)
    tokens[i].meta = {
      title: match[1][0] + match[1].slice(1).toLowerCase(),
      type
    }

    inline.content = inline.content.slice(match[0].length)
    // A marker on its own line leaves no paragraph to render.
    if (!inline.content) tokens[i + 1].hidden = tokens[i + 3].hidden = true
    const children: typeof inline.children = []
    state.md.inline.parse(inline.content, state.md, state.env, children)
    inline.children = children

    let depth = 1
    for (let j = i + 1; j < tokens.length; j++) {
      if (tokens[j].type === "blockquote_open") depth++
      if (tokens[j].type !== "blockquote_close") continue
      depth--
      if (depth !== 0) continue
      tokens[j].type = "markdown_alert_close"
      tokens[j].tag = "div"
      if (type === "question") markQuestionAnswers(tokens, i, j)
      break
    }
  }
})

// Question cards mark each lettered option and the recommendation so the
// content script can offer one-click answers.
function markQuestionAnswers(tokens: ReturnType<MarkdownIt["parse"]>, open: number, close: number) {
  for (let k = open + 3; k < close; k++) {
    if (tokens[k].type !== "inline" || tokens[k - 1].type !== "paragraph_open") continue
    const recommended = QUESTION_RECOMMENDED.exec(tokens[k].content)
    if (recommended) tokens[open].attrSet("data-question-recommended", recommended[1].toUpperCase())
    const option = QUESTION_OPTION.exec(tokens[k].content)
    if (option && tokens[k - 2].type === "list_item_open") tokens[k - 2].attrSet("data-question-option", option[1])
  }
}

export interface QuestionCard {
  target: HTMLElement
  mount: HTMLElement
  options: { value: string; label: string }[]
  recommended: string | null
}

/** Adds an answer-controls mount to a rendered question card. Answers anchor to its heading. */
export function mountQuestionCard(card: HTMLElement): QuestionCard | null {
  const target = card.querySelector<HTMLElement>("h1,h2,h3,h4,h5,h6") ??
    card.querySelector<HTMLElement>(":scope > p:not(.markdown-alert-title)")
  if (!target) return null
  const options = Array.from(card.querySelectorAll<HTMLElement>("li[data-question-option]"), (item) => ({
    value: item.dataset.questionOption!,
    label: item.querySelector("strong")?.textContent?.trim() ?? item.dataset.questionOption!,
  }))
  const recommended = card.dataset.questionRecommended ?? null
  const mount = card.ownerDocument.createElement("div")
  mount.className = "question-card-actions"
  card.append(mount)
  return {
    target,
    mount,
    options,
    recommended: options.some(({ value }) => value === recommended) ? recommended : null,
  }
}

md.renderer.rules.markdown_alert_open = (tokens, idx, _options, _env, self) => {
  const title = md.utils.escapeHtml(tokens[idx].meta.title)
  const type = tokens[idx].meta.type
  const icon = `<svg class="markdown-alert-icon" aria-hidden="true" data-alert-icon="${type}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${MARKDOWN_ALERT_ICONS[type]}</svg>`
  return `${self.renderToken(tokens, idx, _options)}<p class="markdown-alert-title">${icon}${title}</p>\n`
}

md.renderer.rules.markdown_alert_close = (tokens, idx, options, _env, self) =>
  self.renderToken(tokens, idx, options)

md.core.ruler.push("source_lines", (state) => {
  const sourceLineOffset =
    typeof state.env?.sourceLineOffset === "number"
      ? state.env.sourceLineOffset
      : 0

  for (const token of state.tokens) {
    if (!token.map) continue
    if (
      token.nesting !== 1 &&
      token.type !== "fence" &&
      token.type !== "math_block" &&
      token.type !== "code_block" &&
      token.type !== "html_block"
    ) {
      continue
    }
    token.attrSet(
      "data-source-line",
      String(token.map[0] + sourceLineOffset + 1)
    )
  }
})

// Wikilink support: [[note-name]] and [[note-name|display text]]
md.inline.ruler.push("wikilink", (state, silent) => {
  if (state.src[state.pos] !== "[" || state.src[state.pos + 1] !== "[") return false
  const start = state.pos + 2
  const end = state.src.indexOf("]]", start)
  if (end === -1) return false
  if (!silent) {
    const inner = state.src.slice(start, end)
    const pipe = inner.indexOf("|")
    const target = (pipe >= 0 ? inner.slice(0, pipe) : inner).trim()
    const label = (pipe >= 0 ? inner.slice(pipe + 1) : inner).trim()
    const token = state.push("wikilink_inline", "", 0)
    token.meta = { target, label }
  }
  state.pos = end + 2
  return true
})

md.renderer.rules["wikilink_inline"] = (tokens, idx) => {
  const { target, label } = tokens[idx].meta
  const t = md.utils.escapeHtml(target)
  const l = md.utils.escapeHtml(label)
  return `<a class="wikilink" data-wikilink="${t}">${l}</a>`
}
