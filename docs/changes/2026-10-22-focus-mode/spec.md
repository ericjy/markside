---
date: 2026-10-22
status: implemented
intent: intent.md
interview: grill.md
guidelines:
  - ../../visual-design.md
  - ../../../CLAUDE.md
---

# Zen mode

## Requirements

Zen mode hides Markside's surrounding interface so the document fills the page.
**Decided by** links the [interview](grill.md) question behind each
requirement, or a detail proposed by the agent and confirmed when the interview
finished. The interview keeps the reasons and the rejected options.

| ID | Requirement | Decided by |
|---|---|---|
| R1 | Zen mode works in Preview, Source, and Split, and for images and other files. It adds no writing aids such as line centering or paragraph dimming. | [Q1](grill.md#q1-what-should-this-mode-be-for), [Q10](grill.md#q10-should-zen-mode-apply-to-images-and-other-non-markdown-files) |
| R2 | Zen mode hides the toolbar, the file tree, and the Outline. Zen mode leaves 20 px above the document. A faint bar always marks the top center and darkens when the pointer comes within 48 px of the top; reaching the top edge shows the toolbar over the document until the pointer moves more than 64 px down; an open toolbar menu keeps it shown. Keyboard focus in the toolbar also shows it. | [Q5](grill.md#q5-what-stays-on-screen-in-the-mode)<br>toolbar at the top edge: revised after implementation; see [Revisions](#revisions) |
| R3 | These remain available: an already open Review panel, the word count label, the Source formatting buttons, the Reload bar, the Review finish bar, adding a Review Comment from a selection, dialogs, and the quick file switcher. A docked Review panel extends to the top of the window. | [Q5](grill.md#q5-what-stays-on-screen-in-the-mode)<br>docked panel: [confirmed detail](grill.md#confirmed-details) |
| R4 | Page width, Typeface, and Source width keep their current choices. Split keeps both panes. | [Q9](grill.md#q9-should-the-mode-change-the-page-width), [Q1](grill.md#q1-what-should-this-mode-be-for) |
| R5 | The interface hides and returns instantly, without animation. | [Q12](grill.md#q12-should-the-interface-animate-as-it-hides-and-returns) |
| R6 | **Zen mode** in the file actions (`…`) menu turns it on and shows the shortcut; in Zen mode the item reads **Exit Zen mode**. The menu exists only for Markdown files. | [Q6](grill.md#q6-where-do-you-turn-the-mode-on) |
| R7 | `Cmd+.` on macOS or `Ctrl+.` elsewhere toggles Zen mode for any file, including while typing in Source. | [Q10](grill.md#q10-should-zen-mode-apply-to-images-and-other-non-markdown-files)<br>key: changed during implementation; see Shortcut |
| R8 | In Zen mode, an **Exit Zen mode** button replaces the file tree toggle at the left end of the toolbar. It is the first Tab stop. | [Q8](grill.md#q8-how-do-you-leave-the-mode)<br>button in the toolbar: revised after implementation; see [Revisions](#revisions) |
| R9 | Escape leaves Zen mode only when nothing else would handle it. The Review panel, dialogs, the quick file switcher, and an expanded Mermaid diagram close first. In Source, Escape first closes editor search or reduces multiple cursors to one. | [Q8](grill.md#q8-how-do-you-leave-the-mode)<br>Source behavior: [confirmed detail](grill.md#confirmed-details) |
| R10 | Each time Zen mode starts, a hint naming Escape and the toolbar at the top edge shows for about two seconds, then fades. With reduced motion it disappears without fading. | [Q11](grill.md#q11-when-should-the-exit-hint-appear)<br>reduced motion: [confirmed detail](grill.md#confirmed-details) |
| R11 | Leaving Zen mode restores the file tree and Outline to their previous visibility. Zen mode never changes the saved Outline preference. | [confirmed detail](grill.md#confirmed-details) |
| R12 | Zen mode stays on in the tab, across opening other files, ordinary links, reloads, and Sync URL to this file, until the user turns it off. New tabs and later browser sessions start with it off. | [Q2](grill.md#q2-should-the-mode-stay-on-when-you-open-another-file-or-restart-chrome)<br>across reloads and links: revised after implementation; see [Revisions](#revisions) |
| R13 | Zen mode does not request Chrome full screen; the user can combine the two with Chrome's own shortcut. | [Q3](grill.md#q3-should-entering-the-mode-also-make-chrome-full-screen) |
| R14 | Zen mode is not available in localhost Review or in the Link Snapshot and Hosted Snapshot viewer. | [confirmed detail](grill.md#confirmed-details) |
| R15 | The toolbar's Outline and Review toggles work inside Zen mode. The Outline starts hidden each time Zen mode starts, and showing it there changes neither the normal Outline state nor its saved preference. The file tree stays hidden. | revised after implementation; see [Revisions](#revisions) |

## Design

**State.** `components/content-app.tsx` owns a `zenMode` boolean in React state,
initialized from `sessionStorage`, which `useContentZenMode` updates on every
change. Chrome keeps `sessionStorage` for `file://` pages across reloads and
navigation within a tab and starts new tabs empty, which satisfies R12.

**Hiding.** Zen mode wraps `SidebarLeft` and `SidebarRight` in elements that
switch from `display: contents` to `display: none`, instead of changing
`leftOpen` or `outlineOpen`. Their state, the loaded file tree, and the
saved Outline preference stay untouched, which satisfies R11, and nothing
animates. A 20 px spacer replaces the toolbar's height so a revealed toolbar
doesn't crowd the document. The docked Review panel uses `top-0` instead of
`top-12`, and the floating panel moves from `top-[4.5rem]` to `top-6`. A separate `zenOutlineOpen` state, reset whenever Zen mode ends,
drives the Outline inside Zen mode; layout that offsets for the Outline uses
`zenMode ? zenOutlineOpen : outlineOpen`.
The docked Review panel uses `top-0` instead of `top-12` while the toolbar is
hidden, and the floating panel moves from `top-[4.5rem]` to `top-6`.

**Revealed toolbar.** In Zen mode the toolbar's wrapper becomes an absolutely
positioned, transparent overlay that ignores the pointer. A 12 px strip at the
top edge reveals it on pointer entry and holds the cue bar, which
`useContentZenMode` darkens while the pointer is within 48 px of the top.
`useContentZenMode` hides the toolbar again on a `pointermove` more than
64 px from the top while no `role="menu"` element exists. The wrapper also
shows while it contains `:focus-visible`, so Tab reveals it but a mouse click
does not keep it. Entering Zen mode, or hiding the revealed toolbar, blurs a
focused toolbar control for the same reason.

**Menu item.** A **Zen mode** item in the file actions menu shows the shortcut
for the current platform and reads **Exit Zen mode** while it is on.

**Shortcut.** The interview chose `Cmd/Ctrl+Shift+Enter`, but Markside already
uses it to send a Review from Question Cards and the comment composer. During
implementation the user chose `Cmd/Ctrl+.` instead. Markside, CodeMirror's
default keymaps, and Chrome's published shortcuts do not use it, so it reaches
the window listener while Source has focus. `isZenModeShortcut` in
`lib/content-app-policy.ts` matches it.

**Escape.** `hooks/use-content-zen-mode.ts` listens twice. In the capture
phase it records whether the Review panel or quick file switcher is open, an
element with a dialog, alert dialog, menu, or listbox role exists, a Mermaid
diagram is expanded, or the target is a form field. In the bubble phase it
leaves Zen mode only if none was and no handler prevented the default. Radix
layers can close before the bubble phase, which is why the check happens
first. CodeMirror prevents the default only when Escape closes search or
reduces a selection.

**Exit button and hint.** The toolbar shows **Exit Zen mode** in place of the
file tree toggle. `components/content-zen-mode.tsx` renders the top-edge strip
and the hint, which is centered beside a docked Review panel. The hint appears
at once and fades out after two seconds; only its hidden state has a
transition, which reduced motion removes. A separate `role="status"` element
announces the entry.

**Documentation.** Zen mode is in `CONTEXT.md`, the user guide's Appearance
and Keyboard Shortcuts sections, the system design's Key State table, and
`docs/manual-test.md`.

## How each constraint in the intent is met

| Intent constraint | Met by |
|---|---|
| Works in Preview, Source, and Split, and for other file types | R1, R7 |
| Hides only Markside's interface; Chrome full screen stays separate | R2, R13 |
| Stays on in the tab until turned off | R12; `sessionStorage` in Design |
| Page width and the saved Outline choice are unchanged | R4, R11; hiding with CSS in Design |
| No writing aids in the first version | R1 |

## Open questions from the intent

- **Does hiding the interface help enough with concentrating in Source?**
  Carried forward. Use after release decides whether a later writing aid is
  needed; the name Focus is kept free for it.
- **Does Chrome pass Cmd/Ctrl+Shift+Enter to the page on every platform?**
  Moot: Markside already uses it to send a Review, so the shortcut became
  `Cmd/Ctrl+.`. Chrome's published shortcuts do not reserve it. Automated
  checks dispatch keys inside the page, so a physical key press on each
  platform remains part of `docs/manual-test.md`.
- **Should following an ordinary link keep Zen mode on?** Yes; see Revisions.
  Markdown links load a new page, and Zen mode now survives page loads in the
  tab.

## Areas of concern

1. **Shortcut availability.** Resolved by changing the shortcut; see Shortcut.
2. **Escape order.** Escape handlers are separate `window` and element
   listeners with no shared order, and the quick file switcher closes on Escape
   without preventing default. Owner: implementer, by making every Escape
   target that should win mark the event handled or by checking those targets'
   open state. Resolved by the capture-phase check; covered by
   `lib/content-zen-mode.test.ts` and `docs/manual-test.md`.
3. **Layout offsets.** The Review panel, the Reload bar, and the word count
   position themselves relative to the toolbar and Outline. Owner: implementer,
   by checking each in Preview, Source, and Split with docked and floating
   Review. Checked in Chrome with the production build.
4. **Accessibility.** The exit button must be reachable by keyboard, labeled,
   and visible on focus, and the hint must not take focus. Owner: implementer,
   following `docs/visual-design.md`. The button is the first Tab stop and the
   hint is announced without taking focus.

## Revisions

After the first implementation, Zen mode hid Review reply notices, which appear
on the toolbar's Review button, and offered only an exit button at the top
edge. The user chose to reveal the whole toolbar at the top edge instead, as
macOS full screen does. This revises Q5 (the toolbar is hidden) and Q8 (an exit
button appears at the top edge), and adds R15.

The revealed toolbar first sat against the first heading, so Zen mode now
leaves 20 px above the document. The user also asked for a permanent faint bar at
the top center, darker when the pointer nears the top, so the gesture is
discoverable after the hint fades.

Zen mode first ended on every page load, as Q2 decided, so reloading after an
agent reply or following an ordinary Markdown link turned it off. The user
chose to keep it for the tab across page loads instead. New tabs still start
with it off, which preserves Q2's aim that the interface never goes missing
unexpectedly in a later session.

## Naming

Decided in [Q4](grill.md#q4-what-should-the-mode-be-called). Use the product
term Zen mode, as in VS Code. Avoid Focus mode: "focus" already means keyboard
focus, and editors such as iA Writer use Focus Mode for dimming text around the
current sentence, which may become a separate writing aid.
