/**
 * Plasmo copies content script match patterns into web_accessible_resources.
 * Chrome MV3 rejects file:// patterns there. Replace them with <all_urls>.
 * Also adds the on-demand Vega-Lite engine and the loader that imports it, which
 * Parcel must not process: it rewrites import() into its own module lookup.
 *
 * Run with --watch to keep patching whenever plasmo dev rebuilds the manifest.
 */
import { copyFileSync, readFileSync, writeFileSync, watch, existsSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const vegaEngine = "vega-engine.js"
const vegaLoader = "vega-engine-loader.js"

function patchDraftPage(pagePath) {
  if (!existsSync(pagePath)) return
  const page = readFileSync(pagePath, "utf8")
  if (page.includes(vegaLoader)) return
  writeFileSync(pagePath, page.replace("<head>", `<head><script src="/${vegaLoader}"></script>`))
}

function patchManifest(manifestPath) {
  try {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"))
    const buildDir = dirname(manifestPath)
    copyFileSync(join(__dirname, "../lib/vega-engine-bundle.js"), join(buildDir, vegaEngine))
    copyFileSync(join(__dirname, vegaLoader), join(buildDir, vegaLoader))
    patchDraftPage(join(buildDir, "tabs/draft.html"))
    let contentScriptsChanged = false
    for (const script of manifest.content_scripts ?? []) {
      if (script.js?.includes(vegaLoader)) continue
      script.js?.unshift(vegaLoader)
      contentScriptsChanged = true
    }
    if (contentScriptsChanged) writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
    if (manifest.web_accessible_resources) {
      const patched = manifest.web_accessible_resources.map((entry) => ({
        ...entry,
        matches: entry.matches.some((m) => m.startsWith("file://"))
          ? ["<all_urls>"]
          : entry.matches
      }))
      if (!patched.some((entry) => entry.resources.includes(vegaEngine))) {
        patched.push({ matches: ["<all_urls>"], resources: [vegaEngine] })
      }
      // Skip write if already patched
      if (JSON.stringify(patched) === JSON.stringify(manifest.web_accessible_resources)) return
      manifest.web_accessible_resources = patched
      writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
      console.log(`✔ Manifest patched: ${manifestPath}`)
    }
  } catch {
    // build dir may not exist yet
  }
}

const devManifest = join(__dirname, "../build/chrome-mv3-dev/manifest.json")
const prodManifest = join(__dirname, "../build/chrome-mv3-prod/manifest.json")

patchManifest(devManifest)
patchManifest(prodManifest)

if (process.argv.includes("--watch")) {
  console.log("👀 Watching manifests for changes...")

  function watchManifest(manifestPath) {
    const dir = join(manifestPath, "..")
    // Watch the directory since the file may be replaced entirely on rebuild
    let debounce = null
    const watcher = watch(dir, (event, filename) => {
      if (filename !== "manifest.json") return
      clearTimeout(debounce)
      debounce = setTimeout(() => patchManifest(manifestPath), 100)
    })
    return watcher
  }

  // Wait for build dir to exist before watching
  function tryWatch(manifestPath) {
    const dir = join(manifestPath, "..")
    if (existsSync(dir)) {
      watchManifest(manifestPath)
    } else {
      setTimeout(() => tryWatch(manifestPath), 1000)
    }
  }

  tryWatch(devManifest)
  tryWatch(prodManifest)
}
