export function formatDocumentStats(source: string): string {
  const words = source.match(/\S+/g)?.length ?? 0
  const readingTime = words > 0 && words < 200
    ? "<1"
    : String(Math.ceil(words / 200))

  return `${words.toLocaleString("en-US")} ${words === 1 ? "word" : "words"} · ${readingTime} min read`
}
