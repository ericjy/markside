type FileTreeNodeLike = {
  kind: "file" | "directory"
  name: string
}

const REPOSITORY_DOCUMENT_NAMES = new Set([
  "AGENTS",
  "AUTHORS",
  "CHANGELOG",
  "CLAUDE",
  "CODE_OF_CONDUCT",
  "CONTEXT",
  "CONTRIBUTING",
  "COPYING",
  "DESIGN",
  "GOVERNANCE",
  "MAINTAINERS",
  "NOTICE",
  "README",
  "SECURITY",
  "SUPPORT"
])

const DOCUMENT_EXTENSION = /\.(?:md|markdown|rst|txt)$/i
const LICENSE_NAME = /^LICEN[CS]E(?:[-.].+)?$/i

function fileRank(name: string): number {
  if (name.startsWith(".")) return 0

  const documentName = name.replace(DOCUMENT_EXTENSION, "")
  if (
    REPOSITORY_DOCUMENT_NAMES.has(documentName.toUpperCase()) ||
    LICENSE_NAME.test(documentName)
  ) {
    return 1
  }

  return 2
}

export function sortFileTreeNodes<T extends FileTreeNodeLike>(
  nodes: readonly T[]
): T[] {
  return [...nodes].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "directory" ? -1 : 1

    if (a.kind === "file" && b.kind === "file") {
      const rankDifference = fileRank(a.name) - fileRank(b.name)
      if (rankDifference !== 0) return rankDifference
    }

    return a.name.localeCompare(b.name)
  })
}
