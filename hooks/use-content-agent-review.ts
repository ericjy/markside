import { t } from "~lib/i18n"
import { useEffect, useMemo, useRef, useState } from "react"
import { finishReview, parseReviewFile, resolveAddressedComments, setReviewerCommentStatus, type AgentReviewComment, type AgentReviewFile } from "../cli/review-file.mjs"
import { agentReviewUrl, canFinishAgentReview, checkForAgentReply, getAgentReviewResults, getAgentReviewDisabledReason, prepareAgentReview, reviewSendFingerprint, agentReviewIdentity, currentAgentReview } from "~lib/agent-review"
import { getSavePathParts } from "~lib/content-app-policy"
import { normalizeDiskText, requestHandlePermission } from "~lib/content-file-access"
import { getDirectoryEntryForUrl } from "~lib/db"
import { readFileFromDisk } from "~lib/file-reload"
import { fileFolderPath } from "~lib/url"
import { createEmptyReview, resolveReviewPolicy, type ActiveReview, type ReviewComment } from "~lib/review"
import { rangeFromOffsets, sourceLineForNode, type RenderedTextIndex } from "~lib/review-dom"

export interface AgentReviewHandoff {
  file?: AgentReviewFile
  sourceUrl?: string
  folderToChoose?: string
  updatingCommentId?: string | null
  changeStatus?: (id: string, status: "open" | "resolved") => void
  completed?: boolean
  canFinish?: boolean
  finishing?: boolean
  finish?: () => void
  resolvingAll?: boolean
  resolveAll?: () => void
  results?: ReadonlyMap<string, AgentReviewComment>
  disabled: boolean
  disabledReason: string | null
  sending: boolean
  sent?: boolean
  checkForUpdates?: () => Promise<boolean>
  sentAt?: string
  error: string | null
  send: (reviewOverride?: ActiveReview) => Promise<boolean>
}

interface Options {
  fileUrl: string
  enabled: boolean
  open: boolean
  reloadVersion?: number
  sessionCheckVersion?: number
  /** Silent re-read, e.g. when the user returns to the tab. Never reports a check result. */
  discoveryVersion?: number
  onSessionChecked?: (found: boolean) => void
  onLoaded?: (fileUrl: string) => void
  /** The agent changed the Review after a Send from this tab. */
  onAgentReplied?: () => void
  review: ActiveReview | null
  updateReview?: (mutate: (current: ActiveReview | null) => ActiveReview | null) => void
  directory?: { handle: FileSystemDirectoryHandle; rootUrl: string } | null
  openDirectory: (mode: "readwrite") => Promise<boolean>
  diskContentRef: React.MutableRefObject<string | null>
  hasUnsavedDraftRef: React.MutableRefObject<boolean>
  renderedTextIndexRef: React.MutableRefObject<RenderedTextIndex | null>
}

export function useContentAgentReview(options: Options): AgentReviewHandoff | undefined {
  const { fileUrl, enabled, open, review, reloadVersion, sessionCheckVersion, discoveryVersion } = options
  const [state, setState] = useState<{ url: string; file: AgentReviewFile } | null>(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [updatingCommentId, setUpdatingCommentId] = useState<string | null>(null)
  const [finishing, setFinishing] = useState(false)
  const [resolvingAll, setResolvingAll] = useState(false)
  const [replyCheck, setReplyCheck] = useState<{ url: string; sent: number } | null>(null)
  const checkForUpdatesRef = useRef<() => Promise<boolean>>(async () => false)
  const writingRef = useRef(false)
  const optionsRef = useRef(options)
  optionsRef.current = options
  const reportedCheckRef = useRef(0)
  const errorKeyRef = useRef("")
  const directoryRef = useRef<Awaited<ReturnType<typeof getDirectoryEntryForUrl>>>(null)
  const doc = decodeURIComponent(new URL(fileUrl).pathname.split("/").pop()!)

  useEffect(() => {
    let active = true
    // A silent discovery read must not clear a send error the user hasn't seen yet.
    const errorKey = `${fileUrl}|${enabled}|${open}|${reloadVersion}|${sessionCheckVersion}`
    if (errorKeyRef.current !== errorKey) {
      errorKeyRef.current = errorKey
      setError(null)
    }
    if (!enabled) { setState(null); return }
    const load = async () => {
      // Missing sidecars are normal. The relay reads only file:// URLs here.
      const [disk, directory] = await Promise.all([
        readFileFromDisk(null, agentReviewUrl(fileUrl), false).catch(() => null),
        getDirectoryEntryForUrl(fileUrl).catch(() => null),
      ])
      if (!active) return
      directoryRef.current = directory
      optionsRef.current.onLoaded?.(fileUrl)
      // Report each explicit check once, not again for later silent re-reads.
      const reportCheck = (found: boolean) => {
        if (!sessionCheckVersion || reportedCheckRef.current === sessionCheckVersion) return
        reportedCheckRef.current = sessionCheckVersion
        optionsRef.current.onSessionChecked?.(found)
      }
      try {
        const file = disk?.text ? parseReviewFile(disk.text, doc) : null
        setState(file ? { url: fileUrl, file } : null)
        reportCheck(!!file && file.status !== "resolved")
      } catch {
        // An unrelated or unsupported JSON file must not change today's Review UI.
        setState(null)
        reportCheck(false)
      }
    }
    void load()
    return () => { active = false }
  }, [fileUrl, enabled, open, reloadVersion, sessionCheckVersion, discoveryVersion])

  useEffect(() => {
    if (!enabled || replyCheck?.url !== fileUrl) return
    return checkForAgentReply(() => checkForUpdatesRef.current(), () => optionsRef.current.onAgentReplied?.())
  }, [enabled, fileUrl, replyCheck])

  const file = state?.url === fileUrl ? state.file : null
  const results = useMemo(() => getAgentReviewResults(file, review), [file, review])
  useEffect(() => {
    if (!enabled || !file?.comments.some(({ id }) => !review?.comments.some((comment) => comment.id === id))) return
    options.updateReview?.((current) => currentAgentReview(current ?? { ...createEmptyReview(fileUrl, ""), note: file.note ?? "" }, file))
  }, [enabled, fileUrl, file, review, options.updateReview])
  if (!enabled || !file) return undefined
  const chosenDirectory = options.directory
  const availableDirectory = chosenDirectory && getSavePathParts(fileUrl, chosenDirectory.rootUrl)
    ? chosenDirectory
    : directoryRef.current
  const folderToChoose = availableDirectory && getSavePathParts(fileUrl, availableDirectory.rootUrl)
    ? undefined
    : fileFolderPath(fileUrl)
  const completed = file.status === "resolved"
  const unchanged = file.status === "sent" && reviewSendFingerprint(currentAgentReview(review, file)) === reviewSendFingerprint(file)
  const disabledReason = getAgentReviewDisabledReason(file, review)
  const canFinish = canFinishAgentReview(file, review)

  const checkForUpdates = async () => {
    if (writingRef.current) return false
    const disk = await readFileFromDisk(null, agentReviewUrl(fileUrl), false)
    if (disk.text === null) throw new Error(t("Could not read the agent review."))
    const latest = parseReviewFile(disk.text, doc)
    if (optionsRef.current.fileUrl !== fileUrl || writingRef.current) return false
    const changed = JSON.stringify(latest) !== JSON.stringify(file)
    setState({ url: fileUrl, file: latest })
    return changed
  }
  checkForUpdatesRef.current = checkForUpdates

  const getReviewDirectory = async () => {
    // Request permission first, while the click's user gesture is active.
    let entry = availableDirectory
    if (!entry || !getSavePathParts(fileUrl, entry.rootUrl)) {
      if (!await options.openDirectory("readwrite")) throw new DOMException("Folder selection cancelled", "AbortError")
      entry = await getDirectoryEntryForUrl(fileUrl)
    } else if (await requestHandlePermission(entry.handle, "readwrite") !== "granted") {
      throw new Error(t("Allow folder write access, then try again."))
    }
    const parts = entry && getSavePathParts(fileUrl, entry.rootUrl)
    if (!entry || !parts) throw new Error(t("Choose the folder containing this document, then send again."))
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
      const loaded = file.comments.find((comment) => comment.id === id)
      const currentComment = latest.comments.find((comment) => comment.id === id)
      const local = optionsRef.current.review?.comments.find((comment) => comment.id === id)
      if (agentReviewIdentity(latest) !== agentReviewIdentity(file) || !loaded || !currentComment ||
          loaded.body !== currentComment.body || loaded.quote !== currentComment.quote ||
          loaded.status !== currentComment.status || loaded.reply !== currentComment.reply ||
          (local && (local.body !== currentComment.body || local.anchor.exact !== currentComment.quote))) {
        throw new Error(t("This comment changed. Reload Review before updating its status."))
      }
      await writeReview(handle, setReviewerCommentStatus(latest, id, status))
    } catch (error) {
      if (optionsRef.current.fileUrl === fileUrl && (error as DOMException).name !== "AbortError") {
        setError(error instanceof Error ? error.message : t("Could not update the comment. Try again."))
      }
    } finally {
      writingRef.current = false
      setUpdatingCommentId(null)
    }
  }

  const resolveAll = async () => {
    if (writingRef.current) return
    writingRef.current = true
    setResolvingAll(true)
    setError(null)
    try {
      const { directory } = await getReviewDirectory()
      const handle = await directory.getFileHandle(`${doc}.review.json`)
      const latest = parseReviewFile(await (await handle.getFile()).text(), doc)
      if (optionsRef.current.fileUrl !== fileUrl) return
      const addressed = (review: AgentReviewFile) => JSON.stringify(review.comments.filter(({ status }) => status === "addressed"))
      if (agentReviewIdentity(latest) !== agentReviewIdentity(file) || addressed(latest) !== addressed(file)) {
        setState({ url: fileUrl, file: latest })
        throw new Error(t("This Review changed. Check it before resolving."))
      }
      await writeReview(handle, resolveAddressedComments(latest))
    } catch (error) {
      if (optionsRef.current.fileUrl === fileUrl && (error as DOMException).name !== "AbortError") {
        setError(error instanceof Error ? error.message : t("Could not resolve the comments. Try again."))
      }
    } finally {
      writingRef.current = false
      setResolvingAll(false)
    }
  }

  const finish = async () => {
    if (writingRef.current) return
    writingRef.current = true
    setFinishing(true)
    setError(null)
    try {
      const { directory } = await getReviewDirectory()
      const handle = await directory.getFileHandle(`${doc}.review.json`)
      const latest = parseReviewFile(await (await handle.getFile()).text(), doc)
      if (optionsRef.current.fileUrl !== fileUrl) return
      if (agentReviewIdentity(latest) !== agentReviewIdentity(file) || !canFinishAgentReview(latest, optionsRef.current.review)) {
        setState({ url: fileUrl, file: latest })
        throw new Error(t("This Review changed. Check it before finishing."))
      }
      await writeReview(handle, finishReview(latest))
    } catch (error) {
      if (optionsRef.current.fileUrl === fileUrl && (error as DOMException).name !== "AbortError") {
        setError(error instanceof Error ? error.message : t("Could not finish the Review. Try again."))
      }
    } finally {
      writingRef.current = false
      setFinishing(false)
    }
  }

  const send = async (reviewOverride?: ActiveReview) => {
    const reviewToSend = reviewOverride ?? review
    if (writingRef.current || !reviewToSend || getAgentReviewDisabledReason(file, reviewToSend)) return false
    writingRef.current = true
    setSending(true)
    setError(null)
    const current = () => optionsRef.current.fileUrl === fileUrl
    try {
      const { directory, documentName } = await getReviewDirectory()
      if (options.hasUnsavedDraftRef.current) throw new Error(t("Save or discard the Unsaved Draft before sending comments."))
      const documentHandle = await directory.getFileHandle(documentName)
      const documentFile = await documentHandle.getFile()
      const bytes = await documentFile.arrayBuffer()
      const diskText = new TextDecoder().decode(bytes)
      if (normalizeDiskText(diskText) !== normalizeDiskText(options.diskContentRef.current)) {
        throw new Error(t("The document changed on disk. Reload it and check your comments before sending."))
      }
      const sidecarHandle = await directory.getFileHandle(`${doc}.review.json`)
      const latest = parseReviewFile(await (await sidecarHandle.getFile()).text(), doc)
      if (latest.status === "resolved" || agentReviewIdentity(latest) !== agentReviewIdentity(file)) {
        throw new Error(t("This Review request changed. Close and reopen Review before sending."))
      }
      if (getAgentReviewDisabledReason(latest, reviewToSend)) {
        setState({ url: fileUrl, file: latest })
        return false
      }
      const digest = await crypto.subtle.digest("SHA-256", bytes)
      const docHash = Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("")
      const index = options.renderedTextIndexRef.current
      const resolvedComments = index
        ? resolveReviewPolicy({ review: reviewToSend, document: index, request: { type: "reattach" } }).comments
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
      const sent = prepareAgentReview(latest, reviewToSend, docHash, sourceLine)
      if (!current() || options.hasUnsavedDraftRef.current) return false
      await writeReview(sidecarHandle, sent)
      if (current()) setReplyCheck({ url: fileUrl, sent: Date.now() })
      return true
    } catch (error) {
      if (current() && (error as DOMException).name !== "AbortError") {
        setError(error instanceof Error ? error.message : t("Could not send comments. Try again."))
      }
      return false
    } finally {
      writingRef.current = false
      setSending(false)
    }
  }
  return { checkForUpdates, file, sourceUrl: fileUrl, folderToChoose, completed, canFinish, finishing, finish: () => void finish(), resolvingAll, resolveAll: () => void resolveAll(), results, updatingCommentId, changeStatus: (id, status) => void changeStatus(id, status), disabled: sending || finishing || resolvingAll || updatingCommentId !== null || !!disabledReason, disabledReason, sending, sent: unchanged, sentAt: file.sentAt, error, send }
}
