import DOMPurify from "dompurify"
import { parse, View, type Loader } from "vega"
import { expressionInterpreter } from "vega-interpreter"
import { compile, type TopLevelSpec } from "vega-lite"

// lib/mermaid.ts checks the name because the engine loads as a separate bundle.
export class ExternalChartDataError extends Error {
  name = "ExternalChartDataError"
}

const TEXT = "var(--pele-fg)"
const MUTED = "var(--pele-muted)"
const LINE = "var(--pele-line)"
const GRID = "var(--pele-border)"
const SURFACE = "var(--pele-bg)"
const CATEGORY = Array.from({ length: 8 }, (_, index) => `var(--chart-${index + 1})`)
// Vega interpolates sequential colors itself, so they can't be CSS variables.
// Fading in opacity lets low values sink into either theme's background.
const SEQUENTIAL = ["rgba(71, 119, 174, 0.1)", "rgba(71, 119, 174, 1)"]

type ChartConfig = NonNullable<NonNullable<Parameters<typeof compile>[1]>["config"]>

function chartConfig(fontFamily: string | undefined): ChartConfig {
  return {
    background: "transparent",
    font: fontFamily,
    padding: 8,
    range: { category: CATEGORY, heatmap: SEQUENTIAL, ramp: SEQUENTIAL },
    title: {
      color: TEXT,
      anchor: "start",
      fontSize: 16,
      fontWeight: 600,
      offset: 18,
      subtitleColor: MUTED,
      subtitleFontSize: 13,
      subtitlePadding: 6,
    },
    axis: {
      labelColor: MUTED,
      labelFontSize: 12,
      labelPadding: 8,
      titleColor: MUTED,
      titleFontSize: 12,
      titleFontWeight: 500,
      domain: false,
      ticks: false,
      tickCount: 5,
      gridColor: GRID,
      gridOpacity: 0.25,
    },
    axisX: {
      domain: true,
      domainColor: LINE,
      domainOpacity: 0.7,
      grid: false,
      labelAngle: 0,
      labelOverlap: true,
      titleAnchor: "end",
      titlePadding: 10,
    },
    // A flat title above the plot reads faster than one rotated along the axis.
    axisY: { titleAngle: 0, titleAlign: "left", titleBaseline: "bottom", titleX: 0, titleY: -12 },
    legend: {
      // Below the plot, because the y-axis title sits above it.
      orient: "bottom",
      titleOrient: "left",
      titlePadding: 10,
      labelColor: MUTED,
      labelFontSize: 12,
      titleColor: MUTED,
      titleFontSize: 12,
      titleFontWeight: 500,
      symbolType: "circle",
      symbolSize: 70,
      symbolBaseFillColor: MUTED,
      symbolBaseStrokeColor: MUTED,
      columnPadding: 14,
      offset: 16,
      gradientLength: 160,
      gradientThickness: 8,
      gradientStrokeWidth: 0,
    },
    header: {
      labelColor: TEXT,
      labelFontSize: 12,
      labelFontWeight: 500,
      labelAnchor: "start",
      labelPadding: 28,
      titleColor: MUTED,
      titleFontWeight: 500,
    },
    mark: { color: CATEGORY[0] },
    // Vega-Lite draws these two marks black by default, which disappears in dark mode.
    text: { color: TEXT, fontSize: 12, fontWeight: 500 },
    rule: { color: MUTED },
    line: { strokeWidth: 2.25, strokeCap: "round", strokeJoin: "round" },
    point: { filled: true, opacity: 0.9, size: 60 },
    // Large fills look stronger than thin marks of the same color.
    bar: { discreteBandSize: 28, cornerRadiusEnd: 4, fillOpacity: 0.85, stroke: SURFACE, strokeWidth: 1 },
    area: { fillOpacity: 0.35, line: { strokeWidth: 2, strokeCap: "round", strokeJoin: "round" } },
    arc: { padAngle: 0.02, cornerRadius: 4, fillOpacity: 0.85 },
    rect: { cornerRadius: 3, stroke: SURFACE, strokeWidth: 2 },
    // Vega-Lite's 200px default looks tiny in a document column. A spec's own size wins.
    view: {
      stroke: null,
      continuousWidth: 560,
      continuousHeight: 280,
      discreteWidth: 560,
      discreteHeight: { step: 44 },
    },
  }
}

// Vega logs a failed load and draws the chart without its data, so a refusal is
// recorded here and raised once the run ends. A link only needs dropping, and
// Vega crashes if its sanitize call fails, so links resolve to nothing.
function refusingLoader(onRefused: () => void): Loader {
  const refuse = () => {
    onRefused()
    return Promise.reject(new ExternalChartDataError())
  }
  const sanitize = (_uri: string, options?: { context?: string }) => {
    if (options?.context === "href") return Promise.resolve({ href: "" })
    return refuse()
  }
  return { load: refuse, sanitize, http: refuse, file: refuse } as unknown as Loader
}

// Vega numbers clip paths and gradients from 1 in every chart.
function prefixIds(svg: string, prefix: string): string {
  return svg
    .replace(/\bid="([^"]+)"/g, (_, id: string) => `id="${prefix}${id}"`)
    .replace(/url\(#([^)]+)\)/g, (_, id: string) => `url(#${prefix}${id})`)
}

export async function renderVegaLite(
  source: string,
  options: { fontFamily?: string; idPrefix: string }
): Promise<string> {
  const { spec } = compile(JSON.parse(source) as TopLevelSpec, {
    config: chartConfig(options.fontFamily),
  })
  let refused = false
  const view = new View(parse(spec, undefined, { ast: true }), {
    expr: expressionInterpreter,
    loader: refusingLoader(() => { refused = true }),
    logLevel: 0,
    renderer: "none",
  })
  try {
    await view.runAsync()
    // Image marks load while the SVG is written, so check after that.
    const svg = await view.toSVG()
    if (refused) throw new ExternalChartDataError()
    return prefixIds(
      DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true, svgFilters: true }, FORBID_TAGS: ["a", "image"] }),
      options.idPrefix
    )
  } finally {
    view.finalize()
  }
}
