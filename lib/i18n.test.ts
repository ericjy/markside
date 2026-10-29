import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import ts from "typescript"
import { afterEach, describe, expect, it, vi } from "vitest"

import { localize, resolveInterfaceLanguage, t, tPresetChip, tRich } from "./i18n"
import { REVIEW_PRESETS } from "./review-presets"
import simplifiedChinese from "./locales/zh-CN.json"
import traditionalChinese from "./locales/zh-TW.json"
import korean from "./locales/ko.json"
import japanese from "./locales/ja.json"
import spanish from "./locales/es.json"

afterEach(() => vi.unstubAllGlobals())

describe("interface language", () => {
  it.each([
    ["zh-CN", "zh-CN"], ["zh-SG", "zh-CN"], ["zh-Hans", "zh-CN"],
    ["zh-TW", "zh-TW"], ["zh-HK", "zh-TW"], ["zh-Hant-TW", "zh-TW"],
    ["ko-KR", "ko"], ["ja-JP", "ja"], ["es-419", "es"],
    ["en-GB", "en"], ["fr-FR", "en"],
  ] as const)("resolves %s to %s", (locale, expected) => {
    expect(resolveInterfaceLanguage(locale)).toBe(expected)
  })

  it("preserves surrounding spaces, interpolations, and the English fallback", () => {
    expect(localize("  Unknown message ", "ko")).toBe("  Unknown message ")
    expect(t("Open {0}", ["notes.md.txt"])).toBe("Open notes.md.txt")
  })

  it("uses the browser UI language without changing substituted document text", () => {
    vi.stubGlobal("chrome", { i18n: { getUILanguage: () => "zh-TW" } })
    expect(t("Save")).toBe("儲存")
    expect(t("Open the Review for {0}", ["Save"])).toContain("Save")
    expect(renderToStaticMarkup(createElement("div", null,
      tRich("Press {0} to save it anywhere.", createElement("kbd", null, "Ctrl+S")),
    ))).toContain("<kbd>Ctrl+S</kbd>")
  })

  it("keeps every placeholder in each translated message", () => {
    for (const catalog of [simplifiedChinese, traditionalChinese, korean, japanese, spanish]) {
      for (const [source, translated] of Object.entries(catalog)) {
        const placeholders = (value: string) => [...value.matchAll(/\{\d+\}/g)].map((match) => match[0]).sort()
        expect(placeholders(translated), source).toEqual(placeholders(source))
      }
    }
  })

  it("uses product terminology for core controls", () => {
    expect(spanish["Open as Markdown"]).toBe("Abrir como Markdown")
    expect(simplifiedChinese["Source"]).toBe("源码")
    expect(traditionalChinese["Source"]).toBe("原始碼")
    expect(korean["Save"]).toBe("저장")
    expect(japanese["Split"]).toBe("分割表示")
    expect(simplifiedChinese["Import"]).toBe("导入")
    expect(simplifiedChinese["Addressed"]).not.toBe(simplifiedChinese["Resolved"])
  })

  it("distinguishes the Split view from the review action without changing agent instructions", () => {
    vi.stubGlobal("chrome", { i18n: { getUILanguage: () => "zh-CN" } })
    expect(t("Split")).toBe("分栏")
    expect(tPresetChip("Split")).toBe("拆分")
    expect(REVIEW_PRESETS.find((preset) => preset.chip === "Split")?.instruction)
      .toBe("Split this so each part has one clear purpose.")
  })

  it("provides valid extension names and descriptions for every supported locale", () => {
    for (const locale of ["en", "zh_CN", "zh_TW", "ko", "ja", "es"]) {
      const messages = JSON.parse(readFileSync(join("locales", locale, "messages.json"), "utf8")) as Record<string, { message: string }>
      expect(messages.extensionName.message).toContain("Markside")
      expect(messages.extensionDescription.message.length).toBeLessThanOrEqual(132)
    }
  })

  it("provides every explicitly localized interface string in every language", () => {
    const sourceFiles: string[] = ["popup.tsx", "options.tsx"]
    const addFiles = (directory: string) => {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name)
        if (entry.isDirectory()) addFiles(path)
        else if (/\.tsx?$/.test(path) && !path.endsWith(".test.ts") && !path.includes("bundle")) sourceFiles.push(path)
      }
    }
    for (const directory of ["components", "hooks", "tabs", "contents", "lib"]) addFiles(directory)
    const keys = new Set<string>()
    const collect = (node: ts.Expression | undefined) => {
      if (!node) return
      if (ts.isStringLiteral(node)) keys.add(node.text.trim())
      else if (ts.isConditionalExpression(node)) {
        collect(node.whenTrue)
        collect(node.whenFalse)
      }
    }
    for (const path of sourceFiles) {
      const source = readFileSync(path, "utf8")
      const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true,
        path.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
      const visit = (node: ts.Node) => {
        if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && ["t", "tRich"].includes(node.expression.text)) collect(node.arguments[0])
        ts.forEachChild(node, visit)
      }
      visit(file)
    }
    for (const catalog of [simplifiedChinese, traditionalChinese, korean, japanese, spanish]) {
      const dictionary: Record<string, string> = catalog
      expect([...keys].filter((key) => !(key in dictionary))).toEqual([])
    }
  })
})
