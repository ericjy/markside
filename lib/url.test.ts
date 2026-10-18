// lib/url.test.ts
// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import {
  deriveRootUrl,
  readInitialFileContent,
  resolveFetchedFileContent,
  resolveDocumentLinkHref,
  resolveImageSrc,
  fileFolderPath,
  resolveFileBreadcrumbs,
  resolveWikilinkCandidates,
} from "./url"

describe("readInitialFileContent", () => {
  it("reads the Markdown Chrome already loaded into the page", () => {
    document.body.innerHTML = "<pre># Loaded once\n\nNo second fetch needed.</pre>"

    expect(readInitialFileContent(document.body)).toBe(
      "# Loaded once\n\nNo second fetch needed.",
    )
  })
})

describe("resolveFetchedFileContent", () => {
  it("accepts an empty file as successfully loaded content", () => {
    expect(resolveFetchedFileContent({ text: "" })).toEqual({
      content: "",
      error: null,
    })
  })
})

describe("deriveRootUrl", () => {
  it("derives root url when dirName is the immediate parent", () => {
    expect(deriveRootUrl("docs", "file:///Users/eric/docs/README.md"))
      .toBe("file:///Users/eric/docs/")
  })

  it("derives root url when dirName is a grandparent", () => {
    expect(deriveRootUrl("Code", "file:///Users/eric/Code/docs/README.md"))
      .toBe("file:///Users/eric/Code/")
  })

  it("picks the rightmost occurrence when dirName appears multiple times", () => {
    expect(deriveRootUrl("src", "file:///Users/eric/src/myproject/src/index.md"))
      .toBe("file:///Users/eric/src/myproject/src/")
  })

  it("falls back to just the directory name when dirName not found in current URL", () => {
    expect(deriveRootUrl("notfound", "file:///Users/eric/projects/README.md"))
      .toBe("file:///notfound/")
  })

  it("handles a single-level path", () => {
    expect(deriveRootUrl("docs", "file:///docs/README.md"))
      .toBe("file:///docs/")
  })

  it("handles percent-encoded path segments correctly", () => {
    expect(deriveRootUrl("my docs", "file:///Users/eric/my%20docs/README.md"))
      .toBe("file:///Users/eric/my%20docs/")
  })

  it("handles Windows-style file URLs with drive letter", () => {
    expect(deriveRootUrl("docs", "file:///C:/Users/eric/docs/README.md"))
      .toBe("file:///C:/Users/eric/docs/")
  })

  it("falls back to just the directory name on Windows when dirName not found", () => {
    expect(deriveRootUrl("notfound", "file:///C:/Users/eric/projects/README.md"))
      .toBe("file:///notfound/")
  })
})

describe("resolveImageSrc", () => {
  it("resolves a relative src against the rendered file's directory", () => {
    expect(resolveImageSrc("./sunset.png", "file:///Users/eric/sample/index.md"))
      .toBe("file:///Users/eric/sample/sunset.png")
  })

  it("resolves a src without leading ./ prefix", () => {
    expect(resolveImageSrc("sunset.png", "file:///Users/eric/sample/index.md"))
      .toBe("file:///Users/eric/sample/sunset.png")
  })

  it("resolves parent directory traversal", () => {
    expect(resolveImageSrc("../assets/pic.png", "file:///Users/eric/sample/notes/file.md"))
      .toBe("file:///Users/eric/sample/assets/pic.png")
  })

  it("leaves absolute file:// src unchanged", () => {
    expect(resolveImageSrc("file:///Users/eric/other/img.png", "file:///Users/eric/sample/index.md"))
      .toBe("file:///Users/eric/other/img.png")
  })

  it("leaves http/https src unchanged", () => {
    expect(resolveImageSrc("https://example.com/img.png", "file:///Users/eric/sample/index.md"))
      .toBe("https://example.com/img.png")
  })

  it("returns src unchanged when fileUrl is not a file:// URL", () => {
    expect(resolveImageSrc("./img.png", "https://raw.githubusercontent.com/user/repo/main/README.md"))
      .toBe("./img.png")
  })

  it("handles Windows-style file URLs", () => {
    expect(resolveImageSrc("./avatar.png", "file:///C:/Users/eric/docs/about.md"))
      .toBe("file:///C:/Users/eric/docs/avatar.png")
  })

  it("adds the reload version to local images so Reload bypasses the image cache", () => {
    expect(resolveImageSrc("./sunset.png", "file:///Users/eric/sample/index.md", 2))
      .toBe("file:///Users/eric/sample/sunset.png?v=2")
    expect(resolveImageSrc("file:///Users/eric/other/img.png", "file:///Users/eric/sample/index.md", 2))
      .toBe("file:///Users/eric/other/img.png?v=2")
  })

  it("leaves remote images unversioned after a reload", () => {
    expect(resolveImageSrc("https://example.com/img.png", "file:///Users/eric/sample/index.md", 2))
      .toBe("https://example.com/img.png")
  })
})

describe("resolveDocumentLinkHref", () => {
  it("resolves a relative link against the rendered file instead of the address bar", () => {
    const renderedFileUrl = "file:///Users/eric/Code/markside/README.md"
    const staleAddressBarUrl =
      "file:///Users/eric/Code/markside/docs/visual-design.md"

    expect(new URL("CONTRIBUTING.md", staleAddressBarUrl).href).toBe(
      "file:///Users/eric/Code/markside/docs/CONTRIBUTING.md",
    )
    expect(resolveDocumentLinkHref("CONTRIBUTING.md", renderedFileUrl)).toBe(
      "file:///Users/eric/Code/markside/CONTRIBUTING.md",
    )
  })
})

describe("fileFolderPath", () => {
  it("returns the decoded folder path of a file URL", () => {
    expect(fileFolderPath("file:///tmp/my%20notes/doc.md")).toBe("/tmp/my notes/")
  })

  it("drops the leading slash before a Windows drive letter", () => {
    expect(fileFolderPath("file:///C:/Users/eric/docs/about.md")).toBe("C:/Users/eric/docs/")
  })
})

describe("resolveFileBreadcrumbs", () => {
  it("decodes the path and links each folder", () => {
    expect(resolveFileBreadcrumbs("file:///Users/me/My%20Notes/plan.md")).toEqual({
      fileName: "plan.md",
      crumbs: ["Users", "me", "My Notes", "plan.md"],
      crumbUrls: [
        "file:///Users/",
        "file:///Users/me/",
        "file:///Users/me/My Notes/",
        "file:///Users/me/My Notes/plan.md/",
      ],
      hasMore: false,
    })
  })

  it("keeps the last six segments of a deep path", () => {
    const result = resolveFileBreadcrumbs("file:///a/b/c/d/e/f/g/h.md")
    expect(result.crumbs).toEqual(["c", "d", "e", "f", "g", "h.md"])
    expect(result.crumbUrls[0]).toBe("file:///a/b/c/")
    expect(result.hasMore).toBe(true)
  })

  it("has no file name for the root", () => {
    expect(resolveFileBreadcrumbs("file:///").fileName).toBeUndefined()
  })
})

describe("resolveWikilinkCandidates", () => {
  it("tries each Markdown extension beside the current file", () => {
    expect(resolveWikilinkCandidates("file:///docs/guide/intro.md", "Setup Notes")).toEqual([
      "file:///docs/guide/Setup Notes.md",
      "file:///docs/guide/Setup Notes.mdx",
      "file:///docs/guide/Setup Notes.markdown",
    ])
  })

  it("ignores empty names and non-file pages", () => {
    expect(resolveWikilinkCandidates("file:///docs/intro.md", "")).toEqual([])
    expect(resolveWikilinkCandidates("http://localhost:3000/intro.md", "Setup")).toEqual([])
  })
})
