import { describe, expect, it } from "vitest"
import { parseFrontmatter, renderFrontmatterHTML } from "./frontmatter"

describe("parseFrontmatter", () => {
  it("returns body unchanged when content has no frontmatter", () => {
    expect(parseFrontmatter("# Hello")).toEqual({ data: {}, body: "# Hello" })
  })

  it("returns body unchanged when content does not start with ---", () => {
    const content = "Some text\n---\ntitle: x\n---\nmore"
    expect(parseFrontmatter(content)).toEqual({ data: {}, body: content })
  })

  it("returns body unchanged when closing --- is missing", () => {
    const content = "---\ntitle: My Post\n# Body"
    expect(parseFrontmatter(content)).toEqual({ data: {}, body: content })
  })

  it("parses basic key-value pairs", () => {
    const input = "---\ntitle: My Post\nauthor: Alice\n---\n# Body"
    expect(parseFrontmatter(input)).toEqual({
      data: { title: "My Post", author: "Alice" },
      body: "# Body"
    })
  })

  it("strips the leading newline from body", () => {
    const input = "---\ntitle: T\n---\n# Body"
    expect(parseFrontmatter(input).body).toBe("# Body")
  })

  it("handles empty value", () => {
    const input = "---\ntitle:\n---\nbody"
    expect(parseFrontmatter(input).data.title).toBe("")
  })

  it("trims whitespace around keys and values", () => {
    const input = "---\n  title :  Spaced  \n---\n"
    expect(parseFrontmatter(input).data.title).toBe("Spaced")
  })

  it("handles folded scalar (>): joins continuation lines with spaces", () => {
    const input = "---\ndesc: >\n  line one\n  line two\n---\nbody"
    expect(parseFrontmatter(input).data.desc).toBe("line one line two")
  })

  it("handles literal scalar (|): joins continuation lines with newlines", () => {
    const input = "---\ndesc: |\n  line one\n  line two\n---\nbody"
    expect(parseFrontmatter(input).data.desc).toBe("line one\nline two")
  })

  it("parses multiple keys including one with a colon in the value", () => {
    const input = "---\nurl: https://example.com\ntitle: Hello\n---\n"
    const { data } = parseFrontmatter(input)
    expect(data.url).toBe("https://example.com")
    expect(data.title).toBe("Hello")
  })

  it("returns empty body when there is no content after closing ---", () => {
    const input = "---\ntitle: T\n---\n"
    expect(parseFrontmatter(input).body).toBe("")
  })
})

describe("renderFrontmatterHTML", () => {
  it.each([
    "tags: [ideas, backlog]",
    "tags:\n  - ideas\n  - backlog",
    "tags:\n- ideas\n- backlog"
  ])("renders YAML lists as list items: %s", (source) => {
    const { data } = parseFrontmatter(`---\n${source}\n---\n`)
    expect(data.tags).toEqual(["ideas", "backlog"])
    expect(renderFrontmatterHTML(data)).toContain('<ul class="fm-list"><li>ideas</li><li>backlog</li></ul>')
  })

  it("preserves quoted commas and escapes list items", () => {
    const { data } = parseFrontmatter('---\ntags: ["one, two", "<b>three</b>", 001, true]\n---\n')
    expect(data.tags).toEqual(["one, two", "<b>three</b>", "001", "true"])
    expect(renderFrontmatterHTML(data)).toContain("<li>&lt;b&gt;three&lt;/b&gt;</li>")
  })

  it.each([
    ['tags: "[ideas, backlog]"', '"[ideas, backlog]"'],
    ["tags: |\n  - ideas\n  - backlog", "- ideas\n- backlog"],
    ["tags: [ideas, backlog", "[ideas, backlog"]
  ])("keeps scalar and malformed values as text: %s", (source, expected) => {
    expect(parseFrontmatter(`---\n${source}\n---\n`).data.tags).toBe(expected)
  })

  it("renders an empty list without a phantom bullet", () => {
    const { data } = parseFrontmatter("---\ntags: []\n---\n")
    expect(data.tags).toEqual([])
    expect(renderFrontmatterHTML(data)).not.toContain("<li>")
  })

  it("returns empty string for empty data", () => {
    expect(renderFrontmatterHTML({})).toBe("")
  })

  it("includes a Frontmatter header", () => {
    const html = renderFrontmatterHTML({ key: "val" })
    expect(html).toContain("Frontmatter")
  })

  it("wraps output in a .fm-table element", () => {
    const html = renderFrontmatterHTML({ key: "val" })
    expect(html).toContain('class="fm-table')
    expect(html).toContain('data-source-line="1"')
  })

  it("renders each key with .fm-key class", () => {
    const html = renderFrontmatterHTML({ title: "Hello" })
    expect(html).toContain('class="fm-key"')
    expect(html).toContain("title")
  })

  it("escapes HTML in keys", () => {
    const html = renderFrontmatterHTML({ "<b>key</b>": "val" })
    expect(html).toContain("&lt;b&gt;key&lt;/b&gt;")
    expect(html).not.toContain("<b>")
  })

  it("escapes HTML in values", () => {
    const html = renderFrontmatterHTML({ x: "<script>alert(1)</script>" })
    expect(html).toContain("&lt;script&gt;")
    expect(html).not.toContain("<script>")
  })

  it("escapes ampersands in values", () => {
    const html = renderFrontmatterHTML({ x: "cats & dogs" })
    expect(html).toContain("cats &amp; dogs")
  })

  it("converts newlines in values to <br>", () => {
    const html = renderFrontmatterHTML({ desc: "line1\nline2" })
    expect(html).toContain("line1<br>line2")
  })

  it("includes all key-value pairs", () => {
    const html = renderFrontmatterHTML({ a: "1", b: "2", c: "3" })
    expect(html).toContain("a")
    expect(html).toContain("b")
    expect(html).toContain("c")
    // 3 data rows — count fm-key cells (thead row has no fm-key)
    expect(html.match(/class="fm-key"/g)?.length).toBe(3)
  })
})
