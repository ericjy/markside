import { t, tRich } from "~lib/i18n"
// components/sidebar-left.tsx
import { FilePlus2, FolderOpen, Search } from "lucide-react"
import React, { useEffect, useRef } from "react"
import { createPortal } from "react-dom"

import { FileTree } from "~components/file-tree"
import { FolderPickerTip } from "~components/folder-picker-tip"
import { createMarkdownInFolder, openNewMarkdownTab } from "~lib/new-markdown-file"
import { fileFolderPath } from "~lib/url"
import * as Dialog from "@radix-ui/react-dialog"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader
} from "~components/ui/sidebar"
import { type DirectoryStatus, type FolderError } from "~hooks/use-persisted-directory"
import { useFileTree, type DirNode, type FileNode } from "~hooks/use-file-tree"
import {
  clearSidebarScrollTop,
  getSidebarScrollTop,
  setSidebarScrollTop,
} from "~lib/file-tree-state"

interface SidebarLeftProps {
  currentFileUrl: string
  sidebarWidth: number
  onResize: (width: number) => void
  onFileSelect: (url: string, handle: FileSystemFileHandle) => void
  // lifted from usePersistedDirectory in markside.tsx:
  handle: FileSystemDirectoryHandle | null
  rootUrl: string | null
  status: DirectoryStatus
  openDirectory: () => Promise<boolean>
  reauthorize: () => Promise<void>
  folderError: FolderError | null
  onOpenPalette: () => void
  reviewCounts: Record<string, number>
}

function getExtensionVersion() {
  try {
    return chrome.runtime.getManifest().version
  } catch {
    return null
  }
}

export function SidebarLeft({
  currentFileUrl,
  sidebarWidth,
  onResize,
  onFileSelect,
  handle,
  rootUrl,
  status,
  openDirectory,
  reauthorize,
  folderError,
  onOpenPalette,
  reviewCounts
}: SidebarLeftProps) {
  const [treeVersion, setTreeVersion] = React.useState(0)
  const decodedCurrent = decodeURIComponent(currentFileUrl)
  const decodedRoot = rootUrl ? decodeURIComponent(rootUrl) : null
  const activeFilePath =
    decodedRoot && decodedCurrent.startsWith(decodedRoot)
      ? decodedCurrent.slice(decodedRoot.length)
      : null
  const activeFileFolder = activeFilePath?.includes("/")
    ? activeFilePath.slice(0, activeFilePath.lastIndexOf("/"))
    : null
  const { tree, expandDir, collapseDir } = useFileTree(
    handle,
    rootUrl,
    status === "granted",
    treeVersion,
    activeFileFolder,
  )
  const contentRef = useRef<HTMLDivElement>(null)
  const scrollRestoredForUrlRef = useRef<string | null>(null)
  const revealedFilePathRef = useRef<string | null>(null)
  const [folderInfoOpen, setFolderInfoOpen] = React.useState(false)
  const [newFileError, setNewFileError] = React.useState<string | null>(null)
  const [creatingFile, setCreatingFile] = React.useState(false)
  const [newFileOpen, setNewFileOpen] = React.useState(false)
  const [newFileName, setNewFileName] = React.useState("Untitled.md")
  const filenameInputRef = useRef<HTMLInputElement>(null)
  const [createdFileUrl, setCreatedFileUrl] = React.useState<string | null>(null)
  const [copiedFolderPath, setCopiedFolderPath] = React.useState<string | null>(null)

  const createFile = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!handle || !rootUrl || creatingFile) return
    setCreatingFile(true)
    setNewFileError(null)
    try {
      const url = createdFileUrl ?? await createMarkdownInFolder(handle, rootUrl, newFileName)
      setCreatedFileUrl(url)
      setTreeVersion(version => version + 1)
      await openNewMarkdownTab(url)
      setNewFileOpen(false)
    } catch (error) {
      setNewFileError(error instanceof Error ? error.message : t("Could not create the file."))
    } finally {
      setCreatingFile(false)
    }
  }
  const openFileShortcut = /Mac/.test(navigator.platform) ? "⌘O" : "Ctrl+O"
  const extensionVersion = getExtensionVersion()
  const buildChannel = process.env.NODE_ENV === "development" ? "DEV" : "PROD"

  useEffect(() => {
    if (!tree.length || !rootUrl || !contentRef.current) return
    if (scrollRestoredForUrlRef.current === rootUrl) return
    scrollRestoredForUrlRef.current = rootUrl
    void getSidebarScrollTop(rootUrl).then((scrollTop) => {
      if (scrollTop !== null && contentRef.current) {
        contentRef.current.scrollTop = scrollTop
      }
      void clearSidebarScrollTop(rootUrl)
    })
  }, [tree, rootUrl])

  useEffect(() => {
    const container = contentRef.current
    if (!activeFilePath || !container) return
    if (revealedFilePathRef.current === activeFilePath) return
    const row = container.querySelector('[data-active="true"]')
    if (!row) return
    revealedFilePathRef.current = activeFilePath
    // Scroll only the sidebar; scrollIntoView would also move the document.
    const rowRect = row.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()
    if (rowRect.top < containerRect.top) {
      container.scrollTop -= containerRect.top - rowRect.top
    } else if (rowRect.bottom > containerRect.bottom) {
      container.scrollTop += rowRect.bottom - containerRect.bottom
    }
  }, [tree, activeFilePath])

  // Derive the immediate parent folder name from the current file URL for the idle prompt
  const parentFolderName = (() => {
    const segments = decodeURIComponent(currentFileUrl.replace(/^file:\/\/\//, ""))
      .split("/")
      .filter(Boolean)
    return segments.length >= 2 ? segments[segments.length - 2] : null
  })()

  const folderPath = fileFolderPath(currentFileUrl)

  const handleFileClick = (node: FileNode) => {
    if (rootUrl && contentRef.current) {
      void setSidebarScrollTop(rootUrl, contentRef.current.scrollTop)
    }
    const encodedPath = node.path.split("/").map(encodeURIComponent).join("/")
    const url = rootUrl
      ? new URL(encodedPath, rootUrl).href
      : `file:///${encodeURIComponent(handle?.name ?? "folder")}/${encodedPath}`
    onFileSelect(url, node.handle)
  }

  const handleDirToggle = (node: DirNode) => {
    if (node.children !== null) collapseDir(node)
    else expandDir(node)
  }

  const onResizeStart = (e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = sidebarWidth
    const onMove = (e: MouseEvent) => {
      onResize(Math.max(180, Math.min(520, startWidth + e.clientX - startX)))
    }
    const onUp = () => {
      document.removeEventListener("mousemove", onMove)
      document.removeEventListener("mouseup", onUp)
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }
    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"
    document.addEventListener("mousemove", onMove)
    document.addEventListener("mouseup", onUp)
  }

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="h-12 shrink-0 border-b px-4 flex-row items-center gap-2 py-0">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" className="h-5 w-5 shrink-0">
          <rect width="128" height="128" rx="28" fill="#18181b"/>
          <path d="M22 92 V 28 h12 l26 38 26 -38 h12 V 92 h-12 V 50 l-22 32 h-8 L34 50 V 92 Z" fill="#fff"/>
          <g stroke="#fff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <path d="M90 108 H118"/>
            <path d="M109 99 L118 108 L109 117"/>
          </g>
        </svg>
        <span className="font-semibold text-base tracking-tight">{t("Markside")}</span>
        {extensionVersion && (
          <span
            className="text-[10px] font-medium tabular-nums text-sidebar-foreground/40"
            aria-label={t("Version {0}{1}", [extensionVersion, buildChannel === "DEV" ? ", development build" : ""])}
            title={t("Version {0}{1}", [extensionVersion, buildChannel === "DEV" ? ", development build" : ""])}>
            v{extensionVersion}
          </span>
        )}
        {buildChannel === "DEV" && (
          <span
            className="rounded bg-amber-500/15 px-1 py-0.5 text-[9px] font-semibold leading-none tracking-wide text-amber-700 dark:text-amber-400"
            aria-hidden="true">
            {t("DEV")}</span>
        )}
      </SidebarHeader>
      <SidebarContent ref={contentRef} className="file-tree-scroll">
        {status === "loading" && null}

        {status === "idle" && (
          <div className="px-5 py-6">
            <div className="flex max-w-60 flex-col gap-3">
              <div className="space-y-1.5">
                <p className="break-words text-sm leading-snug text-sidebar-foreground/75">
                  {parentFolderName
                    ? tRich("Browse the {0} folder?", <strong className="font-semibold text-sidebar-foreground">{parentFolderName}</strong>)
                    : t("Browse this file's folder?")}
                </p>
                <p className="text-[13px] leading-relaxed text-sidebar-foreground/75">
                  {folderError
                    ? tRich("You chose {0}. Please choose {1}, or a parent folder.", <strong className="font-medium text-sidebar-foreground">{folderError.picked}</strong>, <strong className="font-medium text-sidebar-foreground">{folderError.expected ?? parentFolderName}</strong>)
                    : t("Choose the folder once so Markside can browse and save its files.")}
                </p>
                {folderError && (
                  <p className="text-[13px] leading-relaxed text-sidebar-foreground/75">
                    {tRich("Want to browse {0}? Open a file from it first ({1}).", <strong className="font-medium text-sidebar-foreground">{folderError.picked}</strong>, openFileShortcut)}
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  // Chrome's picker can't open at a path, so copy it for the user to paste.
                  void navigator.clipboard.writeText(folderPath).then(() => setCopiedFolderPath(folderPath), () => {})
                  void openDirectory()
                }}
                className="flex items-center justify-center gap-1.5 rounded-md bg-sidebar-primary px-3 py-2 text-[13px] font-medium text-sidebar-primary-foreground hover:opacity-90">
                <FolderOpen className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="min-w-0 break-words">{parentFolderName ? t("Choose {0}…", [parentFolderName]) : t("Choose folder…")}</span></button>
              <FolderPickerTip copied={copiedFolderPath === folderPath} className="text-[13px] leading-relaxed text-sidebar-foreground/65" />
            </div>
          </div>
        )}

        {(status === "prompt" || status === "granted") && (
          <>
            {status === "prompt" && (
              <div className="mx-2 mt-2 rounded-md bg-yellow-500/10 px-3 py-2 text-xs text-yellow-600 dark:text-yellow-400">
                {t("Access needed.")}{" "}
                <button
                  onClick={reauthorize}
                  className="underline hover:no-underline">
                  {t("Re-authorize")}</button>
              </div>
            )}
<SidebarGroup>
              <SidebarGroupLabel className="flex items-center">
                <span className="truncate font-medium text-sidebar-foreground/80">{handle?.name}</span>
                <button
                  onClick={() => setFolderInfoOpen(true)}
                  aria-label={t("How to change folder")}
                  className="ml-1 shrink-0 p-1 text-sidebar-foreground/30 hover:text-sidebar-foreground/60 transition-colors rounded">
                  <FolderOpen className="h-3 w-3" />
                </button>
                <div className="ml-auto flex shrink-0 items-center gap-1">
                  {handle && rootUrl && status === "granted" && (
                    <button type="button"
                      aria-label={t("New Markdown file")}
                      title={t("New Markdown file")}
                      onClick={() => {
                        setNewFileName("Untitled.md")
                        setCreatedFileUrl(null)
                        setNewFileError(null)
                        setNewFileOpen(true)
                      }}
                      className="rounded p-1 text-sidebar-foreground/50 transition-colors hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring">
                      <FilePlus2 className="h-3 w-3" />
                    </button>
                  )}
                <button
                  onClick={onOpenPalette}
                  aria-label={t("Find file")}
                  className="p-1 text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors rounded">
                  <Search className="h-3 w-3" />
                </button>
                </div>
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <FileTree
                  nodes={tree}
                  selectedPath={activeFilePath}
                  onFileClick={handleFileClick}
                  onDirToggle={handleDirToggle}
                  rootUrl={rootUrl}
                  reviewCounts={reviewCounts}
                />
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      <div
        onMouseDown={onResizeStart}
        className="absolute inset-y-0 right-0 z-20 w-1 cursor-col-resize transition-colors hover:bg-sidebar-border"
      />

      <Dialog.Root open={newFileOpen} onOpenChange={open => { if (!creatingFile) setNewFileOpen(open) }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/50" />
          <Dialog.Content onOpenAutoFocus={event => {
            event.preventDefault()
            filenameInputRef.current?.focus()
            filenameInputRef.current?.setSelectionRange(0, "Untitled".length)
          }} className="fixed left-1/2 top-1/2 z-[101] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-background p-5 text-foreground shadow-2xl">
            <Dialog.Title className="text-base font-semibold">{t("New Markdown file")}</Dialog.Title>
            <Dialog.Description className="mt-2 break-all text-xs text-muted-foreground">
              {t("Create in ")}{rootUrl ? decodeURIComponent(new URL(rootUrl).pathname) : t("the opened folder")}
            </Dialog.Description>
            <form onSubmit={event => void createFile(event)}>
              <label htmlFor="new-markdown-name" className="mt-4 block text-sm">{t("Filename")}</label>
              <input ref={filenameInputRef} id="new-markdown-name" value={newFileName}
                onChange={event => setNewFileName(event.target.value)}
                disabled={creatingFile || Boolean(createdFileUrl)}
                className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              {newFileError && <p role="alert" className="mt-3 text-sm text-destructive">{t(newFileError)}</p>}
              <div className="mt-5 flex justify-end gap-2">
                <Dialog.Close asChild><button type="button" disabled={creatingFile} className="rounded-md border px-3 py-1.5 text-sm">{t("Cancel")}</button></Dialog.Close>
                <button type="submit" disabled={creatingFile || !newFileName.trim()} className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50">
                  {creatingFile ? t("Creating…") : createdFileUrl ? t("Open file") : t("Create file")}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {folderInfoOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
            role="presentation"
            onClick={() => setFolderInfoOpen(false)}>
            <div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="folder-info-title"
              className="w-full max-w-lg rounded-lg border bg-background p-5 shadow-2xl"
              style={{ backgroundColor: "hsl(var(--background))" }}
              onClick={(e) => e.stopPropagation()}>
              <h2 id="folder-info-title" className="text-sm font-semibold">{t("Switch to a different folder")}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {t("Because of how Chrome handles folder access, you need to open a file in that folder before Markside can open the folder. To switch:")}</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm leading-relaxed text-muted-foreground">
                <li>{t("Open any file from that folder. Press ")}{openFileShortcut}{t(", or drag the file into Chrome.")}</li>
                <li>{t("In the sidebar, click “Choose folder” and select the folder.")}</li>
              </ol>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {t("If you've chosen that folder before, the sidebar shows it right away.")}</p>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setFolderInfoOpen(false)}
                  className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors">
                  {t("Got it")}</button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </Sidebar>
  )
}
