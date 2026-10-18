// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest"

import {
  buildLocalhostElementTarget,
  buildLocalhostTextTarget,
  describeElement,
  resolveLocalhostTarget,
} from "./localhost-target"

function render(html: string) {
  document.body.innerHTML = html
  return document.body
}

function selectText(node: Node, start: number, end: number) {
  const range = document.createRange()
  range.setStart(node, start)
  range.setEnd(node, end)
  const selection = window.getSelection()
  if (!selection) throw new Error("no selection")
  selection.removeAllRanges()
  selection.addRange(range)
  return selection
}

beforeEach(() => {
  document.body.innerHTML = ""
})

describe("describeElement", () => {
  it("records identity attributes and a readable ancestor path", () => {
    const root = render(`
      <main><section class="pricing"><button id="buy" class="cta primary"
        data-testid="buy-button" role="button" aria-label="Buy now">Reduce risk</button></section></main>
    `)
    const descriptor = describeElement(root.querySelector("button")!)
    expect(descriptor).toMatchObject({
      tagName: "button",
      id: "buy",
      testId: "buy-button",
      role: "button",
      ariaLabel: "Buy now",
      classNames: ["cta", "primary"],
    })
    expect(descriptor.ancestorPath).toBe("body > main > section.pricing > button#buy.cta.primary")
  })
})

describe("capturing targets", () => {
  it("captures selected text with its quote context and heading path", () => {
    const root = render(`
      <h1>Pricing</h1>
      <p id="lede">Plans that reduce risk for your team.</p>
    `)
    const text = root.querySelector("#lede")!.firstChild!
    const captured = buildLocalhostTextTarget(root, selectText(text, 11, 22))
    expect(captured).not.toBeNull()
    expect(captured!.target.kind).toBe("text")
    expect(captured!.target.anchor.exact).toBe("reduce risk")
    expect(captured!.target.anchor.prefix).toContain("Plans that")
    expect(captured!.target.anchor.headingPath).toEqual(["Pricing"])
    expect(captured!.target.element.id).toBe("lede")
  })

  it("ignores a collapsed selection", () => {
    const root = render(`<p>Reduce risk</p>`)
    const text = root.querySelector("p")!.firstChild!
    expect(buildLocalhostTextTarget(root, selectText(text, 3, 3))).toBeNull()
  })

  it("captures an element with its rendered text", () => {
    const root = render(`
      <h2>Plans</h2>
      <button class="cta" data-testid="buy">Reduce risk</button>
    `)
    const target = buildLocalhostElementTarget(root, root.querySelector("button")!)
    expect(target.kind).toBe("element")
    expect(target.anchor.exact).toBe("Reduce risk")
    expect(target.anchor.headingPath).toEqual(["Plans"])
    expect(target.element.testId).toBe("buy")
  })

  it("captures an element that renders no text", () => {
    const root = render(`<button id="close" aria-label="Close"><svg></svg></button>`)
    const target = buildLocalhostElementTarget(root, root.querySelector("button")!)
    expect(target.anchor.exact).toBe("")
    expect(target.element.ariaLabel).toBe("Close")
  })
})

describe("resolving targets after the page changes", () => {
  it("finds a text target that moved within the page", () => {
    const root = render(`<p id="lede">Plans that reduce risk for your team.</p>`)
    const captured = buildLocalhostTextTarget(root, selectText(root.querySelector("#lede")!.firstChild!, 11, 22))!
    render(`<header>New banner</header><p id="lede">Plans that reduce risk for your team.</p>`)
    const resolved = resolveLocalhostTarget(document.body, captured.target)
    expect(resolved.status).toBe("found")
    if (resolved.status !== "found") return
    expect(resolved.range?.toString()).toBe("reduce risk")
  })

  it("reports a text target that disappeared", () => {
    const root = render(`<p>Plans that reduce risk for your team.</p>`)
    const captured = buildLocalhostTextTarget(root, selectText(root.querySelector("p")!.firstChild!, 11, 22))!
    render(`<p>Plans that help your team.</p>`)
    expect(resolveLocalhostTarget(document.body, captured.target).status).toBe("missing")
  })

  it("does not attach a text target to an ambiguous match", () => {
    const root = render(`<p>Plans that reduce risk for your team.</p>`)
    const captured = buildLocalhostTextTarget(root, selectText(root.querySelector("p")!.firstChild!, 11, 22))!
    render(`<p>We reduce risk here.</p><p>They reduce risk there.</p>`)
    expect(resolveLocalhostTarget(document.body, captured.target).status).toBe("missing")
  })

  it("finds an element target by its test id after it is restyled and moved", () => {
    const root = render(`<main><button class="cta" data-testid="buy">Reduce risk</button></main>`)
    const target = buildLocalhostElementTarget(root, root.querySelector("button")!)
    render(`<aside><div></div></aside><footer><button class="btn-lg" data-testid="buy">Reduce financial risk</button></footer>`)
    const resolved = resolveLocalhostTarget(document.body, target)
    expect(resolved.status).toBe("found")
    if (resolved.status !== "found") return
    expect(resolved.element.getAttribute("data-testid")).toBe("buy")
  })

  it("finds an element target by its accessible name and text", () => {
    const root = render(`<nav><a href="/pricing" aria-label="Pricing">Plans</a></nav>`)
    const target = buildLocalhostElementTarget(root, root.querySelector("a")!)
    render(`<div><a href="/about">About</a><a href="/pricing" aria-label="Pricing">Plans</a></div>`)
    expect(resolveLocalhostTarget(document.body, target).status).toBe("found")
  })

  it("reports an element target that now matches more than one element", () => {
    const root = render(`<button class="cta">Reduce risk</button>`)
    const target = buildLocalhostElementTarget(root, root.querySelector("button")!)
    render(`<button class="cta">Reduce risk</button><button class="cta">Reduce risk</button>`)
    expect(resolveLocalhostTarget(document.body, target).status).toBe("missing")
  })

  it("reports an element target that disappeared", () => {
    const root = render(`<button id="buy" class="cta">Reduce risk</button>`)
    const target = buildLocalhostElementTarget(root, root.querySelector("button")!)
    render(`<p>Reduce risk</p>`)
    expect(resolveLocalhostTarget(document.body, target).status).toBe("missing")
  })
})
