import { describe, expect, it } from "vitest"

import { findContentScriptFile } from "./content-script-injection"

const manifest = {
  content_scripts: [
    { matches: ["http://localhost/*"], js: ["localhost-review.80feb364.js"] },
    { matches: ["file:///*"], js: ["markside.dd1093b7.js"] },
  ],
} as unknown as chrome.runtime.Manifest

describe("finding a content script to inject", () => {
  it("matches the build's hashed filename by its stable prefix", () => {
    expect(findContentScriptFile(manifest, "localhost-review"))
      .toBe("localhost-review.80feb364.js")
    expect(findContentScriptFile(manifest, "markside")).toBe("markside.dd1093b7.js")
  })

  it("reports nothing rather than guessing when no script matches", () => {
    expect(findContentScriptFile(manifest, "options")).toBeNull()
    expect(findContentScriptFile({} as chrome.runtime.Manifest, "markside")).toBeNull()
  })
})
