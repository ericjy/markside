// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest"

import { md } from "./markdown"
import { setCodeBlockWrapPreference } from "./code-block"
import {
  highlightCodeBlocks,
} from "./shiki"

describe("code block enhancement", () => {
  afterEach(() => {
    setCodeBlockWrapPreference(false)
    document.body.replaceChildren()
  })

  it("enhances the existing code block shell without nesting another shell", async () => {
    document.body.innerHTML = md.render("```bash\npnpm dev\n```")

    await highlightCodeBlocks(document.body)

    expect(document.querySelectorAll(".code-block")).toHaveLength(1)
    expect(document.querySelector(".code-block > pre.shiki")).not.toBeNull()
    expect(document.querySelector<HTMLButtonElement>(".code-block-copy")?.disabled)
      .toBe(false)
  })

  it("toggles line wrapping for every block and retains it across renders", async () => {
    document.body.innerHTML = md.render("```text\nfirst block\n```\n\n```text\nsecond block\n```")

    await highlightCodeBlocks(document.body)
    document.querySelector<HTMLButtonElement>(".code-block-wrap")?.click()

    expect(Array.from(document.querySelectorAll(".code-block"))
      .every((block) => block.classList.contains("code-block-wrapped")))
      .toBe(true)
    expect(Array.from(document.querySelectorAll(".code-block-wrap"))
      .every((button) => button.getAttribute("aria-pressed") === "true"))
      .toBe(true)

    document.body.innerHTML = md.render("```text\nnext render\n```")
    await highlightCodeBlocks(document.body)

    expect(document.querySelector(".code-block")?.classList)
      .toContain("code-block-wrapped")
    expect(document.querySelector(".code-block-wrap")?.getAttribute("aria-label"))
      .toBe("Don't wrap lines")
  })
})
