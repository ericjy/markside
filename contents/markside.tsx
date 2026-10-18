// contents/markside.tsx
import iconSvg from "data-text:~assets/icon.svg"
import cssText from "data-text:~style.css"
import type { PlasmoCSConfig } from "plasmo"
import React from "react"
import { createRoot } from "react-dom/client"

import {
  DEFAULT_PANE_WIDTH_PREFERENCES,
  DEFAULT_SPLIT_PERCENT,
  getMarkdownMode,
  getPaneWidthPreferences,
  getSplitPercent
} from "~lib/markdown-mode"
import {
  getThemePreference
} from "~lib/theme-preference"
import {
  readInitialFileContent
} from "~lib/url"

import { FileRenderer } from "~components/content-app"

export const config: PlasmoCSConfig & { include_globs: string[] } = {
  // Plasmo only extracts inline string literals into the generated manifest.
  matches: [
    "file:///*",
  ],
  include_globs: [
    "file://*/*.md",
    "file://*/*.mdx",
    "file://*/*.markdown",
    "file://*/*.txt",
    "file://*/*.log",
    "file://*/*.json",
    "file://*/*.jsonc",
    "file://*/*.yaml",
    "file://*/*.yml",
    "file://*/*.toml",
    "file://*/*.ini",
    "file://*/*.cfg",
    "file://*/*.conf",
    "file://*/*.csv",
    "file://*/*.tsv",
    "file://*/*.js",
    "file://*/*.jsx",
    "file://*/*.mjs",
    "file://*/*.cjs",
    "file://*/*.ts",
    "file://*/*.tsx",
    "file://*/*.css",
    "file://*/*.scss",
    "file://*/*.less",
    "file://*/*.py",
    "file://*/*.sh",
    "file://*/*.bash",
    "file://*/*.zsh",
    "file://*/*.sql",
    "file://*/*.vue",
    "file://*/*.svelte",
    "file://*/*.astro",
    "file://*/.env",
    "file://*/.gitignore",
    "file://*/.editorconfig",
    "file://*/Dockerfile",
    "file://*/Makefile",
    "file://*/LICENSE",
    "file://*/*.md#*",
    "file://*/*.mdx#*",
    "file://*/*.markdown#*",
    "file://*/*.txt#*",
    "file://*/*.log#*",
    "file://*/*.json#*",
    "file://*/*.jsonc#*",
    "file://*/*.yaml#*",
    "file://*/*.yml#*",
    "file://*/*.toml#*",
    "file://*/*.ini#*",
    "file://*/*.cfg#*",
    "file://*/*.conf#*",
    "file://*/*.csv#*",
    "file://*/*.tsv#*",
    "file://*/*.js#*",
    "file://*/*.jsx#*",
    "file://*/*.mjs#*",
    "file://*/*.cjs#*",
    "file://*/*.ts#*",
    "file://*/*.tsx#*",
    "file://*/*.css#*",
    "file://*/*.scss#*",
    "file://*/*.less#*",
    "file://*/*.py#*",
    "file://*/*.sh#*",
    "file://*/*.bash#*",
    "file://*/*.zsh#*",
    "file://*/*.sql#*",
    "file://*/*.vue#*",
    "file://*/*.svelte#*",
    "file://*/*.astro#*",
    "file://*/.env#*",
    "file://*/.gitignore#*",
    "file://*/.editorconfig#*",
    "file://*/Dockerfile#*",
    "file://*/Makefile#*",
    "file://*/LICENSE#*",
  ],
  run_at: "document_idle"
}

async function bootstrap() {
  const initialContent = readInitialFileContent(document.body)

  const faviconEl = document.createElement("link")
  faviconEl.rel = "icon"
  faviconEl.type = "image/svg+xml"
  faviconEl.href = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(iconSvg)
  document.head.appendChild(faviconEl)

  const styleEl = document.createElement("style")
  styleEl.id = "markside-styles"
  styleEl.textContent = cssText
  document.head.appendChild(styleEl)

  const resetEl = document.createElement("style")
  resetEl.textContent =
    "html,body{margin:0;height:100%}body>pre{display:none!important}"
  document.head.appendChild(resetEl)

  const mount = document.createElement("div")
  mount.id = "markside-mount"
  mount.style.cssText = "height:100%;display:flex;flex-direction:column"
  document.body.appendChild(mount)
  const [initialMode, initialSplitPercent, initialPaneWidthPreferences, initialThemePreference, newFile] = await Promise.all([
    getMarkdownMode().catch(() => "preview" as const),
    getSplitPercent().catch(() => DEFAULT_SPLIT_PERCENT),
    getPaneWidthPreferences().catch(() => DEFAULT_PANE_WIDTH_PREFERENCES),
    getThemePreference().catch(() => null),
    chrome.runtime.sendMessage({ type: "consume-new-markdown-file" }).catch(() => null),
  ])
  createRoot(mount).render(React.createElement(FileRenderer, {
    initialContent,
    initialMode: newFile?.created ? "source" : initialMode,
    initialSplitPercent,
    initialPaneWidthPreferences,
    focusSource: newFile?.created === true,
    initialThemePreference,
  }))
}

void bootstrap()

// Plasmo's dev HMR overlay requires a default export; returning null keeps it inert.
export default function PlasmoOverlayPlaceholder() {
  return null
}
