import { classifyMarksideFileUrl } from "./file-types"
import { parseFrontmatter } from "./frontmatter"

export function canExportPdf(fileUrl: string): boolean {
  return classifyMarksideFileUrl(fileUrl) === "markdown"
}

export function resolvePdfExportTitle(content: string, fileName: string): string {
  const { data, body } = parseFrontmatter(content)
  const heading = findFirstH1(body)

  return heading || (typeof data.title === "string" && data.title) || humanizeFileName(fileName)
}

export function hasDocumentH1(content: string): boolean {
  return findFirstH1(parseFrontmatter(content).body) !== null
}

function findFirstH1(markdown: string): string | null {
  const lines = markdown.split("\n")
  let fence: "`" | "~" | null = null

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]
    const fenceMatch = line.match(/^ {0,3}(`{3,}|~{3,})/)
    if (fenceMatch) {
      const marker = fenceMatch[1][0] as "`" | "~"
      fence = fence === marker ? null : fence ?? marker
      continue
    }
    if (fence) continue

    const atx = line.match(/^ {0,3}#(?!#)[ \t]+(.+?)(?:[ \t]+#+)?[ \t]*$/)
    if (atx) return atx[1].trim()

    if (
      line.trim() &&
      /^ {0,3}=+[ \t]*$/.test(lines[index + 1] ?? "")
    ) return line.trim()
  }

  return null
}

function humanizeFileName(fileName: string): string {
  return fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase())
}
