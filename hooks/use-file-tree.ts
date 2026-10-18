import { useEffect, useRef, useState } from "react"

import {
  getExpandedFileTreePaths,
  setExpandedFileTreePaths,
  updateExpandedFileTreePaths
} from "~lib/file-tree-state"
import { sortFileTreeNodes } from "~lib/file-tree-order"

export const SKIP = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  ".plasmo",
  "__pycache__",
  ".DS_Store"
])

export type FileNode = {
  kind: "file"
  name: string
  handle: FileSystemFileHandle
  path: string
}

export type DirNode = {
  kind: "directory"
  name: string
  handle: FileSystemDirectoryHandle
  path: string
  children: TreeNode[] | null // null = collapsed / not loaded
}

export type TreeNode = FileNode | DirNode

async function readDir(
  handle: FileSystemDirectoryHandle,
  path: string,
  expandedPaths: ReadonlySet<string> = new Set()
): Promise<TreeNode[]> {
  const entries: TreeNode[] = []
  for await (const entry of handle.values()) {
    if (SKIP.has(entry.name)) continue
    const entryPath = path ? `${path}/${entry.name}` : entry.name
    if (entry.kind === "directory") {
      const directoryHandle = entry as FileSystemDirectoryHandle
      entries.push({
        kind: "directory",
        name: entry.name,
        handle: directoryHandle,
        path: entryPath,
        children: expandedPaths.has(entryPath)
          ? await readDir(directoryHandle, entryPath, expandedPaths)
          : null
      })
    } else {
      entries.push({
        kind: "file",
        name: entry.name,
        handle: entry as FileSystemFileHandle,
        path: entryPath
      })
    }
  }
  return sortFileTreeNodes(entries)
}

export function useFileTree(
  rootHandle: FileSystemDirectoryHandle | null,
  rootUrl: string | null,
  canRead: boolean,
  refreshVersion = 0,
) {
  const [tree, setTree] = useState<TreeNode[]>([])
  const expandedPathsRef = useRef<string[]>([])

  useEffect(() => {
    let active = true
    expandedPathsRef.current = []

    if (!rootHandle || !canRead) {
      setTree([])
      return () => {
        active = false
      }
    }

    const loadTree = async () => {
      const expandedPaths = rootUrl
        ? await getExpandedFileTreePaths(rootUrl)
        : []
      const nextTree = await readDir(
        rootHandle,
        "",
        new Set(expandedPaths)
      )
      if (!active) return
      expandedPathsRef.current = expandedPaths
      setTree(nextTree)
    }

    void loadTree()
    return () => {
      active = false
    }
  }, [rootHandle, rootUrl, canRead, refreshVersion])

  const expandDir = async (node: DirNode) => {
    if (node.children !== null) return // already loaded
    const children = await readDir(
      node.handle,
      node.path,
      new Set(expandedPathsRef.current)
    )
    setTree((prev) => patchTree(prev, node.path, children))

    const nextPaths = updateExpandedFileTreePaths(
      expandedPathsRef.current,
      node.path,
      true
    )
    expandedPathsRef.current = nextPaths
    if (rootUrl) await setExpandedFileTreePaths(rootUrl, nextPaths)
  }

  const collapseDir = (node: DirNode) => {
    setTree((prev) => patchTree(prev, node.path, null))

    const nextPaths = updateExpandedFileTreePaths(
      expandedPathsRef.current,
      node.path,
      false
    )
    expandedPathsRef.current = nextPaths
    if (rootUrl) void setExpandedFileTreePaths(rootUrl, nextPaths)
  }

  return { tree, expandDir, collapseDir }
}

function patchTree(
  nodes: TreeNode[],
  targetPath: string,
  children: TreeNode[] | null
): TreeNode[] {
  return nodes.map((n) => {
    if (n.kind !== "directory") return n
    if (n.path === targetPath) return { ...n, children }
    if (n.children) {
      return { ...n, children: patchTree(n.children, targetPath, children) }
    }
    return n
  })
}
