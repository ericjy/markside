import { describe, expect, it } from "vitest"

import { sortFileTreeNodes } from "./file-tree-order"

describe("sortFileTreeNodes", () => {
  it("orders directories first, then dotfiles, repository documents, and other files", () => {
    const nodes = [
      { kind: "file" as const, name: "package.json" },
      { kind: "file" as const, name: "SECURITY.md" },
      { kind: "directory" as const, name: "src" },
      { kind: "file" as const, name: ".gitignore" },
      { kind: "file" as const, name: "README.md" },
      { kind: "directory" as const, name: "docs" },
      { kind: "file" as const, name: "AGENTS.md" },
      { kind: "file" as const, name: "eslint.config.mjs" }
    ]

    expect(sortFileTreeNodes(nodes).map((node) => node.name)).toEqual([
      "docs",
      "src",
      ".gitignore",
      "AGENTS.md",
      "README.md",
      "SECURITY.md",
      "eslint.config.mjs",
      "package.json"
    ])
  })

  it("recognizes common repository document names and license variants", () => {
    const nodes = [
      { kind: "file" as const, name: "zebra.txt" },
      { kind: "file" as const, name: "NOTICE" },
      { kind: "file" as const, name: "LICENSE-APACHE" },
      { kind: "file" as const, name: "CONTRIBUTING.rst" },
      { kind: "file" as const, name: "CONTEXT.md" },
      { kind: "file" as const, name: "DESIGN.md" },
      { kind: "file" as const, name: "CLAUDE.md" },
      { kind: "file" as const, name: "CODE_OF_CONDUCT.md" },
      { kind: "file" as const, name: "CHANGELOG.md" }
    ]

    expect(sortFileTreeNodes(nodes).map((node) => node.name)).toEqual([
      "CHANGELOG.md",
      "CLAUDE.md",
      "CODE_OF_CONDUCT.md",
      "CONTEXT.md",
      "CONTRIBUTING.rst",
      "DESIGN.md",
      "LICENSE-APACHE",
      "NOTICE",
      "zebra.txt"
    ])
  })

  it("does not mutate the directory entries returned by the browser", () => {
    const nodes = [
      { kind: "file" as const, name: "z.txt" },
      { kind: "file" as const, name: "a.txt" }
    ]

    sortFileTreeNodes(nodes)

    expect(nodes.map((node) => node.name)).toEqual(["z.txt", "a.txt"])
  })
})
