import { afterEach, describe, expect, it, vi } from "vitest"
import { completeWebPreviewEnable, isWebMarkdownUrl, restoreWebPreview, setWebPreviewEnabled, webDocumentIdentity, webPreviewEnabled } from "./web-preview"

describe("online Markdown URLs", () => {
  it.each([
    ["https://raw.example/a/README.md?ref=main#title", true],
    ["http://example.test/a.markdown", true],
    ["https://example.test/a.MDX", true],
    ["https://example.test/a.md.html", false],
    ["https://example.test/view?file=a.md", false],
    ["file:///tmp/a.md", false],
    ["invalid", false],
  ])("classifies %s", (url, expected) => expect(isWebMarkdownUrl(url)).toBe(expected))
})

describe("online document identity", () => {
  it.each([
    ["https://raw.githubusercontent.com/facebook/react/main/README.md", "README.md", "facebook/react", "github"],
    ["https://raw.githubusercontent.com/microsoft/vscode/main/docs/README.md?ref=1", "README.md", "microsoft/vscode", "github"],
    ["https://gitlab.com/gitlab-org/gitlab/-/raw/master/README.md", "README.md", "gitlab-org/gitlab", "gitlab"],
    ["https://gitlab.com/org/team/project/-/raw/main/README.md", "README.md", "org/team/project", "gitlab"],
    ["https://gitlab.com/org/project/-/blob/main/README.md", "README.md", "gitlab.com", "website"],
    ["https://bitbucket.org/adastradev/test-open-source-pipeline/raw/d663c4c3/Readme.md", "Readme.md", "adastradev/test-open-source-pipeline", "bitbucket"],
    ["https://bitbucket.org/team/project/raw/main/docs/guide.md?ref=nav", "guide.md", "team/project", "bitbucket"],
    ["https://bitbucket.org/team/project/src/main/README.md", "README.md", "bitbucket.org", "website"],
    ["https://docs.example.com/guide/hello%20world.md#intro", "hello world.md", "docs.example.com", "website"],
    ["http://localhost:8080/test.md", "test.md", "localhost:8080", "website"],
    ["https://raw.githubusercontent.com/owner/file.md", "file.md", "raw.githubusercontent.com", "website"],
    ["https://example.com/bad%FF.md", "bad%FF.md", "example.com", "website"],
  ])("identifies %s", (url, filename, source, kind) => {
    expect(webDocumentIdentity(url)).toEqual({ filename, source, kind })
  })
})

describe("online preview permission", () => {
  afterEach(() => vi.unstubAllGlobals())

  function setup(granted = true) {
    const scripts: chrome.scripting.RegisteredContentScript[] = []
    const saved: Record<string, unknown> = {}
    const remove = vi.fn(async () => true)
    const request = vi.fn(async () => granted)
    const register = vi.fn(async (entries: chrome.scripting.RegisteredContentScript[]) => { scripts.push(...entries) })
    const unregister = vi.fn(async () => { scripts.length = 0 })
    const execute = vi.fn(async (injection: chrome.scripting.ScriptInjection<[], unknown>) =>
      "func" in injection ? [{ result: "eligible" }] : [])
    vi.stubGlobal("chrome", {
      permissions: { request, remove, contains: async () => granted },
      scripting: { getRegisteredContentScripts: async () => scripts, registerContentScripts: register, unregisterContentScripts: unregister, executeScript: execute },
      runtime: { getManifest: () => ({ content_scripts: [{ matches: ["file:///*"], js: ["markside.abc.js"] }] }), sendMessage: async () => { await completeWebPreviewEnable(); return { ok: true } } },
      storage: { local: { get: async () => saved, set: async (values: Record<string, unknown>) => Object.assign(saved, values) } },
      tabs: { query: async () => [{ id: 42, url: "https://example.com/README.md" }] },
    })
    return { register, unregister, remove, request, execute, saved }
  }

  it("registers automatic preview only after permission, and unregisters before removing it", async () => {
    const { register, unregister, remove } = setup()
    expect(await setWebPreviewEnabled(true)).toBe(true)
    expect(await webPreviewEnabled()).toBe(true)
    expect(register.mock.calls[0][0][0].js).toEqual(["vega-engine-loader.js", "markside.abc.js"])
    expect(await setWebPreviewEnabled(false)).toBe(false)
    expect(unregister).toHaveBeenCalledOnce()
    expect(remove).toHaveBeenCalledOnce()
    expect(unregister.mock.invocationCallOrder[0]).toBeLessThan(remove.mock.invocationCallOrder[0])
  })

  it("does not register when the user declines", async () => {
    const { register } = setup(false)
    expect(await setWebPreviewEnabled(true)).toBe(false)
    expect(register).not.toHaveBeenCalled()
  })

  it("finishes registration and renders the active page after permission is granted even if the popup is gone", async () => {
    const { register, execute, saved } = setup()
    await completeWebPreviewEnable()
    expect(register).toHaveBeenCalledOnce()
    expect(saved.webPreviewEnabled).toBe(true)
    expect(execute).toHaveBeenCalledTimes(2)
    expect(execute.mock.calls[1][0]).toMatchObject({ target: { tabId: 42 }, files: ["vega-engine-loader.js", "markside.abc.js"] })
  })

  it("recovers a previous grant that was interrupted before the setting was saved", async () => {
    const { register, saved } = setup()
    await restoreWebPreview()
    expect(register).toHaveBeenCalledOnce()
    expect(saved.webPreviewEnabled).toBe(true)
  })

  it("does not restore preview when the user explicitly turned it off", async () => {
    const { register, saved } = setup()
    saved.webPreviewEnabled = false
    await restoreWebPreview()
    expect(register).not.toHaveBeenCalled()
  })
})
