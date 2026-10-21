#!/usr/bin/env node
import { existsSync, watch } from "node:fs"
import { readFile, writeFile, rename, unlink, stat } from "node:fs/promises"
import { basename, dirname, join, resolve } from "node:path"
import { pathToFileURL } from "node:url"
import { randomUUID } from "node:crypto"
import { spawn } from "node:child_process"
import { parseArgs } from "node:util"
import { parseReviewFile, addressReviewComment, refreshReviewFile, formatReviewComments } from "./review-file.mjs"

async function readReview(path, doc) {
  try {
    return parseReviewFile(await readFile(path, "utf8"), doc)
  } catch (error) {
    if (error.code === "ENOENT") return null
    throw error
  }
}

async function atomicWrite(path, review) {
  const temporary = `${path}.${randomUUID()}.tmp`
  try {
    await writeFile(temporary, JSON.stringify(review, null, 2) + "\n", { flag: "wx", mode: 0o600 })
    await rename(temporary, path)
  } finally {
    await unlink(temporary).catch((error) => { if (error.code !== "ENOENT") throw error })
  }
}

// Addressed or resolved feedback waits on the reviewer until they send more or finish.
const hasAgentWork = (review) =>
  review.status === "resolved" || (review.status === "sent" && review.comments.some(({ status }) => status === "open"))

function openChrome(file) {
  const url = pathToFileURL(file).href
  const windowsChrome = process.platform === "win32"
    ? [process.env.PROGRAMFILES, process.env["PROGRAMFILES(X86)"], process.env.LOCALAPPDATA]
        .filter(Boolean)
        .map((root) => join(root, "Google", "Chrome", "Application", "chrome.exe"))
        .find((path) => existsSync(path)) ?? "chrome.exe"
    : "chrome.exe"
  const [command, args] = process.platform === "darwin"
    ? ["open", ["-a", "Google Chrome", url]]
    : process.platform === "win32"
      ? [windowsChrome, [url]]
      : ["google-chrome", [url]]
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "ignore", detached: process.platform !== "darwin" })
    child.once("error", () => reject(new Error("Could not open Google Chrome. Install Chrome or use --no-open.")))
    if (process.platform === "darwin") {
      child.once("exit", (code) => code === 0 ? resolve() : reject(new Error("Could not open Google Chrome. Install Chrome or use --no-open.")))
    } else {
      child.once("spawn", () => { child.unref(); resolve() })
    }
  })
}

function waitForReview(path, doc, seconds, signal) {
  return new Promise((resolve, reject) => {
    let watcher
    let reading = false
    let finished = false
    const finish = (error, review = null) => {
      if (finished) return
      finished = true
      watcher?.close()
      clearInterval(poll)
      clearTimeout(timer)
      signal.removeEventListener("abort", abort)
      error ? reject(error) : resolve(review)
    }
    const check = async () => {
      if (reading || finished) return
      reading = true
      try {
        const review = await readReview(path, doc)
        if (review && hasAgentWork(review)) finish(null, review)
      } catch (error) {
        finish(new Error(`Cannot read Review: ${error.message}`))
      } finally { reading = false }
    }
    const abort = () => finish(null)
    const poll = setInterval(check, 1000)
    const timer = setTimeout(() => finish(null), seconds * 1000)
    // Watch the directory: atomic replacement changes the file's inode.
    try {
      watcher = watch(dirname(path), (_event, filename) => {
        if (!filename || filename.toString() === basename(path)) void check()
      })
      watcher.on("error", () => { watcher?.close(); watcher = undefined })
    } catch { /* Polling also covers filesystems without fs.watch support. */ }
    signal.addEventListener("abort", abort, { once: true })
    if (signal.aborted) abort()
    else void check()
  })
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { timeout: { type: "string", default: "540" }, "no-open": { type: "boolean" }, continue: { type: "boolean" }, reply: { type: "string" }, help: { type: "boolean" } },
  })
  if (values.help) {
    console.log('markside review <file> [--timeout 540] [--no-open] [--continue]\nmarkside comments <file>\nmarkside address <file> <id> [--reply "..."]')
    return 0
  }
  const [command, input, id] = positionals
  if (command === "resolve") throw new Error("The reviewer resolves comments in Markside. Use markside address <file> <id> --reply \"...\" to report your changes.")
  if (!input || !["review", "comments", "address"].includes(command) ||
      positionals.length !== (command === "address" ? 3 : 2)) {
    throw new Error("Usage: markside review <file> | comments <file> | address <file> <id> [--reply \"...\"]")
  }
  const seconds = Number(values.timeout)
  if (!Number.isFinite(seconds) || seconds <= 0 || seconds * 1000 > 2 ** 31 - 1) throw new Error("--timeout must be a positive number of seconds")
  const file = resolve(input)
  if (!await stat(file).then((entry) => entry.isFile()).catch(() => false)) throw new Error(`Markdown file not found: ${file}`)
  if (!/\.(md|mdx|markdown)$/.test(file)) throw new Error("Markside reviews .md, .mdx, and .markdown files")
  const path = `${file}.review.json`
  const doc = basename(file)
  const existing = await readReview(path, doc)
  if (command === "comments") {
    if (!existing) throw new Error(`No Review file: ${path}`)
    console.log(formatReviewComments(existing, true))
    return 0
  }
  if (command === "address") {
    if (!existing) throw new Error(`No Review file: ${path}`)
    const addressed = addressReviewComment(existing, id, values.reply)
    await atomicWrite(path, addressed)
    console.log(`Addressed ${id}`)
    return 0
  }
  const controller = new AbortController()
  const interrupt = () => controller.abort()
  process.once("SIGINT", interrupt)
  process.once("SIGTERM", interrupt)
  try {
    if (values.continue && !existing) throw new Error(`No Review to continue: ${path}. Start with markside review <file>.`)
    const pending = values.continue ? existing : refreshReviewFile(existing, doc)
    if (pending !== existing) await atomicWrite(path, pending)
    if (hasAgentWork(pending)) {
      console.log(formatReviewComments(pending))
      return 0
    }
    if (!values["no-open"]) await openChrome(file)
    console.error("Waiting for review in Markside...")
    const sent = await waitForReview(path, doc, seconds, controller.signal)
    if (controller.signal.aborted) return 130
    if (sent) { console.log(formatReviewComments(sent)); return 0 }
    const quotedInput = "'" + input.replaceAll("'", "'\\''") + "'"
    console.log(`STILL_WAITING: no review yet. Run "markside review ${quotedInput}${values.continue ? " --continue" : ""}${values["no-open"] ? " --no-open" : ""}" again to keep waiting.`)
    return 2
  } finally {
    process.removeListener("SIGINT", interrupt)
    process.removeListener("SIGTERM", interrupt)
  }
}

main().then((code) => { process.exitCode = code }).catch((error) => {
  console.error(`markside: ${error.message}`)
  process.exitCode = 1
})
