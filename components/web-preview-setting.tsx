import React, { useEffect, useState } from "react"
import { t } from "~lib/i18n"
import { setWebPreviewEnabled, webPreviewEnabled } from "~lib/web-preview"

export function WebPreviewSetting() {
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [error, setError] = useState(false)
  const [pending, setPending] = useState(false)
  useEffect(() => { void webPreviewEnabled().then(setEnabled).catch(() => setError(true)) }, [])
  return <div className="row">
    <div className="row-text">
      <p className="row-label">{t("Automatically preview online Markdown")}</p>
      <p className="row-desc">{t("Allow Markside to access websites to preview raw Markdown files automatically. Other pages are left unchanged.")}</p>
      {error && <p className="row-note language-error" role="alert">{t("Could not change online preview. Please try again.")}</p>}
    </div>
    <div className="row-control row-control-stacked">
      {enabled !== null && <span className="state"><span className={`state-dot${enabled ? "" : " state-dot-off"}`} />{enabled ? t("On") : t("Off")}</span>}
      <button type="button" className="link-btn" disabled={enabled === null || pending} onClick={() => {
        setError(false)
        setPending(true)
        void setWebPreviewEnabled(!enabled).then(setEnabled).catch(() => setError(true)).finally(() => setPending(false))
      }}>{enabled ? t("Turn off") : t("Turn on")}</button>
    </div>
  </div>
}
