import { describe, expect, it } from "vitest"

import {
  COMPOSER_QUICK_PRESETS,
  QUESTION_QUICK_PRESETS,
  QUICK_COMMENT_PRESETS,
  REVIEW_PRESET_GROUPS,
  REVIEW_PRESETS,
  insertReviewPreset,
  searchReviewPresets,
} from "./review-presets"

describe("Review Comment presets", () => {
  it("exposes the approved catalog and quick actions in order", () => {
    expect(REVIEW_PRESET_GROUPS).toEqual([
      "concision",
      "clarity",
      "voice",
      "rigor",
      "structure",
      "approval",
    ])
    expect(REVIEW_PRESETS.map(({ id, group, chip, name }) => ({ id, group, chip, name }))).toEqual([
      { id: "tighten", group: "concision", chip: "Tighten", name: "Tighten wording" },
      { id: "dedupe", group: "concision", chip: "Consolidate", name: "Remove redundancy" },
      { id: "condense", group: "concision", chip: "Condense", name: "Condense explanation" },
      { id: "specify", group: "clarity", chip: "Specify", name: "Less vague, more specific" },
      { id: "clarify", group: "clarity", chip: "Clarify", name: "Make it easier to understand" },
      { id: "explain", group: "clarity", chip: "Explain", name: "Explain for the audience" },
      { id: "example", group: "clarity", chip: "Example", name: "Add a concrete example" },
      { id: "humanize", group: "voice", chip: "Humanize", name: "Make writing less AI" },
      { id: "dehype", group: "voice", chip: "Dehype", name: "Remove hype and jargon" },
      { id: "prune", group: "voice", chip: "Prune", name: "Remove stylistic excess" },
      { id: "motivate", group: "voice", chip: "Motivate", name: "Strengthen the case" },
      { id: "reframe", group: "voice", chip: "Reframe", name: "Reframe for the audience" },
      { id: "simplify", group: "rigor", chip: "Simplify", name: "Simplify the approach" },
      { id: "verify", group: "rigor", chip: "Verify", name: "Verify and support this" },
      { id: "qualify", group: "rigor", chip: "Qualify", name: "Match the evidence" },
      { id: "refresh", group: "rigor", chip: "Refresh", name: "Bring this up to date" },
      { id: "lead", group: "structure", chip: "Lead", name: "Lead with the main point" },
      { id: "split", group: "structure", chip: "Split", name: "Split into focused parts" },
      { id: "agree", group: "approval", chip: "Agree", name: "Approve as written" },
    ])
    expect(QUICK_COMMENT_PRESETS.map(({ id }) => id)).toEqual([
      "clarify",
      "specify",
      "example",
      "condense",
      "humanize",
      "dehype",
      "simplify",
      "verify",
      "agree",
    ])
    expect(COMPOSER_QUICK_PRESETS.map(({ id }) => id)).toEqual([
      "agree",
      "tighten",
      "specify",
      "clarify",
      "humanize",
      "verify",
    ])
    expect(QUESTION_QUICK_PRESETS.map(({ id, chip }) => ({ id, chip }))).toEqual([
      { id: "clarify", chip: "Clarify" },
      { id: "example", chip: "Example" },
      { id: "skip", chip: "Skip" },
      { id: "delegate", chip: "Delegate" },
      { id: "stop", chip: "Stop" },
    ])
    expect(searchReviewPresets("skip")).toEqual([])
    expect(QUESTION_QUICK_PRESETS[0].instruction).toContain("diagram")
    expect(REVIEW_PRESETS.find(({ id }) => id === "clarify")?.instruction).not.toContain("diagram")
    expect(REVIEW_PRESETS.find(({ id }) => id === "humanize")?.instruction).toBe(
      "Rewrite this in a natural, distinctive voice. Remove common AI-writing patterns: contrived contrasts (“It’s not X. It’s Y.”), forced punchiness, unnecessary bullet lists, and overused em dashes. Preserve the meaning and intended tone.",
    )
    expect(REVIEW_PRESETS.find(({ id }) => id === "clarify")?.instruction).toBe(
      "Rewrite this in clear, easy-to-understand language. Simplify unfamiliar wording and sentence structure without losing meaning or adding new information.",
    )
    expect(REVIEW_PRESETS.find(({ id }) => id === "dehype")?.instruction).toBe(
      "Rewrite this in plain, credible language. Remove marketing hype, unsupported promises, buzzwords, clichés, unnecessary jargon, hashtags and decorative emoji. Preserve the meaning and any specific, supportable claims.",
    )
  })

  it("finds presets by visible text, instructions, and symptom aliases", () => {
    expect(searchReviewPresets("main point").map(({ id }) => id)).toContain("lead")
    expect(searchReviewPresets("authoritative source").map(({ id }) => id)).toContain("verify")
    expect(searchReviewPresets("outdated").map(({ id }) => id)).toEqual(["refresh"])
    expect(searchReviewPresets("robotic").map(({ id }) => id)).toEqual(["humanize"])
    expect(searchReviewPresets("unsupported").map(({ id }) => id)).toEqual(["dehype", "verify"])
    expect(searchReviewPresets("marketing").map(({ id }) => id)).toEqual(["dehype"])
    expect(searchReviewPresets("no matching preset")).toEqual([])
  })
})

describe("insertReviewPreset", () => {
  const instruction = "Express the same meaning in fewer words. Do not add new information."

  it("inserts, replaces, and separates text using editor semantics", () => {
    expect(insertReviewPreset("", instruction, { start: 0, end: 0 })).toEqual({
      value: instruction,
      selection: { start: instruction.length, end: instruction.length },
    })
    expect(insertReviewPreset("nit: ", instruction, { start: 5, end: 5 }).value).toBe(
      `nit: ${instruction}`,
    )
    expect(insertReviewPreset("Please make this clearer now.", instruction, {
      start: 7,
      end: 24,
    }).value).toBe(`Please ${instruction} now.`)
    expect(insertReviewPreset("BeforeAfter", instruction, { start: 6, end: 6 }).value).toBe(
      `Before\n\n${instruction}\n\nAfter`,
    )
    expect(insertReviewPreset("Short", instruction, { start: 99, end: 120 }).value).toBe(
      `Short\n\n${instruction}`,
    )
  })
})
