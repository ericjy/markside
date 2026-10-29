// @vitest-environment jsdom

import { describe, expect, it } from "vitest"

import { analyzeLinkSnapshotResources } from "./link-snapshot-resources"

describe("Link Snapshot resource analysis", () => {
  it("counts local images, relative document links, and wikilinks", () => {
    const markdown = [
      "![local](./diagram.png)",
      "![remote](https://images.example.com/chart.png)",
      "[plan](../plan.md)",
      "[website](https://example.com)",
      "[email](mailto:owner@example.com)",
      "[section](#next)",
      "[[decision-log]]",
    ].join("\n\n")

    expect(analyzeLinkSnapshotResources(markdown)).toEqual({
      localImages: 1,
      localDocumentLinks: 2,
    })
  })

  it("treats non-HTTPS images as unavailable", () => {
    expect(analyzeLinkSnapshotResources([
      "![http](http://example.com/a.png)",
      "![data](data:image/png;base64,AAAA)",
      "![file](file:///tmp/a.png)",
    ].join("\n"))).toEqual({
      localImages: 3,
      localDocumentLinks: 0,
    })
  })

  it("resolves reference links and ignores resource syntax in code", () => {
    expect(analyzeLinkSnapshotResources([
      "![diagram][image] and [plan][document]",
      "",
      "[image]: ./diagram.png",
      "[document]: ./plan.md",
      "",
      "```md",
      "![not an image](./inside-code.png)",
      "[[not-a-link]]",
      "```",
    ].join("\n"))).toEqual({
      localImages: 1,
      localDocumentLinks: 1,
    })
  })
})

it("finds distinct local image references in Markdown and HTML", async () => {
  const { findLocalSnapshotImages } = await import("./link-snapshot-resources")
  const markdown = ["![chart](../chart.png)", "<img src='./chart.png'>", "![again](../chart.png)", "![remote](https://example.com/a.png)", "![embed](./diagram.html)", "`![code](hidden.png)`"].join("\n\n")
  expect(findLocalSnapshotImages(markdown)).toEqual(["../chart.png", "./chart.png"])
})
