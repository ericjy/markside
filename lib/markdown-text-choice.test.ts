// @vitest-environment jsdom

import { act } from "react"
import { describe, expect, it } from "vitest"

import { useMarkdownTextChoice } from "../hooks/use-content-file-loading"
import { renderHook } from "./test-harness"

describe("Markdown text file choice", () => {
  it("asks for each opened .md.txt file, and resets the choice after navigation", () => {
    const first: string = "file:///docs/first.md.txt"
    const second: string = "file:///docs/second.md.txt"
    const hook = renderHook(useMarkdownTextChoice, first)
    expect(hook.result.current).toMatchObject({ suggestMarkdown: true, markdownText: false })

    act(() => hook.result.current.chooseMarkdownText(true))
    expect(hook.result.current).toMatchObject({ suggestMarkdown: false, markdownText: true })

    hook.rerender(second)
    expect(hook.result.current).toMatchObject({ suggestMarkdown: true, markdownText: false })
    act(() => hook.result.current.chooseMarkdownText(false))
    expect(hook.result.current).toMatchObject({ suggestMarkdown: false, markdownText: false })

    hook.rerender("file:///docs/ordinary.txt")
    expect(hook.result.current).toMatchObject({ suggestMarkdown: false, markdownText: false })
    hook.rerender(first)
    expect(hook.result.current).toMatchObject({ suggestMarkdown: true, markdownText: false })
    hook.unmount()
  })
})
