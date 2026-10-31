import { getInterfaceLanguage, t } from "./i18n"
import { createHighlighterCore } from "@shikijs/core"
import { createJavaScriptRegexEngine } from "@shikijs/engine-javascript"

import langCss from "@shikijs/langs/css"
import langDiff from "@shikijs/langs/diff"
import langDockerfile from "@shikijs/langs/dockerfile"
import langGo from "@shikijs/langs/go"
import langHttp from "@shikijs/langs/http"
import langHtml from "@shikijs/langs/html"
import langJavascript from "@shikijs/langs/javascript"
import langJson from "@shikijs/langs/json"
import langJsx from "@shikijs/langs/jsx"
import langMarkdown from "@shikijs/langs/markdown"
import langPython from "@shikijs/langs/python"
import langRust from "@shikijs/langs/rust"
import langShell from "@shikijs/langs/shellscript"
import langSql from "@shikijs/langs/sql"
import langToml from "@shikijs/langs/toml"
import langTsx from "@shikijs/langs/tsx"
import langTypescript from "@shikijs/langs/typescript"
import langXml from "@shikijs/langs/xml"
import langYaml from "@shikijs/langs/yaml"
import themeDark from "@shikijs/themes/github-dark"
import themeLight from "@shikijs/themes/github-light"

import {
  CHECK_ICON,
  COPY_ICON,
  getCodeBlockWrapPreference,
  getCodeBlockLanguageLabel,
  setCodeBlockWrapPreference,
  WRAP_ICON,
} from "./code-block"

let _promise: ReturnType<typeof createHighlighterCore> | null = null

function getHighlighter() {
  if (!_promise) {
    _promise = createHighlighterCore({
      engine: createJavaScriptRegexEngine(),
      themes: [themeLight, themeDark],
      langs: [
        ...langTypescript,
        ...langTsx,
        ...langJavascript,
        ...langJsx,
        ...langPython,
        ...langShell,
        ...langJson,
        ...langCss,
        ...langHtml,
        ...langMarkdown,
        ...langYaml,
        ...langGo,
        ...langRust,
        ...langSql,
        ...langDiff,
        ...langToml,
        ...langDockerfile,
        ...langHttp,
        ...langXml
      ]
    })
  }
  return _promise
}

export async function highlightMarkdownSource(code: HTMLElement, source: string): Promise<void> {
  const highlighter = await getHighlighter()
  const html = highlighter.codeToHtml(source, {
    lang: "markdown",
    themes: { light: "github-light", dark: "github-dark" },
    defaultColor: false,
  })
  const container = document.createElement("div")
  container.innerHTML = html
  const highlighted = container.querySelector("code")
  if (highlighted && code.isConnected) code.replaceChildren(...highlighted.childNodes)
}

export async function highlightCodeBlocks(container: HTMLElement): Promise<void> {
  const blocks = Array.from(container.querySelectorAll("pre > code"))
  if (!blocks.length) return

  let hl: Awaited<ReturnType<typeof getHighlighter>>
  try {
    hl = await getHighlighter()
  } catch (e) {
    console.error("[shiki] highlighter init failed", e)
    return
  }

  for (const codeEl of blocks) {
    const pre = codeEl.parentElement
    if (!pre) continue

    const lang =
      Array.from(codeEl.classList)
        .find((c) => c.startsWith("language-"))
        ?.replace("language-", "") ?? "text"

    if (lang === "mermaid" || lang === "vega-lite") continue

    const code = codeEl.textContent ?? ""

    try {
      const highlighted = hl.codeToHtml(code, {
        lang,
        themes: { light: "github-light", dark: "github-dark" },
        defaultColor: false
      })
      const tmp = document.createElement("div")
      tmp.innerHTML = highlighted
      const shikiPre = tmp.firstElementChild
      if (!shikiPre) continue

      const existingWrapper =
        pre.parentElement?.classList.contains("code-block")
          ? pre.parentElement
          : null
      const wrapper = existingWrapper ?? document.createElement("div")
      const label = getCodeBlockLanguageLabel(lang)
      wrapper.className = label ? "code-block" : "code-block code-block-plain"

      const header = document.createElement("div")
      header.className = "code-block-header"
      header.lang = getInterfaceLanguage()

      const langLabel = document.createElement("span")
      langLabel.className = "code-block-lang"
      langLabel.textContent = label

      const copyBtn = document.createElement("button")
      copyBtn.className = "code-block-copy"
      copyBtn.setAttribute("aria-label", t("Copy code"))
      copyBtn.title = t("Copy code")
      copyBtn.innerHTML = COPY_ICON
      copyBtn.addEventListener("click", () => {
        navigator.clipboard.writeText(code).then(() => {
          copyBtn.innerHTML = CHECK_ICON
          copyBtn.classList.add("copied")
          setTimeout(() => {
            copyBtn.innerHTML = COPY_ICON
            copyBtn.classList.remove("copied")
          }, 2000)
        })
      })

      const wrapBtn = document.createElement("button")
      wrapBtn.className = "code-block-wrap"
      wrapBtn.innerHTML = WRAP_ICON
      const syncWrapState = () => {
        const wrapped = getCodeBlockWrapPreference()
        const wrapLabel = wrapped ? t("Don't wrap lines") : t("Wrap lines")
        container.querySelectorAll<HTMLElement>(".code-block").forEach((block) => {
          block.classList.toggle("code-block-wrapped", wrapped)
        })
        container.querySelectorAll<HTMLButtonElement>(".code-block-wrap").forEach((button) => {
          button.setAttribute("aria-label", wrapLabel)
          button.setAttribute("aria-pressed", String(wrapped))
          button.title = wrapLabel
        })
      }
      wrapBtn.addEventListener("click", () => {
        setCodeBlockWrapPreference(!getCodeBlockWrapPreference())
        syncWrapState()
      })

      const actions = document.createElement("div")
      actions.className = "code-block-actions"
      actions.appendChild(wrapBtn)
      actions.appendChild(copyBtn)

      header.appendChild(langLabel)
      header.appendChild(actions)
      if (existingWrapper) {
        wrapper.replaceChildren(header, shikiPre)
      } else {
        wrapper.appendChild(header)
        wrapper.appendChild(shikiPre)
        pre.replaceWith(wrapper)
      }
      syncWrapState()
    } catch (e) {
      console.error("[shiki] highlight failed for lang:", lang, e)
    }
  }
}
