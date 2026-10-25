import type { Heading } from "./headings"

// Treat explicit section prefixes as author-controlled numbering for the whole document.
export function hasAuthoredHeadingNumbers(headings: Heading[]): boolean {
  return headings.some(({ text }) => /^(?:\d+[.)]|\d+(?:\.\d+)+[.)]?)\s/.test(text))
}

export function headingNumbers(headings: Heading[]): string[] {
  if (hasAuthoredHeadingNumbers(headings)) return headings.map(() => "")
  const hasTitle = headings[0]?.level === 1 && headings.filter(h => h.level === 1).length === 1
  const stack: { level: number; count: number }[] = []
  return headings.map((heading, index) => {
    if (hasTitle && index === 0) return ""
    while (stack.length > 1 && stack[stack.length - 1].level > heading.level) stack.pop()
    const last = stack[stack.length - 1]
    if (last && last.level >= heading.level) {
      last.level = heading.level
      last.count += 1
    }
    else stack.push({ level: heading.level, count: 1 })
    return stack.map(item => item.count).join(".")
  })
}

export function applyHeadingNumbers(root: HTMLElement, enabled: boolean): void {
  const elements = Array.from(root.querySelectorAll<HTMLElement>("h1,h2,h3,h4,h5,h6"))
    .filter((element) => !element.closest("[data-reload-removed]"))
  const numbers = headingNumbers(elements.map(el => ({
    id: el.id,
    text: (() => {
      const clean = el.cloneNode(true) as Element
      clean.querySelectorAll("[data-reload-removed], [data-readability-ui]").forEach((node) => node.remove())
      return clean.textContent?.trim() ?? ""
    })(),
    level: Number(el.tagName[1]),
  })))
  elements.forEach((element, index) => {
    if (enabled && numbers[index]) element.dataset.headingNumber = numbers[index]
    else delete element.dataset.headingNumber
  })
}
