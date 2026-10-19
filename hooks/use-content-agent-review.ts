import { useEffect, useRef, useState } from "react"
import { parseReviewFile, type AgentReviewFile } from "../cli/review-file.mjs"
import { agentReviewUrl, prepareAgentReview, reviewSendFingerprint } from "~lib/agent-review"
import { getSavePathParts } from "~lib/content-app-policy"
import { normalizeDiskText, requestHandlePermission } from "~lib/content-file-access"
import { getDirectoryEntryForUrl } from "~lib/db"
import { readFileFromDisk } from "~lib/file-reload"
import { resolveReviewPolicy, type ActiveReview, type ReviewComment } from "~lib/review"
import { rangeFromOffsets, sourceLineForNode, type RenderedTextIndex } from "~lib/review-dom"

export interface AgentReviewHandoff {
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
  openReview: () => void
  review: ActiveReview | null
  openDirectory: (mode: "readwrite") => Promise<boolean>
  diskContentRef: React.MutableRefObject<string | null>
  hasUnsavedDraftRef: React.MutableRefObject<boolean>
  renderedTextIndexRef: React.MutableRefObject<RenderedTextIndex | null>
}

export function useContentAgentReview(options: Options): AgentReviewHandoff | undefined {
  const { fileUrl, enabled, open, review } = options
  const [state, setState] = useState<{ url: string; file: AgentReviewFile } | null>(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sendingRef = useRef(false)
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
  }, [fileUrl, enabled, open])

  const file = state?.url === fileUrl ? state.file : null
  if (!enabled || !file || file.status === "resolved") return undefined
  const unchanged = file.status === "sent" && reviewSendFingerprint(review) === reviewSendFingerprint(file)
  const disabledReason = !review?.comments.length
    ? "Add a comment before sending to the agent."
    : unchanged ? "Add or edit a comment to send again." : null

  const send = async () => {
    if (sendingRef.current || disabledReason || !review) return
    sendingRef.current = true
    setSending(true)
    setError(null)
    const current = () => optionsRef.current.fileUrl === fileUrl
    try {
      // Ask for access before hashing or reading files, while the click is active.
      let entry = directoryRef.current
      if (!entry || !getSavePathParts(fileUrl, entry.rootUrl)) {
        if (!await options.openDirectory("readwrite")) return
        entry = await getDirectoryEntryForUrl(fileUrl)
      } else if (await requestHandlePermission(entry.handle, "readwrite") !== "granted") {
        throw new Error("Allow folder write access, then send again.")
      }
      const parts = entry && getSavePathParts(fileUrl, entry.rootUrl)
      if (!entry || !parts) throw new Error("Choose the folder containing this document, then send again.")
      directoryRef.current = entry
      if (options.hasUnsavedDraftRef.current) throw new Error("Save or discard the Unsaved Draft before sending comments.")
      let directory = entry.handle
      for (const part of parts.slice(0, -1)) directory = await directory.getDirectoryHandle(part)
      const documentHandle = await directory.getFileHandle(parts[parts.length - 1])
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
      const writable = await sidecarHandle.createWritable()
      try {
        await writable.write(JSON.stringify(sent, null, 2) + "\n")
        // Chrome commits the staged replacement on close; no local rename API is needed.
        await writable.close()
      } catch (error) {
        await writable.abort().catch(() => undefined)
        throw error
      }
      if (current()) setState({ url: fileUrl, file: sent })
    } catch (error) {
      if (current() && (error as DOMException).name !== "AbortError") {
        setError(error instanceof Error ? error.message : "Could not send comments. Try again.")
      }
    } finally {
      sendingRef.current = false
      setSending(false)
    }
  }
  return { disabled: sending || !!disabledReason, disabledReason, sending, sentAt: file.sentAt, error, send: () => void send() }
}
