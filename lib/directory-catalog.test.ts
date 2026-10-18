import { describe, expect, it } from "vitest"

import {
  type DirectoryEntry,
  mergeLegacyDirectoryEntry,
  selectDirectoryEntry,
} from "./directory-catalog"

function entry(rootUrl: string): DirectoryEntry {
  return {
    rootUrl,
    handle: { name: rootUrl } as FileSystemDirectoryHandle,
  }
}

describe("selectDirectoryEntry", () => {
  it("returns null when no saved root contains the file", () => {
    expect(
      selectDirectoryEntry(
        [entry("file:///Users/eric/docs/")],
        "file:///Users/eric/code/README.md",
      ),
    ).toBeNull()
  })

  it("selects an unrelated saved root independently", () => {
    const docs = entry("file:///Users/eric/docs/")
    const code = entry("file:///Users/eric/code/")

    expect(
      selectDirectoryEntry(
        [docs, code],
        "file:///Users/eric/code/README.md",
      ),
    ).toBe(code)
  })

  it("selects the longest root when roots overlap", () => {
    const projects = entry("file:///Users/eric/projects/")
    const markside = entry("file:///Users/eric/projects/markside/")

    expect(
      selectDirectoryEntry(
        [projects, markside],
        "file:///Users/eric/projects/markside/README.md",
      ),
    ).toBe(markside)
  })

  it("does not match a partial directory segment", () => {
    expect(
      selectDirectoryEntry(
        [entry("file:///Users/eric/app/")],
        "file:///Users/eric/application/README.md",
      ),
    ).toBeNull()
  })

  it("ignores the document fragment", () => {
    const docs = entry("file:///Users/eric/my%20docs/")

    expect(
      selectDirectoryEntry(
        [docs],
        "file:///Users/eric/my%20docs/README.md#install",
      ),
    ).toBe(docs)
  })
})

describe("mergeLegacyDirectoryEntry", () => {
  it("imports a legacy entry missing from the catalog", () => {
    const catalog = entry("file:///Users/eric/code/")
    const legacy = entry("file:///Users/eric/docs/")

    expect(mergeLegacyDirectoryEntry([catalog], legacy)).toEqual({
      entries: [catalog, legacy],
      imported: legacy,
    })
  })

  it("does not import a duplicate legacy root", () => {
    const catalog = entry("file:///Users/eric/docs/")
    const legacy = entry("file:///Users/eric/docs/")

    expect(mergeLegacyDirectoryEntry([catalog], legacy)).toEqual({
      entries: [catalog],
      imported: null,
    })
  })

  it("does nothing when there is no legacy entry", () => {
    const catalog = entry("file:///Users/eric/docs/")

    expect(mergeLegacyDirectoryEntry([catalog], null)).toEqual({
      entries: [catalog],
      imported: null,
    })
  })
})
