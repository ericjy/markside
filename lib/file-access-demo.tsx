import { ChevronRight } from "lucide-react"

// A miniature of the Markside details page in chrome://extensions, replaying the
// scroll to the file access row and the click that turns it on.
const DEMO_ROWS: { label: string; kind: "link" | "toggle" | "target" }[] = [
  { label: "Site access", kind: "link" },
  { label: "Site settings", kind: "link" },
  { label: "Pin to toolbar", kind: "toggle" },
  { label: "Allow in Incognito", kind: "toggle" },
  { label: "Allow access to file URLs", kind: "target" },
  { label: "Collect errors", kind: "toggle" },
  { label: "Extension options", kind: "link" },
]

export function FileAccessDemo() {
  return (
    <div className="demo-window" aria-hidden="true">
      <div className="demo-bar"><span>chrome://extensions/?id={chrome.runtime.id}</span></div>
      <div className="demo-viewport">
        <div className="demo-list">
          {DEMO_ROWS.map(row => (
            <div key={row.label} className={`demo-row${row.kind === "target" ? " target" : ""}`}>
              <span>{row.label}</span>
              {row.kind === "link" ? <ChevronRight size={16} /> : <span className="demo-toggle"><span /></span>}
            </div>
          ))}
        </div>
        <svg className="demo-cursor" width="18" height="22" viewBox="0 0 18 22">
          <path d="M1.5 1.5v16.2l4.3-4.1 2.9 6.6 2.9-1.3-2.9-6.5h6z" fill="#000" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  )
}

// Each surface sets the demo's system font under its own root, whose font rule
// would otherwise win.
export const FILE_ACCESS_DEMO_CSS = `
.demo-window { background: #fff; border-radius: 12px; box-shadow: 0 0 0 1px #dad4c8, rgba(0,0,0,0.06) 0 4px 12px; overflow: hidden; }
.demo-bar { padding: 8px 12px; background: #f1f3f4; border-bottom: 1px solid #e3e3e3; }
.demo-bar span { display: block; width: fit-content; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding: 2px 12px; border-radius: 999px; background: #fff; color: #5f6368; font-size: 12px; }
.demo-viewport { position: relative; height: 176px; overflow: hidden; animation: demo-cycle 7s infinite; }
.demo-list { animation: demo-scroll 7s infinite; }
.demo-row { height: 44px; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 0 16px; border-top: 1px solid #ececec; color: #1f1f1f; font-size: 13.5px; }
.demo-row:first-child { border-top: 0; }
.demo-row svg { color: #5f6368; }
.demo-row.target { animation: demo-target 7s infinite; }
.demo-toggle { position: relative; flex-shrink: 0; width: 34px; height: 20px; border-radius: 999px; background: #e3e3e3; border: 1px solid #747775; }
.demo-toggle span { position: absolute; top: 4px; left: 4px; width: 10px; height: 10px; border-radius: 50%; background: #747775; }
.demo-row.target .demo-toggle { animation: demo-track 7s infinite; }
.demo-row.target .demo-toggle span { animation: demo-knob 7s infinite; }
.demo-cursor { position: absolute; left: calc(100% - 36px); top: 106px; filter: drop-shadow(0 2px 3px rgba(0,0,0,0.25)); animation: demo-cursor 7s infinite; }

@keyframes demo-cycle { 0% { opacity: 0; } 4%, 90% { opacity: 1; } 97%, 100% { opacity: 0; } }
@keyframes demo-scroll {
  0%, 12% { transform: translateY(0); animation-timing-function: cubic-bezier(0.65, 0, 0.35, 1); }
  30%, 100% { transform: translateY(-88px); }
}
@keyframes demo-cursor {
  0%, 8% { transform: translate(-150px, 46px); opacity: 0; }
  16% { transform: translate(-150px, 46px); opacity: 1; animation-timing-function: cubic-bezier(0.65, 0, 0.35, 1); }
  32% { transform: translate(-150px, 46px); animation-timing-function: cubic-bezier(0.65, 0, 0.35, 1); }
  50% { transform: translate(0, 0) scale(1); }
  53% { transform: translate(0, 0) scale(0.86); }
  57%, 90% { transform: translate(0, 0) scale(1); opacity: 1; }
  96%, 100% { transform: translate(0, 0); opacity: 0; }
}
@keyframes demo-track {
  0%, 53% { background: #e3e3e3; border-color: #747775; }
  57%, 100% { background: #0b57d0; border-color: #0b57d0; }
}
@keyframes demo-knob {
  0%, 53% { transform: translateX(0) scale(1); background: #747775; }
  57%, 100% { transform: translateX(14px) scale(1.4); background: #fff; }
}
@keyframes demo-target {
  0%, 53% { background: #fff; }
  60%, 100% { background: rgba(132, 231, 165, 0.22); }
}
@media (prefers-reduced-motion: reduce) {
  .demo-viewport, .demo-list, .demo-row.target, .demo-toggle, .demo-toggle span { animation: none !important; }
  .demo-list { transform: translateY(-88px); }
  .demo-cursor { display: none; }
  .demo-row.target { box-shadow: inset 0 0 0 2px #84e7a5; }
}
`
