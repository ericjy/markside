import { useEffect, useState } from "react"

import {
  applyInterfaceLanguagePreference,
  getInterfaceLanguage,
  INTERFACE_LANGUAGE_STORAGE_KEY,
  type InterfaceLanguagePreference,
} from "~lib/i18n"

export function useInterfaceLanguage() {
  const [preference, setPreference] = useState<InterfaceLanguagePreference>("auto")
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let active = true
    let changed = false
    const apply = (value: unknown) => {
      if (!active) return
      setPreference(applyInterfaceLanguagePreference(value))
      setReady(true)
    }
    const onChange = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area !== "local" || !changes[INTERFACE_LANGUAGE_STORAGE_KEY]) return
      changed = true
      apply(changes[INTERFACE_LANGUAGE_STORAGE_KEY].newValue)
    }
    chrome.storage.onChanged.addListener(onChange)
    void chrome.storage.local.get(INTERFACE_LANGUAGE_STORAGE_KEY).then((stored) => {
      if (!changed) apply(stored[INTERFACE_LANGUAGE_STORAGE_KEY])
    }).catch(() => {
      if (!changed) apply("auto")
    })
    return () => {
      active = false
      chrome.storage.onChanged.removeListener(onChange)
    }
  }, [])

  return { preference, language: getInterfaceLanguage(), ready }
}
