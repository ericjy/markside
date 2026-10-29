// @vitest-environment jsdom

import { act, createElement, useState } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import Options from "../options"
import { useInterfaceLanguage } from "../hooks/use-interface-language"
import { applyInterfaceLanguagePreference, INTERFACE_LANGUAGE_STORAGE_KEY, t } from "./i18n"
import { flush, renderHook, stubChromeStorage } from "./test-harness"

let root: ReturnType<typeof createRoot> | undefined
let container: HTMLDivElement

beforeEach(() => {
  container = document.createElement("div")
  document.body.appendChild(container)
})

afterEach(() => {
  if (root) act(() => root?.unmount())
  root = undefined
  container.remove()
  applyInterfaceLanguagePreference("auto")
  document.documentElement.removeAttribute("lang")
  vi.unstubAllGlobals()
})

function configureBrowser(initial: Record<string, unknown> = {}) {
  const storage = stubChromeStorage(initial)
  Object.assign(chrome, {
    i18n: { getUILanguage: () => "en-US" },
    extension: { isAllowedFileSchemeAccess: async () => false },
    runtime: { id: "test-extension" },
  })
  return storage
}

function OpenDocument() {
  const { language } = useInterfaceLanguage()
  const [draft] = useState("An unsaved draft")
  return createElement("div", { "data-document": "", lang: language },
    createElement("span", null, t("Save")),
    createElement("textarea", { value: draft, readOnly: true }),
  )
}

describe("independent interface language", () => {
  it("offers every language before file access is enabled and updates open surfaces without losing a draft", async () => {
    const storage = configureBrowser()
    root = createRoot(container)
    await act(async () => root?.render(createElement("div", null,
      createElement(Options),
      createElement(OpenDocument),
    )))
    await flush()

    const select = container.querySelector<HTMLSelectElement>("#interface-language")
    expect(select).not.toBeNull()
    expect(Array.from(select!.options, (option) => option.value))
      .toEqual(["auto", "en", "zh-CN", "zh-TW", "ko", "ja", "es"])
    expect(container.textContent).toContain("One more step before Markside can open your files")

    for (const [value, saveLabel, settingsLabel] of [
      ["zh-CN", "保存", "Markside 设置"],
      ["zh-TW", "儲存", "Markside 設定"],
      ["ko", "저장", "Markside 설정"],
      ["ja", "保存", "Markside 設定"],
      ["es", "Guardar", "Configuración de Markside"],
      ["en", "Save", "Markside Settings"],
    ]) {
      await act(async () => {
        select!.value = value
        select!.dispatchEvent(new Event("change", { bubbles: true }))
      })
      expect(storage.data[INTERFACE_LANGUAGE_STORAGE_KEY]).toBe(value)
      expect(document.documentElement.lang).toBe(value)
      expect(container.querySelector("[data-document]")?.getAttribute("lang")).toBe(value)
      expect(container.querySelector("[data-document] span")?.textContent).toBe(saveLabel)
      expect(container.querySelector("h1")?.textContent).toBe(settingsLabel)
      expect(container.querySelector("textarea")?.value).toBe("An unsaved draft")
      if (value === "ko") {
        expect(container.querySelector(".setup strong span[lang='en']")?.textContent)
          .toBe("Allow access to file URLs")
        expect(container.querySelector(".setup strong span[lang='ko']")?.textContent)
          .toContain("파일 URL에 대한 액세스 허용")
        expect(container.querySelector(".demo-window")?.getAttribute("lang")).toBe("en")
      }
    }

    await act(async () => {
      select!.value = "auto"
      select!.dispatchEvent(new Event("change", { bubbles: true }))
    })
    expect(storage.data[INTERFACE_LANGUAGE_STORAGE_KEY]).toBe("auto")
    expect(document.documentElement.lang).toBe("en")
  })

  it("restores a saved preference and falls back for an invalid value", async () => {
    const storage = configureBrowser({ [INTERFACE_LANGUAGE_STORAGE_KEY]: "ko" })
    const hook = renderHook(useInterfaceLanguage, undefined)
    await flush()
    expect(hook.result.current).toEqual({ preference: "ko", language: "ko", ready: true })
    expect(t("Save")).toBe("저장")
    await act(async () => storage.set({ [INTERFACE_LANGUAGE_STORAGE_KEY]: "invalid" }))
    expect(hook.result.current).toEqual({ preference: "auto", language: "en", ready: true })
    hook.unmount()
  })

  it("follows the browser again when the saved choice is reset", async () => {
    const storage = configureBrowser({ [INTERFACE_LANGUAGE_STORAGE_KEY]: "ja" })
    chrome.i18n.getUILanguage = () => "ko-KR"
    const hook = renderHook(useInterfaceLanguage, undefined)
    await flush()
    expect(hook.result.current.language).toBe("ja")
    await act(async () => storage.set({ [INTERFACE_LANGUAGE_STORAGE_KEY]: "auto" }))
    expect(hook.result.current).toEqual({ preference: "auto", language: "ko", ready: true })
    hook.unmount()
  })

  it("reports a failed save without changing the selected language", async () => {
    configureBrowser()
    root = createRoot(container)
    await act(async () => root?.render(createElement(Options)))
    await flush()
    vi.mocked(chrome.storage.local.set).mockRejectedValueOnce(new Error("Storage unavailable"))
    const select = container.querySelector<HTMLSelectElement>("#interface-language")!
    await act(async () => {
      select.value = "ko"
      select.dispatchEvent(new Event("change", { bubbles: true }))
    })
    expect(select.value).toBe("auto")
    expect(container.querySelector('[role="alert"]')?.textContent)
      .toBe("Could not save the language. Please try again.")
  })

  it("does not let a slow initial read overwrite a newer preference change", async () => {
    const storage = configureBrowser()
    let finishRead: (value: Record<string, unknown>) => void = () => undefined
    vi.mocked(chrome.storage.local.get).mockImplementationOnce(() => new Promise((resolve) => { finishRead = resolve }))
    const hook = renderHook(useInterfaceLanguage, undefined)
    await act(async () => storage.set({ [INTERFACE_LANGUAGE_STORAGE_KEY]: "ja" }))
    await act(async () => finishRead({ [INTERFACE_LANGUAGE_STORAGE_KEY]: "es" }))
    expect(hook.result.current).toEqual({ preference: "ja", language: "ja", ready: true })
    hook.unmount()
  })
})
