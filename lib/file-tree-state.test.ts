import { describe, expect, it } from "vitest"

import {
  getExpandedFileTreeStorageKey,
  readExpandedFileTreePaths,
  updateExpandedFileTreePaths,
} from "./file-tree-state"

describe("readExpandedFileTreePaths", () => {
  it("accepts only unique directory paths from stored browser data", () => {
    expect(readExpandedFileTreePaths([
      "src",
      "src/components",
      "src",
      42,
      null,
    ])).toEqual(["src", "src/components"])
    expect(readExpandedFileTreePaths({ src: true })).toEqual([])
  })
})

describe("updateExpandedFileTreePaths", () => {
  it("adds or removes the toggled directory without discarding nested state", () => {
    expect(updateExpandedFileTreePaths(["src"], "src/components", true))
      .toEqual(["src", "src/components"])
    expect(updateExpandedFileTreePaths(
      ["src", "src/components"],
      "src",
      false,
    )).toEqual(["src/components"])
  })
})

describe("getExpandedFileTreeStorageKey", () => {
  it("scopes expansion state to the opened root folder", () => {
    expect(getExpandedFileTreeStorageKey("file:///Users/eric/project/"))
      .not.toBe(getExpandedFileTreeStorageKey("file:///Users/eric/notes/"))
  })
})
