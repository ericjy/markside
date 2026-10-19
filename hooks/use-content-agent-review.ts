import { useEffect, useMemo, useRef, useState } from "react"
import { parseReviewFile, setReviewerCommentStatus, type AgentReviewComment, type AgentReviewFile } from "../cli/review-file.mjs"
import { agentReviewUrl, getAgentReviewResults, prepareAgentReview, reviewSendFingerprint } from "~lib/agent-review"
import { getSavePathParts } from "~lib/content-app-policy"
import { normalizeDiskText, requestHandlePermission } from "~lib/content-file-access"
import { getDirectoryEntryForUrl } from "~lib/db"
import { readFileFromDisk } from "~lib/file-reload"
import { fileFolderPath } from "~lib/url"
import { resolveReviewPolicy, type ActiveReview, type ReviewComment } from "~lib/review"
import { rangeFromOffsets, sourceLineForNode, type RenderedTextIndex } from "~lib/review-dom"

export interface AgentReviewHandoff {
  folderToChoose?: string
  updatingCommentId?: string | null
  changeStatus?: (id: string, status: "open" | "resolved") => void
  completed?: boolean
  results?: ReadonlyMap<string, AgentReviewComment>
  disabled: boolean
  disabledReason: string | null
  sending: boolean
  sentAt?: string
  error: string | null
  send: () => void
}

interface Options {
  fileUrl: string
  enabled: boolean
  open: boolean
  reloadVersion?: number
  openReview: () => void
  review: ActiveReview | null
  directory?: { handle: FileSystemDirectoryHandle; rootUrl: string } | null
  openDirectory: (mode: "readwrite") => Promise<boolean>
  diskContentRef: React.MutableRefObject<string | null>
  hasUnsavedDraftRef: React.MutableRefObject<boolean>
  renderedTextIndexRef: React.MutableRefObject<RenderedTextIndex | null>
}

export function useContentAgentReview(options: Options): AgentReviewHandoff | undefined {
  const { fileUrl, enabled, open, review, reloadVersion } = options
  const [state, setState] = useState<{ url: string; file: AgentReviewFile } | null>(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [updatingCommentId, setUpdatingCommentId] = useState<string | null>(null)
  const writingRef = useRef(false)
  const optionsRef = useRef(options)
  optionsRef.current = options
  const autoOpenedRef = useRef<string | null>(null)
  const directoryRef = useRef<Awaited<ReturnType<typeof getDirectoryEntryForUrl>>>(null)
  const doc = decodeURIComponent(new URL(fileUrl).pathname.split("/").pop()!)

  useEffect(() => {
    let active = true
    setError(null)
    if (!enabled) { setState(null); return }
    const load = async () => {
      // Missing sidecars are normal. The relay reads only file:// URLs here.
      const [disk, directory] = await Promise.all([
        readFileFromDisk(null, agentReviewUrl(fileUrl), false).catch(() => null),
        getDirectoryEntryForUrl(fileUrl).catch(() => null),
      ])
      if (!active) return
      directoryRef.current = directory
      try {
        const file = disk?.text ? parseReviewFile(disk.text, doc) : null
        setState(file ? { url: fileUrl, file } : null)
        if (file?.status === "pending" && autoOpenedRef.current !== fileUrl) {
          autoOpenedRef.current = fileUrl
          optionsRef.current.openReview()
        }
      } catch {
        // An unrelated or unsupported JSON file must not change today's Review UI.
        setState(null)
      }
    }
    void load()
    return () => { active = false }
  }, [fileUrl, enabled, open, reloadVersion])

  const file = state?.url === fileUrl ? state.file : null
  const results = useMemo(() => getAgentReviewResults(file, review), [file, review])
  if (!enabled || !file) return undefined
  const chosenDirectory = options.directory
  const availableDirectory = chosenDirectory && getSavePathParts(fileUrl, chosenDirectory.rootUrl)
    ? chosenDirectory
    : directoryRef.current
  const folderToChoose = availableDirectory && getSavePathParts(fileUrl, availableDirectory.rootUrl)
    ? undefined
    : fileFolderPath(fileUrl)
  const completed = file.status === "resolved"
  const unchanged = file.status === "sent" && reviewSendFingerprint(review) === reviewSendFingerprint(file)
  const hasOpenComments = review?.comments.some(({ id }) => (results.get(id)?.status ?? "open") === "open")
  const disabledReason = completed
    ? "This Review is resolved."
    : !review?.comments.length
    ? "Add a comment before sending to the agent."
    : !hasOpenComments ? "Add or reopen a comment to send again."
    : unchanged ? "Add or edit a comment to send again." : null

  const getReviewDirectory = async () => {
    // Request permission first, while the click's user gesture is active.
    let entry = availableDirectory
    if (!entry || !getSavePathParts(fileUrl, entry.rootUrl)) {
      if (!await options.openDirectory("readwrite")) throw new DOMException("Folder selection cancelled", "AbortError")
      entry = await getDirectoryEntryForUrl(fileUrl)
    } else if (await requestHandlePermission(entry.handle, "readwrite") !== "granted") {
      throw new Error("Allow folder write access, then try again.")
    }
    const parts = entry && getSavePathParts(fileUrl, entry.rootUrl)
    if (!entry || !parts) throw new Error("Choose the folder containing this document, then send again.")
    directoryRef.current = entry
    let directory = entry.handle
    for (const part of parts.slice(0, -1)) directory = await directory.getDirectoryHandle(part)
    return { directory, documentName: parts[parts.length - 1] }
  }

  const writeReview = async (handle: FileSystemFileHandle, next: AgentReviewFile) => {
    const writable = await handle.createWritable()
    try {
      await writable.write(JSON.stringify(next, null, 2) + "\n")
      // Chrome commits the staged replacement on close.
      await writable.close()
    } catch (error) {
      await writable.abort().catch(() => undefined)
      throw error
    }
    if (optionsRef.current.fileUrl === fileUrl) setState({ url: fileUrl, file: next })
  }

  const changeStatus = async (id: string, status: "open" | "resolved") => {
    if (writingRef.current) return
    writingRef.current = true
    setUpdatingCommentId(id)
    setError(null)
    try {
      const { directory } = await getReviewDirectory()
      const handle = await directory.getFileHandle(`${doc}.review.json`)
      const latest = parseReviewFile(await (await handle.getFile()).text(), doc)
      if (optionsRef.current.fileUrl !== fileUrl) return
      if (latest.requestedAt !== file.requestedAt || !getAgentReviewResults(latest, optionsRef.current.review).has(id)) {
        throw new Error("This comment changed. Reload Review before updating its status.")
      }
      await writeReview(handle, setReviewerCommentStatus(latest, id, status))
    } catch (error) {
      if (optionsRef.current.fileUrl === fileUrl && (error as DOMException).name !== "AbortError") {
        setError(error instanceof Error ? error.message : "Could not update the comment. Try again.")
      }
    } finally {
      writingRef.current = false
      setUpdatingCommentId(null)
    }
  }

  const send = async () => {
    if (writingRef.current || disabledReason || !review) return
    writingRef.current = true
    setSending(true)
    setError(null)
    const current = () => optionsRef.current.fileUrl === fileUrl
    try {
      const { directory, documentName } = await getReviewDirectory()
      if (options.hasUnsavedDraftRef.current) throw new Error("Save or discard the Unsaved Draft before sending comments.")
      const documentHandle = await directory.getFileHandle(documentName)
      const documentFile = await documentHandle.getFile()
      const bytes = await documentFile.arrayBuffer()
      const diskText = new TextDecoder().decode(bytes)
      if (normalizeDiskText(diskText) !== normalizeDiskText(options.diskContentRef.current)) {
        throw new Error("The document changed on disk. Reload it and check your comments before sending.")
      }
      const sidecarHandle = await directory.getFileHandle(`${doc}.review.json`)
      const latest = parseReviewFile(await (await sidecarHandle.getFile()).text(), doc)
      if (latest.status === "resolved" || latest.requestedAt !== file.requestedAt) {
        throw new Error("This Review request changed. Close and reopen Review before sending.")
      }
      const digest = await crypto.subtle.digest("SHA-256", bytes)
      const docHash = Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("")
      const index = options.renderedTextIndexRef.current
      const resolvedComments = index
        ? resolveReviewPolicy({ review, document: index, request: { type: "reattach" } }).comments
        : []
      const sourceLine = (comment: ReviewComment) => {
        if (comment.anchor.removed) return null
        if (!index) return null
        // Resolve against today's rendered text, including after an explicit reload.
        const resolved = resolvedComments.find(({ id }) => id === comment.id)
        if (!resolved || resolved.status !== "anchored") return null
        const range = rangeFromOffsets(index, resolved.range.start, resolved.range.end)
        return range ? sourceLineForNode(range.startContainer) : null
      }
      const sent = prepareAgentReview(latest, review, docHash, sourceLine)
      if (!current() || options.hasUnsavedDraftRef.current) return
      await writeReview(sidecarHandle, sent)
    } catch (error) {
      if (current() && (error as DOMException).name !== "AbortError") {
        setError(error instanceof Error ? error.message : "Could not send comments. Try again.")
      }
    } finally {
      writingRef.current = false
      setSending(false)
    }
  }
  return { folderToChoose, completed, results, updatingCommentId, changeStatus: (id, status) => void changeStatus(id, status), disabled: sending || updatingCommentId !== null || !!disabledReason, disabledReason, sending, sentAt: file.sentAt, error, send: () => void send() }
}
