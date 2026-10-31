import { INTERFACE_LANGUAGES, parseInterfaceLanguagePreference, setInterfaceLanguagePreference, t, tRich } from "~lib/i18n"
import { Check, ChevronRight, Copy, FileDown, Mail, Star, X } from "lucide-react"
import { useEffect, useState } from "react"
import { WebPreviewSetting } from "~components/web-preview-setting"

import { useInterfaceLanguage } from "~hooks/use-interface-language"
import {
  getAutoSaveEnabled,
  setAutoSaveEnabled as persistAutoSaveEnabled,
  watchAutoSaveEnabled,
} from "~lib/auto-save"
import { FileAccessDemo, FileAccessSettingLabel, FILE_ACCESS_DEMO_CSS } from "~lib/file-access-demo"
import { FILE_ACCESS_SETUP_KEY } from "~lib/file-access-setup"
import {
  CHROME_WEB_STORE_REVIEW_URL,
  MARKSIDE_FEEDBACK_EMAIL,
  MARKSIDE_FEEDBACK_URL,
  stopAutomaticReviewPrompts,
} from "~lib/review-prompt"

import "~style.css"

const TERMINAL_ALIAS = "alias markside='open -a \"Google Chrome\"'"

const IS_MAC = navigator.userAgent.includes("Mac")

function Code({ children }: { children: React.ReactNode }) {
  return <code className="inline-code">{children}</code>
}

function KeyCap({ children }: { children: React.ReactNode }) {
  return <kbd className="keycap">{children}</kbd>
}

function Keys({ keys }: { keys: string[] }) {
  return (
    <span className="keys">
      {keys.map((key, index) => (
        <span key={key} className="keys">
          {index > 0 && <span className="keys-plus">+</span>}
          <KeyCap>{key}</KeyCap>
        </span>
      ))}
    </span>
  )
}

function Group({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="group">
      <header className="group-head">
        <h2>{title}</h2>
        {aside}
      </header>
      <div className="panel">{children}</div>
    </section>
  )
}

function CopyCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="command">
      <code>{command}</code>
      <button
        type="button"
        className="icon-btn"
        aria-label={copied ? t("Copied") : t("Copy command")}
        title={copied ? t("Copied") : t("Copy command")}
        onClick={() => {
          void navigator.clipboard.writeText(command).then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 1600)
          })
        }}>
        {copied ? <Check size={15} /> : <Copy size={15} />}
      </button>
    </div>
  )
}

function openExtensionSettings() {
  void chrome.tabs.create({ url: `chrome://extensions/?id=${chrome.runtime.id}` })
}

export default function Options() {
  const { preference: languagePreference, language, ready: languageReady } = useInterfaceLanguage()
  useEffect(() => { document.documentElement.lang = language }, [language])
  const [languageError, setLanguageError] = useState(false)
  const [hasFileAccess, setHasFileAccess] = useState<boolean | null>(null)
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false)
  const [openedSettings, setOpenedSettings] = useState(false)
  const [returnedStillOff, setReturnedStillOff] = useState(false)
  const [setupJustFinished, setSetupJustFinished] = useState(false)
  const [draggingFile, setDraggingFile] = useState(false)

  useEffect(() => {
    // Users leave for chrome://extensions to grant file access, so re-check when they come back.
    const checkFileAccess = async (returning: boolean) => {
      const allowed = await chrome.extension.isAllowedFileSchemeAccess()
      setHasFileAccess(allowed)
      if (!allowed) {
        setReturnedStillOff(returning)
        await chrome.storage.local.set({ [FILE_ACCESS_SETUP_KEY]: true })
      } else if ((await chrome.storage.local.get(FILE_ACCESS_SETUP_KEY))[FILE_ACCESS_SETUP_KEY]) {
        setSetupJustFinished(true)
        await chrome.storage.local.remove(FILE_ACCESS_SETUP_KEY)
      }
    }
    const onFocus = () => void checkFileAccess(true)
    void checkFileAccess(false)
    window.addEventListener("focus", onFocus)
    void getAutoSaveEnabled().then(setAutoSaveEnabled)
    const unwatchAutoSave = watchAutoSaveEnabled(setAutoSaveEnabled)
    return () => {
      window.removeEventListener("focus", onFocus)
      unwatchAutoSave()
    }
  }, [])

  if (!languageReady) return null

  return (
    <>
      <style>{`
        body { background: #faf9f7; }
        .opt-root {
          --ink: #000;
          --text: #55534e;
          --muted: #7a766e;
          --line: #dad4c8;
          --wash: #f0ede7;
          --green: #078a52;
          --forest: #02492a;
          --mint: #84e7a5;
          background: #faf9f7;
          min-height: 100vh;
          color: var(--text);
          font-family: 'Roobert', 'Helvetica Neue', Arial, sans-serif;
          font-size: 15px;
          line-height: 1.55;
        }
        .opt-root * { font-family: inherit; }
        .opt-root ::selection { background: rgba(132, 231, 165, 0.55); color: #000; }
        .opt-root code, .opt-root kbd, .opt-root pre { font-family: 'Space Mono', ui-monospace, monospace; }
        .opt-root strong { color: var(--ink); font-weight: 500; }
        .opt-root :focus-visible { outline: 3px solid var(--mint); outline-offset: 2px; border-radius: 8px; }

        .opt-shell { max-width: 680px; margin: 0 auto; padding: 48px 24px 56px; display: flex; flex-direction: column; gap: 32px; }

        .opt-header { display: flex; align-items: center; gap: 12px; }
        .opt-header h1 { font-size: 22px; font-weight: 600; letter-spacing: -0.4px; color: var(--ink); line-height: 1.2; }

        .setup { background: #fff; border: 2px solid var(--forest); border-radius: 16px; padding: 28px; display: grid; grid-template-columns: minmax(0, 1fr); gap: 24px; }
        .setup h2 { font-size: 22px; font-weight: 600; letter-spacing: -0.4px; color: var(--ink); line-height: 1.25; }
        .setup-lede { margin-top: 6px; }
        .setup ol { list-style: none; margin: 20px 0 22px; padding: 0; display: flex; flex-direction: column; gap: 12px; }
        .setup li { display: flex; gap: 12px; align-items: baseline; color: var(--muted); transition: color 200ms ease; }
        .setup li.current { color: var(--text); }
        .step-num { flex-shrink: 0; width: 24px; height: 24px; border-radius: 50%; background: var(--wash); color: var(--muted); font-size: 13px; font-weight: 600; display: inline-flex; align-items: center; justify-content: center; transform: translateY(-1px); transition: background 200ms ease, color 200ms ease; }
        .setup li.current .step-num { background: var(--forest); color: #fff; }
        .setup li.done .step-num { background: var(--mint); color: var(--forest); }
        .still-off { margin: -8px 0 20px 36px; padding: 10px 14px; border-radius: 10px; background: #fff4d6; color: #6b4a00; font-size: 14px; animation: arrive-fade 240ms ease-out both; }
        .setup-figure { margin: 0; background: var(--wash); border-radius: 16px; padding: 20px; }
        .setup-figure figcaption { font-size: 13px; color: var(--muted); margin-top: 12px; }

        ${FILE_ACCESS_DEMO_CSS}
        .opt-root .demo-window * { font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; }


        .done-card { background: #fff; border: 2px solid var(--green); border-radius: 16px; padding: 22px 20px 22px 24px; display: flex; gap: 16px; align-items: flex-start; animation: arrive 560ms cubic-bezier(0.16, 1, 0.3, 1) both; }
        .done-card h2 { font-size: 20px; font-weight: 600; letter-spacing: -0.4px; color: var(--ink); line-height: 1.3; }
        .done-card p { margin-top: 4px; }
        .done-card .icon-btn { margin-left: auto; margin-top: -4px; }
        .done-card > div { flex: 1; min-width: 0; }
        .done-check { flex-shrink: 0; }
        .drop-zone { margin-top: 14px; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 22px 16px; border: 2px dashed var(--line); border-radius: 12px; background: var(--wash); color: var(--muted); font-size: 14px; font-weight: 500; transition: border-color 150ms ease, background 150ms ease, color 150ms ease; }
        .drop-zone * { pointer-events: none; }
        .drop-zone.dragging { border-color: var(--green); background: rgba(132, 231, 165, 0.22); color: var(--forest); }
        .done-card .drop-alt { margin-top: 10px; font-size: 13px; color: var(--muted); }
        .done-check circle { fill: var(--forest); transform-origin: center; animation: check-pop 420ms cubic-bezier(0.16, 1, 0.3, 1) 120ms both; }
        .done-check path { stroke: var(--mint); stroke-dasharray: 26; stroke-dashoffset: 26; animation: check-draw 360ms cubic-bezier(0.65, 0, 0.35, 1) 360ms forwards; }
        @keyframes arrive { from { opacity: 0; transform: translateY(10px); filter: blur(4px); } }
        @keyframes arrive-fade { from { opacity: 0; } }
        @keyframes check-pop { from { transform: scale(0.4); opacity: 0; } }
        @keyframes check-draw { to { stroke-dashoffset: 0; } }

        .groups { display: flex; flex-direction: column; gap: 28px; }
        .groups.arrive { animation: arrive 560ms cubic-bezier(0.16, 1, 0.3, 1) 260ms both; }
        .group { display: flex; flex-direction: column; gap: 8px; }
        .group-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; padding: 0 4px; }
        .group-head h2 { font-size: 14px; font-weight: 600; color: var(--ink); }
        .panel { background: #fff; border: 1px solid var(--line); border-radius: 12px; }

        .row { display: flex; align-items: center; justify-content: space-between; gap: 24px; padding: 14px 18px; border-top: 1px solid var(--wash); }
        .panel > :first-child { border-top: 0; }
        .row-text { flex: 1; min-width: 0; }
        .row-label { color: var(--ink); font-weight: 500; }
        .row-desc { font-size: 14px; }
        .row-note { font-size: 13px; color: var(--muted); margin-top: 2px; }
        .row-control { display: inline-flex; align-items: center; gap: 12px; flex-shrink: 0; }
        .row-control-stacked { flex-direction: column; align-items: flex-end; gap: 4px; }
        .language-select { max-width: 100%; min-height: 36px; padding: 5px 32px 5px 10px; border: 1px solid var(--line); border-radius: 8px; background: #fff; color: var(--ink); }
        .language-error { color: #a32222; }

        .state { display: inline-flex; align-items: center; gap: 6px; font-size: 14px; color: var(--ink); }
        .state-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--green); }
        .state-dot-off { background: #a8a29e; }
        .link-btn { border: 0; background: none; padding: 0; cursor: pointer; color: var(--green); font-size: 14px; font-weight: 500; text-decoration: underline; text-decoration-color: transparent; text-underline-offset: 3px; transition: text-decoration-color 120ms ease; }
        .link-btn:hover { text-decoration-color: currentColor; }

        .inline-code { background: var(--wash); border-radius: 6px; padding: 1px 6px; font-size: 12.5px; color: var(--ink); overflow-wrap: anywhere; }
        .command { display: flex; align-items: center; gap: 8px; margin-top: 10px; padding: 6px 6px 6px 14px; background: #101010; border-radius: 10px; }
        .command code { flex: 1; min-width: 0; color: #f4f1ea; font-size: 12.5px; overflow-x: auto; white-space: nowrap; scrollbar-width: none; }
        .command .icon-btn { color: #f4f1ea; }
        .command .icon-btn:hover { background: rgba(255,255,255,0.12); color: #fff; }

        details { border-top: 1px solid var(--wash); }
        summary { cursor: pointer; padding: 14px 18px; list-style: none; display: flex; justify-content: space-between; align-items: center; gap: 24px; border-radius: 12px; }
        summary::-webkit-details-marker { display: none; }
        summary .chev { color: var(--muted); flex-shrink: 0; transition: transform 160ms ease; }
        details[open] summary .chev { transform: rotate(90deg); }
        details > div { padding: 0 18px 16px; font-size: 14px; }
        details ul { margin: 0; padding-left: 18px; list-style: disc; display: flex; flex-direction: column; gap: 6px; }

        .icon-btn { border: 0; background: transparent; padding: 7px; border-radius: 8px; cursor: pointer; color: var(--text); display: inline-flex; transition: background 120ms ease, color 120ms ease; }
        .icon-btn:hover { background: var(--wash); color: var(--ink); }

        .switch { width: 40px; height: 22px; padding: 2px; border: none; border-radius: 999px; cursor: pointer; flex-shrink: 0; transition: background 150ms ease; }
        .switch span { display: block; width: 18px; height: 18px; border-radius: 50%; background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,0.2); transition: transform 150ms ease; }


        .keys { display: inline-flex; align-items: center; gap: 3px; }
        .keys-plus { font-size: 11px; color: #b5b0a6; padding: 0 1px; }
        .keycap { display: inline-flex; align-items: center; padding: 1px 6px; background: #fff; border: 1px solid #c9c5bc; border-bottom-width: 2px; border-radius: 5px; font-size: 12px; color: var(--ink); line-height: 1.6; white-space: nowrap; }
        .keys-os { font-size: 12px; color: var(--muted); margin-left: 4px; }
        .key-group { display: inline-flex; align-items: center; gap: 12px; flex-wrap: wrap; justify-content: flex-end; }

        .clay-btn {
          display: inline-flex; align-items: center; gap: 8px;
          background: #000; color: #fff;
          font-size: 14px; font-weight: 500; letter-spacing: -0.13px;
          padding: 10px 20px; border-radius: 12px; border: none; cursor: pointer;
          text-decoration: none;
          transition: transform 150ms ease, box-shadow 150ms ease, background 150ms ease;
          transform-origin: center bottom;
        }
        .clay-btn:hover { transform: rotateZ(-3deg) translateY(-4px); box-shadow: rgb(0,0,0) -5px 5px; background: var(--green); }

        .opt-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px 24px; flex-wrap: wrap; padding: 0 4px; font-size: 13px; color: var(--muted); }
        .footer-links { display: flex; gap: 20px; flex-wrap: wrap; }
        .footer-link { display: inline-flex; align-items: center; gap: 6px; border: 0; background: none; padding: 0; cursor: pointer; color: var(--text); font-size: 13px; font-weight: 500; text-decoration: none; transition: color 120ms ease; }
        .footer-link:hover { color: var(--green); }

        @media (max-width: 640px) {
          .opt-shell { padding: 28px 16px 40px; }
          .setup { padding: 22px; gap: 20px; }
          .row { flex-wrap: wrap; gap: 8px 16px; }
          .language-row { align-items: stretch; flex-direction: column; }
          .language-row .language-select { width: 100%; }
          .row-control { flex-shrink: 1; }
          .key-group { justify-content: flex-start; }
        }
        @media (prefers-reduced-motion: reduce) {
          .clay-btn, .clay-btn:hover { transition: none; transform: none; }
          summary .chev, .switch, .switch span { transition: none; }
          .done-card, .groups.arrive { animation-name: arrive-fade; }
          .done-check circle { animation: none; }
          .done-check path { animation: none; stroke-dashoffset: 0; }
        }
      `}</style>

      <div className="opt-root">
        <div className="opt-shell">

          <header className="opt-header">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" aria-hidden="true" style={{ height: '36px', width: '36px', flexShrink: 0 }}>
              <rect width="128" height="128" rx="28" fill="#000"/>
              <path d="M22 92 V 28 h12 l26 38 26 -38 h12 V 92 h-12 V 50 l-22 32 h-8 L34 50 V 92 Z" fill="#fff"/>
              <g stroke="#fff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none">
                <path d="M90 108 H118"/>
                <path d="M109 99 L118 108 L109 117"/>
              </g>
            </svg>
            <h1>{t("Markside Settings")}</h1>
          </header>

          <Group title={t("Language")}>
            <div className="row language-row">
              <div className="row-text">
                <label htmlFor="interface-language" className="row-label">{t("Interface language")}</label>
                <p className="row-desc">{t("Choose the language used by Markside.")}</p>
                {languageError && <p className="row-note language-error" role="alert">{t("Could not save the language. Please try again.")}</p>}
              </div>
              <select
                id="interface-language"
                className="language-select"
                value={languagePreference}
                onChange={(event) => {
                  setLanguageError(false)
                  void setInterfaceLanguagePreference(parseInterfaceLanguagePreference(event.target.value))
                    .catch(() => setLanguageError(true))
                }}>
                <option value="auto">{t("Follow browser language")}</option>
                {INTERFACE_LANGUAGES.map(({ value, name }) => (
                  <option key={value} value={value} lang={value}>{name}</option>
                ))}
              </select>
            </div>
          </Group>

          <Group title={t("Online Markdown")}>
            <WebPreviewSetting />
          </Group>

          {hasFileAccess === false && (
            <section className="setup" aria-labelledby="setup-title">
              <div>
                <h2 id="setup-title">{t("One more step before Markside can open your files")}</h2>
                <p className="setup-lede">{t("To open Markdown files on your computer, Markside needs one Chrome permission. You only turn it on once, and your files never leave your device.")}</p>
                <ol>
                  {[
                    <>{t("Click ")}<strong>{t("Open Extension Details")}</strong> {t(" to go to Markside's page in Chrome.")}</>,
                    <>{t("Scroll down and turn on ")}<strong><FileAccessSettingLabel /></strong>.</>,
                    <>{t("Come back to this tab. Markside checks for the change automatically.")}</>,
                  ].map((step, index) => {
                    const current = openedSettings ? 1 : 0
                    return (
                      <li key={index} className={index < current ? "done" : index === current ? "current" : undefined}>
                        <span className="step-num">{index < current ? <Check size={14} strokeWidth={3} /> : index + 1}</span>
                        <span>{step}</span>
                      </li>
                    )
                  })}
                </ol>
                {openedSettings && returnedStillOff && (
                  <p className="still-off" role="status">{tRich("File access is still off. On the Markside details page, scroll to {0} and make sure the switch turns blue.", <strong><FileAccessSettingLabel /></strong>)}</p>
                )}
                <button
                  type="button"
                  className="clay-btn"
                  onClick={() => {
                    setOpenedSettings(true)
                    setReturnedStillOff(false)
                    openExtensionSettings()
                  }}>
                  {t("Open Extension Details →")}</button>
              </div>
              <figure className="setup-figure">
                <FileAccessDemo />
                <figcaption>{t("The switch is near the bottom of the Markside details page.")}</figcaption>
              </figure>
            </section>
          )}

          {hasFileAccess && setupJustFinished && (
            <section className="done-card" role="status" aria-labelledby="done-title">
              <svg className="done-check" width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
                <circle cx="20" cy="20" r="20" />
                <path d="M12.5 20.5l5 5 10-11" fill="none" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div>
                <h2 id="done-title">{t("Markside can open your files now")}</h2>
                <p>{t("Try it with any Markdown file.")}</p>
                {/* Chrome opens a file dropped anywhere on the tab; this only makes the target visible. */}
                <div
                  className={draggingFile ? "drop-zone dragging" : "drop-zone"}
                  onDragEnter={() => setDraggingFile(true)}
                  onDragLeave={() => setDraggingFile(false)}>
                  <FileDown size={20} />
                  {t("Drop a ")}<Code>.md</Code> {t(" file on any tab, like this one")}</div>
                <p className="drop-alt">{tRich("or press {0} to pick one", <Keys keys={IS_MAC ? ["⌘", "O"] : ["Ctrl", "O"]} />)}</p>
              </div>
              <button type="button" className="icon-btn" aria-label={t("Dismiss")} title={t("Dismiss")} onClick={() => setSetupJustFinished(false)}>
                <X size={16} />
              </button>
            </section>
          )}

          {hasFileAccess && (
            <>
              <div className={setupJustFinished ? "groups arrive" : "groups"}>
                <Group title={t("General")}>
                  <div className="row">
                    <div className="row-text">
                      <p className="row-label">{t("File access")}</p>
                      <p className="row-desc">{tRich("Chrome's {0} is on, so Markside can open local files.", <strong><FileAccessSettingLabel /></strong>)}</p>
                    </div>
                    <div className="row-control row-control-stacked">
                      <span className="state"><span className="state-dot" />{t("On")}</span>
                      <button type="button" className="link-btn" onClick={openExtensionSettings}>{t("Change")}</button>
                    </div>
                  </div>
                  <div className="row">
                    <div className="row-text">
                      <p id="auto-save-label" className="row-label">{t("Auto Save")}</p>
                      <p className="row-desc">{t("Save your changes to disk 1.5 seconds after you stop typing.")}</p>
                      <p className="row-note">{tRich("When off, save with {0} or {1}.", <Keys keys={["⌘", "S"]} />, <span style={{ whiteSpace: 'nowrap' }}><Keys keys={["Ctrl", "S"]} /></span>)}</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      className="switch"
                      aria-checked={autoSaveEnabled}
                      aria-labelledby="auto-save-label"
                      onClick={() => {
                        const enabled = !autoSaveEnabled
                        setAutoSaveEnabled(enabled)
                        void persistAutoSaveEnabled(enabled)
                      }}
                      style={{ background: autoSaveEnabled ? '#078a52' : '#c9c5bc' }}>
                      <span style={{ transform: `translateX(${autoSaveEnabled ? 18 : 0}px)` }} />
                    </button>
                  </div>
                </Group>

                <Group title={t("Ways to open a Markdown file")}>
                  {[
                    ["Drag", <>{t("Drop the file onto any Chrome tab.")}</>],
                    ["File picker", <>{tRich("Press {0} on Mac or {1} on Windows.", <Keys keys={["⌘", "O"]} />, <Keys keys={["Ctrl", "O"]} />)}</>],
                    ["Address bar", <>{tRich("Paste a path such as {0}.", <Code>/path/to/file.md</Code>)}</>],
                    ["Terminal", <>{tRich("Run {0} on Mac.", <Code>open -a "Google Chrome" file.md</Code>)}</>],
                    ["Ask your agent", <>{t("Tell Claude Code, Codex, or another coding agent to “open plan.md in Chrome”.")}</>],
                  ].map(([label, desc]) => (
                    <div className="row" key={label as string}>
                      <div className="row-text">
                        <p className="row-label">{t(String(label))}</p>
                        <p className="row-desc">{desc}</p>
                      </div>
                    </div>
                  ))}
                  <details>
                    <summary>
                      <span className="row-text">
                        <span className="row-label">{t("Double-click to open in Chrome")}</span>
                        <span className="row-desc" style={{ display: 'block' }}>{t("Make Chrome the default app for .md files.")}</span>
                      </span>
                      <ChevronRight className="chev" size={16} />
                    </summary>
                    <div>
                      <ul>
                        <li>{tRich("{0} Right-click a file → {1} → {2} → choose Chrome → {3}.", <strong>{t("Mac:")}</strong>, <strong>{t("Get Info")}</strong>, <strong>{t("Open With")}</strong>, <strong>{t("Change All")}</strong>)}</li>
                        <li>{tRich("{0} Right-click a file → {1} → {2} → select Chrome → check {3} → {4}.", <strong>{t("Windows:")}</strong>, <strong>{t("Open with")}</strong>, <strong>{t("Choose another app")}</strong>, <strong>{t("Always use this app")}</strong>, <strong>{t("OK")}</strong>)}</li>
                      </ul>
                    </div>
                  </details>
                  <details>
                    <summary>
                      <span className="row-text">
                        <span className="row-label">{tRich("A {0} terminal command", <Code>markside</Code>)}</span>
                        <span className="row-desc" style={{ display: 'block' }}>{t("Open files from any terminal on Mac.")}</span>
                      </span>
                      <ChevronRight className="chev" size={16} />
                    </summary>
                    <div>
                      <p>{tRich("Add this alias to {0} or {1}:", <Code>~/.zshrc</Code>, <Code>~/.bashrc</Code>)}</p>
                      <CopyCommand command={TERMINAL_ALIAS} />
                      <p style={{ marginTop: '8px' }}>{tRich("Then run {0}.", <Code>markside /path/to/file.md</Code>)}</p>
                    </div>
                  </details>
                </Group>

                <Group title={t("Keyboard shortcuts")}>
                  <div className="row">
                    <span className="row-label">{t("Toggle preview and source")}</span>
                    <span className="key-group">
                      <span className="keys"><Keys keys={["Ctrl", "E"]} /><span className="keys-os">{t("Mac and Windows")}</span></span>
                    </span>
                  </div>
                  <div className="row">
                    <span className="row-label">{t("Find a file in the open folder")}</span>
                    <span className="key-group">
                      <span className="keys"><Keys keys={["⌘", "P"]} /><span className="keys-os">{t("Mac")}</span></span>
                      <span className="keys"><Keys keys={["Ctrl", "P"]} /><span className="keys-os">{t("Windows")}</span></span>
                    </span>
                  </div>
                </Group>
              </div>

              <footer className="opt-footer">
                <span>{t("Markside ")}{chrome.runtime.getManifest().version}</span>
                <div className="footer-links">
                  <button
                    type="button"
                    className="footer-link"
                    onClick={() => {
                      void stopAutomaticReviewPrompts().catch(() => undefined)
                      void chrome.tabs.create({ url: CHROME_WEB_STORE_REVIEW_URL })
                    }}>
                    <Star size={14} /> {t(" Rate on Chrome Web Store")}</button>
                  <a className="footer-link" href={MARKSIDE_FEEDBACK_URL} title={MARKSIDE_FEEDBACK_EMAIL}>
                    <Mail size={14} /> {t(" Email feedback")}</a>
                </div>
              </footer>
            </>
          )}

        </div>
      </div>
    </>
  )
}
