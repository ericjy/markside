import { describe, expect, it } from "vitest"

import { uninstallSurveyUrl } from "./uninstall-survey"

describe("uninstallSurveyUrl", () => {
  it("points at the survey with only the version", () => {
    expect(uninstallSurveyUrl("https://markside.app", "1.5.1")).toBe("https://markside.app/uninstall?v=1.5.1")
    expect(uninstallSurveyUrl("http://localhost:4321/", "1.5.1")).toBe("http://localhost:4321/uninstall?v=1.5.1")
  })
})
