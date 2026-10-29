#!/usr/bin/env node

// Report Markside's position in Chrome Web Store search results. The Store
// renders only the first ten results without JavaScript, so this drives a
// headless Chrome over the DevTools protocol and clicks "Load more".

import { spawn } from "node:child_process"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const ITEM_ID = "ccokohfaicfjkilcakhnlckbbkhhknhj"
const DEFAULT_QUERIES = [
  "markdown",
  "markdown viewer",
  "markdown editor",
  "local markdown viewer",
  "markdown comment",
  "review markdown ai agent"
]
const CHROME =
  process.env.CHROME ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

const HELP = `Report Markside's Chrome Web Store search rank

Usage:
  pnpm webstore:rank [--depth <n>] [query ...]

Searches each query (default: ${DEFAULT_QUERIES.map((q) => `"${q}"`).join(", ")})
and loads up to --depth results (default 300). Results vary by region, so
compare runs made from the same location. Set CHROME to use another browser.
`

// Runs inside the search page: load results until `depth` items or the end.
async function collectItemIds(depth) {
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
  const ids = () => [
    ...new Set(
      [...document.querySelectorAll('a[href*="/detail/"]')].map((a) =>
        new URL(a.href).pathname.split("/").pop()
      )
    )
  ]
  for (let i = 0; i < 50 && ids().length === 0; i++) await sleep(200)
  while (ids().length < depth) {
    const more = [...document.querySelectorAll("button")].find(
      (button) => button.innerText.trim() === "Load more"
    )
    if (!more) break
    const before = ids().length
    more.click()
    for (let i = 0; i < 25 && ids().length === before; i++) await sleep(200)
    if (ids().length === before) break
  }
  return ids().slice(0, depth)
}

function parseArgs(argv) {
  let depth = 300
  const queries = []
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--help" || argv[i] === "-h") {
      process.stdout.write(HELP)
      process.exit(0)
    } else if (argv[i] === "--depth") {
      depth = Number(argv[++i])
      if (!Number.isInteger(depth) || depth < 1) {
        throw new Error("--depth must be a positive integer")
      }
    } else {
      queries.push(argv[i])
    }
  }
  return { depth, queries: queries.length ? queries : DEFAULT_QUERIES }
}

function launchChrome(profile) {
  const chrome = spawn(CHROME, [
    "--headless=new",
    "--remote-debugging-port=0",
    `--user-data-dir=${profile}`,
    "--window-size=1400,1000",
    "about:blank"
  ])
  const endpoint = new Promise((resolve, reject) => {
    let stderr = ""
    chrome.stderr.on("data", (chunk) => {
      stderr += chunk
      const match = stderr.match(/DevTools listening on (ws:\/\/\S+)/)
      if (match) resolve(match[1])
    })
    chrome.on("error", reject)
    chrome.on("exit", (code) =>
      reject(new Error(`Chrome exited with code ${code}\n${stderr}`))
    )
  })
  return { chrome, endpoint }
}

async function connect(url) {
  const socket = new WebSocket(url)
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true })
    socket.addEventListener("error", reject, { once: true })
  })
  let nextId = 1
  const pending = new Map()
  const listeners = []
  socket.addEventListener("message", ({ data }) => {
    const message = JSON.parse(data)
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id)
      pending.delete(message.id)
      if (message.error) reject(new Error(message.error.message))
      else resolve(message.result)
    } else if (message.method) {
      for (const listener of listeners) listener(message)
    }
  })
  return {
    send(method, params = {}, sessionId) {
      const id = nextId++
      socket.send(JSON.stringify({ id, method, params, sessionId }))
      return new Promise((resolve, reject) =>
        pending.set(id, { resolve, reject })
      )
    },
    once(method, sessionId) {
      return new Promise((resolve) => {
        const listener = (message) => {
          if (message.method !== method || message.sessionId !== sessionId) {
            return
          }
          listeners.splice(listeners.indexOf(listener), 1)
          resolve(message.params)
        }
        listeners.push(listener)
      })
    },
    close: () => socket.close()
  }
}

async function main() {
  const { depth, queries } = parseArgs(process.argv.slice(2))
  const profile = mkdtempSync(join(tmpdir(), "markside-rank-"))
  const { chrome, endpoint } = launchChrome(profile)
  try {
    const cdp = await connect(await endpoint)
    const { targetId } = await cdp.send("Target.createTarget", {
      url: "about:blank"
    })
    const { sessionId } = await cdp.send("Target.attachToTarget", {
      targetId,
      flatten: true
    })
    await cdp.send("Page.enable", {}, sessionId)

    console.log(`Markside (${ITEM_ID}), searched ${new Date().toISOString()}`)
    for (const query of queries) {
      const loaded = cdp.once("Page.loadEventFired", sessionId)
      await cdp.send(
        "Page.navigate",
        {
          url: `https://chromewebstore.google.com/search/${encodeURIComponent(query)}?hl=en`
        },
        sessionId
      )
      await loaded
      const { result, exceptionDetails } = await cdp.send(
        "Runtime.evaluate",
        {
          expression: `(${collectItemIds})(${depth})`,
          awaitPromise: true,
          returnByValue: true
        },
        sessionId
      )
      if (exceptionDetails) throw new Error(exceptionDetails.text)
      const ids = result.value
      const rank = ids.indexOf(ITEM_ID) + 1
      console.log(
        `${(rank ? `#${rank}` : "—").padStart(5)}  of ${String(ids.length).padStart(3)}  ${query}`
      )
    }
    cdp.close()
  } finally {
    if (chrome.exitCode === null) {
      const exited = new Promise((resolve) => chrome.once("exit", resolve))
      chrome.kill()
      await exited
    }
    rmSync(profile, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
