import { describe, expect, it } from "vitest"

import { countWeakReadabilityScores, extractReadabilitySections, formatReadabilityComment, resolveReadabilityResult, formatReadabilityScore, locatableLowDimensions, readabilityBandLabel, type ReadabilityScores } from "./readability"

describe("Readability Check sections", () => {
  it("checks one heading and its child Markdown without absorbing its sibling", () => {
    const source = `---
title: Example
---
# Plan
Intro.
## Approach
Keep this list:
- First
- Second
### Details
\`\`\`md
## Not a heading
\`\`\`
More detail.
## Costs
Later.
`
    const sections = extractReadabilitySections(source)
    expect(sections.find((section) => section.path.join(" > ") === "Plan > Approach")?.source).toBe(`## Approach
Keep this list:
- First
- Second
### Details
\`\`\`md
## Not a heading
\`\`\`
More detail.
`)
    expect(sections.find((section) => section.path.join(" > ") === "Plan")?.source).toContain("## Costs")
  })

  it("keeps a checked section current until its own source changes", () => {
    const before = extractReadabilitySections("# Plan\n## A\nClear.\n## B\nAlso clear.\n")
    const selected = before.find((section) => section.path.join(" > ") === "Plan > A")!
    const result = {
      id: "result-1",
      level: selected.level,
      path: selected.path,
      samePathCount: selected.samePathCount,
      sourceLine: selected.sourceLine,
      sourceHash: selected.sourceHash,
      documentHash: "old-document",
      scores: { directness: 3, conciseness: 1, simplicity: 2, naturalness: 3, coherence: 3, scannability: 1, formatFit: 2 },
      createdAt: "2026-09-22T00:00:00.000Z",
    }
    const afterSiblingEdit = extractReadabilitySections("# Plan\n## A\nClear.\n## B\nChanged.\n")
    expect(resolveReadabilityResult(result, afterSiblingEdit)?.status).toBe("current")
    const afterOwnEdit = extractReadabilitySections("# Plan\n## A\nRewritten.\n## B\nAlso clear.\n")
    expect(resolveReadabilityResult(result, afterOwnEdit)?.status).toBe("outdated")
    expect(countWeakReadabilityScores(result.scores)).toBe(2)
    expect(formatReadabilityComment(result)).toContain("Format Fit: 2.0/4")
  })

  it("formats the review comment with worst-first checks and skips perfect dimensions", () => {
    const result = {
      id: "result-3",
      level: 2 as const,
      path: ["Plan", "Approach"],
      samePathCount: 1,
      sourceLine: 3,
      sourceHash: "hash",
      documentHash: "doc",
      scores: { directness: 2, conciseness: 1, simplicity: 1, naturalness: 0, coherence: 2, scannability: 2, formatFit: 4 },
      createdAt: "2026-09-22T00:00:00.000Z",
    }
    expect(formatReadabilityComment(result)).toBe(`Improve the readability and clarity of the selected section for a general reader, allowing terms common in its industry or company. Preserve its meaning and any needed technical detail. Don't change other sections.

Current Readability scores:
- Directness: 2.0/4
- Conciseness: 1.0/4
- Simplicity: 1.0/4
- Naturalness: 0.0/4
- Coherence: 2.0/4
- Scannability: 2.0/4
- Format Fit: 4.0/4

To improve naturalness, check for idiosyncratic phrases, odd turns of phrase, dramatic fragments, "not X" framing (staged contrasts and disclaimers), or dashes used as pauses or asides, and state the point directly. Replace most such dashes with periods or commas.

To improve conciseness, check for restated ideas, over-explained concepts, unnecessary qualifiers, details or disclaimers the reader doesn't need, or commentary about the document itself, without cutting needed detail.

To improve simplicity, check for excessive abstraction, unexplained jargon, stacked concepts, or overly long or nested sentences. Split long sentences into shorter complete ones. Keep necessary technical terms.

To improve directness, check whether background, caveats, setup, or slogan-style openings come before the first concrete fact or instruction.

To improve coherence, check whether ideas jump around, reasoning steps are left implicit, statements contradict each other, or a "so" or "because" links points that don't follow.

To improve scannability, check whether different points are buried and mixed instead of standing out and separated, for example through headings and structure.`)
  })

  it("shows one-decimal scores, labels the band between two levels, and counts low bands", () => {
    const scores = { directness: 1.9, conciseness: 2.0, simplicity: 3.6, naturalness: 0.4, coherence: 2.0, scannability: 3.9, formatFit: 4 }
    expect(readabilityBandLabel(0.9)).toBe("Poor")
    expect(readabilityBandLabel(1.0)).toBe("Weak")
    expect(readabilityBandLabel(1.9)).toBe("Weak")
    expect(readabilityBandLabel(2.0)).toBe("Good")
    expect(readabilityBandLabel(3.0)).toBe("Great")
    expect(readabilityBandLabel(4)).toBe("Great")
    expect(formatReadabilityScore(2.4)).toBe("2.4")
    expect(formatReadabilityScore(3)).toBe("3.0")
    expect(countWeakReadabilityScores(scores)).toBe(2)
    const comment = formatReadabilityComment({
      id: "r", level: 2, path: ["Plan"], samePathCount: 1, sourceLine: 1, sourceHash: "h", documentHash: "d",
      scores, createdAt: "2026-09-22T00:00:00.000Z",
    })
    expect(comment).toContain("- Directness: 1.9/4")
    expect(comment).toContain("To improve naturalness")
    expect(comment).toContain("To improve coherence")
    expect(comment).not.toContain("To improve simplicity")
    expect(comment).not.toContain("To improve scannability")
  })

  it("tolerates results saved before Naturalness existed", () => {
    const legacy = {
      id: "legacy", level: 2 as const, path: ["Plan"], samePathCount: 1, sourceLine: 1,
      sourceHash: "hash", documentHash: "doc",
      scores: { directness: 1, conciseness: 2, simplicity: 2, coherence: 2, scannability: 2, formatFit: 2 } as ReadabilityScores,
      createdAt: "2026-09-22T00:00:00.000Z",
    }
    expect(countWeakReadabilityScores(legacy.scores)).toBe(1)
    const comment = formatReadabilityComment(legacy)
    expect(comment).not.toContain("Naturalness")
    expect(comment).not.toContain("undefined")
  })

  it("adds the located sentences to the review comment, grouped per sentence", () => {
    const result = {
      id: "r", level: 2 as const, path: ["Plan"], samePathCount: 1, sourceLine: 1, sourceHash: "h", documentHash: "d",
      scores: { directness: 3, conciseness: 3, simplicity: 3, naturalness: 1, coherence: 3, scannability: 3, formatFit: 3 },
      createdAt: "2026-09-22T00:00:00.000Z",
      findings: [
        { sentence: "It's not just about security, it's about trust.", dimension: "naturalness" as const, violation: "dramatic", why: "Dramatic fragment or staged emphasis.", probability: 0.88 },
        { sentence: "It's not just about security, it's about trust.", dimension: "naturalness" as const, violation: "argue", why: "Argues with no one: rebuts something nobody raised.", probability: 0.65 },
      ],
    }
    const comment = formatReadabilityComment(result)
    expect(comment).toContain('Sentences to fix:\n- "It\'s not just about security, it\'s about trust." (Naturalness) Dramatic fragment or staged emphasis. Argues with no one: rebuts something nobody raised.')
    expect(comment.match(/It's not just about security/g)).toHaveLength(1)
    expect(formatReadabilityComment({ ...result, findings: [] })).not.toContain("Sentences to fix")
    expect(locatableLowDimensions({ ...result.scores, scannability: 0, coherence: 1, formatFit: 0 })).toEqual(["naturalness", "coherence", "scannability", "formatFit"])
  })

  it("lists paragraph findings separately, as paragraphs to restructure", () => {
    const paragraph = "You should rotate a key whenever it shows up in a log, a commit, or a chat message, when a teammate leaves, or when it is old."
    const result = {
      id: "r", level: 2 as const, path: ["Plan"], samePathCount: 1, sourceLine: 1, sourceHash: "h", documentHash: "d",
      scores: { directness: 3, conciseness: 3, simplicity: 3, naturalness: 3, coherence: 3, scannability: 1, formatFit: 1 },
      createdAt: "2026-09-22T00:00:00.000Z",
      findings: [
        { sentence: "Argues with no one.", unit: "sentence" as const, dimension: "naturalness" as const, violation: "argue", why: "Rebuts a point no one raised.", probability: 0.8 },
        { sentence: paragraph, unit: "block" as const, dimension: "formatFit" as const, violation: "format-list", suggested: "list" as const, why: "Parallel points read better as a list.", probability: 0.95 },
        { sentence: paragraph, unit: "block" as const, dimension: "scannability" as const, violation: "wall", why: "Too many points in one paragraph.", probability: 0.9 },
      ],
    }
    const comment = formatReadabilityComment(result)
    expect(comment).toContain('Sentences to fix:\n- "Argues with no one." (Naturalness) Rebuts a point no one raised.')
    expect(comment).toContain(`Paragraphs to restructure:\n- "${paragraph}" (Format Fit, Scannability) Parallel points read better as a list. Too many points in one paragraph.`)
  })

  it("does not attach an ambiguous duplicate heading result to the wrong instance", () => {
    const original = extractReadabilitySections("# Plan\n## Detail\nFirst.\n## Detail\nSecond.\n")
    const selected = original[1]
    const result = {
      id: "result-2", level: selected.level, path: selected.path,
      samePathCount: selected.samePathCount,
      sourceLine: selected.sourceLine, sourceHash: selected.sourceHash,
      documentHash: selected.documentHash,
      scores: { directness: 2, conciseness: 2, simplicity: 2, naturalness: 2, coherence: 2, scannability: 2, formatFit: 2 },
      createdAt: "2026-09-22T00:00:00.000Z",
    }
    const changed = extractReadabilitySections("# Plan\n## Detail\nChanged first.\n## Detail\nChanged second.\n")
    expect(resolveReadabilityResult(result, changed)).toBeNull()
    const removedDuplicate = extractReadabilitySections("# Plan\n## Detail\nSecond.\n")
    expect(resolveReadabilityResult(result, removedDuplicate)).toBeNull()
    const identical = extractReadabilitySections("# Plan\n## Detail\nSame.\n## Detail\nSame.\n")
    const first = identical[1]
    const identicalResult = {
      ...result, sourceLine: first.sourceLine, sourceHash: first.sourceHash,
      documentHash: first.documentHash,
    }
    expect(resolveReadabilityResult(
      identicalResult,
      extractReadabilitySections("# Plan\n## Detail\nSame.\n"),
    )).toBeNull()
  })
})
