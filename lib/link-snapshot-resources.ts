import type Token from "markdown-it/lib/token.mjs"
import MarkdownIt from "markdown-it"

const resourceMarkdown = new MarkdownIt({ html: true })
resourceMarkdown.validateLink = () => true

export interface LinkSnapshotResources {
  localImages: number
  localDocumentLinks: number
}

function isRemoteImage(target: string): boolean {
  return target.trim().toLowerCase().startsWith("https://")
}

function isLocalDocumentLink(target: string): boolean {
  const normalized = target.trim().toLowerCase()
  return normalized.length > 0 &&
    !normalized.startsWith("#") &&
    !normalized.startsWith("https://") &&
    !normalized.startsWith("http://") &&
    !normalized.startsWith("mailto:")
}

function visitTokens(tokens: Token[], resources: LinkSnapshotResources): void {
  for (const token of tokens) {
    if (token.type === "image") {
      if (!isRemoteImage(String(token.attrGet("src") ?? ""))) resources.localImages++
    } else if (token.type === "link_open") {
      if (isLocalDocumentLink(String(token.attrGet("href") ?? ""))) resources.localDocumentLinks++
    } else if (token.type === "wikilink_inline") {
      resources.localDocumentLinks++
    } else if (token.type === "text") {
      resources.localDocumentLinks += Array.from(token.content.matchAll(/\[\[[^\]]+\]\]/g)).length
    } else if (token.type === "html_inline" || token.type === "html_block") {
      const template = document.createElement("template")
      template.innerHTML = token.content
      for (const image of template.content.querySelectorAll("img")) {
        if (!isRemoteImage(image.getAttribute("src") ?? "")) resources.localImages++
      }
      for (const link of template.content.querySelectorAll("a")) {
        if (isLocalDocumentLink(link.getAttribute("href") ?? "")) resources.localDocumentLinks++
      }
    }
    if (token.children) visitTokens(token.children, resources)
  }
}

export function analyzeLinkSnapshotResources(markdown: string): LinkSnapshotResources {
  const resources = { localImages: 0, localDocumentLinks: 0 }
  visitTokens(resourceMarkdown.parse(markdown, {}), resources)
  return resources
}
