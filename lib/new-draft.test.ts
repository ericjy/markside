import { afterEach, describe, expect, it, vi } from "vitest"

import { describeDraftTitle, initialDraftMode, NEW_DRAFT_STORAGE_KEY, openNewDraft, suggestDraftFileName } from "./new-draft"

const DRAFT_URL = "chrome-extension://markside/tabs/draft.html"

function stubChrome(stored: unknown, contexts: { documentUrl?: string }[]) {
  const chromeStub = {
    storage: {
      local: { get: vi.fn(async () => ({ [NEW_DRAFT_STORAGE_KEY]: stored })) },
    },
    runtime: {
      ContextType: { TAB: "TAB" },
      getURL: (path: string) => `chrome-extension://markside/${path}`,
      getContexts: vi.fn(async () => contexts),
    },
    tabs: {
      create: vi.fn(async () => ({})),
      update: vi.fn(async (tabId: number) => ({ id: tabId, windowId: 7 })),
    },
    windows: { update: vi.fn(async () => ({})) },
  }
  vi.stubGlobal("chrome", chromeStub)
  return chromeStub
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("suggestDraftFileName", () => {
  it("turns the first heading into lowercase words joined by hyphens", () => {
    expect(suggestDraftFileName("Intro line\n\n## Rate limits RFC\n\n# Later")).toBe("rate-limits-rfc.md")
    expect(suggestDraftFileName("# Markside sample")).toBe("markside-sample.md")
  })

  it("falls back to untitled without a heading", () => {
    expect(suggestDraftFileName("")).toBe("untitled.md")
    expect(suggestDraftFileName("Just a note")).toBe("untitled.md")
  })

  it("ignores headings inside frontmatter and code fences", () => {
    expect(suggestDraftFileName("---\ntitle: x\n---\n```\n# not this\n```\n# Plan")).toBe("plan.md")
  })

  it("replaces punctuation and characters that filenames cannot contain", () => {
    expect(suggestDraftFileName("# Q3: plan / review?")).toBe("q3-plan-review.md")
    expect(suggestDraftFileName("# . / .")).toBe("untitled.md")
  })

  it("keeps the text of inline code and emphasis", () => {
    expect(suggestDraftFileName("# Use `fetch` **now**")).toBe("use-fetch-now.md")
  })

  it("keeps letters from other scripts", () => {
    expect(suggestDraftFileName("# 速率 限制 v2")).toBe("速率-限制-v2.md")
  })
})

describe("describeDraftTitle", () => {
  it("prefers the first heading", () => {
    expect(describeDraftTitle("intro\n\n## Rate limits RFC")).toBe("Rate limits RFC")
  })

  it("falls back to the first line without list or quote markers", () => {
    expect(describeDraftTitle("\n- **Buy** milk\n- eggs")).toBe("Buy milk")
    expect(describeDraftTitle("> quoted `text`")).toBe("quoted text")
  })

  it("is empty for an empty draft", () => {
    expect(describeDraftTitle("  \n\n")).toBe("")
  })
})

describe("initialDraftMode", () => {
  it("opens Split when both panes fit and Source otherwise", () => {
    expect(initialDraftMode(1280)).toBe("split")
    expect(initialDraftMode(640)).toBe("split")
    expect(initialDraftMode(639)).toBe("source")
  })
})

describe("openNewDraft", () => {
  it("focuses the tab still editing the unsaved draft", async () => {
    const chromeStub = stubChrome({ content: "x", updatedAt: "", tabId: 3 }, [{ documentUrl: DRAFT_URL }])
    await openNewDraft()
    expect(chromeStub.runtime.getContexts).toHaveBeenCalledWith({ contextTypes: ["TAB"], tabIds: [3] })
    expect(chromeStub.tabs.update).toHaveBeenCalledWith(3, { active: true })
    expect(chromeStub.windows.update).toHaveBeenCalledWith(7, { focused: true })
    expect(chromeStub.tabs.create).not.toHaveBeenCalled()
  })

  it("opens a draft tab when the editing tab has closed or left the page", async () => {
    const chromeStub = stubChrome({ content: "x", updatedAt: "", tabId: 3 }, [
      { documentUrl: "chrome-extension://markside/options.html" },
    ])
    await openNewDraft()
    expect(chromeStub.tabs.update).not.toHaveBeenCalled()
    expect(chromeStub.tabs.create).toHaveBeenCalledWith({ url: DRAFT_URL })
  })

  it("opens a draft tab when no unsaved draft exists", async () => {
    const chromeStub = stubChrome(undefined, [])
    await openNewDraft()
    expect(chromeStub.runtime.getContexts).not.toHaveBeenCalled()
    expect(chromeStub.tabs.create).toHaveBeenCalledWith({ url: DRAFT_URL })
  })
})
