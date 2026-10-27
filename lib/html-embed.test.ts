// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  buildHtmlEmbedDocument,
  findHtmlEmbedSources,
  HTML_EMBED_POLICY,
  installHtmlEmbedNavigationPolicy,
  isHtmlEmbedPath,
  renderHtmlEmbeds,
} from "./html-embed"
import { analyzeLinkSnapshotResources } from "./link-snapshot-resources"
import { createLinkSnapshot, decodeLinkSnapshotFragment } from "./link-snapshot"
import { md } from "./markdown"

const sendMessage = vi.fn()
vi.stubGlobal("chrome", { runtime: { sendMessage, lastError: undefined } })

beforeEach(() => {
  sendMessage.mockReset()
  document.body.replaceChildren()
})

describe("HTML Embed paths", () => {
  it("accepts relative paths to .html files", () => {
    expect(isHtmlEmbedPath("./spec.assets/flow.html")).toBe(true)
    expect(isHtmlEmbedPath("../shared/flow.html")).toBe(true)
    expect(isHtmlEmbedPath("flow.html?x=1#top")).toBe(true)
  })

  it("rejects URLs, other extensions, and other letter cases", () => {
    expect(isHtmlEmbedPath("https://example.com/flow.html")).toBe(false)
    expect(isHtmlEmbedPath("file:///tmp/flow.html")).toBe(false)
    expect(isHtmlEmbedPath("//example.com/flow.html")).toBe(false)
    expect(isHtmlEmbedPath("./flow.htm")).toBe(false)
    expect(isHtmlEmbedPath("./flow.HTML")).toBe(false)
    expect(isHtmlEmbedPath("./diagram.png")).toBe(false)
  })
})

describe("HTML Embed document", () => {
  const policy = `<meta http-equiv="Content-Security-Policy" content="${HTML_EMBED_POLICY}">`

  it("injects the policy at the start of <head>", () => {
    const built = buildHtmlEmbedDocument('<!doctype html><html><head lang="en"><title>x</title></head><body><header>h</header></body></html>')
    expect(built.startsWith(`<!doctype html><html><head lang="en">${policy}<script>`)).toBe(true)
    expect(built).toContain("<header>h</header>")
  })

  it("keeps a doctype first when there is no head", () => {
    const built = buildHtmlEmbedDocument("<!DOCTYPE html><svg></svg>")
    expect(built.startsWith(`<!DOCTYPE html>${policy}`)).toBe(true)
  })

  it("prepends the policy to a fragment", () => {
    expect(buildHtmlEmbedDocument("<svg></svg>").startsWith(policy)).toBe(true)
  })

  it("adds the page navigation policy once", () => {
    installHtmlEmbedNavigationPolicy(document)
    installHtmlEmbedNavigationPolicy(document)
    const policies = document.head.querySelectorAll("meta[http-equiv='Content-Security-Policy']")
    expect(policies).toHaveLength(1)
    expect(policies[0].getAttribute("content")).toBe("frame-src 'none'")
  })
})

describe("HTML Embed Markdown", () => {
  it("renders an image line that names a .html file as an embed", () => {
    const html = md.render("Intro\n\n![Save flow](./how.assets/save-flow.html)\n")
    const root = document.createElement("div")
    root.innerHTML = html
    const figure = root.querySelector<HTMLElement>("figure.html-embed")!
    expect(figure.dataset.embedSrc).toBe("./how.assets/save-flow.html")
    expect(figure.dataset.sourceLine).toBe("3")
    expect(figure.querySelector(".html-embed-body")?.textContent).toBe("Save flow")
    expect(figure.querySelector("figcaption")?.textContent).toBe("[HTML: ./how.assets/save-flow.html]")
    expect(root.querySelector("img")).toBeNull()
  })

  it("leaves images inside text, remote pages, and pictures alone", () => {
    expect(md.render("See ![flow](./flow.html) here")).toContain("<img")
    expect(md.render("![flow](https://example.com/flow.html)")).toContain("<img")
    expect(md.render("![chart](./chart.png)")).toContain("<img")
  })

  it("lists each embedded path once", () => {
    const tokens = md.parse("![a](./a.html)\n\n![b](./b.html)\n\n![a again](./a.html)\n", {})
    expect(findHtmlEmbedSources(tokens)).toEqual(["./a.html", "./b.html"])
  })
})

describe("HTML Embed rendering", () => {
  const render = (markdown: string) => {
    const root = document.createElement("div")
    root.innerHTML = md.render(markdown)
    document.body.append(root)
    return root
  }

  it("loads the file into a sandboxed frame with the policy", async () => {
    sendMessage.mockImplementation((_message, callback) => callback({ text: "<p>Hello</p>" }))
    const root = render("![Greeting](./greeting.html)")
    await renderHtmlEmbeds(root, "file:///docs/guide.md", 1)
    expect(sendMessage).toHaveBeenCalledWith(
      { type: "fetch-file", url: "file:///docs/greeting.html" },
      expect.any(Function),
    )
    const frame = root.querySelector("iframe")!
    expect(frame.getAttribute("sandbox")).toBe("allow-scripts")
    expect(frame.title).toBe("Greeting")
    expect(frame.srcdoc).toContain(HTML_EMBED_POLICY)
    expect(frame.srcdoc).toContain("<p>Hello</p>")
    expect(root.querySelector("[data-embed-action='comment']")).not.toBeNull()
    expect(root.querySelector("[data-embed-action='expand']")).not.toBeNull()
  })

  it("names the path when the file cannot be read", async () => {
    sendMessage.mockImplementation((_message, callback) => callback({ error: "Not found" }))
    const root = render("![Missing](../missing.html)")
    await renderHtmlEmbeds(root, "file:///docs/guide.md", 2)
    expect(root.querySelector(".html-embed-error")?.textContent).toBe("Could not open ../missing.html. Check that the file exists.")
    expect(root.querySelector("figcaption")?.textContent).toBe("[HTML: ../missing.html]")
  })

  it("reads a file once per reload version", async () => {
    sendMessage.mockImplementation((_message, callback) => callback({ text: "<p>x</p>" }))
    await renderHtmlEmbeds(render("![x](./once.html)"), "file:///docs/guide.md", 3)
    await renderHtmlEmbeds(render("![x](./once.html)"), "file:///docs/guide.md", 3)
    expect(sendMessage).toHaveBeenCalledTimes(1)
    await renderHtmlEmbeds(render("![x](./once.html)"), "file:///docs/guide.md", 4)
    expect(sendMessage).toHaveBeenCalledTimes(2)
  })
})

describe("HTML Embeds in Snapshots", () => {
  it("carries embedded files in the envelope", () => {
    const creation = createLinkSnapshot({
      filename: "guide.md",
      markdown: "![Flow](./flow.html)",
      embeds: { "./flow.html": "<p>Flow</p>" },
    })
    if (creation.status !== "ready") throw new Error("expected a ready snapshot")
    const decoded = decodeLinkSnapshotFragment(new URL(creation.url).hash)
    expect(decoded.status === "ready" && decoded.snapshot.embeds).toEqual({ "./flow.html": "<p>Flow</p>" })
  })

  it("does not count embeds as missing local images", () => {
    expect(analyzeLinkSnapshotResources("![Flow](./flow.html)\n\n![Chart](./chart.png)").localImages).toBe(1)
  })
})
