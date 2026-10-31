// @vitest-environment jsdom
import { describe, expect, it } from "vitest"

import { ExternalChartDataError, renderVegaLite } from "./vega-engine"

const render = (spec: object) => renderVegaLite(JSON.stringify(spec), { idPrefix: "chart-1-" })

const lineChart = {
  data: { values: [{ day: 1, count: 30 }, { day: 2, count: 55 }] },
  mark: "line",
  encoding: {
    x: { field: "day", type: "quantitative", title: "Day" },
    y: { field: "count", type: "quantitative" },
  },
}

describe("renderVegaLite", () => {
  it("renders inline data to SVG with real text and theme colors", async () => {
    const svg = await render(lineChart)
    expect(svg).toContain("<svg")
    expect(svg).toMatch(/<text[^>]*>Day<\/text>/)
    expect(svg).toContain("var(--pele-fg)")
  })

  it("evaluates expressions without compiling code", async () => {
    const svg = await render({
      ...lineChart,
      transform: [{ calculate: "datum.count * 2", as: "doubled" }, { filter: "datum.day > 1" }],
      encoding: { ...lineChart.encoding, y: { field: "doubled", type: "quantitative", title: "Doubled" } },
    })
    expect(svg).toContain("Doubled")
  })

  it.each([
    ["top-level data", { ...lineChart, data: { url: "https://example.com/data.csv" } }],
    ["a relative path", { ...lineChart, data: { url: "./secrets.csv" } }],
    ["a layer", { layer: [{ ...lineChart, data: { url: "https://example.com/data.csv" } }] }],
    ["a lookup", {
      ...lineChart,
      transform: [{
        lookup: "day",
        from: { data: { url: "https://example.com/data.csv" }, key: "day", fields: ["name"] },
      }],
    }],
  ])("refuses a URL in %s", async (_, spec) => {
    await expect(render(spec)).rejects.toBeInstanceOf(ExternalChartDataError)
  })

  it("drops links from the output", async () => {
    const svg = await render({
      data: { values: [{ x: 1, y: 1, link: "https://example.com/" }] },
      mark: { type: "point", filled: true },
      encoding: {
        x: { field: "x", type: "quantitative" },
        y: { field: "y", type: "quantitative" },
        href: { field: "link" },
      },
    })
    expect(svg).toContain("<svg")
    expect(svg).not.toMatch(/<a\b|href=/)
  })

  it("refuses an image mark", async () => {
    await expect(render({
      data: { values: [{ x: 1, y: 1, url: "https://example.com/pixel.png" }] },
      mark: { type: "image", width: 10, height: 10 },
      encoding: {
        x: { field: "x", type: "quantitative" },
        y: { field: "y", type: "quantitative" },
        url: { field: "url" },
      },
    })).rejects.toBeInstanceOf(ExternalChartDataError)
  })

  it("prefixes generated IDs so charts on one page do not share clip paths", async () => {
    const svg = await render({
      ...lineChart,
      mark: { type: "line", clip: true },
    })
    const ids = [...svg.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1])
    expect(ids.length).toBeGreaterThan(0)
    expect(ids.every((id) => id.startsWith("chart-1-"))).toBe(true)
    for (const [, id] of svg.matchAll(/url\(#([^)]+)\)/g)) expect(ids).toContain(id)
  })

  it("rejects invalid JSON and specs", async () => {
    await expect(renderVegaLite("{ not json", { idPrefix: "x-" })).rejects.toThrow()
  })
})
