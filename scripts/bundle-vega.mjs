/**
 * Bundles the Vega-Lite chart engine into one ESM file. fix-manifest.mjs copies
 * it into the build, and lib/mermaid.ts imports it only for a document with a chart.
 *
 * Run: node scripts/bundle-vega.mjs
 */
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import { execFileSync } from "child_process"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")

execFileSync(
  join(root, "node_modules/.bin/esbuild"),
  ["lib/vega-engine.ts", "--bundle", "--minify", "--format=esm", "--outfile=lib/vega-engine-bundle.js", "--log-level=warning"],
  { cwd: root, stdio: "inherit" }
)

console.log("✔ Vega-Lite engine bundled → lib/vega-engine-bundle.js")
