import { createElement, Fragment, type ReactNode } from "react"

import simplifiedChinese from "./locales/zh-CN.json"
import traditionalChinese from "./locales/zh-TW.json"
import korean from "./locales/ko.json"
import japanese from "./locales/ja.json"
import spanish from "./locales/es.json"

export type InterfaceLanguage = "en" | "zh-CN" | "zh-TW" | "ko" | "ja" | "es"

const translations: Record<Exclude<InterfaceLanguage, "en">, Record<string, string>> = {
  "zh-CN": simplifiedChinese,
  "zh-TW": traditionalChinese,
  ko: korean,
  ja: japanese,
  es: spanish,
}

export function resolveInterfaceLanguage(locale: string): InterfaceLanguage {
  const normalized = locale.replace(/_/g, "-").toLowerCase()
  if (normalized.startsWith("zh")) {
    return /(?:^|-)hant(?:-|$)|(?:^|-)(?:tw|hk|mo)(?:-|$)/.test(normalized)
      ? "zh-TW" : "zh-CN"
  }
  if (/^ko(?:-|$)/.test(normalized)) return "ko"
  if (/^ja(?:-|$)/.test(normalized)) return "ja"
  if (/^es(?:-|$)/.test(normalized)) return "es"
  return "en"
}

export function getInterfaceLanguage(): InterfaceLanguage {
  const locale = typeof chrome !== "undefined" && chrome.i18n?.getUILanguage
    ? chrome.i18n.getUILanguage()
    : typeof navigator !== "undefined" ? navigator.language : "en"
  return resolveInterfaceLanguage(locale)
}

export function localize(source: string, language: InterfaceLanguage): string {
  const trimmed = source.trim()
  const translated = language === "en" ? trimmed : translations[language][trimmed] ?? trimmed
  const leading = source.match(/^\s*/)?.[0] ?? ""
  const trailing = source.match(/\s*$/)?.[0] ?? ""
  return leading + translated + trailing
}

export function t(source: string, values: readonly unknown[] = []): string {
  return localize(source, getInterfaceLanguage()).replace(/\{(\d+)\}/g, (match, index: string) =>
    Number(index) < values.length ? String(values[Number(index)]) : match,
  )
}

export function tPresetChip(chip: string): string {
  if (chip === "Split" && getInterfaceLanguage() !== "en") return t("Review preset: Split")
  return t(chip)
}

export function tRich(source: string, ...values: ReactNode[]): ReactNode[] {
  const translated = localize(source, getInterfaceLanguage())
  return translated.split(/(\{\d+\})/g).map((part, index) => {
    const match = /^\{(\d+)\}$/.exec(part)
    if (!match || Number(match[1]) >= values.length) return part
    return createElement(Fragment, { key: index }, values[Number(match[1])])
  })
}
