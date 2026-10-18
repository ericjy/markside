// @vitest-environment jsdom
import { describe, expect, it } from "vitest"

import { addDefaultDetailsSummaries, md } from "./markdown"

describe("details rendering", () => {
  it("adds a styleable default summary when details has none", () => {
    const root = document.createElement("div")
    root.innerHTML = md.render("<details>\n\nHidden content.\n\n</details>")

    addDefaultDetailsSummaries(root)

    const details = root.querySelector("details")
    expect(details?.firstElementChild?.tagName).toBe("SUMMARY")
    expect(details?.firstElementChild?.textContent).toBe("Details")
  })

  it("preserves an explicit details summary", () => {
    const root = document.createElement("div")
    root.innerHTML = md.render(
      "<details>\n<summary>Release notes</summary>\n\nHidden content.\n\n</details>"
    )

    addDefaultDetailsSummaries(root)

    expect(root.querySelectorAll("summary")).toHaveLength(1)
    expect(root.querySelector("summary")?.textContent).toBe("Release notes")
  })
})
