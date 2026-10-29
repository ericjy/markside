export type MarksideFileKind = "markdown" | "source" | "unsupported"

const MARKDOWN_EXTENSION_NAMES = ["md", "mdx", "markdown"]
const SOURCE_EXTENSION_NAMES = [
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
]
const SOURCE_FILE_NAME_PATTERNS = [
  ".env",
  ".gitignore",
  ".editorconfig",
  "Dockerfile",
  "Makefile",
  "LICENSE",
]

export const MARKSIDE_CONTENT_MATCHES = ["file:///*"]
const MARKSIDE_CONTENT_FILE_GLOBS = [
  ...MARKDOWN_EXTENSION_NAMES.map((extension) => `file://*/*.${extension}`),
  ...SOURCE_EXTENSION_NAMES.map((extension) => `file://*/*.${extension}`),
  ...SOURCE_FILE_NAME_PATTERNS.map((fileName) => `file://*/${fileName}`),
]
export const MARKSIDE_CONTENT_GLOBS = MARKSIDE_CONTENT_FILE_GLOBS.flatMap(
  (glob) => [glob, `${glob}#*`],
)

const MARKDOWN_EXTENSIONS = new Set(MARKDOWN_EXTENSION_NAMES)
const SOURCE_FILE_NAMES = new Set(SOURCE_FILE_NAME_PATTERNS)
const SOURCE_EXTENSIONS = new Set(SOURCE_EXTENSION_NAMES)

function getLocalFileName(fileUrl: string): string | null {
  try {
    const url = new URL(fileUrl)
    if (url.protocol !== "file:") return null
    return decodeURIComponent(
      url.pathname.slice(url.pathname.lastIndexOf("/") + 1),
    )
  } catch {
    return null
  }
}

export function isMarkdownTextFileUrl(fileUrl: string): boolean {
  const fileName = getLocalFileName(fileUrl)
  return fileName !== null && /\.md\.txt$/i.test(fileName)
}

export function classifyMarksideFileUrl(fileUrl: string): MarksideFileKind {
  const fileName = getLocalFileName(fileUrl)
  if (!fileName) return "unsupported"
  const extension = fileName.slice(fileName.lastIndexOf(".") + 1)
  if (MARKDOWN_EXTENSIONS.has(extension)) return "markdown"
  return SOURCE_FILE_NAMES.has(fileName) || SOURCE_EXTENSIONS.has(extension)
    ? "source"
    : "unsupported"
}

function matchesMarksideContentScript(fileUrl: string): boolean {
  const fileName = getLocalFileName(fileUrl)
  if (!fileName) return false
  const extension = fileName.slice(fileName.lastIndexOf(".") + 1)
  return (
    MARKDOWN_EXTENSIONS.has(extension) ||
    SOURCE_EXTENSIONS.has(extension) ||
    SOURCE_FILE_NAME_PATTERNS.includes(fileName)
  )
}

export function shouldPinFileUrl(fileUrl: string): boolean {
  return matchesMarksideContentScript(fileUrl)
}
