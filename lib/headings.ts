import { md } from "./markdown"

export interface Heading {
  id: string
  text: string
  level: number
}

export function resolveActiveOutlineHeading(
  headings: Array<{ id: string; top: number }>,
  threshold: number,
): string | null {
  if (headings.length === 0) return null
  let activeId = headings[0].id
  for (const heading of headings) {
    if (heading.top > threshold) break
    activeId = heading.id
  }
  return activeId
}

export function extractHeadings(markdownContent: string): Heading[] {
  if (!markdownContent) return []
  const tokens = md.parse(markdownContent, {})
  const headings: Heading[] = []

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    if (token.type === "heading_open") {
      const level = parseInt(token.tag.slice(1), 10)
      const id = token.attrGet("id") ?? ""
      const inlineToken = tokens[i + 1]
      const text =
        inlineToken?.children
          ?.filter((t) => t.type === "text" || t.type === "code_inline")
          .map((t) => t.content)
          .join("")
          .trim() ?? ""
      if (text) headings.push({ id, text, level })
    }
  }

  return headings
}

export interface OutlineGroup {
  id: string
  title: string
  level: 1 | 2
  items: { id: string; title: string; level: number }[]
  subgroups: OutlineGroup[]  // H2 groups nested under an H1
}

export function groupHeadings(headings: Heading[]): OutlineGroup[] {
  if (!headings.length) return []

  const sections: OutlineGroup[] = []
  let currentH1: OutlineGroup | null = null
  let currentH2: OutlineGroup | null = null

  for (const h of headings) {
    if (h.level === 1) {
      currentH1 = { id: h.id, title: h.text, level: 1, items: [], subgroups: [] }
      currentH2 = null
      sections.push(currentH1)
    } else if (h.level === 2) {
      currentH2 = { id: h.id, title: h.text, level: 2, items: [], subgroups: [] }
      if (currentH1) {
        currentH1.subgroups.push(currentH2)
      } else {
        sections.push(currentH2)
      }
    } else {
      const item = { id: h.id, title: h.text, level: h.level }
      if (currentH2) {
        currentH2.items.push(item)
      } else if (currentH1) {
        currentH1.items.push(item)
      } else {
        // orphan H3/H4 before any H1/H2
        let orphan = sections[0]
        if (!orphan || orphan.id !== "" || orphan.title !== "") {
          orphan = { id: "", title: "", level: 2, items: [], subgroups: [] }
          sections.unshift(orphan)
        }
        orphan.items.push(item)
      }
    }
  }

  return sections
}
