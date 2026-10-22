---
date: 2026-10-22
status: proposed
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
| R2 | Zen mode hides the toolbar, the file tree, and the Outline. | [Q5](grill.md#q5-what-stays-on-screen-in-the-mode) |
| R3 | These remain available: an already open Review panel, the word count label, the Source formatting buttons, the Reload bar, the Review finish bar, adding a Review Comment from a selection, dialogs, and the quick file switcher. A docked Review panel extends to the top of the window. | [Q5](grill.md#q5-what-stays-on-screen-in-the-mode)<br>docked panel: [confirmed detail](grill.md#confirmed-details) |
| R4 | Page width, Typeface, and Source width keep their current choices. Split keeps both panes. | [Q9](grill.md#q9-should-the-mode-change-the-page-width), [Q1](grill.md#q1-what-should-this-mode-be-for) |
| R5 | The interface hides and returns instantly, without animation. | [Q12](grill.md#q12-should-the-interface-animate-as-it-hides-and-returns) |
| R6 | **Zen mode** in the file actions (`…`) menu turns it on and shows the shortcut. The menu exists only for Markdown files. | [Q6](grill.md#q6-where-do-you-turn-the-mode-on) |
| R7 | `Cmd+Shift+Enter` on macOS or `Ctrl+Shift+Enter` elsewhere toggles Zen mode for any file, including while typing in Source. | [Q7](grill.md#q7-which-keyboard-shortcut-toggles-the-mode), [Q10](grill.md#q10-should-zen-mode-apply-to-images-and-other-non-markdown-files) |
| R8 | An exit button appears when the pointer reaches the top edge of the page or when Tab moves keyboard focus to it. | [Q8](grill.md#q8-how-do-you-leave-the-mode)<br>keyboard focus: [confirmed detail](grill.md#confirmed-details) |
| R9 | Escape leaves Zen mode only when nothing else would handle it. The Review panel, dialogs, the quick file switcher, and an expanded Mermaid diagram close first. In Source, Escape first closes editor search or reduces multiple cursors to one. | [Q8](grill.md#q8-how-do-you-leave-the-mode)<br>Source behavior: [confirmed detail](grill.md#confirmed-details) |
| R10 | Each time Zen mode starts, a hint naming Escape and the exit button shows for about two seconds, then fades. With reduced motion it disappears without fading. | [Q11](grill.md#q11-when-should-the-exit-hint-appear)<br>reduced motion: [confirmed detail](grill.md#confirmed-details) |
| R11 | Leaving Zen mode restores the file tree and Outline to their previous visibility. Zen mode never changes the saved Outline preference. | [confirmed detail](grill.md#confirmed-details) |
| R12 | Zen mode stays on in the tab while the user opens other files. Reloading the page, including Sync URL to this file, starts with it off. Other tabs and later sessions are unaffected. | [Q2](grill.md#q2-should-the-mode-stay-on-when-you-open-another-file-or-restart-chrome) |
| R13 | Zen mode does not request Chrome full screen; the user can combine the two with Chrome's own shortcut. | [Q3](grill.md#q3-should-entering-the-mode-also-make-chrome-full-screen) |
| R14 | Zen mode is not available in localhost Review or in the Link Snapshot and Hosted Snapshot viewer. | [confirmed detail](grill.md#confirmed-details) |

## Design

**State.** `components/content-app.tsx` owns a `zenMode` boolean in React state.
Opening another file inside Markside does not reload the page, so ordinary state
satisfies R12 without storage.

**Hiding.** Zen mode suppresses rendering of `ContentToolbar`, `SidebarLeft`, and
`SidebarRight` instead of changing `leftOpen` or `outlineOpen`. Their state and
the saved Outline preference stay untouched, which satisfies R11. The docked
Review panel uses `top-0` instead of `top-12` while the toolbar is hidden, and
the floating panel's top offset shifts the same way.

**Menu item.** A **Zen mode** item in the file actions menu shows the shortcut
for the current platform. The menu is hidden in Zen mode, so the item only
enters it.

**Shortcut.** `hooks/use-content-shortcuts.ts` adds the toggle beside the
existing shortcuts, with a policy helper and test in `lib/content-app-policy.ts`.
CodeMirror binds only `Mod-Enter` by default, so `Shift-Mod-Enter` reaches the
window handler while Source has focus.

**Escape.** Zen mode's Escape handler ignores events whose default was already
prevented and runs only when no other Escape target is open. See concern 2.

**Exit button and hint.** A small, labeled exit button sits in a top-edge hover
zone and becomes visible on hover or keyboard focus. The entry hint is a
non-interactive, `aria-live` status message that fades after about two seconds
unless reduced motion is on.

**Documentation.** On implementation, add Zen mode to `CONTEXT.md`, the
user guide's Keyboard Shortcuts and Appearance sections, the system design's
Key State table, and `docs/manual-test.md`.

## How each constraint in the intent is met

| Intent constraint | Met by |
|---|---|
| Works in Preview, Source, and Split, and for other file types | R1, R7 |
| Hides only Markside's interface; Chrome full screen stays separate | R2, R13 |
| Stays on in the tab until turned off; a reload starts with it off | R12; React state in Design |
| Page width and the saved Outline choice are unchanged | R4, R11; hiding by rendering in Design |
| No writing aids in the first version | R1 |

## Open questions from the intent

- **Does hiding the interface help enough with concentrating in Source?**
  Carried forward. Use after release decides whether a later writing aid is
  needed; the name Focus is kept free for it.
- **Does Chrome pass Cmd/Ctrl+Shift+Enter to the page on every platform?**
  Carried forward as concern 1. It must be answered before implementation.

## Areas of concern

1. **Shortcut availability.** Chrome may reserve `Cmd/Ctrl+Shift+Enter` on some
   platform. Owner: implementer, by checking macOS, Windows, and Linux before
   building. If it is reserved, ask the user for another shortcut.
2. **Escape order.** Escape handlers are separate `window` and element
   listeners with no shared order, and the quick file switcher closes on Escape
   without preventing default. Owner: implementer, by making every Escape
   target that should win mark the event handled or by checking those targets'
   open state. Cover the order in `docs/manual-test.md`.
3. **Layout offsets.** The Review panel, the Reload bar, and the word count
   position themselves relative to the toolbar and Outline. Owner: implementer,
   by checking each in Preview, Source, and Split with docked and floating
   Review.
4. **Accessibility.** The exit button must be reachable by keyboard, labeled,
   and visible on focus, and the hint must not take focus. Owner: implementer,
   following `docs/visual-design.md`.

## Naming

Decided in [Q4](grill.md#q4-what-should-the-mode-be-called). Use the product
term Zen mode, as in VS Code. Avoid Focus mode: "focus" already means keyboard
focus, and editors such as iA Writer use Focus Mode for dimming text around the
current sentence, which may become a separate writing aid.
