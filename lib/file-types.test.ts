import { describe, expect, it } from "vitest"

import {
  classifyMarksideFileUrl,
  isMarkdownTextFileUrl,
  MARKSIDE_CONTENT_GLOBS,
  MARKSIDE_CONTENT_MATCHES,
  shouldPinFileUrl,
} from "./file-types"

describe("classifyMarksideFileUrl", () => {
  it("distinguishes Markdown from supported source text", () => {
    expect(classifyMarksideFileUrl("file:///Users/eric/docs/README.md"))
      .toBe("markdown")
    expect(classifyMarksideFileUrl("file:///Users/eric/docs/notes.txt"))
      .toBe("source")
  })

  it.each([
    "log",
    "json",
    "jsonc",
    "yaml",
    "yml",
    "toml",
    "ini",
    "cfg",
    "conf",
    "csv",
    "tsv",
    "js",
    "jsx",
    "mjs",
    "cjs",
    "ts",
    "tsx",
    "css",
    "scss",
    "less",
    "py",
    "sh",
    "bash",
    "zsh",
    "sql",
    "vue",
    "svelte",
    "astro",
  ])("supports .%s source files", (extension) => {
    expect(classifyMarksideFileUrl(
      `file:///Users/eric/project/example.${extension}`,
    )).toBe("source")
  })

  it.each(["html", "svg", "xml", "pdf", "png", "zip"])(
    "leaves .%s files to the existing in-app or browser handling",
    (extension) => {
      expect(classifyMarksideFileUrl(
        `file:///Users/eric/project/example.${extension}`,
      )).toBe("unsupported")
    },
  )

  it("leaves case variants outside direct content-script support", () => {
    expect(classifyMarksideFileUrl("file:///Users/eric/docs/NOTES.TXT"))
      .toBe("unsupported")
    expect(classifyMarksideFileUrl("file:///Users/eric/docs/DockerFile"))
      .toBe("unsupported")
  })

  it("rejects non-local URLs", () => {
    expect(classifyMarksideFileUrl("https://example.com/notes.txt"))
      .toBe("unsupported")
  })

  it.each([
    ".env",
    ".gitignore",
    ".editorconfig",
    "Dockerfile",
    "Makefile",
    "LICENSE",
  ])("supports the extensionless source file %s", (fileName) => {
    expect(classifyMarksideFileUrl(
      `file:///Users/eric/project/${fileName}`,
    )).toBe("source")
  })
})

describe("isMarkdownTextFileUrl", () => {
  it.each([
    "file:///docs/note.md.txt",
    "file:///docs/%ED%95%9C%EA%B8%80.MD.txt#heading",
    "file:///docs/note.md.TXT",
  ])("recognizes a local Markdown-looking text file: %s", (url) => {
    expect(isMarkdownTextFileUrl(url)).toBe(true)
    expect(classifyMarksideFileUrl(url)).not.toBe("markdown")
  })

  it.each([
    "file:///docs/note.txt",
    "file:///docs/note.md",
    "file:///docs/note.md.txt.backup",
    "file:///docs/note.mdx.txt",
    "https://example.com/note.md.txt",
    "file:///docs/%ZZ.md.txt",
  ])("does not suggest Markdown for %s", (url) => {
    expect(isMarkdownTextFileUrl(url)).toBe(false)
  })
})

describe("MARKSIDE_CONTENT_MATCHES", () => {
  it("uses a valid file match plus globs for every supported filename", () => {
    const expectedGlobs = [
      "file://*/*.md",
      "file://*/*.mdx",
      "file://*/*.markdown",
      ...[
        "txt",
        "log",
        "json",
        "jsonc",
        "yaml",
        "yml",
        "toml",
        "ini",
        "cfg",
        "conf",
        "csv",
        "tsv",
        "js",
        "jsx",
        "mjs",
        "cjs",
        "ts",
        "tsx",
        "css",
        "scss",
        "less",
        "py",
        "sh",
        "bash",
        "zsh",
        "sql",
        "vue",
        "svelte",
        "astro",
      ].map((extension) => `file://*/*.${extension}`),
      ...[
        ".env",
        ".gitignore",
        ".editorconfig",
        "Dockerfile",
        "Makefile",
        "LICENSE",
      ].map((fileName) => `file://*/${fileName}`),
    ]

    expect(MARKSIDE_CONTENT_MATCHES).toEqual(["file:///*"])
    expect(MARKSIDE_CONTENT_GLOBS).toEqual(
      expectedGlobs.flatMap((glob) => [glob, `${glob}#*`]),
    )
  })
})

describe("shouldPinFileUrl", () => {
  it("navigates supported Markside text files", () => {
    expect(shouldPinFileUrl("file:///Users/eric/project/README.md")).toBe(true)
    expect(shouldPinFileUrl("file:///Users/eric/project/src/index.ts")).toBe(true)
    expect(shouldPinFileUrl("file:///Users/eric/project/.env")).toBe(true)
  })

  it("keeps unsupported files in the mounted app", () => {
    expect(shouldPinFileUrl("file:///Users/eric/project/index.html")).toBe(false)
  })

  it("does not reload to a filename that Chrome's exact match pattern misses", () => {
    expect(shouldPinFileUrl("file:///Users/eric/project/NOTES.TXT")).toBe(false)
  })
})
