// contents/markside.tsx
import iconSvg from "data-text:~assets/icon.svg"
import cssText from "data-text:~style.css"
import localizedCssText from "data-text:~lib/i18n-ui.css"
import type { PlasmoCSConfig } from "plasmo"
import React from "react"
import { createRoot } from "react-dom/client"

import {
  DEFAULT_PANE_WIDTH_PREFERENCES,
  DEFAULT_SPLIT_PERCENT,
  getMarkdownMode,
  getLeftOpenPreference,
  getOutlineOpenPreference,
  getPaneWidthPreferences,
  getSplitPercent
} from "~lib/markdown-mode"
import {
  getThemePreference
} from "~lib/theme-preference"
import { installHtmlEmbedNavigationPolicy } from "~lib/html-embed"
import { getInterfaceLanguage, loadInterfaceLanguagePreference } from "~lib/i18n"
import {
  readInitialFileContent
} from "~lib/url"

import { FileRenderer } from "~components/content-app"
import { WebPreview } from "~components/web-preview"
import { isWebMarkdownUrl } from "~lib/web-preview"

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
  if (document.getElementById("markside-mount")) return
  if (location.protocol === "http:" || location.protocol === "https:") {
    if (!isWebMarkdownUrl(location.href) || document.contentType !== "text/plain" || document.body.children.length !== 1 || document.body.firstElementChild?.tagName !== "PRE") return
    const source = document.body.firstElementChild.textContent ?? ""
    const style = document.createElement("style")
    style.textContent = cssText + "\n" + localizedCssText + "\nhtml,body{margin:0;height:100%}body>pre{display:none!important}"
    document.head.appendChild(style)
    const mount = document.createElement("div")
    mount.id = "markside-mount"
    document.body.appendChild(mount)
    const [, zen] = await Promise.all([
      loadInterfaceLanguagePreference().catch(() => "auto" as const),
      chrome.runtime.sendMessage({ type: "get-web-zen-mode" }).catch(() => null),
    ])
    mount.lang = getInterfaceLanguage()
    createRoot(mount).render(React.createElement(WebPreview, { source, url: location.href, initialZenMode: zen?.enabled === true }))
    return
  }
  const initialContent = readInitialFileContent(document.body)

  const faviconEl = document.createElement("link")
  faviconEl.rel = "icon"
  faviconEl.type = "image/svg+xml"
  faviconEl.href = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(iconSvg)
  document.head.appendChild(faviconEl)
  installHtmlEmbedNavigationPolicy(document)

  const styleEl = document.createElement("style")
  styleEl.id = "markside-styles"
  styleEl.textContent = cssText + "\n" + localizedCssText
  document.head.appendChild(styleEl)

  const resetEl = document.createElement("style")
  resetEl.textContent =
    "html,body{margin:0;height:100%}body>pre{display:none!important}"
  document.head.appendChild(resetEl)

  const mount = document.createElement("div")
  mount.id = "markside-mount"
  mount.lang = getInterfaceLanguage()
  mount.style.cssText = "height:100%;display:flex;flex-direction:column"
  document.body.appendChild(mount)
  const [initialMode, initialSplitPercent, initialPaneWidthPreferences, initialThemePreference, initialOutlineOpen, initialLeftOpen, newFile] = await Promise.all([
    getMarkdownMode().catch(() => "preview" as const),
    getSplitPercent().catch(() => DEFAULT_SPLIT_PERCENT),
    getPaneWidthPreferences().catch(() => DEFAULT_PANE_WIDTH_PREFERENCES),
    getThemePreference().catch(() => null),
    getOutlineOpenPreference().catch(() => null),
    getLeftOpenPreference().catch(() => true),
    chrome.runtime.sendMessage({ type: "consume-new-markdown-file" }).catch(() => null),
    loadInterfaceLanguagePreference().catch(() => "auto" as const),
  ])
  mount.lang = getInterfaceLanguage()
  createRoot(mount).render(React.createElement(FileRenderer, {
    initialContent,
    initialMode: newFile?.created ? "source" : initialMode,
    initialSplitPercent,
    initialPaneWidthPreferences,
    focusSource: newFile?.created === true,
    initialThemePreference,
    initialOutlineOpen,
    initialLeftOpen,
  }))
}

void bootstrap()

// Plasmo's dev HMR overlay requires a default export; returning null keeps it inert.
export default function PlasmoOverlayPlaceholder() {
  return null
}
