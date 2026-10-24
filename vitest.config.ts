import { defineConfig } from "vitest/config"
import { fileURLToPath } from "node:url"

const root = fileURLToPath(new URL(".", import.meta.url))

export default defineConfig({
  oxc: {
    jsx: {
      runtime: "automatic",
    },
  },
  resolve: {
    alias: [{ find: /^~(.+)$/, replacement: `${root}$1` }],
  },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["lib/**/*.ts"],
      exclude: ["lib/shiki-engine-bundle.mjs", "lib/codemirror-bundle.mjs", "lib/shiki.ts"]
    }
  }
})
