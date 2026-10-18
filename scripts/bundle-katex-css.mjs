/**
 * Inlines KaTeX's WOFF2 fonts into its stylesheet as data URIs so the content
 * script can inject it into file:// pages without web-accessible font files.
 *
 * Run: node scripts/bundle-katex-css.mjs
 */
import { readFileSync, writeFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, "..")
const dist = join(root, "node_modules/katex/dist")
const outfile = join(root, "lib/katex-bundle.css")

const css = readFileSync(join(dist, "katex.min.css"), "utf8").replace(
  /src:url\((fonts\/[^)]+\.woff2)\) format\("woff2"\)[^;}]*/g,
  (_, font) =>
    `src:url(data:font/woff2;base64,${readFileSync(join(dist, font)).toString("base64")}) format("woff2")`
)
if (css.includes("url(fonts/")) throw new Error("Unexpected KaTeX font declaration")
writeFileSync(outfile, css)

console.log("✔ KaTeX CSS bundled → lib/katex-bundle.css")
