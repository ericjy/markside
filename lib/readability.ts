import { parseFrontmatter } from "./frontmatter"
import { md } from "./markdown"
import { hashReviewSource } from "./review"

// [key, label, what it judges, what lowers the score]. Keep these in step with the Jev rubric.
export const READABILITY_DIMENSIONS = [
  ["directness", "Directness", "Whether the main point comes first.", "Background, caveats, setup, or slogan-style openings before the first concrete fact or instruction."],
  ["conciseness", "Conciseness", "Whether every part earns its place.", "Restated ideas, over-explained concepts, unnecessary qualifiers, details or disclaimers the reader doesn't need, or commentary about the document itself."],
  ["simplicity", "Simplicity", "Whether the wording is easy to process.", "Unexplained jargon, heavy abstraction, stacked concepts, or long nested sentences. Necessary technical terms are fine."],
  ["naturalness", "Naturalness", "Whether it reads as plain, unforced prose.", "Odd or idiosyncratic phrases, dramatic fragments, \"not X\" framing, such as \"It's not X, it's Y\" or \"This is not X\", or dashes used repeatedly as pauses or asides."],
  ["coherence", "Coherence", "Whether ideas connect in a logical order.", "Contradictions, jumps between unrelated points, missing reasoning steps, or a \"so\" or \"because\" that links nothing."],
  ["scannability", "Scannability", "Whether key points are easy to find without reading every line.", "Points buried in long paragraphs with no headings, lists, or emphasis to separate them."],
  ["formatFit", "Format Fit", "Whether prose, lists, tables, code, and diagrams suit the information.", "Steps or comparisons written as prose that would read better as a list, table, or diagram."],
] as const

export type ReadabilityDimension = typeof READABILITY_DIMENSIONS[number][0]
// Results saved before a dimension existed lack its score, so callers must tolerate gaps.
export type ReadabilityScores = Record<ReadabilityDimension, number>

// Jev scores 0-4 against five described levels. A band is the stretch between two
// neighbouring levels, so 0-1 is Poor, 1-2 Weak, 2-3 Good, and 3-4 Great.
export const READABILITY_MAX_SCORE = 4
export const READABILITY_BANDS = ["Poor", "Weak", "Good", "Great"] as const

// Scores from this value up are near the top described level and get no improvement check.
const READABILITY_STRONG_SCORE = 3.5

export function readabilityBand(score: number) {
  return Math.min(READABILITY_BANDS.length - 1, Math.max(0, Math.floor(score)))
}

export function readabilityBandLabel(score: number) {
  return READABILITY_BANDS[readabilityBand(score)]
}

export function formatReadabilityScore(score: number) {
  return score.toFixed(1)
}

export function scoredReadabilityDimensions(scores: Partial<Record<ReadabilityDimension, number>>) {
  return READABILITY_DIMENSIONS.filter(([key]) => typeof scores[key] === "number")
}

const READABILITY_CHECKS: Record<ReadabilityDimension, string> = {
  directness: "check whether background, caveats, setup, or slogan-style openings come before the first concrete fact or instruction.",
  conciseness: "check for restated ideas, over-explained concepts, unnecessary qualifiers, details or disclaimers the reader doesn't need, or commentary about the document itself, without cutting needed detail.",
  simplicity: "check for excessive abstraction, unexplained jargon, stacked concepts, or overly long or nested sentences. Split long sentences into shorter complete ones. Keep necessary technical terms.",
  naturalness: "check for idiosyncratic phrases, odd turns of phrase, dramatic fragments, \"not X\" framing (staged contrasts and disclaimers), or dashes used as pauses or asides, and state the point directly. Replace most such dashes with periods or commas.",
  coherence: "check whether ideas jump around, reasoning steps are left implicit, statements contradict each other, or a \"so\" or \"because\" links points that don't follow.",
  scannability: "check whether different points are buried and mixed instead of standing out and separated, for example through headings and structure.",
  formatFit: "consider whether this should be a list, table, code block, or diagram instead of prose.",
}

export interface ReadabilitySection {
  level: 1 | 2 | 3
  path: string[]
  samePathCount: number
  sourceLine: number
  source: string
  sourceHash: string
  documentHash: string
}

// Dimensions whose problems can be tied to a place in the section: a sentence for
// Conciseness, Simplicity, Naturalness, and Coherence, a whole paragraph for Directness,
// Scannability, and Format Fit.
export const LOCATABLE_READABILITY_DIMENSIONS = ["directness", "conciseness", "simplicity", "naturalness", "coherence", "scannability", "formatFit"] as const satisfies readonly ReadabilityDimension[]

export type ReadabilityFormat = "list" | "table" | "diagram"

export interface ReadabilityFinding {
  // The sentence, or for a paragraph finding the whole paragraph.
  sentence: string
  unit?: "sentence" | "block"
  // For a paragraph that would read better as another format.
  suggested?: ReadabilityFormat
  dimension: ReadabilityDimension
  violation: string
  why: string
  probability: number
}

export interface ReadabilityResult extends Omit<ReadabilitySection, "source"> {
  id: string
  scores: ReadabilityScores
  // Set once "Find problem sentences" has run; an empty list means nothing stood out.
  findings?: ReadabilityFinding[]
  createdAt: string
  commentId?: string
}

export type ResolvedReadabilityResult = {
  result: ReadabilityResult
  section: ReadabilitySection
  status: "current" | "outdated"
}

function headingText(children: { type: string; content: string }[] | null) {
  return children
    ?.filter((token) => token.type === "text" || token.type === "code_inline")
    .map((token) => token.content)
    .join("")
    .trim() ?? ""
}

export function extractReadabilitySections(markdown: string): ReadabilitySection[] {
  const { body } = parseFrontmatter(markdown)
  const prefix = markdown.slice(0, markdown.length - body.length)
  const lineOffset = prefix.split("\n").length - 1
  const lineStarts = [0]
  for (let index = 0; index < body.length; index += 1) {
    if (body[index] === "\n") lineStarts.push(index + 1)
  }
  const headings: Array<{ level: number; path: string[]; bodyLine: number }> = []
  const stack: Array<{ level: number; text: string }> = []
  const tokens = md.parse(body, {})
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]
    if (token.type !== "heading_open" || !token.map) continue
    const level = Number(token.tag.slice(1))
    while (stack.length && stack[stack.length - 1].level >= level) stack.pop()
    const text = headingText(tokens[index + 1]?.children ?? null)
    if (!text) continue
    stack.push({ level, text })
    headings.push({ level, path: stack.map((item) => item.text), bodyLine: token.map[0] })
  }

  const documentHash = hashReviewSource(markdown)
  const pathCounts = new Map<string, number>()
  for (const heading of headings) {
    const key = JSON.stringify(heading.path)
    pathCounts.set(key, (pathCounts.get(key) ?? 0) + 1)
  }
  return headings.flatMap((heading, index) => {
    if (heading.level < 1 || heading.level > 3) return []
    const next = headings.slice(index + 1).find((item) => item.level <= heading.level)
    const start = lineStarts[heading.bodyLine] ?? body.length
    const end = next ? lineStarts[next.bodyLine] ?? body.length : body.length
    const source = body.slice(start, end)
    return [{
      level: heading.level as ReadabilitySection["level"],
      path: heading.path,
      samePathCount: pathCounts.get(JSON.stringify(heading.path)) ?? 1,
      sourceLine: heading.bodyLine + lineOffset + 1,
      source,
      sourceHash: hashReviewSource(source),
      documentHash,
    }]
  })
}

function samePath(left: readonly string[], right: readonly string[]) {
  return left.length === right.length && left.every((part, index) => part === right[index])
}

export function resolveReadabilityResult(
  result: ReadabilityResult,
  sections: readonly ReadabilitySection[],
): ResolvedReadabilityResult | null {
  const atSavedLine = sections.find((section) =>
    section.documentHash === result.documentHash &&
    section.sourceLine === result.sourceLine &&
    section.level === result.level &&
    samePath(section.path, result.path)
  )
  const candidates = sections.filter((section) =>
    section.level === result.level && samePath(section.path, result.path)
  )
  const section = atSavedLine ?? (
    result.samePathCount === 1 && candidates.length === 1 ? candidates[0] : null
  )
  if (!section) return null
  return {
    result,
    section,
    status: section.sourceHash === result.sourceHash ? "current" : "outdated",
  }
}

export function locatableLowDimensions(scores: ReadabilityScores) {
  return LOCATABLE_READABILITY_DIMENSIONS.filter((key) => typeof scores[key] === "number" && readabilityBand(scores[key]) <= 1)
}

// One entry per sentence, in the order the sentences were first reported.
export function groupReadabilityFindings(findings: readonly ReadabilityFinding[]) {
  const groups = new Map<string, { sentence: string; items: ReadabilityFinding[] }>()
  for (const finding of findings) {
    const group = groups.get(finding.sentence) ?? { sentence: finding.sentence, items: [] }
    group.items.push(finding)
    groups.set(finding.sentence, group)
  }
  return [...groups.values()]
}

export function countWeakReadabilityScores(scores: ReadabilityScores) {
  return scoredReadabilityDimensions(scores).filter(([key]) => readabilityBand(scores[key]) <= 1).length
}

export function formatReadabilityComment(result: ReadabilityResult) {
  const scoreLines = scoredReadabilityDimensions(result.scores).map(([key, label]) => `- ${label}: ${formatReadabilityScore(result.scores[key])}/${READABILITY_MAX_SCORE}`)
  const checks = scoredReadabilityDimensions(result.scores)
    .filter(([key]) => result.scores[key] < READABILITY_STRONG_SCORE)
    .sort(([keyA], [keyB]) => result.scores[keyA] - result.scores[keyB])
    .map(([key, label]) => `To improve ${label.toLowerCase()}, ${READABILITY_CHECKS[key]}`)

  const describe = (findings: readonly ReadabilityFinding[], header: string, limit: number) => findings.length
    ? [header, ...groupReadabilityFindings(findings).map(({ sentence, items }) => {
      const quote = sentence.length > limit ? `${sentence.slice(0, limit - 3)}...` : sentence
      const labels = [...new Set(items.map((item) => READABILITY_DIMENSIONS.find(([key]) => key === item.dimension)?.[1] ?? item.dimension))]
      return `- "${quote}" (${labels.join(", ")}) ${items.map((item) => item.why).join(" ")}`
    })].join("\n")
    : null
  const located = result.findings ?? []
  const findings = [
    describe(located.filter((finding) => finding.unit !== "block"), "Sentences to fix:", 300),
    describe(located.filter((finding) => finding.unit === "block"), "Paragraphs to restructure:", 200),
  ].filter((paragraph): paragraph is string => paragraph !== null)

  const paragraphs = [
    "Improve the readability and clarity of the selected section for a general reader, allowing terms common in its industry or company. Preserve its meaning and any needed technical detail. Don't change other sections.",
    ["Current Readability scores:", ...scoreLines].join("\n"),
    ...checks,
    ...findings,
  ]
  return paragraphs.join("\n\n")
}
