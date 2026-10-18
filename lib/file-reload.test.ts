// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"

import { readFileFromDisk } from "./file-reload"

const sendMessage = vi.fn()

vi.stubGlobal("chrome", {
  runtime: {
    lastError: undefined,
    sendMessage,
  },
})

beforeEach(() => {
  sendMessage.mockReset()
})

describe("file reload", () => {
  it("reads a directly opened text file in place without a cached handle", async () => {
    sendMessage.mockImplementation((_message, callback) => {
      callback({ text: "# Latest from disk" })
    })

    await expect(readFileFromDisk(
      null,
      "file:///Users/eric/Code/markside/README.md",
      false,
    )).resolves.toMatchObject({
      buffer: null,
      text: "# Latest from disk",
    })

    expect(sendMessage).toHaveBeenCalledWith(
      {
        type: "fetch-file",
        url: "file:///Users/eric/Code/markside/README.md",
      },
      expect.any(Function),
    )
  })

  it("reads through the cached handle when one is available", async () => {
    const file = new File(["# Cached handle"], "README.md", {
      type: "text/markdown",
      lastModified: 123,
    })
    const handle = {
      getFile: vi.fn().mockResolvedValue(file),
    } as unknown as FileSystemFileHandle

    await expect(readFileFromDisk(handle, "file:///README.md", false))
      .resolves.toEqual({
        buffer: null,
        lastModified: 123,
        text: "# Cached handle",
        type: "text/markdown",
      })

    expect(sendMessage).not.toHaveBeenCalled()
  })

  it("reads a directly opened image in place without a cached handle", async () => {
    const buffer = new Uint8Array([1, 2, 3]).buffer
    sendMessage.mockImplementation((_message, callback) => {
      callback({ base64: "AQID", type: "image/png" })
    })

    await expect(readFileFromDisk(
      null,
      "file:///Users/eric/Code/markside/screenshot.png",
      true,
    )).resolves.toEqual({
      buffer,
      lastModified: 0,
      text: null,
      type: "image/png",
    })

    expect(sendMessage).toHaveBeenCalledWith(
      {
        type: "fetch-file-data",
        url: "file:///Users/eric/Code/markside/screenshot.png",
      },
      expect.any(Function),
    )
  })
})
