export const CODE_BLOCK_LANG_NAMES: Record<string, string> = {
  typescript: "TypeScript",
  tsx: "TSX",
  javascript: "JavaScript",
  jsx: "JSX",
  python: "Python",
  bash: "Bash",
  shellscript: "Shell",
  sh: "Shell",
  go: "Go",
  rust: "Rust",
  sql: "SQL",
  json: "JSON",
  yaml: "YAML",
  css: "CSS",
  html: "HTML",
  markdown: "Markdown",
  toml: "TOML",
  diff: "Diff",
  dockerfile: "Dockerfile",
  http: "HTTP",
  xml: "XML",
}

export const COPY_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`
export const CHECK_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`
export const WRAP_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M3 12h15a3 3 0 1 1 0 6h-4"/><path d="m16 16-2 2 2 2"/><path d="M3 18h7"/></svg>`

let wrapCodeBlocks = false

export function getCodeBlockWrapPreference() {
  return wrapCodeBlocks
}

export function setCodeBlockWrapPreference(wrapped: boolean) {
  wrapCodeBlocks = wrapped
}

export function getCodeBlockLanguageLabel(language: string) {
  return CODE_BLOCK_LANG_NAMES[language] ??
    (language !== "text" ? language : "")
}
