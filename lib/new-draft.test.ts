import { afterEach, describe, expect, it, vi } from "vitest"

import { initialDraftMode, NEW_DRAFT_STORAGE_KEY, openNewDraft, suggestDraftFileName } from "./new-draft"

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
  it("uses the first heading", () => {
    expect(suggestDraftFileName("Intro line\n\n## Rate limits RFC\n\n# Later")).toBe("Rate limits RFC.md")
  })

  it("falls back to Untitled without a heading", () => {
    expect(suggestDraftFileName("")).toBe("Untitled.md")
    expect(suggestDraftFileName("Just a note")).toBe("Untitled.md")
  })

  it("ignores headings inside frontmatter and code fences", () => {
    expect(suggestDraftFileName("---\ntitle: x\n---\n```\n# not this\n```\n# Plan")).toBe("Plan.md")
  })

  it("removes characters that filenames cannot contain", () => {
    expect(suggestDraftFileName("# Q3: plan / review?")).toBe("Q3 plan review.md")
    expect(suggestDraftFileName("# . / .")).toBe("Untitled.md")
  })

  it("keeps the text of inline code and emphasis", () => {
    expect(suggestDraftFileName("# Use `fetch` **now**")).toBe("Use fetch now.md")
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
