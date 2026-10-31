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

function chartConfig(fontFamily: string | undefined) {
  return {
    background: "transparent",
    font: fontFamily,
    title: { color: TEXT },
    axis: { labelColor: MUTED, titleColor: TEXT, domainColor: LINE, tickColor: LINE, gridColor: GRID, gridOpacity: 0.4 },
    legend: { labelColor: MUTED, titleColor: TEXT },
    header: { labelColor: MUTED, titleColor: TEXT },
    // Vega-Lite's 200px default looks tiny in a document column. A spec's own size wins.
    view: { stroke: GRID, continuousWidth: 560, continuousHeight: 300, discreteWidth: 560 },
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
