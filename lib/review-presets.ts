export const REVIEW_PRESET_GROUPS = [
  "concision",
  "clarity",
  "voice",
  "rigor",
  "structure",
  "approval",
] as const

export type ReviewPresetGroup = typeof REVIEW_PRESET_GROUPS[number]

export interface ReviewPreset {
  id: string
  group: ReviewPresetGroup
  chip: string
  name: string
  instruction: string
  aliases: readonly string[]
  quick: boolean
}

export const REVIEW_PRESETS = [
  {
    id: "tighten",
    group: "concision",
    chip: "Tighten",
    name: "Tighten wording",
    instruction: "Express the same meaning in fewer words. Do not add new information.",
    aliases: ["shorten", "wordy", "verbose"],
    quick: true,
  },
  {
    id: "dedupe",
    group: "concision",
    chip: "Consolidate",
    name: "Remove redundancy",
    instruction: "Keep the strongest occurrence of this point and remove the repetition.",
    aliases: ["duplicate", "repetitive", "redundant"],
    quick: false,
  },
  {
    id: "condense",
    group: "concision",
    chip: "Condense",
    name: "Condense explanation",
    instruction: "Reduce this to the essential point for the intended audience.",
    aliases: ["too long", "over-explained", "essential"],
    quick: false,
  },
  {
    id: "specify",
    group: "clarity",
    chip: "Specify",
    name: "Less vague, more specific",
    instruction: "Replace vague or generic language with concrete, context-specific information. Do not invent missing details.",
    aliases: ["vague", "generic", "concrete"],
    quick: true,
  },
  {
    id: "clarify",
    group: "clarity",
    chip: "Clarify",
    name: "Make it easier to understand",
    instruction: "Rewrite this in clear, easy-to-understand language. Simplify unfamiliar wording and sentence structure without losing meaning or adding new information.",
    aliases: ["unclear", "cryptic", "confusing"],
    quick: true,
  },
  {
    id: "explain",
    group: "clarity",
    chip: "Explain",
    name: "Explain for the audience",
    instruction: "Add only the context or reasoning the intended audience needs to understand this.",
    aliases: ["context", "reasoning", "understand"],
    quick: false,
  },
  {
    id: "example",
    group: "clarity",
    chip: "Example",
    name: "Add a concrete example",
    instruction: "Add one concrete example that helps the intended audience understand this point.",
    aliases: ["illustrate", "instance", "abstract"],
    quick: false,
  },
  {
    id: "humanize",
    group: "voice",
    chip: "Humanize",
    name: "Make writing less AI",
    instruction: "Rewrite this in a natural, distinctive voice. Remove common AI-writing patterns: contrived contrasts (“It’s not X. It’s Y.”), forced punchiness, unnecessary bullet lists, and overused em dashes. Preserve the meaning and intended tone.",
    aliases: ["ai", "formulaic", "robotic", "unnatural"],
    quick: true,
  },
  {
    id: "dehype",
    group: "voice",
    chip: "Dehype",
    name: "Remove hype and jargon",
    instruction: "Rewrite this in plain, credible language. Remove marketing hype, unsupported promises, buzzwords, clichés, unnecessary jargon, hashtags and decorative emoji. Preserve the meaning and any specific, supportable claims.",
    aliases: ["marketing", "overpromise", "cliche", "jargon", "hashtag", "emoji"],
    quick: false,
  },
  {
    id: "prune",
    group: "voice",
    chip: "Prune",
    name: "Remove stylistic excess",
    instruction: "Remove unnecessary flourishes and rhetorical decoration. Keep the useful content.",
    aliases: ["ornamental", "overwritten", "flourish", "rhetorical"],
    quick: false,
  },
  {
    id: "motivate",
    group: "voice",
    chip: "Motivate",
    name: "Strengthen the case",
    instruction: "Emphasize why this matters and the most relevant benefits using supported claims. Do not exaggerate or invent benefits.",
    aliases: ["compelling", "benefits", "persuade", "why it matters"],
    quick: false,
  },
  {
    id: "reframe",
    group: "voice",
    chip: "Reframe",
    name: "Reframe for the audience",
    instruction: "Reframe this around what matters most to the intended audience. Focus on outcomes rather than mechanics where appropriate.",
    aliases: ["business", "customer", "outcomes", "technical"],
    quick: false,
  },
  {
    id: "simplify",
    group: "rigor",
    chip: "Simplify",
    name: "Simplify the approach",
    instruction: "Replace this with the simplest approach that satisfies the requirements. Remove unnecessary complexity.",
    aliases: ["overengineered", "complex", "approach", "yagni"],
    quick: false,
  },
  {
    id: "verify",
    group: "rigor",
    chip: "Verify",
    name: "Verify and support this",
    instruction: "Check this against an authoritative source. Correct or qualify it if necessary, and add supporting evidence when appropriate for the document.",
    aliases: ["unsupported", "source", "evidence", "wrong", "assumption"],
    quick: true,
  },
  {
    id: "qualify",
    group: "rigor",
    chip: "Qualify",
    name: "Match the evidence",
    instruction: "Narrow or soften this claim so its strength and scope match the available evidence.",
    aliases: ["overstated", "claim", "uncertainty", "scope"],
    quick: false,
  },
  {
    id: "refresh",
    group: "rigor",
    chip: "Refresh",
    name: "Bring this up to date",
    instruction: "Update this using the current authoritative state. Preserve historical context that is still relevant.",
    aliases: ["outdated", "stale", "current", "old"],
    quick: false,
  },
  {
    id: "lead",
    group: "structure",
    chip: "Lead",
    name: "Lead with the main point",
    instruction: "Lead with the main point and put supporting explanation after it.",
    aliases: ["bury the lede", "introduction", "main point", "late"],
    quick: false,
  },
  {
    id: "split",
    group: "structure",
    chip: "Split",
    name: "Split into focused parts",
    instruction: "Split this so each part has one clear purpose.",
    aliases: ["two jobs", "separate", "section", "focus"],
    quick: false,
  },
  {
    id: "agree",
    group: "approval",
    chip: "Agree",
    name: "Approve as written",
    instruction: "Agreed — this works well as written.",
    aliases: ["approve", "lgtm", "no changes", "good"],
    quick: false,
  },
] as const satisfies readonly ReviewPreset[]

export const QUICK_COMMENT_PRESETS = [
  "clarify",
  "specify",
  "example",
  "condense",
  "humanize",
  "dehype",
  "simplify",
  "verify",
  "agree",
].map((id) => REVIEW_PRESETS.find((preset) => preset.id === id)!)

function normalizeSearch(value: string) {
  return value.toLocaleLowerCase().replace(/\s+/g, " ").trim()
}

export function searchReviewPresets(query: string) {
  const normalized = normalizeSearch(query)
  if (!normalized) return [...REVIEW_PRESETS]
  return REVIEW_PRESETS.filter((preset) => normalizeSearch([
    preset.chip,
    preset.name,
    preset.instruction,
    ...preset.aliases,
  ].join(" ")).includes(normalized))
}

export interface ReviewTextSelection {
  start: number
  end: number
}

export function insertReviewPreset(
  value: string,
  instruction: string,
  selection: ReviewTextSelection,
): { value: string; selection: ReviewTextSelection } {
  const start = Math.max(0, Math.min(selection.start, value.length))
  const end = Math.max(start, Math.min(selection.end, value.length))
  const before = value.slice(0, start)
  const after = value.slice(end)
  const replacing = start !== end
  const prefix = !replacing && before && !/\s$/u.test(before) ? "\n\n" : ""
  const suffix = !replacing && after && !/^\s/u.test(after) ? "\n\n" : ""
  const caret = before.length + prefix.length + instruction.length
  return {
    value: `${before}${prefix}${instruction}${suffix}${after}`,
    selection: { start: caret, end: caret },
  }
}
