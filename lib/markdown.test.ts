// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { hasQuestionCard, md, mountQuestionCard } from "./markdown"

describe("markdown renderer", () => {
  it("adds an id attribute to H1 headings", () => {
    const html = md.render("# Hello World")
    expect(html).toContain('id="hello-world"')
  })

  it("adds an id attribute to H2 headings", () => {
    const html = md.render("## Section Two")
    expect(html).toContain('id="section-two"')
  })

  it("slugifies heading ids (lowercase, hyphens)", () => {
    const html = md.render("### My Heading Here")
    expect(html).toContain('id="my-heading-here"')
  })

  it("matches GitHub heading ids", () => {
    const ids = Array.from(
      md.render([
        "### Q5. What stays on screen in the mode?",
        "## 设计一个简单的 Markside 功能",
        "## 🚀 Launch",
        "## Use `npm run` now",
        "## C++ & <kbd>Rust</kbd>",
        "## a -- b",
        "## Hello\\_world",
      ].join("\n\n")).matchAll(/<h\d id="([^"]*)"/g),
      (match) => match[1],
    )
    expect(ids).toEqual([
      "q5-what-stays-on-screen-in-the-mode",
      "设计一个简单的-markside-功能",
      "-launch",
      "use-npm-run-now",
      "c--rust",
      "a----b",
      "hello_world",
    ])
  })

  it("numbers duplicate heading ids like GitHub", () => {
    const html = md.render("## Notes\n\n## Notes\n\n## Notes 1")
    expect(Array.from(html.matchAll(/id="([^"]*)"/g), (match) => match[1])).toEqual(["notes", "notes-1", "notes-1-1"])
  })

  it("converts bare URLs to links when linkify is enabled", () => {
    const html = md.render("Visit https://example.com today")
    expect(html).toContain('href="https://example.com"')
  })

  it("renders fenced code blocks with the language class", () => {
    const html = md.render("```typescript\nconst x = 1\n```")
    expect(html).toContain('class="language-typescript"')
  })

  it("renders fenced code block content inside <code>", () => {
    const html = md.render("```js\nconsole.log('hi')\n```")
    expect(html).toContain("console.log")
    expect(html).toContain("<pre>")
    expect(html).toContain("<code")
  })

  it("annotates rendered blocks with their source lines", () => {
    const html = md.render("# Heading\n\nParagraph\n\n- first\n- second")

    expect(html).toContain('data-source-line="1"')
    expect(html).toContain('data-source-line="3"')
    expect(html).toContain('data-source-line="5"')
    expect(html).toContain('data-source-line="6"')
  })

  it("offsets source lines when rendering a body after frontmatter", () => {
    const html = md.render("# Heading", { sourceLineOffset: 4 })

    expect(html).toContain('data-source-line="5"')
  })

  it("renders the code block header before syntax enhancement", () => {
    const html = md.render("```bash\npnpm dev\n```")

    expect(html).toContain('class="code-block"')
    expect(html).toContain('class="code-block-header"')
    expect(html).toContain('class="code-block-lang">Bash</span>')
    expect(html).toContain('class="code-block-wrap"')
    expect(html).toContain('aria-label="Wrap lines"')
    expect(html).toContain('aria-pressed="false"')
    expect(html).toContain('aria-label="Copy code"')
    expect(html).toContain('class="code-block" data-source-line="1"')
  })

  it("renders inline code spans", () => {
    const html = md.render("Use `npm install` to install")
    expect(html).toContain("<code>npm install</code>")
  })

  it("renders bold text", () => {
    const html = md.render("**important**")
    expect(html).toContain("<strong>important</strong>")
  })

  it("renders italic text", () => {
    const html = md.render("_emphasis_")
    expect(html).toContain("<em>emphasis</em>")
  })

  it("renders unordered lists", () => {
    const html = md.render("- alpha\n- beta\n- gamma")
    expect(html).toContain("<ul ")
    expect(html).toContain(">alpha</li>")
  })

  it("renders ordered lists", () => {
    const html = md.render("1. first\n2. second")
    expect(html).toContain("<ol ")
    expect(html).toContain(">first</li>")
  })

  it("applies typographer smart quotes", () => {
    const html = md.render('"hello"')
    // typographer converts straight quotes to curly
    expect(html).toContain("\u201c") // "
    expect(html).toContain("\u201d") // "
  })

  it("renders blockquotes", () => {
    const html = md.render("> quoted text")
    expect(html).toContain("<blockquote ")
    expect(html).toContain("quoted text")
  })

  it("renders a GitHub-style note alert", () => {
    const html = md.render("> [!NOTE]  \n> Highlights **useful information**.")

    expect(html).toContain('class="markdown-alert markdown-alert-note"')
    expect(html).toContain('class="markdown-alert-title"')
    expect(html).toContain(
      '<svg class="markdown-alert-icon" aria-hidden="true"'
    )
    expect(html).toContain("Note")
    expect(html).toContain("<strong>useful information</strong>")
    expect(html).not.toContain("[!NOTE]")
  })

  it.each([
    ["IMPORTANT", "Important"],
    ["WARNING", "Warning"],
    ["TIP", "Tip"],
    ["CAUTION", "Caution"]
  ])("renders the %s alert type", (marker, title) => {
    const html = md.render(`> [!${marker}]\n> Alert body`)

    expect(html).toContain(
      `class="markdown-alert markdown-alert-${marker.toLowerCase()}"`
    )
    expect(html).toContain('class="markdown-alert-title"')
    expect(html).toContain(`data-alert-icon="${marker.toLowerCase()}"`)
    expect(html).toContain(`${title}</p>`)
    expect(html).toContain("Alert body")
  })

  it("preserves multiple paragraphs inside an alert", () => {
    const html = md.render("> [!TIP]\n> First paragraph.\n>\n> Second paragraph.")

    expect(html).toContain('class="markdown-alert markdown-alert-tip"')
    expect(html).toContain("<p data-source-line=\"1\">First paragraph.</p>")
    expect(html).toContain("<p data-source-line=\"4\">Second paragraph.</p>")
  })

  it("leaves unsupported alert markers as ordinary blockquotes", () => {
    const html = md.render("> [!DANGER]\n> Is this an alert?")

    expect(html).toContain("<blockquote ")
    expect(html).toContain("[!DANGER]")
    expect(html).not.toContain("markdown-alert")
  })

  const question = [
    "```question",
    "### Q3. Where does the doc live?",
    "",
    "- **A. Sibling doc.** Next to the plan.",
    "- **B. Inside the plan.** One file.",
    "",
    "**Recommended: B.** It keeps one file.",
    "```",
  ].join("\n")

  it("renders a question card whose lettered options are choices", () => {
    const html = md.render(question)

    expect(html).toContain('class="markdown-alert markdown-alert-question" data-question-recommended="B"')
    expect(html).toContain('data-alert-icon="question"')
    expect(html).toContain('<ul class="question-options" role="radiogroup"')
    expect(html).toContain('<li data-question-option="A" class="question-option" role="radio" aria-checked="false" tabindex="0"')
    expect(html).toContain('<strong><span class="question-option-key">A<span class="question-option-key-dot">.</span></span> Sibling doc.</strong>')
    // A marker on its own line leaves no empty paragraph behind.
    expect(html).not.toMatch(/<p[^>]*><\/p>/)
  })

  it("detects question cards but not question code inside another fence", () => {
    expect(hasQuestionCard(`# Plan\n\n${question}`)).toBe(true)
    expect(hasQuestionCard("> [!QUESTION]\n> Which one?")).toBe(true)
    expect(hasQuestionCard(`~~~markdown\n${question}\n~~~`)).toBe(false)
  })

  it("preserves source lines and heading anchors inside question fences", () => {
    const root = document.createElement("div")
    root.innerHTML = md.render("Intro\n\n" + question, { sourceLineOffset: 4 })

    expect(root.querySelector("h3")?.dataset.sourceLine).toBe("8")
    expect(root.querySelector("h3 .header-anchor")).not.toBeNull()
    expect(root.querySelector("li")?.dataset.sourceLine).toBe("10")
    expect(root.querySelector(".code-block")).toBeNull()
  })

  it("keeps a context list that merges into the options a plain list", () => {
    const root = document.createElement("div")
    root.innerHTML = md.render(question.replace(
      "### Q3. Where does the doc live?\n",
      "### Q3. Where does the doc live?\n\n- One context point.\n- Another point.\n",
    ))
    const [context, options] = root.querySelectorAll("ul")
    expect(context.className).toBe("")
    expect(context.querySelector("p")).toBeNull()
    expect(context.querySelector("li")?.dataset.sourceLine).toBe("4")
    expect(context.textContent).toContain("One context point.")
    expect(options.className).toBe("question-options")
    expect(options.querySelectorAll("li.question-option")).toHaveLength(2)
    expect(options.querySelector("p")).toBeNull()
    expect(root.querySelectorAll("ul.question-options")).toHaveLength(1)
  })

  it("keeps a tilde mermaid fence inside a question a mermaid block", () => {
    const root = document.createElement("div")
    root.innerHTML = md.render(question.replace(
      "### Q3. Where does the doc live?\n",
      "### Q3. Where does the doc live?\n\n~~~mermaid\ngraph LR\n  A --> B\n~~~\n",
    ))
    const card = root.querySelector(".markdown-alert-question")!
    expect(card.querySelector("code.language-mermaid")?.textContent).toContain("A --> B")
    expect(card.querySelectorAll("li.question-option")).toHaveLength(2)
  })

  it("keeps legacy question alerts working", () => {
    const legacy = question.split("\n").slice(1, -1).map((line) => "> " + line).join("\n")
    const root = document.createElement("div")
    root.innerHTML = md.render("> [!QUESTION]\n" + legacy)
    expect(root.querySelectorAll(".question-option")).toHaveLength(2)
    expect(root.querySelector(".question-option-recommended")?.getAttribute("data-question-option")).toBe("B")
  })

  it("marks an archived question's decision line", () => {
    const root = document.createElement("div")
    root.innerHTML = md.render("> **Your decision: A.** Keep it.\n\n> **Assumed decision: B.** Fine.\n\n> **Open.**\n\n> **Note:** quoted")
    expect([...root.querySelectorAll("blockquote")].map((quote) => quote.className)).toEqual([
      "question-decision question-decision-user",
      "question-decision question-decision-assumed",
      "question-decision question-decision-pending",
      "",
    ])
  })

  it("leaves question examples inside other code fences literal", () => {
    const root = document.createElement("div")
    root.innerHTML = md.render("````markdown\n" + question + "\n````")
    expect(root.querySelector(".markdown-alert-question")).toBeNull()
    expect(root.querySelector("code")?.textContent).toContain("```question")
  })

  it("marks only leading comparison symbols in question tables without changing their text", () => {
    const table = "| A | B | C | D |\n|---|---|---|---|\n| ✓ Supported | △ Needs work | ✕ Unsupported | ? Unverified |\n| `✓` Code | Text ✓ | One file | Two files |"
    const root = document.createElement("div")
    root.innerHTML = md.render("```question\n### Which?\n\n" + table + "\n```")
    const symbols = root.querySelectorAll(".question-comparison-symbol")
    expect(Array.from(symbols, (symbol) => [symbol.textContent, symbol.getAttribute("data-rating")])).toEqual([
      ["✓", "good"], ["△", "tradeoff"], ["✕", "poor"], ["?", "unknown"],
    ])
    expect(Array.from(root.querySelectorAll("tbody tr:first-child td"), (cell) => cell.textContent)).toEqual([
      "✓ Supported", "△ Needs work", "✕ Unsupported", "? Unverified",
    ])
    root.innerHTML = md.render(table)
    expect(root.querySelector(".question-comparison-symbol")).toBeNull()
  })

  it.each([false, true])("preserves comparison open=%s and keeps the recommendation outside it", (open) => {
    const comparison = `<details${open ? " open" : ""}>\n<summary>Compare tradeoffs</summary>\n\n| A | B |\n|---|---|\n| ✓ Supported | △ Needs work |\n\n</details>\n\n`
    const root = document.createElement("div")
    root.innerHTML = md.render(question.replace("**Recommended:", comparison + "**Recommended:"))
    const details = root.querySelector("details")!
    expect(details.open).toBe(open)
    expect(details.querySelector("summary")?.textContent).toBe("Compare tradeoffs")
    expect(details.querySelectorAll("table .question-comparison-symbol")).toHaveLength(2)
    expect(details.contains(root.querySelector(".question-recommendation"))).toBe(false)
    expect(details.nextElementSibling?.className).toBe("question-recommendation")
  })

  it("marks the recommended option and keeps the recommendation in its own paragraph", () => {
    const root = document.createElement("div")
    root.innerHTML = md.render(question)
    const recommended = root.querySelector('li[data-question-option="B"]')!

    expect(recommended.className).toBe("question-option question-option-recommended")
    expect(recommended.querySelector(".question-recommendation")).toBeNull()
    expect(root.querySelector(".markdown-alert-question > p.question-recommendation")?.textContent).toBe("Why B? It keeps one file.")
    expect(root.textContent).toContain("A. Sibling doc. Next to the plan.")
  })

  it("uses the recommended letter in the explanation heading", () => {
    const root = document.createElement("div")
    const source = question.replace("Recommended: B", "Recommended: A")
    root.innerHTML = md.render(source)
    expect(root.querySelector(".question-recommendation > strong")?.textContent).toBe("Why A?")
    expect(root.querySelector(".question-option-recommended")?.getAttribute("data-question-option")).toBe("A")
  })

  it("leaves a recommendation in place when no option has its letter", () => {
    const root = document.createElement("div")
    root.innerHTML = md.render(question.replace("Recommended: B", "Recommended: D"))

    expect(root.querySelector(".question-option-recommended")).toBeNull()
    expect(root.querySelector(".markdown-alert-question > p:last-child")?.textContent).toContain("Recommended: D.")
  })

  it("mounts answer controls after a question card's content and anchors them to its heading", () => {
    const root = document.createElement("div")
    root.innerHTML = md.render(question)
    const card = mountQuestionCard(root.querySelector<HTMLElement>(".markdown-alert-question")!)!

    expect(card.target.tagName).toBe("H3")
    expect(card.target.hasAttribute("data-question-target")).toBe(true)
    expect(card.options.map(({ value, element }) => `${value}:${element.tagName}`)).toEqual(["A:LI", "B:LI"])
    expect(card.recommended).toBe("B")
    expect(card.mount.className).toBe("question-card-actions question-card-shortcuts")
    expect(card.mount.parentElement?.lastElementChild).toBe(card.mount)
    expect(card.footerMount.className).toBe("question-card-actions question-card-footer")
    expect(card.element.nextElementSibling).toBe(card.footerMount)
  })

  it("tags each comparison column with the option letter in its header", () => {
    const root = document.createElement("div")
    root.innerHTML = md.render(question.replace(
      "**Recommended: B.** It keeps one file.",
      "**Recommended: B.** It keeps one file.\n\n<details open>\n<summary>Compare tradeoffs</summary>\n\n| Criterion | A. Sibling | B. Inside |\n|---|---|---|\n| Files | Two | One |\n\n</details>",
    ))
    mountQuestionCard(root.querySelector<HTMLElement>(".markdown-alert-question")!)
    const columns = (row: number) => Array.from(root.querySelectorAll("tr")[row].cells, (cell) => cell.dataset.questionColumn ?? "")
    expect(columns(0)).toEqual(["", "A", "B"])
    expect(columns(1)).toEqual(["", "A", "B"])
    expect(root.querySelector("table")?.parentElement?.className).toBe("question-comparison")
    const header = root.querySelectorAll("th")[1]
    expect(header.querySelector(".question-column-key")?.textContent).toBe("A.")
    expect(header.textContent).toBe("A. Sibling")
  })

  it("offers only free-text answers when a question has no lettered options", () => {
    const root = document.createElement("div")
    root.innerHTML = md.render("```question\nWhat should the doc be called?\n\n**Recommended: A.** No options exist.\n```")
    const card = mountQuestionCard(root.querySelector<HTMLElement>(".markdown-alert-question")!)!

    expect(card.target.textContent).toBe("What should the doc be called?")
    expect(card.options).toEqual([])
    expect(card.recommended).toBeNull()
  })

  it("attaches a header-anchor link inside each heading", () => {
    const html = md.render("## My Section")
    expect(html).toContain("header-anchor")
  })

  it("keeps the visual heading anchor out of rendered text", () => {
    const html = md.render("## My Section")

    expect(html).toContain('class="header-anchor"')
    expect(html).not.toContain(">#</a>")
  })
})

describe("footnote rendering", () => {
  it("renders an inline footnote reference as a superscript link", () => {
    const html = md.render("Text.[^1]\n\n[^1]: The note.")
    expect(html).toContain("fnref")
    expect(html).toContain("<sup")
  })

  it("renders the footnote definition block at the end", () => {
    const html = md.render("Text.[^1]\n\n[^1]: The note.")
    expect(html).toContain("footnotes")
    expect(html).toContain("The note.")
  })

  it("supports named footnote labels", () => {
    const html = md.render("Claim.[^note]\n\n[^note]: Explanation.")
    expect(html).toContain("Explanation.")
  })
})

describe("task list rendering", () => {
  it("renders checked items as checked checkboxes", () => {
    const html = md.render("- [x] Done")
    expect(html).toContain('<input type="checkbox" disabled checked>')
    expect(html).toContain("Done")
    expect(html).not.toContain("[x]")
  })

  it("renders unchecked items as unchecked checkboxes", () => {
    const html = md.render("- [ ] Todo")
    expect(html).toContain('<input type="checkbox" disabled>')
    expect(html).not.toContain("checked")
    expect(html).toContain("Todo")
    expect(html).not.toContain("[ ]")
  })

  it("adds task-list-item class to list items", () => {
    const html = md.render("- [x] Done")
    expect(html).toContain('class="task-list-item"')
  })

  it("leaves regular list items unchanged", () => {
    const html = md.render("- plain item")
    expect(html).not.toContain('type="checkbox"')
    expect(html).toContain("plain item")
  })

  it("handles mixed task and regular items", () => {
    const html = md.render("- [x] Done\n- [ ] Todo\n- plain")
    expect(html).toContain('<input type="checkbox" disabled checked>')
    expect(html).toContain('<input type="checkbox" disabled>')
    expect(html).toContain("plain")
  })

  it("is case-insensitive for [X]", () => {
    const html = md.render("- [X] Done")
    expect(html).toContain('<input type="checkbox" disabled checked>')
  })
})

describe("math rendering", () => {
  it("renders inline $...$ math with KaTeX", () => {
    const html = md.render("Euler: $e^{i\\pi} + 1 = 0$.")
    expect(html).toContain('<span class="katex">')
    expect(html).toContain('<annotation encoding="application/x-tex">e^{i\\pi} + 1 = 0</annotation>')
  })

  it("renders $$...$$ blocks in display mode with a source line", () => {
    const html = md.render("Intro\n\n$$\n\\int_0^1 x\\,dx\n$$\n")
    expect(html).toContain('<div class="math-block" data-source-line="3">')
    expect(html).toContain('class="katex-display"')
  })

  it("renders single-line $$...$$ blocks", () => {
    const html = md.render("$$a^2 + b^2 = c^2$$")
    expect(html).toContain('class="katex-display"')
  })

  it("renders ```math fences as display math", () => {
    const html = md.render("```math\nx^2\n```")
    expect(html).toContain('class="katex-display"')
    expect(html).not.toContain("code-block")
  })

  it("leaves currency amounts as plain text", () => {
    const html = md.render("It costs $5 and that one costs $10. Range: $20 - $30.")
    expect(html).not.toContain("katex")
    expect(html).toContain("$5 and that one costs $10")
  })

  it("does not treat escaped dollars or code spans as math", () => {
    expect(md.render("\\$x\\$")).not.toContain("katex")
    expect(md.render("`$x^2$`")).toContain("<code>$x^2$</code>")
  })

  it("renders invalid LaTeX as an inline error instead of throwing", () => {
    const html = md.render("Bad: $\\frac{1}{$")
    expect(html).toContain("katex-error")
  })

  it("renders math inside table cells and list items", () => {
    expect(md.render("| A |\n| --- |\n| $x$ |")).toContain('<span class="katex">')
    expect(md.render("- $y$")).toContain('<span class="katex">')
  })
})
