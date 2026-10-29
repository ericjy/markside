import { t } from "./i18n"

export function formatDocumentStats(source: string): string {
  const words = source.match(/\S+/g)?.length ?? 0
  const readingTime = words > 0 && words < 200
    ? "<1"
    : String(Math.ceil(words / 200))

  return t(words === 1 ? "{0} word · {1} min read" : "{0} words · {1} min read", [words.toLocaleString("en-US"), readingTime])
}
