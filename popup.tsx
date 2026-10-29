import {
  Bot,
  ChevronRight,
  ExternalLink,
  Eye,
  EyeOff,
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
import { FileAccessDemo, FILE_ACCESS_DEMO_CSS } from "~lib/file-access-demo"
import { FILE_ACCESS_SETUP_KEY } from "~lib/file-access-setup"
import { classifyMarksideFileUrl } from "~lib/file-types"
import { openNewDraft } from "~lib/new-draft"
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

const openFileRows = [
  { icon: FolderInput, action: "Drag a file", target: "to a browser tab" },
  { icon: Keyboard, action: "Press ⌘O", target: "in any tab" },
  { icon: MapPin, action: "Paste a path", target: "in the address bar" },
  { icon: Bot, action: "Ask your agent", target: "to open it in Chrome" },
]

async function fileExists(url: string) {
  try {
    await fetch(url)
    return true
  } catch {
    return false
  }
}

export default function Popup() {
  const [hasFileAccess, setHasFileAccess] = useState<boolean | null>(null)
  const [localhostOrigin, setLocalhostOrigin] = useState<string | null>(null)
  const [documentUrl, setDocumentUrl] = useState<string | null>(null)
  const [tabId, setTabId] = useState<number | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [tabLabel, setTabLabel] = useState<string | null>(null)
  const [entries, setEntries] = useState<ReviewIndexEntry[] | null>(null)
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
  const tabTitle = localhostOrigin ? localhostOrigin.replace(/^https?:\/\//, "") : tabLabel

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
        .popup-root { background: var(--popup-cream); overflow: hidden; width: 360px; }
        .popup-brand { align-items: center; display: flex; gap: 11px; padding: 16px 20px 14px; text-decoration: none; }
        .popup-brand:focus-visible { border-radius: 10px; outline: 3px solid var(--popup-matcha); outline-offset: 2px; }
        .popup-brand-text { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
        .popup-brand-logo { flex-shrink: 0; height: 30px; width: 30px; }
        .popup-brand-name { color: var(--popup-text); font-size: 16px; font-weight: 700; letter-spacing: -0.25px; line-height: 1; margin: 0; }
        .popup-tagline { color: var(--popup-text-secondary); font-size: 11.5px; font-weight: 500; line-height: 1.35; margin: 0; }
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
        .draft-card { align-items: center; background: #fff; border: 1px solid var(--popup-border); border-radius: 12px; cursor: pointer; display: flex; gap: 12px; margin-top: 4px; padding: 12px; text-align: left; width: 100%; }
        .review-card + .draft-card { margin-top: 16px; }
        .draft-card:hover { background: var(--popup-cream-deep); border-color: #bdb5a7; }
        .draft-card:focus-visible { outline: 3px solid var(--popup-matcha); outline-offset: 2px; }
        .draft-icon { align-items: center; background: var(--popup-text); border-radius: 9px; color: #fff; display: flex; flex-shrink: 0; height: 32px; justify-content: center; transition: background 150ms ease; width: 32px; }
        .draft-card:hover .draft-icon { background: var(--popup-green-bright); }
        .draft-text { display: flex; flex: 1; flex-direction: column; gap: 2px; min-width: 0; }
        .draft-title { color: var(--popup-text); font-size: 13px; font-weight: 700; }
        .draft-hint { color: var(--popup-text-secondary); font-size: 11px; line-height: 1.4; }
        .draft-arrow { color: var(--popup-text-secondary); flex-shrink: 0; transition: transform 150ms ease; }
        .draft-card:hover .draft-arrow { color: var(--popup-text); transform: translateX(2px); }
        .draft-card + .section-label { margin-top: 24px; }
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

        .open-row { align-items: center; color: var(--popup-text-secondary); display: flex; font-size: 12px; gap: 9px; padding: 5px 0; }
        .open-row b { color: var(--popup-text); font-weight: 600; }
        .open-icon { align-items: center; background: #e7f3e2; border: 1px solid #bfd5b7; border-radius: 8px; color: var(--popup-green-bright); display: flex; flex-shrink: 0; height: 24px; justify-content: center; width: 24px; }

        .setup-title { color: var(--popup-text); font-size: 14px; font-weight: 700; margin: 6px 0 6px; }
        .setup-copy { color: var(--popup-text-secondary); font-size: 13px; line-height: 1.55; margin: 0 0 12px; }
        .setup-demo { margin: 0 0 14px; }
        ${FILE_ACCESS_DEMO_CSS}
        .popup-root .demo-window * { font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; }

        .popup-footer { align-items: center; border-top: 1px solid var(--popup-border); display: flex; gap: 6px; justify-content: center; margin-top: 16px; padding-top: 12px; }
        .footer-link { align-items: center; background: transparent; border: 0; color: var(--popup-text-secondary); cursor: pointer; display: inline-flex; font-size: 12px; font-weight: 600; gap: 6px; padding: 4px 6px; }
        .footer-link:hover { color: var(--popup-green-bright); }
        .footer-link:focus-visible { border-radius: 6px; outline: 3px solid var(--popup-matcha); outline-offset: 1px; }
        .footer-dot { color: var(--popup-border); }
        @media (prefers-reduced-motion: reduce) { .primary-button, .draft-icon, .draft-arrow { transition: none; } .draft-card:hover .draft-arrow { transform: none; } }
      `}</style>

      <div className="popup-root">
        <a
          className="popup-brand"
          href="https://markside.app"
          target="_blank"
          rel="noreferrer"
          aria-label="Open markside.app in a new tab">
          <svg className="popup-brand-logo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" aria-hidden="true">
            <rect width="128" height="128" rx="28" fill="#000" />
            <path d="M22 92 V 28 h12 l26 38 26 -38 h12 V 92 h-12 V 50 l-22 32 h-8 L34 50 V 92 Z" fill="#fff" />
            <g stroke="#fff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none">
              <path d="M90 108 H118" />
              <path d="M109 99 L118 108 L109 117" />
            </g>
          </svg>
          <span className="popup-brand-text">
            <h1 className="popup-brand-name">Markside</h1>
            <span className="popup-tagline">View and edit Markdown in your browser</span>
          </span>
        </a>

        <main className="popup-body">
          {reviewable && (
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
              {panelOpen ? "Exit Review Mode" : "Enter Review Mode"}
            </button>
          )}

          {documentUrl && (
            <p className="popup-note context-note">
              Select text in the page to add a comment.
            </p>
          )}

          {hasFileAccess === false ? (
            <>
              <h2 className="setup-title">One last step to set up Markside</h2>
              <p className="setup-copy">
                Click Open Extension Details, then turn on <strong>Allow access to file URLs</strong>.
              </p>
              <div className="setup-demo"><FileAccessDemo /></div>
              <button
                className="primary-button"
                onClick={() => {
                  void chrome.storage.local.set({ [FILE_ACCESS_SETUP_KEY]: true })
                  void chrome.tabs.create({ url: `chrome://extensions/?id=${chrome.runtime.id}` })
                }}>
                Open Extension Details
              </button>
            </>
          ) : (
            <>
              {pending.length > 0 && (
                <div className="section-label">
                  <span>Pending reviews</span>
                  <span>{pending.length}</span>
                </div>
              )}

              {pending.map((entry) => missingKeys.has(entry.key) ? (
                <div className="review-card missing" key={`${entry.kind}-${entry.key}`}>
                  <span className="review-head">
                    <span className="review-name" title={entry.key}>{entry.label}</span>
                    <span className="review-count">
                      {entry.itemCount} {entry.itemCount === 1 ? "item" : "items"}
                    </span>
                  </span>
                  <span className="review-meta">
                    {entry.detail && <span className="review-path" title={entry.detail}>{entry.detail}</span>}
                  </span>
                  <span className="review-missing">
                    File moved or deleted
                    <button
                      className="review-dismiss"
                      aria-label={`Dismiss the Review for ${entry.label}`}
                      onClick={() => void dismissReview(entry)}>
                      <X size={12} /> Dismiss
                    </button>
                  </span>
                </div>
              ) : (
                <button
                  className="review-card"
                  key={`${entry.kind}-${entry.key}`}
                  aria-label={`Open the Review for ${entry.label}`}
                  onClick={() => void openReview(entry)}>
                  <span className="review-head">
                    <span
                      className={entry.kind === "localhost" ? "review-name mono" : "review-name"}
                      title={entry.key}>
                      {entry.label}
                    </span>
                    <span className="review-count">
                      {entry.itemCount} {entry.itemCount === 1 ? "item" : "items"}
                    </span>
                  </span>
                  <span className="review-meta">
                    {entry.detail && <span className="review-path" title={entry.detail}>{entry.detail}</span>}
                    <span className="review-age">
                      {entry.detail ? "\u00a0· " : ""}{describeReviewAge(entry.updatedAt, Date.now())}
                    </span>
                  </span>
                  <span className="review-open"><ExternalLink size={12} /> Open</span>
                </button>
              ))}

              <button
                className="draft-card"
                onClick={() => void openNewDraft().then(() => window.close())}>
                <span className="draft-icon"><FilePlus size={16} strokeWidth={1.8} /></span>
                <span className="draft-text">
                  <span className="draft-title">New draft</span>
                  <span className="draft-hint">Write or paste Markdown, save it anywhere</span>
                </span>
                <ChevronRight className="draft-arrow" size={16} strokeWidth={1.8} aria-hidden="true" />
              </button>

              {!reviewable && (
                <>
                  <div className="section-label"><span>Ways to open a Markdown file</span></div>
                  {openFileRows.map(({ icon: Icon, action, target }) => (
                    <div className="open-row" key={action}>
                      <span className="open-icon"><Icon size={13} strokeWidth={1.8} /></span>
                      <span><b>{action}</b> {target}</span>
                    </div>
                  ))}
                  {LOCALHOST_REVIEW_ENABLED && (
                    <>
                      <div className="section-label"><span>Review a localhost page</span></div>
                      <div className="open-row">
                        <span className="open-icon"><Eye size={13} strokeWidth={1.8} /></span>
                        <span>Serve it on <b>localhost</b>, then Enter Review Mode here</span>
                      </div>
                    </>
                  )}
                </>
              )}
            </>
          )}

          <div className="popup-footer">
            <button className="footer-link" onClick={() => chrome.runtime.openOptionsPage()}>
              <Settings size={13} strokeWidth={1.8} />
              Settings
            </button>
            <span className="footer-dot">·</span>
            <button
              className="footer-link"
              onClick={() => {
                void stopAutomaticReviewPrompts().catch(() => undefined)
                void chrome.tabs.create({ url: CHROME_WEB_STORE_REVIEW_URL })
              }}>
              <Star size={13} strokeWidth={1.8} />
              Rate Markside
            </button>
          </div>
        </main>
      </div>
    </>
  )
}
