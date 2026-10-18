/**
 * Pre-bundles CodeMirror and its language/theme extensions into a single ESM
 * file so Parcel always sees one instance of @codemirror/state — avoiding the
 * "Unrecognized extension value" / multiple-instances error.
 *
 * Run: node scripts/bundle-codemirror.mjs
 */
import { writeFileSync, unlinkSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import { execSync } from "child_process"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, "..")
const esbuild = join(root, "node_modules/.bin/esbuild")
const entryTmp = join(root, "lib/_codemirror-entry-tmp.mjs")
const outfile = join(root, "lib/codemirror-bundle.mjs")

// Re-export exactly what RawEditor.tsx needs, sourced from the canonical packages.
// codemirror@6.0.2 only exports EditorView + basicSetup, not state/compartment,
// so we export each sub-package directly to avoid missing-export errors.
// Legacy-mode languages (YAML, shell) are pre-wrapped with StreamLanguage.define
// so consumers don't need to import @codemirror/language directly.
writeFileSync(
  entryTmp,
  [
    'export * from "@codemirror/state"',
    'export * from "@codemirror/view"',
    'export { basicSetup } from "codemirror"',
    'export { markdown } from "@codemirror/lang-markdown"',
    'export { oneDark } from "@codemirror/theme-one-dark"',
    'export { javascript } from "@codemirror/lang-javascript"',
    'export { json } from "@codemirror/lang-json"',
    'export { css } from "@codemirror/lang-css"',
    'export { html } from "@codemirror/lang-html"',
    'export { python } from "@codemirror/lang-python"',
    'export * from "./codemirror-reveal-extension"',
    'import { defaultHighlightStyle, HighlightStyle, StreamLanguage, syntaxHighlighting } from "@codemirror/language"',
    'import { tagHighlighter, tags } from "@lezer/highlight"',
    'import { EditorView as CodeMirrorView } from "@codemirror/view"',
    'import { yaml as _yaml } from "@codemirror/legacy-modes/mode/yaml"',
    'import { shell as _shell } from "@codemirror/legacy-modes/mode/shell"',
    'import { standardSQL as _sql } from "@codemirror/legacy-modes/mode/sql"',
    'export const yamlLang = StreamLanguage.define(_yaml)',
    'export const shellLang = StreamLanguage.define(_shell)',
    'export const sqlLang = StreamLanguage.define(_sql)',
    'export const defaultHighlighting = syntaxHighlighting(defaultHighlightStyle)',
    'export const inlineCodeHighlighting = syntaxHighlighting(HighlightStyle.define([{ tag: tags.monospace, color: "var(--cm-inline-code)" }]))',
    'export const headingHighlighting = syntaxHighlighting(tagHighlighter([{ tag: tags.heading, class: "cm-heading-text" }, { tag: tags.processingInstruction, class: "cm-markdown-mark" }]))',
    'export const headingTheme = CodeMirrorView.theme({ ".cm-heading-text": { color: "#7c3aed" }, ".cm-line:has(.cm-heading-text) .cm-markdown-mark": { color: "#7c3aed !important" } })',
    'export const darkHeadingTheme = CodeMirrorView.theme({ ".cm-heading-text": { color: "#c4b5fd" }, ".cm-line:has(.cm-heading-text) .cm-markdown-mark": { color: "#c4b5fd !important" } })',
  ].join("\n") + "\n"
)

try {
  execSync(
    `"${esbuild}" "${entryTmp}" --bundle --format=esm --platform=browser --target=es2020 --outfile="${outfile}" --log-level=warning`,
    { cwd: root, stdio: "inherit" }
  )
  console.log("✔ CodeMirror bundled → lib/codemirror-bundle.mjs")
} finally {
  unlinkSync(entryTmp)
}
