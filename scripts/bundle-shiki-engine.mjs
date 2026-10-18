/**
 * Pre-bundles @shikijs/engine-javascript and its full dependency tree
 * (oniguruma-to-es, oniguruma-parser, regex, regex-recursion, etc.)
 * into a single ESM file so Parcel doesn't have to resolve their sub-path exports.
 *
 * Run: node scripts/bundle-shiki-engine.mjs
 */
import { writeFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import { execSync } from "child_process"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, "..")
const entry = join(root, "node_modules/@shikijs/engine-javascript/dist/index.mjs")
const outfile = join(root, "lib/shiki-engine-bundle.mjs")
const esbuild = join(root, "node_modules/.bin/esbuild")

execSync(
  `"${esbuild}" "${entry}" --bundle --format=esm --platform=browser --target=es2020 --outfile="${outfile}" --log-level=warning`,
  { cwd: root, stdio: "inherit" }
)

console.log("✔ Shiki engine bundled → lib/shiki-engine-bundle.mjs")
