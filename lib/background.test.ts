// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"

type MessageListener = (
  message: { type: string; url?: string; days?: number; blob?: number[]; enabled?: boolean },
  sender: { tab?: { id?: number } },
  sendResponse: (response: unknown) => void,
) => boolean | undefined

const addListener = vi.fn()
const updateTab = vi.fn()
const fetchFile = vi.fn()

const setBadgeText = vi.fn().mockResolvedValue(undefined)
const setUninstallURL = vi.fn().mockResolvedValue(undefined)
const permissionAdded = vi.fn()
const registerContentScripts = vi.fn().mockResolvedValue(undefined)
const saveStorage = vi.fn().mockResolvedValue(undefined)
const tabRemoved = vi.fn()
const sessionValues: Record<string, unknown> = {}

vi.stubGlobal("chrome", {
  runtime: {
    lastError: undefined,
    onMessage: { addListener },
    onStartup: { addListener: vi.fn() },
    onInstalled: { addListener: vi.fn() },
    getManifest: () => ({ version: "1.5.1", content_scripts: [{ js: ["markside.test.js"] }] }),
    setUninstallURL,
  },
  tabs: { update: updateTab, query: vi.fn().mockResolvedValue([]), onRemoved: { addListener: tabRemoved } },
  permissions: { onAdded: { addListener: permissionAdded }, contains: vi.fn().mockResolvedValue(true) },
  scripting: { getRegisteredContentScripts: vi.fn().mockResolvedValue([]), registerContentScripts },
  action: {
    setBadgeText,
    setBadgeBackgroundColor: vi.fn().mockResolvedValue(undefined),
  },
  storage: {
    local: { get: vi.fn().mockResolvedValue({}), set: saveStorage },
    session: {
      get: async (key: string) => ({ [key]: sessionValues[key] }),
      set: async (values: Record<string, unknown>) => { Object.assign(sessionValues, values) },
      remove: async (key: string) => { delete sessionValues[key] },
    },
    onChanged: { addListener: vi.fn() },
  },
})
vi.stubGlobal("fetch", fetchFile)

await import("../background")

const listener = addListener.mock.calls[0][0] as MessageListener

describe("online Zen mode", () => {
  it("keeps the state per tab and clears it when that tab closes", async () => {
    const send = (message: { type: string; enabled?: boolean }, id: number) => new Promise<unknown>(resolve => {
      listener(message, { tab: { id } }, resolve)
    })
    await expect(send({ type: "set-web-zen-mode", enabled: true }, 42)).resolves.toEqual({ enabled: true })
    await expect(send({ type: "get-web-zen-mode" }, 42)).resolves.toEqual({ enabled: true })
    await expect(send({ type: "get-web-zen-mode" }, 43)).resolves.toEqual({ enabled: false })
    const onRemoved = tabRemoved.mock.calls[0][0] as (tabId: number) => void
    onRemoved(42)
    await expect(send({ type: "get-web-zen-mode" }, 42)).resolves.toEqual({ enabled: false })
  })
})

describe("online preview permission grant", () => {
  it("registers preview after Chrome grants website access without relying on the popup", async () => {
    const onAdded = permissionAdded.mock.calls[0][0] as (permissions: { origins: string[] }) => void
    onAdded({ origins: ["http://*/*", "https://*/*"] })
    await vi.waitFor(() => expect(saveStorage).toHaveBeenCalledWith({ webPreviewEnabled: true }))
    expect(registerContentScripts).toHaveBeenCalledWith([expect.objectContaining({ id: "web-markdown-preview" })])
  })
})

describe("review badge", () => {
  it("clears the badge when no Review is waiting", async () => {
    await vi.waitFor(() => expect(setBadgeText).toHaveBeenCalledWith({ text: "" }))
  })
})

describe("uninstall survey", () => {
  it("opens the survey with the extension version after uninstall", () => {
    expect(setUninstallURL).toHaveBeenCalledWith("https://markside.app/uninstall?v=1.5.1")
  })
})

describe("background file navigation", () => {
  beforeEach(() => {
    fetchFile.mockReset()
    updateTab.mockReset()
  })

  it("relays binary file data for an in-place reload", async () => {
    const buffer = new Uint8Array([1, 2, 3]).buffer
    fetchFile.mockResolvedValue({
      arrayBuffer: vi.fn().mockResolvedValue(buffer),
      headers: { get: vi.fn().mockReturnValue("image/png") },
    })

    const response = new Promise<unknown>((resolve) => {
      expect(listener(
        { type: "fetch-file-data", url: "file:///Users/eric/image.png" },
        {},
        resolve,
      )).toBe(true)
    })

    await expect(response).resolves.toEqual({
      base64: "AQID",
      type: "image/png",
    })
  })

  it("navigates the sender's tab through the browser process", () => {
    const sendResponse = vi.fn()
    updateTab.mockImplementation(
      (_tabId: number, _properties: { url: string }, callback: () => void) => {
        callback()
      },
    )

    expect(listener(
      { type: "navigate-file", url: "file:///Users/eric/docs/notes.md" },
      { tab: { id: 42 } },
      sendResponse,
    )).toBe(true)

    expect(updateTab).toHaveBeenCalledWith(
      42,
      { url: "file:///Users/eric/docs/notes.md" },
      expect.any(Function),
    )
    expect(sendResponse).toHaveBeenCalledWith({ ok: true })
  })

  it("rejects navigation without a local URL and sender tab", () => {
    const sendResponse = vi.fn()

    expect(listener(
      { type: "navigate-file", url: "https://example.com/notes.md" },
      {},
      sendResponse,
    )).toBeUndefined()

    expect(updateTab).not.toHaveBeenCalled()
    expect(sendResponse).toHaveBeenCalledWith({
      error: "Invalid local file navigation",
    })
  })
})

describe("hosted Snapshot upload", () => {
  beforeEach(() => {
    fetchFile.mockReset()
  })

  it("posts the ciphertext with the expiry header and resolves the id", async () => {
    fetchFile.mockResolvedValue({
      ok: true,
      status: 201,
      json: vi.fn().mockResolvedValue({ id: `261017${"A".repeat(22)}` }),
    })

    const response = new Promise<unknown>((resolve) => {
      expect(listener(
        { type: "upload-snapshot", days: 30, blob: [1, 2, 3] },
        {},
        resolve,
      )).toBe(true)
    })

    await expect(response).resolves.toEqual({ id: `261017${"A".repeat(22)}` })

    expect(fetchFile).toHaveBeenCalledWith(
      "https://markside.app/api/snapshots",
      expect.objectContaining({
        method: "POST",
        headers: {
          "content-type": "application/octet-stream",
          "x-snapshot-expiry-days": "30",
        },
      }),
    )
    const body = fetchFile.mock.calls[0][1].body as Uint8Array
    expect(Array.from(body)).toEqual([1, 2, 3])
  })

  it("reports an error when the upload response is not ok", async () => {
    fetchFile.mockResolvedValue({ ok: false, status: 413 })

    const response = new Promise<unknown>((resolve) => {
      expect(listener(
        { type: "upload-snapshot", days: 7, blob: [1] },
        {},
        resolve,
      )).toBe(true)
    })

    await expect(response).resolves.toEqual({ error: "Upload failed (413)" })
  })
})
