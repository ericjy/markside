import { t } from "~lib/i18n"
import {
  Bot,
  BookOpen,
  Braces,
  ChevronRight,
  Code,
  File,
  FileImage,
  FileText,
  Folder,
  FolderOpen,
  Scale
} from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "~components/ui/collapsible"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub
} from "~components/ui/sidebar"
import type { DirNode, FileNode, TreeNode } from "~hooks/use-file-tree"

function getFileIcon(name: string) {
  if (/^(?:AGENTS|CLAUDE)\.md$/i.test(name)) {
    return <Bot className="h-3.5 w-3.5 shrink-0 text-fuchsia-400" />
  }
  if (/^LICEN[CS]E(?:[-.].+)?$/i.test(name)) {
    return <Scale className="h-3.5 w-3.5 shrink-0 text-amber-400" />
  }
  if (/^README(?:\.(?:md|markdown|rst|txt))?$/i.test(name)) {
    return <BookOpen className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
  }

  const ext = name.slice(name.lastIndexOf(".") + 1).toLowerCase()
  switch (ext) {
    case "md":
    case "mdx":
    case "markdown":
      return <FileText className="h-3.5 w-3.5 shrink-0 text-sky-500" />
    case "ts":
    case "tsx":
    case "js":
    case "jsx":
    case "mjs":
    case "cjs":
    case "py":
    case "go":
    case "rs":
    case "rb":
    case "java":
    case "c":
    case "cpp":
    case "cs":
    case "php":
    case "swift":
    case "kt":
    case "sh":
    case "bash":
    case "zsh":
    case "css":
    case "scss":
    case "html":
    case "sql":
      return <Code className="h-3.5 w-3.5 shrink-0 text-violet-400" />
    case "json":
    case "jsonc":
    case "yaml":
    case "yml":
    case "toml":
    case "xml":
    case "env":
      return <Braces className="h-3.5 w-3.5 shrink-0 text-amber-400" />
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "svg":
    case "webp":
    case "ico":
      return <FileImage className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
    default:
      return <File className="h-3.5 w-3.5 shrink-0 opacity-40" />
  }
}

interface Props {
  nodes: TreeNode[]
  selectedPath: string | null
  onFileClick: (node: FileNode) => void
  onDirToggle: (node: DirNode) => void
  rootUrl: string | null
  reviewCounts: Record<string, number>
}

export function FileTree({
  nodes,
  selectedPath,
  onFileClick,
  onDirToggle,
  rootUrl,
  reviewCounts
}: Props) {
  return (
    <SidebarMenu>
      {nodes.map((node) => (
        <TreeNode
          key={node.path}
          node={node}
          selectedPath={selectedPath}
          onFileClick={onFileClick}
          onDirToggle={onDirToggle}
          rootUrl={rootUrl}
          reviewCounts={reviewCounts}
        />
      ))}
    </SidebarMenu>
  )
}

function TreeNode({
  node,
  selectedPath,
  onFileClick,
  onDirToggle,
  rootUrl,
  reviewCounts
}: {
  node: TreeNode
  selectedPath: string | null
  onFileClick: (node: FileNode) => void
  onDirToggle: (node: DirNode) => void
  rootUrl: string | null
  reviewCounts: Record<string, number>
}) {
  if (node.kind === "file") {
    const encodedPath = node.path.split("/").map(encodeURIComponent).join("/")
    const sourceUrl = rootUrl ? new URL(encodedPath, rootUrl).href : null
    const reviewCount = sourceUrl ? reviewCounts[sourceUrl] ?? 0 : 0
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          isActive={node.path === selectedPath}
          className="gap-1.5">
          <a
            href={sourceUrl ?? undefined}
            onClick={(event) => {
              if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
              event.preventDefault()
              onFileClick(node)
            }}>
            {getFileIcon(node.name)}
            <span className="truncate text-sm">{node.name}</span>
            {reviewCount > 0 && (
              <span
                title={t("{0} review item{1}", [reviewCount, reviewCount === 1 ? "" : "s"])}
                className="ml-auto min-w-4 rounded-full bg-amber-400/25 px-1 text-center text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                {reviewCount}
              </span>
            )}
          </a>
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

  const isOpen = node.children !== null

  return (
    <SidebarMenuItem>
      <Collapsible open={isOpen} onOpenChange={() => onDirToggle(node)}>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton className="gap-1.5">
            <ChevronRight
              className={`h-3.5 w-3.5 shrink-0 opacity-60 transition-transform ${isOpen ? "rotate-90" : ""}`}
            />
            {isOpen
              ? <FolderOpen className="h-3.5 w-3.5 shrink-0 text-amber-300" />
              : <Folder className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />
            }
            <span className="truncate text-sm">{node.name}</span>
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          {node.children && node.children.length > 0 && (
            <SidebarMenuSub>
              {node.children.map((child) => (
                <TreeNode
                  key={child.path}
                  node={child}
                  selectedPath={selectedPath}
                  onFileClick={onFileClick}
                  onDirToggle={onDirToggle}
                  rootUrl={rootUrl}
                  reviewCounts={reviewCounts}
                />
              ))}
            </SidebarMenuSub>
          )}
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  )
}
