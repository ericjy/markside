export * from "@codemirror/state"
export * from "@codemirror/view"
export { basicSetup } from "codemirror"
export { markdown } from "@codemirror/lang-markdown"
export { oneDark } from "@codemirror/theme-one-dark"
export { javascript } from "@codemirror/lang-javascript"
export { json } from "@codemirror/lang-json"
export { css } from "@codemirror/lang-css"
export { html } from "@codemirror/lang-html"
export { python } from "@codemirror/lang-python"
export * from "./codemirror-reveal-extension"

import type { Language } from "@codemirror/language"
import type { Extension } from "@codemirror/state"

export const yamlLang: Language
export const shellLang: Language
export const sqlLang: Language
export const defaultHighlighting: Extension
export const inlineCodeHighlighting: Extension
export const headingHighlighting: Extension
export const headingTheme: Extension
export const darkHeadingTheme: Extension
