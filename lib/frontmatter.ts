import { isScalar, isSeq, parseDocument } from "yaml"

type FrontmatterValue = string | string[]

export interface ParsedFrontmatter {
  data: Record<string, FrontmatterValue>
  body: string
}

export function parseFrontmatter(content: string): ParsedFrontmatter {
  if (!content.startsWith("---")) return { data: {}, body: content }

  const closeIdx = content.indexOf("\n---", 3)
  if (closeIdx === -1) return { data: {}, body: content }

  const block = content.slice(3, closeIdx).trim()
  const body = content.slice(closeIdx + 4).replace(/^\n/, "")

  const data: Record<string, FrontmatterValue> = {}
  let currentKey: string | null = null
  let currentLines: string[] = []
  let scalarType: ">" | "|" | null = null // > = folded (spaces), | = literal (newlines)

  const flush = () => {
    if (!currentKey) return
    const joined =
      scalarType === ">"
        ? currentLines.join(" ").trim()
        : scalarType === "|"
          ? currentLines.join("\n").trim()
          : currentLines.join("\n").trim()
    data[currentKey] = joined
    if (!scalarType && /^(\[|-(?:\s|$))/.test(joined)) {
      const parsed = parseDocument(joined, { schema: "failsafe" })
      if (!parsed.errors.length && isSeq(parsed.contents)) {
        const items = parsed.contents.items.flatMap((item) => isScalar(item) ? [String(item.value ?? "")] : [])
        if (items.length === parsed.contents.items.length) data[currentKey] = items
      }
    }
  }

  for (const line of block.split("\n")) {
    const kv = line.match(/^([\w][\w\s-]*?)\s*:\s*(.*)$/)
    if (kv) {
      flush()
      currentKey = kv[1].trim()
      const val = kv[2].trim()
      scalarType = val === ">" ? ">" : val === "|" ? "|" : null
      currentLines = scalarType ? [] : [val]
    } else if (currentKey && (line.startsWith("  ") || line.startsWith("\t") || (!scalarType && /^-\s/.test(line)))) {
      currentLines.push(line.trim())
    }
  }
  flush()

  return { data, body }
}

export function renderFrontmatterHTML(data: Record<string, FrontmatterValue>): string {
  if (!Object.keys(data).length) return ""
  const rows = Object.entries(data)
    .map(([k, v]) => {
      const renderText = (value: string) => escHtml(value).replace(/\n/g, "<br>")
      const valHTML = Array.isArray(v)
        ? v.length ? `<ul class="fm-list">${v.map((item) => `<li>${renderText(item)}</li>`).join("")}</ul>` : ""
        : renderText(v)
      return `<tr><td class="fm-key">${escHtml(k)}</td><td class="fm-val">${valHTML}</td></tr>`
    })
    .join("")
  return `<table class="fm-table not-prose" data-source-line="1"><thead><tr><th colspan="2" class="fm-header">Frontmatter</th></tr></thead><tbody>${rows}</tbody></table>`
}

function escHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}
