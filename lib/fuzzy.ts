export type FileEntry = { name: string; path: string }

/**
 * Returns a rank score (lower = better) for how well the entry matches the
 * query, or null if it does not match at all.
 *
 * Score 0 — filename starts with query
 * Score 1 — filename contains query as substring
 * Score 2 — full path contains all query chars in order (char-sequence)
 */
export function rankMatch(query: string, entry: FileEntry): number | null {
  const q = query.toLowerCase()
  const name = entry.name.toLowerCase()
  const path = entry.path.toLowerCase()
  if (name.startsWith(q)) return 0
  if (name.includes(q)) return 1
  if (charSequence(q, path)) return 2
  return null
}

function charSequence(query: string, target: string): boolean {
  let qi = 0
  for (const ch of target) {
    if (ch === query[qi]) qi++
    if (qi === query.length) return true
  }
  return false
}

/**
 * Filters and ranks files by query. Works with any object that has name and
 * path (generic T extends FileEntry), so handles are preserved in the result.
 * Empty query returns all files sorted alphabetically by path.
 */
export function fuzzySearch<T extends FileEntry>(query: string, files: T[]): T[] {
  if (!query.trim()) {
    return [...files].sort((a, b) => a.path.localeCompare(b.path))
  }
  const q = query.trim().toLowerCase()
  const scored: Array<{ file: T; score: number }> = []
  for (const file of files) {
    const score = rankMatch(q, file)
    if (score !== null) scored.push({ file, score })
  }
  return scored
    .sort((a, b) => a.score - b.score || a.file.path.localeCompare(b.file.path))
    .map(({ file }) => file)
}
