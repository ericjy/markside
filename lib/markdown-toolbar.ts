export type MarkdownInsert =
  | "heading-1"
  | "heading-2"
  | "heading-3"
  | "bold"
  | "italic"
  | "strikethrough"
  | "link"
  | "quote"
  | "code"
  | "fenced-code"
  | "bullet-list"
  | "task-list"
  | "table"
  | "image"
  | "horizontal-rule"
  | "footnote"
  | "alert-note"
  | "alert-tip"
  | "alert-important"
  | "alert-warning"
  | "alert-caution"

export interface MarkdownEdit {
  insert: string
  selectionFrom: number
  selectionTo: number
}

function wrap(
  selected: string,
  placeholder: string,
  before: string,
  after: string,
  selectionStart = before.length,
): MarkdownEdit {
  const text = selected || placeholder
  return {
    insert: `${before}${text}${after}`,
    selectionFrom: selectionStart,
    selectionTo: selectionStart + text.length,
  }
}

function prefixLines(selected: string, placeholder: string, prefix: string): MarkdownEdit {
  const text = selected || placeholder
  const insert = text
    .split("\n")
    .map((line) => `${prefix}${line}`)
    .join("\n")

  return {
    insert,
    selectionFrom: prefix.length,
    selectionTo: insert.length,
  }
}

function blockSpacing(beforeSelection: string, afterSelection: string) {
  return {
    leadingBreak: beforeSelection && !beforeSelection.endsWith("\n") ? "\n\n" : "",
    trailingBreak: afterSelection && !afterSelection.startsWith("\n") ? "\n\n" : "",
  }
}

export function createMarkdownEdit(
  action: MarkdownInsert,
  selected: string,
  beforeSelection: string,
  afterSelection: string,
): MarkdownEdit {
  switch (action) {
    case "heading-1":
      return prefixLines(selected, "Heading", "# ")
    case "heading-2":
      return prefixLines(selected, "Heading", "## ")
    case "heading-3":
      return prefixLines(selected, "Heading", "### ")
    case "bold":
      return wrap(selected, "bold text", "**", "**")
    case "italic":
      return wrap(selected, "italic text", "_", "_")
    case "strikethrough":
      return wrap(selected, "strikethrough text", "~~", "~~")
    case "link": {
      const text = selected || "link text"
      const insert = `[${text}](https://)`
      return selected
        ? { insert, selectionFrom: text.length + 3, selectionTo: insert.length - 1 }
        : { insert, selectionFrom: 1, selectionTo: text.length + 1 }
    }
    case "quote":
      return prefixLines(selected, "Quote", "> ")
    case "code": {
      const marker = selected.includes("`") ? "``" : "`"
      return wrap(selected, "code", marker, marker)
    }
    case "fenced-code": {
      const marker = selected.includes("```") ? "~~~~" : "```"
      const code = selected || "code"
      const { leadingBreak, trailingBreak } = blockSpacing(beforeSelection, afterSelection)
      return {
        insert: `${leadingBreak}${marker}\n${code}\n${marker}${trailingBreak}`,
        selectionFrom: leadingBreak.length + marker.length + 1,
        selectionTo: leadingBreak.length + marker.length + 1 + code.length,
      }
    }
    case "bullet-list":
      return prefixLines(selected, "List item", "- ")
    case "task-list":
      return prefixLines(selected, "Task", "- [ ] ")
    case "table": {
      const { leadingBreak, trailingBreak } = blockSpacing(beforeSelection, afterSelection)
      const table = [
        "| Column 1 | Column 2 | Column 3 |",
        "| --- | --- | --- |",
        "| Cell | Cell | Cell |",
      ].join("\n")
      return {
        insert: `${leadingBreak}${table}${trailingBreak}`,
        selectionFrom: leadingBreak.length + 2,
        selectionTo: leadingBreak.length + 10,
      }
    }
    case "image": {
      const text = selected || "alt text"
      const insert = `![${text}](image-url)`
      return selected
        ? { insert, selectionFrom: text.length + 4, selectionTo: insert.length - 1 }
        : { insert, selectionFrom: 2, selectionTo: text.length + 2 }
    }
    case "horizontal-rule": {
      const { leadingBreak, trailingBreak } = blockSpacing(beforeSelection, afterSelection)
      const insert = `${leadingBreak}---${trailingBreak}`
      const cursor = leadingBreak.length + 3
      return { insert, selectionFrom: cursor, selectionTo: cursor }
    }
    case "footnote":
      return wrap(selected, "Footnote text", "^[", "]")
    case "alert-note":
    case "alert-tip":
    case "alert-important":
    case "alert-warning":
    case "alert-caution": {
      const text = selected || "Alert text"
      const marker = `> [!${action.slice("alert-".length).toUpperCase()}]\n`
      const body = text
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n")
      const { leadingBreak, trailingBreak } = blockSpacing(beforeSelection, afterSelection)
      return {
        insert: `${leadingBreak}${marker}${body}${trailingBreak}`,
        selectionFrom: leadingBreak.length + marker.length + 2,
        selectionTo: leadingBreak.length + marker.length + body.length,
      }
    }
  }
}
