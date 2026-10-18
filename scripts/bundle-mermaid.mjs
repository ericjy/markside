/**
 * Pre-bundles mermaid and its full dependency tree into a single ESM file
 * so Parcel doesn't have to resolve its sub-path exports.
 *
 * Run: node scripts/bundle-mermaid.mjs
 */
import { readFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import { execSync } from "child_process"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, "..")
const esbuild = join(root, "node_modules/.bin/esbuild")
const outfile = join(root, "lib/mermaid-bundle.mjs")

// Resolve mermaid's ESM entry from its package.json exports
const pkg = JSON.parse(readFileSync(join(root, "node_modules/mermaid/package.json"), "utf8"))
const esmEntry = pkg.exports?.["."]?.import ?? pkg.module ?? pkg.main
const entry = join(root, "node_modules/mermaid", esmEntry)

execSync(
  `"${esbuild}" "${entry}" --bundle --format=esm --platform=browser --target=es2020 --outfile="${outfile}" --log-level=warning`,
  { cwd: root, stdio: "inherit" }
)

console.log("✔ Mermaid bundled → lib/mermaid-bundle.mjs")
