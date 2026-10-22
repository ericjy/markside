import MarkdownIt from "markdown-it"
import type StateCore from "markdown-it/lib/rules_core/state_core.mjs"
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

// Expand before inline parsing and heading IDs, keeping the fence body's source lines.
md.core.ruler.before("inline", "question_fences", (state) => {
  state.tokens = state.tokens.flatMap((token) => {
    if (token.type !== "fence" || token.info.trim().toLowerCase() !== "question") return [token]
    const body: typeof state.tokens = []
    state.md.block.parse(token.content, state.md, state.env, body)
    for (const child of body) {
      child.level += token.level + 1
      if (child.map && token.map) {
        child.map = [child.map[0] + token.map[0] + 1, child.map[1] + token.map[0] + 1]
      }
    }
    const open = new state.Token("markdown_alert_open", "div", 1)
    open.block = true
    open.level = token.level
    open.map = token.map
    open.attrSet("class", "markdown-alert markdown-alert-question")
    open.meta = { title: "Question", type: "question" }
    const close = new state.Token("markdown_alert_close", "div", -1)
    close.block = true
    close.level = token.level
    return [open, ...body, close]
  })
})

md.core.ruler.push("markdown_alerts", (state) => {
  const tokens = state.tokens

  for (let i = 0; i < tokens.length - 2; i++) {
    if (tokens[i].type === "markdown_alert_open" && tokens[i].meta.type === "question") {
      const close = tokens.findIndex((token, j) => j > i && token.type === "markdown_alert_close" && token.level === tokens[i].level)
      markQuestionAnswers(state, i, close)
      continue
    }
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
      if (type === "question") markQuestionAnswers(state, i, j)
      break
    }
  }
})

// Question cards turn each lettered option into a choice and mark the
// recommended one, so the content script can make the options themselves the
// answer controls.
function markQuestionAnswers(state: StateCore, open: number, close: number) {
  const { tokens } = state
  const options = new Map<string, number>()
  let recommendation: { value: string; index: number } | null = null
  for (let k = open + 1; k < close; k++) {
    if (tokens[k].type === "inline" && tokens[k - 1].type === "td_open") {
      const first = tokens[k].children?.[0]
      if (first?.type === "text" && /^[✓△✕?](?:\s|$)/.test(first.content)) {
        const symbol = first.content[0]
        const rating = { "✓": "good", "△": "tradeoff", "✕": "poor", "?": "unknown" }[symbol]
        const marker = new state.Token("html_inline", "", 0)
        marker.content = `<span class="question-comparison-symbol" data-rating="${rating}">${symbol}</span>`
        first.content = first.content.slice(1)
        tokens[k].children!.unshift(marker)
      }
    }
    if (tokens[k].type !== "inline" || tokens[k - 1].type !== "paragraph_open") continue
    const recommended = QUESTION_RECOMMENDED.exec(tokens[k].content)
    if (recommended && !recommendation && tokens[k - 2].type !== "list_item_open") {
      recommendation = { value: recommended[1].toUpperCase(), index: k }
    }
    const option = QUESTION_OPTION.exec(tokens[k].content)
    if (!option || tokens[k - 2].type !== "list_item_open" || options.has(option[1])) continue
    const item = tokens[k - 2]
    item.attrSet("data-question-option", option[1])
    item.attrJoin("class", "question-option")
    item.attrSet("role", "radio")
    item.attrSet("aria-checked", "false")
    item.attrSet("tabindex", "0")
    for (let list = k - 3; list > open; list--) {
      if (tokens[list].type !== "bullet_list_open" || tokens[list].level !== item.level - 1) continue
      tokens[list].attrSet("class", "question-options")
      tokens[list].attrSet("role", "radiogroup")
      break
    }
    // Show the letter as a key without changing the option's text.
    const children = tokens[k].children!
    const strong = children.findIndex((child) => child.type !== "text" || child.content)
    const letter = children[strong + 1]
    if (children[strong]?.type === "strong_open" && letter?.type === "text" && letter.content.startsWith(`${option[1]}.`)) {
      const key = new state.Token("html_inline", "", 0)
      key.content = `<span class="question-option-key">${option[1]}<span class="question-option-key-dot">.</span></span>`
      letter.content = letter.content.slice(2)
      children.splice(strong + 1, 0, key)
    }
    options.set(option[1], k - 2)
  }
  if (recommendation && options.has(recommendation.value)) {
    tokens[open].attrSet("data-question-recommended", recommendation.value)
    tokens[options.get(recommendation.value)!].attrJoin("class", "question-option-recommended")
    tokens[recommendation.index - 1].attrJoin("class", "question-recommendation")
  }
  splitOptionLists(state, open, close)
}

// A context list separated from the options only by a blank line merges into
// the options list, so give each run of plain items and options its own list.
function splitOptionLists(state: StateCore, open: number, close: number) {
  const { tokens } = state
  const lines = state.src.split("\n")
  const blank = (line: number) => /^[\s>]*$/.test(lines[line] ?? "")
  for (let list = open + 1; list < close; list++) {
    if (tokens[list].type !== "bullet_list_open" || tokens[list].attrGet("class") !== "question-options") continue
    const level = tokens[list].level
    const items: { start: number; end: number; option: boolean }[] = []
    let end = list + 1
    for (; tokens[end].type !== "bullet_list_close" || tokens[end].level !== level; end++) {
      if (tokens[end].type === "list_item_open" && tokens[end].level === level + 1) {
        items.push({ start: end, end, option: tokens[end].attrGet("data-question-option") !== null })
      }
      if (tokens[end].type === "list_item_close" && tokens[end].level === level + 1) items.at(-1)!.end = end
    }
    if (items.every((item) => item.option)) continue

    const runs: (typeof items)[] = []
    for (const item of items) {
      if (runs.at(-1)?.[0].option === item.option) runs.at(-1)!.push(item)
      else runs.push([item])
    }
    const loose = !tokens[items[0].start + 1].hidden
    const replacement = runs.flatMap((run) => {
      const body = tokens.slice(run[0].start, run.at(-1)!.end + 1)
      const first = body[0].map![0]
      // Item and list maps include trailing blank lines, so measure their content.
      const last = Math.max(...body.filter((token) => !/list/.test(token.type)).map((token) => token.map?.[1] ?? first))
      if (loose && !lines.slice(first, last).some((_, line) => blank(first + line))) {
        for (const token of body) {
          if (token.level === level + 2 && token.type.startsWith("paragraph_")) token.hidden = true
        }
      }
      const listOpen = new state.Token("bullet_list_open", "ul", 1)
      const listClose = new state.Token("bullet_list_close", "ul", -1)
      for (const token of [listOpen, listClose]) {
        token.block = true
        token.level = level
        token.markup = tokens[list].markup
      }
      listOpen.map = [first, last]
      if (run[0].option) {
        listOpen.attrSet("class", "question-options")
        listOpen.attrSet("role", "radiogroup")
      }
      return [listOpen, ...body, listClose]
    })
    tokens.splice(list, end - list + 1, ...replacement)
    close += replacement.length - (end - list + 1)
    list += replacement.length - 1
  }
}

export function hasQuestionCard(markdown: string) {
  return md.parse(markdown, {}).some((token) => token.type === "markdown_alert_open" && token.meta.type === "question")
}

export interface QuestionCard {
  element: HTMLElement
  target: HTMLElement
  mount: HTMLElement
  composeMount: HTMLElement
  /** Just after the card, outside it: the round's send and waiting status. */
  footerMount: HTMLElement
  options: { value: string; element: HTMLElement }[]
  recommended: string | null
}

/** Adds an answer-controls mount to a rendered question card. Answers anchor to its heading. */
export function mountQuestionCard(card: HTMLElement): QuestionCard | null {
  const target = card.querySelector<HTMLElement>("h1,h2,h3,h4,h5,h6") ??
    card.querySelector<HTMLElement>(":scope > p:not(.markdown-alert-title)")
  if (!target) return null
  target.dataset.questionTarget = ""
  const options = Array.from(card.querySelectorAll<HTMLElement>("li[data-question-option]"), (element) => ({
    value: element.dataset.questionOption!,
    element,
  }))
  // A comparison column headed "B. …" belongs to option B, so choosing B can highlight it.
  for (const table of card.querySelectorAll("table")) {
    if (!table.parentElement?.classList.contains("question-comparison")) {
      const panel = card.ownerDocument.createElement("div")
      panel.className = "question-comparison"
      table.replaceWith(panel)
      panel.append(table)
    }
    const columns = Array.from(table.rows[0]?.cells ?? [], (cell) => /^([A-Z])\./.exec(cell.textContent?.trim() ?? "")?.[1])
    for (const row of table.rows) {
      Array.from(row.cells).forEach((cell, index) => {
        if (columns[index]) cell.dataset.questionColumn = columns[index]
      })
    }
    // Show the header's letter as a key like the options', keeping "B." in the text.
    for (const cell of table.rows[0]?.cells ?? []) {
      const text = cell.firstChild
      const letter = text?.nodeType === Node.TEXT_NODE ? /^\s*([A-Z])\.\s*/.exec(text.textContent ?? "") : null
      if (!text || !letter || !cell.dataset.questionColumn) continue
      const key = card.ownerDocument.createElement("span")
      key.className = "question-column-key"
      key.innerHTML = `${letter[1]}<span class="question-option-key-dot">.</span>`
      text.textContent = " " + (text.textContent ?? "").slice(letter[0].length)
      cell.prepend(key)
    }
  }
  const footerMount = card.ownerDocument.createElement("div")
  footerMount.className = "question-card-actions question-card-footer"
  card.after(footerMount)
  const mount = card.ownerDocument.createElement("div")
  mount.className = "question-card-actions question-card-shortcuts"
  card.append(mount)
  const composeMount = card.ownerDocument.createElement("div")
  composeMount.className = "question-card-actions question-card-compose"
  const list = options[0]?.element.closest("ul")
  if (list) list.after(composeMount)
  else mount.before(composeMount)
  return { element: card, target, mount, composeMount, footerMount, options, recommended: card.dataset.questionRecommended ?? null }
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
