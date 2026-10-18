import { useEffect,useRef,useState } from "react"
import { getTypeface,TYPEFACES,watchTypeface,type Typeface } from "~lib/typeface"

export function useContentPreferences(initialThemePreference: boolean | null) {
  const [dark, setDark] = useState(
    () =>
      initialThemePreference ??
      window.matchMedia("(prefers-color-scheme: dark)").matches
  )
  const followsSystemThemeRef = useRef(initialThemePreference === null)
  const [numberHeadings, setNumberHeadings] = useState(false)

  useEffect(() => {
    let active = true
    void chrome.storage.local.get("numberHeadings").then(saved => {
      if (active) setNumberHeadings(saved.numberHeadings === true)
    })
    const onChange = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === "local" && changes.numberHeadings) {
        setNumberHeadings(changes.numberHeadings.newValue === true)
      }
    }
    chrome.storage.onChanged.addListener(onChange)
    return () => {
      active = false
      chrome.storage.onChanged.removeListener(onChange)
    }
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark)
  }, [dark])

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = (e: MediaQueryListEvent) => {
      if (followsSystemThemeRef.current) setDark(e.matches)
    }
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])

  useEffect(() => {
    let active = true
    const applyTypeface = (typeface: Typeface) => {
      if (!active) return
      document.documentElement.style.setProperty("--markside-prose-font", TYPEFACES[typeface].stack)
    }
    void getTypeface().then(applyTypeface)
    const unwatch = watchTypeface(applyTypeface)
    return () => {
      active = false
      unwatch()
    }
  }, [])

  return { dark, setDark, followsSystemThemeRef, numberHeadings, setNumberHeadings }
}
