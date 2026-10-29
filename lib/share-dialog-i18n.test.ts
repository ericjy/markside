// @vitest-environment jsdom

import { createElement, type ComponentProps } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { afterEach, describe, expect, it } from "vitest"

import { ContentDialogs } from "../components/content-dialogs"
import { applyInterfaceLanguagePreference } from "./i18n"

const noop = () => undefined
const asyncNoop = async () => undefined
const snapshot: NonNullable<ComponentProps<typeof ContentDialogs>["linkSnapshotDialog"]> = {
  markdown: "# Example", embeds: {}, missingEmbeds: ["one.html", "two.html"],
  images: {}, originalImages: {}, missingImages: [], imageNotice: null, compressed: false,
  creation: { status: "ready", url: "https://example.com", characters: 930, words: 2, oversized: false },
  resources: { localImages: 2, localDocumentLinks: 2 }, requiresSave: false,
  includeReview: false, reviewerName: "", kind: "link", expiryDays: 7, shareUrl: null, status: "confirm",
}
const props: ComponentProps<typeof ContentDialogs> = {
  reviewPromptOpen: false, dismissReviewPrompt: noop, acceptReviewPrompt: noop,
  clipboardFallback: null, setClipboardFallback: noop,
  linkSnapshotDialog: snapshot, closeLinkSnapshotDialog: noop, setLinkSnapshotDialog: noop,
  ownReviewItemCount: 2, updateLinkSnapshotReviewChoice: noop, importedRoundCount: 2,
  openLinkSnapshotUrl: noop, copyBackupUrl: asyncNoop, backupUrlCopyState: "idle",
  confirmLinkSnapshot: asyncNoop, compressLinkSnapshotImages: asyncNoop,
  importReviewDialog: null, closeImportReviewDialog: noop, setImportReviewDialog: noop,
  decodeImportReviewInput: asyncNoop, confirmImportReview: noop,
  pendingNavigation: null, setPendingNavigation: noop, performFileNavigation: asyncNoop,
  saveState: "idle", cancelScheduledSave: noop, doSave: async () => true,
  draftRef: { current: "" }, fileUrlRef: { current: "file:///example.md" },
  pdfExportTipOpen: false, dismissPdfExportTip: noop, continuePdfExport: noop,
  saveFolderDialogOpen: false, currentFileName: "example.md", folderError: null,
  setSaveFolderDialogOpen: noop, chooseSaveFolder: asyncNoop,
  reviewCopyReload: null, cancelReviewCopyReload: noop, reloadForReviewCopy: asyncNoop,
  reloadConfirmOpen: false, setReloadConfirmOpen: noop, handleReloadFromDisk: asyncNoop,
  renderedCopyStatus: "idle",
}

function dialogText(language: string, overrides: Partial<typeof props> = {}) {
  applyInterfaceLanguagePreference(language)
  const container = document.createElement("div")
  container.innerHTML = renderToStaticMarkup(createElement(ContentDialogs, { ...props, ...overrides }))
  return container.textContent ?? ""
}

afterEach(() => applyInterfaceLanguagePreference("auto"))

describe("Share Link interface translations", () => {
  it.each([
    ["en", "930-character link"],
    ["zh-CN", "930 个字符的链接"],
    ["zh-TW", "連結長度：930 個字元"],
    ["ko", "링크 길이: 930자"],
    ["ja", "リンクの長さ：930 文字"],
    ["es", "Enlace de 930 caracteres"],
  ])("shows a meaningful link length in %s", (language, expected) => {
    expect(dialogText(language)).toContain(expected)
  })

  it("renders complete, natural Simplified Chinese resource and Review descriptions", () => {
    const text = dialogText("zh-CN")
    expect(text).toContain("2 张图片不会包含在此副本中。")
    expect(text).toContain("2 个指向本地文件的链接对接收者不可用。")
    expect(text).toContain("在此链接中包含我的审阅（2 项）")
    expect(text).toContain("2 条已导入的审阅记录也将包含在此链接中。")
    expect(text).toContain("Markside 无法读取这些 HTML 嵌入，分享的链接中会将它们显示为缺失：")
  })

  it.each([
    ["zh-TW", "此副本不會包含 2 張圖片。", "在此連結中包含我的審閱（2 項）"],
    ["ko", "이미지 2개가 이 사본에 포함되지 않습니다.", "이 링크에 내 리뷰 포함 (2개 항목)"],
    ["ja", "画像 2 枚はこのコピーに含まれません。", "このリンクに自分のレビューを含める（2 件）"],
    ["es", "2 imágenes no se incluirán en esta copia.", "Incluir mi revisión en este enlace (2 elementos)"],
  ])("uses complete resource and Review messages in %s", (language, images, review) => {
    const text = dialogText(language)
    expect(text).toContain(images)
    expect(text).toContain(review)
  })

  it("localizes expiry, included images, and missing-image warnings as complete sentences", () => {
    const text = dialogText("zh-CN", {
      linkSnapshotDialog: {
        ...snapshot, kind: "hosted", images: { "one.png": "x", "two.png": "y" },
        missingImages: ["three.png", "four.png"],
      },
    })
    expect(text).toContain("7 天后过期。")
    expect(text).toContain("2 张本地图片将包含在加密副本中。")
    expect(text).toContain("无法读取以下图片，但仍可不包含它们并继续分享：")
    expect(text).toContain("three.png")
  })

  it("formats the size limit and Review import with their original values", () => {
    const tooLarge = dialogText("zh-CN", {
      linkSnapshotDialog: {
        ...snapshot,
        creation: { status: "too-large", characters: 930, words: 2, bytes: 512 * 1024, maxBytes: 256 * 1024 },
      },
    })
    expect(tooLarge).toContain("文档大小为 512 KB，超过接收者浏览器能够打开的 256 KB 上限。")

    const round = {
      id: "r1", reviewerName: "Alice", note: "Keep this note", createdAt: "2026-10-29",
      comments: [
        { id: "c1", body: "Keep this comment", createdAt: "2026-10-29", anchor: { exact: "text", prefix: "", suffix: "", start: 0, end: 4, headingPath: [] } },
        { id: "c2", body: "Another comment", createdAt: "2026-10-29", anchor: { exact: "text", prefix: "", suffix: "", start: 0, end: 4, headingPath: [] } },
      ],
    }
    const preview = dialogText("zh-CN", { linkSnapshotDialog: null, importReviewDialog: { input: "", status: "preview", rounds: [round] } })
    expect(preview).toContain("第 1 轮 — Alice")
    expect(preview).toContain("（2 条评论，1 条备注）")
    const imported = dialogText("zh-CN", { linkSnapshotDialog: null, importReviewDialog: { input: "", status: "imported", rounds: [round, round] } })
    expect(imported).toContain("已导入 2 条审阅记录。")
  })

  it("keeps singular and plural English warnings correct", () => {
    const text = dialogText("en")
    expect(text).toContain("2 images won't be included in this copy.")
    expect(text).toContain("2 links to local files won't work for the recipient.")
    expect(text).toContain("Include my Review (2 items) in this link")
    const single = dialogText("en", {
      ownReviewItemCount: 1,
      linkSnapshotDialog: { ...snapshot, resources: { localImages: 1, localDocumentLinks: 1 }, missingEmbeds: ["one.html"] },
    })
    expect(single).toContain("1 image won't be included in this copy.")
    expect(single).toContain("1 link to a local file won't work for the recipient.")
    expect(single).toContain("Include my Review (1 item) in this link")
  })
})
