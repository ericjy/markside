import { t, tRich } from "~lib/i18n"
import { useInterfaceLanguage } from "~hooks/use-interface-language"
import {
  Bot,
  ExternalLink,
  Eye,
  EyeOff,
  FilePen,
  FilePlus,
  FolderInput,
  Keyboard,
  MapPin,
  Settings,
  Star,
  X,
} from "lucide-react"
import { useCallback, useEffect, useState } from "react"

import { getLocalhostReviewOrigin, LOCALHOST_REVIEW_ENABLED } from "~lib/localhost-review"
import { ensureContentScript } from "~lib/content-script-injection"
import {
  isLocalhostReviewPanelOpen,
  setLocalhostReviewPanelOpen,
} from "~lib/localhost-review-storage"
import { FileAccessDemo, FileAccessSettingLabel, FILE_ACCESS_DEMO_CSS } from "~lib/file-access-demo"
import { FILE_ACCESS_SETUP_KEY } from "~lib/file-access-setup"
import { classifyMarksideFileUrl } from "~lib/file-types"
import {
  describeDraftTitle,
  NEW_DRAFT_PAGE,
  openNewDraft,
  readSavedDraftName,
  readStoredDraft,
} from "~lib/new-draft"
import { requestOpenReview } from "~lib/open-review-request"
import {
  describeReviewAge,
  documentReviewEntries,
  sortReviewIndex,
  type ReviewIndexEntry,
} from "~lib/review-index"
import { forgetReviewIndexEntry, readReviewIndex } from "~lib/review-index-storage"
import {
  CHROME_WEB_STORE_REVIEW_URL,
  stopAutomaticReviewPrompts,
} from "~lib/review-prompt"

import "~style.css"

const IS_MAC = navigator.platform.includes("Mac")

const openFileRows = [
  { icon: FolderInput, action: "Drag a file", description: "{0} to a browser tab" },
  { icon: Keyboard, action: "Press", keys: [IS_MAC ? "⌘" : "Ctrl", "O"], description: "{0} {1} in any tab" },
  { icon: MapPin, action: "Paste a path", description: "{0} in the address bar" },
  { icon: Bot, action: "Ask your agent", description: "{0} to open it in Chrome" },
]

// System sans keeps the letter O distinct from zero.
function Keys({ keys }: { keys: readonly string[] }) {
  return (
    <span className="popup-keys">
      {keys.map((key) => <kbd className="popup-key" key={key}>{key}</kbd>)}
    </span>
  )
}

async function fileExists(url: string) {
  try {
    await fetch(url)
    return true
  } catch {
    return false
  }
}

export default function Popup() {
  const { language, ready: languageReady } = useInterfaceLanguage()
  const [hasFileAccess, setHasFileAccess] = useState<boolean | null>(null)
  const [localhostOrigin, setLocalhostOrigin] = useState<string | null>(null)
  const [documentUrl, setDocumentUrl] = useState<string | null>(null)
  const [tabId, setTabId] = useState<number | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [tabLabel, setTabLabel] = useState<string | null>(null)
  const [entries, setEntries] = useState<ReviewIndexEntry[] | null>(null)
  const [unsavedDraft, setUnsavedDraft] = useState<{ title: string; updatedAt: string } | null>(null)
  // Set when the active tab is the draft tab: its saved filename, or null before saving.
  const [draftTab, setDraftTab] = useState<{ savedName: string | null } | null>(null)
  const [missingKeys, setMissingKeys] = useState<ReadonlySet<string>>(new Set())

  const loadEntries = useCallback(async () => {
    const stored = await readReviewIndex().catch(() => [])
    const visible = sortReviewIndex(LOCALHOST_REVIEW_ENABLED ? stored : documentReviewEntries(stored))
    setEntries(visible)
    // A file moved or deleted outside Markside keeps its index entry, and
    // opening it would land on Chrome's file-not-found page.
    const documents = visible.filter((entry) => entry.kind === "document")
    const found = await Promise.all(documents.map((entry) => fileExists(entry.key)))
    setMissingKeys(new Set(documents.filter((_, index) => !found[index]).map((entry) => entry.key)))
  }, [])

  useEffect(() => {
    void chrome.extension.isAllowedFileSchemeAccess().then(setHasFileAccess)
    void chrome.tabs
      .query({ active: true, currentWindow: true })
      .then(async ([tab]) => {
        if (!tab?.url) return
        setTabId(tab.id ?? null)
        const origin = LOCALHOST_REVIEW_ENABLED ? getLocalhostReviewOrigin(tab.url) : null
        setLocalhostOrigin(origin)
        if (origin) setPanelOpen(await isLocalhostReviewPanelOpen(origin).catch(() => false))
        if (tab.id !== undefined && tab.url.startsWith(chrome.runtime.getURL(NEW_DRAFT_PAGE))) {
          setDraftTab({ savedName: await readSavedDraftName(tab.id).catch(() => null) })
        }
        setDocumentUrl(
          tab.url.startsWith("file://") && classifyMarksideFileUrl(tab.url) === "markdown"
            ? tab.url
            : null,
        )
        try {
          const { protocol, host, pathname } = new URL(tab.url)
          setTabLabel(
            protocol === "file:"
              ? decodeURIComponent(pathname).split("/").pop() ?? null
              : host,
          )
        } catch {
          setTabLabel(null)
        }
      })
      .catch(() => undefined)
    void loadEntries()
    void readStoredDraft().then((draft) => {
      if (draft?.content.trim()) {
        setUnsavedDraft({ title: describeDraftTitle(draft.content), updatedAt: draft.updatedAt })
      }
    }).catch(() => undefined)
  }, [loadEntries])

  const toggleLocalhostReview = async () => {
    if (!localhostOrigin) return
    await setLocalhostReviewPanelOpen(localhostOrigin, !panelOpen)
    // The tab may predate this extension being installed or reloaded, in which
    // case nothing is listening for the flag yet.
    if (!panelOpen && tabId !== null) {
      await ensureContentScript(tabId, "localhost-review").catch(() => undefined)
    }
    window.close()
  }

  const openReview = async (entry: ReviewIndexEntry) => {
    if (entry.kind === "localhost") await setLocalhostReviewPanelOpen(entry.key, true)
    else {
      if (!(await fileExists(entry.key))) {
        setMissingKeys((current) => new Set(current).add(entry.key))
        return
      }
      await requestOpenReview(entry.key)
    }
    await chrome.tabs.create({ url: entry.key })
    window.close()
  }

  const dismissReview = async (entry: ReviewIndexEntry) => {
    await forgetReviewIndexEntry(entry.kind, entry.key)
    setEntries((current) => current?.filter((candidate) => candidate !== entry) ?? null)
  }

  const pending = entries ?? []
  const reviewable = Boolean(localhostOrigin || documentUrl)
  // Identity only: pairing it with the state in one line truncated whichever
  // came second.
  const tabTitle = draftTab
    ? draftTab.savedName ?? "New draft"
    : localhostOrigin ? localhostOrigin.replace(/^https?:\/\//, "") : tabLabel
  const editingUnsavedDraft = draftTab !== null && draftTab.savedName === null

  if (!languageReady) return null

  return (
    <>
      <style>{`
        :root {
          --popup-cream: #f5f0e6;
          --popup-cream-deep: #eee9df;
          --popup-green-bright: #078a52;
          --popup-matcha: #84e7a5;
          --popup-text: #000;
          --popup-text-secondary: #55534e;
          --popup-border: #dad4c8;
        }
        html, body { background: transparent; }
        body { margin: 0; }
        .popup-root * { box-sizing: border-box; font-family: 'DM Sans', 'Helvetica Neue', Arial, sans-serif; }
        .popup-root { background: var(--popup-cream); display: flex; flex-direction: column; overflow: hidden; width: 360px; }
        .popup-brand { align-items: center; align-self: flex-start; display: inline-flex; gap: 8px; margin: 16px 20px 12px; text-decoration: none; }
        .popup-brand:focus-visible { border-radius: 6px; outline: 3px solid var(--popup-matcha); outline-offset: 3px; }
        .popup-brand-logo { flex-shrink: 0; height: 20px; width: 20px; }
        .popup-brand-name { color: var(--popup-text); font-size: 14px; font-weight: 700; letter-spacing: -0.2px; line-height: 1; margin: 0; }
        .popup-body { padding: 0 20px 14px; }

        .context { align-items: center; background: #fff; border: 1px solid var(--popup-border); border-radius: 999px; display: flex; gap: 8px; margin-bottom: 12px; padding: 7px 12px; }
        .context-dot { background: var(--popup-green-bright); border-radius: 50%; box-shadow: 0 0 0 3px rgba(132, 231, 165, 0.45); flex-shrink: 0; height: 7px; width: 7px; }
        .context-dot.idle { background: #a8a29e; box-shadow: none; }
        .context-label { font-family: 'Space Mono', ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .context-label.idle { color: var(--popup-text-secondary); }

        .primary-button { align-items: center; background: var(--popup-text); border: 1px solid var(--popup-text); border-radius: 999px; color: #fff; cursor: pointer; display: inline-flex; font-size: 13px; font-weight: 600; gap: 7px; justify-content: center; padding: 10px 14px; transition: background 150ms ease, box-shadow 180ms ease, transform 180ms cubic-bezier(0.34, 1.56, 0.64, 1); width: 100%; }
        .primary-button:hover { background: var(--popup-green-bright); border-color: var(--popup-green-bright); box-shadow: #000 -4px 4px; transform: translate(2px, -2px); }
        .primary-button:active { box-shadow: none; transform: none; }
        .primary-button:focus-visible { outline: 3px solid var(--popup-matcha); outline-offset: 2px; }
        .popup-note { color: var(--popup-text-secondary); font-size: 11px; line-height: 1.5; margin: 8px 0 0; }
        .context-note { margin: -4px 0 0 12px; }

        .section-label { align-items: baseline; color: var(--popup-text-secondary); display: flex; font-size: 10px; font-weight: 700; justify-content: space-between; letter-spacing: 0.75px; margin: 18px 0 8px; text-transform: uppercase; }
        .section-label:first-child { margin-top: 4px; }
        .review-card { background: #fff; border: 1px solid var(--popup-border); border-radius: 12px; cursor: pointer; display: block; margin-bottom: 8px; padding: 12px; text-align: left; width: 100%; }
        .review-card:hover { background: var(--popup-cream-deep); border-color: #bdb5a7; }
        .review-card:focus-visible { outline: 3px solid var(--popup-matcha); outline-offset: 2px; }
        .review-open { align-items: center; color: var(--popup-text-secondary); display: inline-flex; font-size: 11px; font-weight: 600; gap: 5px; }
        .review-head { align-items: baseline; display: flex; gap: 8px; justify-content: space-between; }
        .review-name { color: var(--popup-text); font-size: 13px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .review-name.mono { font-family: 'Space Mono', ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
        .review-count { background: var(--popup-cream-deep); border-radius: 999px; color: var(--popup-text-secondary); flex-shrink: 0; font-size: 11px; font-weight: 600; padding: 2px 8px; }
        .review-meta { color: var(--popup-text-secondary); display: flex; font-size: 11px; line-height: 1.45; margin: 4px 0 8px; white-space: nowrap; }
        .review-path { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
        .review-age { flex-shrink: 0; }
        .review-card.missing { cursor: default; }
        .review-card.missing:hover { background: #fff; border-color: var(--popup-border); }
        .review-card.missing .review-name { color: var(--popup-text-secondary); }
        .review-missing { align-items: center; color: #b42318; display: flex; font-size: 11px; font-weight: 600; justify-content: space-between; }
        .review-dismiss { align-items: center; background: transparent; border: 0; color: var(--popup-text-secondary); cursor: pointer; display: inline-flex; font-size: 11px; font-weight: 600; gap: 4px; padding: 0; }
        .review-dismiss:hover { color: var(--popup-text); }
        .review-dismiss:focus-visible { border-radius: 4px; outline: 3px solid var(--popup-matcha); outline-offset: 1px; }

        .open-row { align-items: center; color: var(--popup-text-secondary); display: flex; font-size: 12px; gap: 10px; padding: 3px 0; }
        .open-row b { color: var(--popup-text); font-weight: 600; }
        .open-icon { color: #8a857c; display: flex; flex-shrink: 0; justify-content: center; width: 16px; }
        .popup-keys { display: inline-flex; gap: 3px; vertical-align: 1px; }
        .popup-key { background: #fff; border: 1px solid var(--popup-border); border-bottom-width: 2px; border-radius: 5px; color: var(--popup-text); display: inline-block; font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; font-size: 11px; font-weight: 600; line-height: 16px; min-width: 18px; padding: 0 4px; text-align: center; }

        .setup-title { color: var(--popup-text); font-size: 14px; font-weight: 700; margin: 6px 0 6px; }
        .setup-copy { color: var(--popup-text-secondary); font-size: 13px; line-height: 1.55; margin: 0 0 12px; }
        .setup-demo { margin: 0 0 14px; }
        ${FILE_ACCESS_DEMO_CSS}
        .popup-root .demo-window * { font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; }

        .popup-footer { align-items: center; border-top: 1px solid var(--popup-border); display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; margin-top: 16px; padding-top: 12px; }
        .footer-link { align-items: center; background: transparent; border: 0; color: var(--popup-text-secondary); cursor: pointer; display: inline-flex; font-size: 12px; font-weight: 600; gap: 6px; padding: 4px 6px; }
        .footer-link:hover { color: var(--popup-green-bright); }
        .footer-link:focus-visible { border-radius: 6px; outline: 3px solid var(--popup-matcha); outline-offset: 1px; }
        .footer-dot { color: var(--popup-border); }
        @media (prefers-reduced-motion: reduce) { .primary-button { transition: none; } }
      `}</style>

      <div className="popup-root" lang={language}>
        <a
          className="popup-brand"
          href="https://markside.app"
          target="_blank"
          rel="noreferrer"
          aria-label={t("Open markside.app in a new tab")}>
          <svg className="popup-brand-logo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" aria-hidden="true">
            <rect width="128" height="128" rx="28" fill="#000" />
            <path d="M22 92 V 28 h12 l26 38 26 -38 h12 V 92 h-12 V 50 l-22 32 h-8 L34 50 V 92 Z" fill="#fff" />
            <g stroke="#fff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none">
              <path d="M90 108 H118" />
              <path d="M109 99 L118 108 L109 117" />
            </g>
          </svg>
          <h1 className="popup-brand-name">{t("Markside")}</h1>
        </a>

        <main className="popup-body">
          {(reviewable || draftTab) && (
            <div className="context">
              <span className="context-dot" />
              <span className="context-label" title={tabTitle ?? undefined}>
                {tabTitle ?? ""}
              </span>
            </div>
          )}

          {localhostOrigin && (
            <button className="primary-button" onClick={() => void toggleLocalhostReview()}>
              {panelOpen
                ? <EyeOff size={15} strokeWidth={1.8} />
                : <Eye size={15} strokeWidth={1.8} />}
              {panelOpen ? t("Exit Review Mode") : t("Enter Review Mode")}
            </button>
          )}

          {documentUrl && (
            <p className="popup-note context-note">
              {t("Select text in the page to add a comment.")}</p>
          )}

          {editingUnsavedDraft && (
            <p className="popup-note context-note">{tRich("Press {0} to save it anywhere.", <Keys keys={[IS_MAC ? "⌘" : "Ctrl", "S"]} />)}</p>
          )}

          {hasFileAccess === false ? (
            <>
              <h2 className="setup-title">{t("One last step to set up Markside")}</h2>
              <p className="setup-copy">{tRich("Click Open Extension Details, then turn on {0}.", <strong><FileAccessSettingLabel /></strong>)}</p>
              <div className="setup-demo"><FileAccessDemo /></div>
              <button
                className="primary-button"
                onClick={() => {
                  void chrome.storage.local.set({ [FILE_ACCESS_SETUP_KEY]: true })
                  void chrome.tabs.create({ url: `chrome://extensions/?id=${chrome.runtime.id}` })
                }}>
                {t("Open Extension Details")}</button>
            </>
          ) : (
            <>
              {pending.length > 0 && (
                <div className="section-label">
                  <span>{t("Pending reviews")}</span>
                  <span>{pending.length}</span>
                </div>
              )}

              {pending.map((entry) => missingKeys.has(entry.key) ? (
                <div className="review-card missing" key={`${entry.kind}-${entry.key}`}>
                  <span className="review-head">
                    <span className="review-name" title={entry.key}>{entry.label}</span>
                    <span className="review-count">
                      {t(entry.itemCount === 1 ? "{0} item" : "{0} items", [entry.itemCount])}
                    </span>
                  </span>
                  <span className="review-meta">
                    {entry.detail && <span className="review-path" title={entry.detail}>{entry.detail}</span>}
                  </span>
                  <span className="review-missing">
                    {t("File moved or deleted")}<button
                      className="review-dismiss"
                      aria-label={t("Dismiss the Review for {0}", [entry.label])}
                      onClick={() => void dismissReview(entry)}>
                      <X size={12} /> {t(" Dismiss")}</button>
                  </span>
                </div>
              ) : (
                <button
                  className="review-card"
                  key={`${entry.kind}-${entry.key}`}
                  aria-label={t("Open the Review for {0}", [entry.label])}
                  onClick={() => void openReview(entry)}>
                  <span className="review-head">
                    <span
                      className={entry.kind === "localhost" ? "review-name mono" : "review-name"}
                      title={entry.key}>
                      {entry.label}
                    </span>
                    <span className="review-count">
                      {t(entry.itemCount === 1 ? "{0} item" : "{0} items", [entry.itemCount])}
                    </span>
                  </span>
                  <span className="review-meta">
                    {entry.detail && <span className="review-path" title={entry.detail}>{entry.detail}</span>}
                    <span className="review-age">
                      {entry.detail ? "\u00a0· " : ""}{describeReviewAge(entry.updatedAt, Date.now())}
                    </span>
                  </span>
                  <span className="review-open"><ExternalLink size={12} /> {t(" Open")}</span>
                </button>
              ))}

              {!reviewable && !draftTab && (
                <>
                  <div className="section-label"><span>{t("Ways to open a Markdown file")}</span></div>
                  {openFileRows.map(({ icon: Icon, action, keys, description }) => (
                    <div className="open-row" key={action}>
                      <span className="open-icon"><Icon size={15} strokeWidth={1.6} /></span>
                      <span>{tRich(description, <b>{t(action)}</b>, ...(keys ? [<Keys keys={keys} />] : []))}</span>
                    </div>
                  ))}
                  {LOCALHOST_REVIEW_ENABLED && (
                    <>
                      <div className="section-label"><span>{t("Review a localhost page")}</span></div>
                      <div className="open-row">
                        <span className="open-icon"><Eye size={15} strokeWidth={1.6} /></span>
                        <span>{tRich("Serve it on {0}, then Enter Review Mode here", <b>{t("localhost")}</b>)}</span>
                      </div>
                    </>
                  )}
                </>
              )}
            </>
          )}

          <div className="popup-footer">
            {!editingUnsavedDraft && <>
              <button className="footer-link" title={unsavedDraft?.title || undefined} onClick={() => void openNewDraft().then(() => window.close())}>
                {unsavedDraft ? <FilePen size={13} strokeWidth={1.8} /> : <FilePlus size={13} strokeWidth={1.8} />}
                {unsavedDraft ? t("Continue draft") : t("New draft")}</button>
              <span className="footer-dot">·</span>
            </>}
            <button className="footer-link" onClick={() => chrome.runtime.openOptionsPage()}>
              <Settings size={13} strokeWidth={1.8} />
              {t("Settings")}</button>
            <span className="footer-dot">·</span>
            <button
              className="footer-link"
              onClick={() => {
                void stopAutomaticReviewPrompts().catch(() => undefined)
                void chrome.tabs.create({ url: CHROME_WEB_STORE_REVIEW_URL })
              }}>
              <Star size={13} strokeWidth={1.8} />
              {t("Rate Markside")}</button>
          </div>
        </main>
      </div>
    </>
  )
}
