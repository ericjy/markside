# Zen mode / focus mode

Status: Proposed. Design confirmed; not implemented.

## Confirmed details

These details were proposed by the agent and confirmed when the reviewer finished the Review.

- Leaving Zen mode brings back the file tree and Outline exactly as they were before. Your saved Outline choice is never changed.
- A docked Review panel extends to the top of the window while the toolbar is hidden.
- The top-edge exit button also appears when you reach it with Tab, so it works without a pointer.
- While typing in Source, Escape first closes editor search or reduces multiple cursors to one. Only the next press leaves Zen mode.
- The exit hint disappears without fading when reduced motion is on.
- If Chrome turns out to keep Cmd/Ctrl+Shift+Enter for itself on any platform, I'll ask you about another shortcut before building it.
- Zen mode is not available in localhost Review or in the Link Snapshot and Hosted Snapshot viewer.

## Question history

### Q1. What should this mode be for?

> **Your decision: C.** Hide the interface in whichever view is open, with no writing aids in the first version.

<details>
<summary>Full question</summary>

Today a Markdown file is surrounded by the toolbar with breadcrumbs, the file tree on the left, the Outline on the right, and the Review panel when it is open. You can already hide the two sidebars one at a time and choose a Narrow page width, but nothing hides everything at once.

~~~mermaid
flowchart LR
  T[Toolbar and breadcrumbs] --- D
  F[File tree] --- D[Document: Preview, Source, or Split]
  D --- O[Outline]
  D --- R[Review panel]
~~~

- **A. Distraction-free reading in Preview.** One action hides the surrounding interface so only the rendered document shows. Simple and matches how most people read in Markside, but it does nothing while editing in Source or Split.
- **B. Distraction-free writing in Source.** Hiding the interface comes with writing aids, such as keeping the current line centered and dimming other paragraphs. Helps long writing sessions, but it is a larger feature and does not help reading.
- **C. Hide the interface in whichever view is open.** The same action works in Preview, Source, and Split, with no writing aids in the first version. One rule covers every view, but Split still shows two panes side by side.

**Recommended: C.** Hiding the interface does not depend on the view, so limiting it to Preview adds a rule without saving work; writing aids can come later.

<details open>
<summary>Compare tradeoffs</summary>

| Criterion | A. Reading in Preview | B. Writing in Source | C. Any view |
|---|---|---|---|
| Helps reading | ✓ | ✕ | ✓ |
| Helps editing | ✕ | ✓ Writing aids too | △ Hides interface only |
| Size of first version | ✓ Small | ✕ Large | ✓ Small |
| Rules to explain | △ Preview only | △ Source only | ✓ One rule |

</details>

</details>

### Q2. Should the mode stay on when you open another file or restart Chrome?

> **Your decision: A.** Stay on in this tab until you turn it off; a new tab or a reload starts with it off.

<details>
<summary>Full question</summary>

Opening another file from the file tree or quick file switcher stays in the same tab. Page width and Typeface are remembered across restarts; sidebar visibility (other than Outline) resets when the page reloads.

- **A. Stay on in this tab until you turn it off.** Switching files keeps the mode on; a new tab or a page reload starts with it off. You don't lose your setup while moving between files, but you have to turn it on again after reloading.
- **B. Remember it across tabs and restarts.** Like Page width, every document opens in the mode until you turn it off. Good if you always read this way, but a new user who turned it on once may find the interface missing later.
- **C. Turn it off when you open another file.** The mode applies to the current file only. Nothing surprises you later, but browsing several files means turning it on again each time.

**Recommended: A.** It keeps the mode while you move through files without making the interface disappear unexpectedly in a later session.

<details open>
<summary>Compare tradeoffs</summary>

| Criterion | A. This tab | B. Everywhere | C. This file |
|---|---|---|---|
| Survives switching files | ✓ | ✓ | ✕ |
| Survives reload or restart | ✕ | ✓ | ✕ |
| Risk of a missing interface surprising you | ✓ Low | △ Higher | ✓ Low |

</details>

</details>

### Q3. Should entering the mode also make Chrome full screen?

> **Your decision: A.** Keep them separate; the mode hides only Markside's interface.

<details>
<summary>Full question</summary>

Chrome's own full screen hides tabs and the address bar. A web page can request it only in response to a click or key press, and Chrome always lets Escape leave full screen. Switching files inside Markside keeps full screen; reloading the page or choosing Sync URL to this file ends it.

- **A. Keep them separate.** The mode hides only Markside's interface; you can use Chrome's full screen (Cmd+Ctrl+F on macOS, F11 elsewhere) on top of it. Predictable and leaves Escape for Markside, but full distraction-free reading takes two steps.
- **B. Also enter Chrome full screen.** One action hides everything, including tabs and the address bar. Feels complete, but Escape then leaves full screen, and Markside must decide whether that also ends the mode.
- **C. Offer full screen as a separate choice.** The mode stays separate, with an extra action that also enters full screen. Covers both habits, but adds a second control to explain.

**Recommended: A.** Chrome already provides full screen with one shortcut, and keeping it separate avoids Escape meaning two things at once.

<details open>
<summary>Compare tradeoffs</summary>

| Criterion | A. Separate | B. Together | C. Both offered |
|---|---|---|---|
| Steps to hide everything | △ Two | ✓ One | ✓ One |
| Escape behavior | ✓ Unchanged | △ Also leaves full screen | △ Depends on choice |
| Controls to explain | ✓ One | ✓ One | ✕ Two |

</details>

</details>

### Q4. What should the mode be called?

> **Your decision: A.** Call it Zen mode.

<details>
<summary>Full question</summary>

Q1 decided the mode hides the surrounding interface in Preview, Source, or Split, without writing aids. The name becomes a glossary term and appears in the menu. VS Code calls this behavior Zen Mode. iA Writer and similar editors use Focus Mode for a writing aid that dims everything except the current sentence or paragraph.

- **A. Zen mode.** Use the name VS Code users already know for hiding the interface. It leaves Focus free for a later dimming aid, but some people may not know what Zen means at first.
- **B. Focus mode.** Use the plainest description of the goal. It is easy to understand, but writers may expect sentence dimming, and "focus" already means keyboard focus throughout the accessibility guidance.
- **C. Distraction-free mode.** Describe exactly what happens. No ambiguity, but it is long for a menu item.

**Recommended: A.** It matches the closest existing product with this exact behavior and avoids a collision with keyboard focus and a possible future writing aid.

<details open>
<summary>Compare tradeoffs</summary>

| Criterion | A. Zen mode | B. Focus mode | C. Distraction-free mode |
|---|---|---|---|
| Clear on first read | △ Familiar to VS Code users | ✓ | ✓ |
| Matches this behavior elsewhere | ✓ VS Code | △ Often means dimming text | ✓ |
| Conflicts with existing terms | ✓ None | ✕ Keyboard focus | ✓ None |
| Menu length | ✓ Short | ✓ Short | △ Long |

</details>

</details>

### Q5. What stays on screen in the mode?

> **Your decision: A.** Hide the toolbar, file tree, and Outline; keep the Review panel if open, the word count, the Source formatting buttons, and the bars that need attention.

<details>
<summary>Full question</summary>

The toolbar holds the breadcrumbs, Reload, the Preview/Source/Split switch, theme, Review and Outline toggles, Share Link, and the file actions menu. Around the document there are also the word count label, the Source formatting buttons, and bars that appear when something needs you: the Reload bar after a file changes on disk and the Review finish bar. Selecting text still offers to add a Review Comment.

~~~mermaid
flowchart TB
  T[Toolbar] --- M
  F[File tree] --- M[Document]
  M --- O[Outline]
  M --- R[Review panel, if open]
  M --- N[Reload bar and Review finish bar, when shown]
  M --- W[Word count and Source formatting buttons]
~~~

- **A. Hide the toolbar, file tree, and Outline.** Keep the Review panel if it is open, the word count, the Source formatting buttons, and the bars that need your attention. Reviewing and editing keep working, but a few small controls remain.
- **B. Show only the document and bars that need you.** Also hide the Review panel, word count, and Source formatting buttons; the Reload bar, Review finish bar, and adding a comment from a selection still work. The calmest screen, but you must leave the mode to read Review replies or use formatting buttons.
- **C. Hide only the file tree and Outline.** Keep the toolbar. Barely changes the screen and keeps every control, but it adds little over hiding the two sidebars yourself.

**Recommended: A.** It removes the navigation interface that surrounds the text while keeping the tools tied to what you are reading or editing.

<details open>
<summary>Compare tradeoffs</summary>

| Criterion | A. Hide navigation | B. Document only | C. Sidebars only |
|---|---|---|---|
| Calm screen | △ Small controls remain | ✓ | ✕ Toolbar remains |
| Review replies visible | ✓ If the panel was open | ✕ | ✓ |
| Formatting buttons in Source | ✓ | ✕ | ✓ |
| Different from hiding sidebars yourself | ✓ | ✓ | ✕ |

</details>

</details>

### Q6. Where do you turn the mode on?

> **Your decision: A.** Turn it on from a file actions menu item that shows the keyboard shortcut.

<details>
<summary>Full question</summary>

The file actions (`…`) menu already holds Page width and Typeface. The toolbar has icon buttons for theme, Review, Outline, and Share Link.

- **A. A file actions menu item and a keyboard shortcut.** The menu item shows the shortcut so people learn it. Keeps the toolbar unchanged, but the item sits one click deeper.
- **B. A toolbar button and a keyboard shortcut.** Always one click away. Easy to find, but it adds another icon to a crowded toolbar.
- **C. A keyboard shortcut only.** No new visible control. Keeps every surface unchanged, but few people will discover it.

**Recommended: A.** The menu already gathers reading-layout choices, and listing the shortcut there makes it discoverable without adding a toolbar icon.

<details open>
<summary>Compare tradeoffs</summary>

| Criterion | A. Menu and shortcut | B. Toolbar and shortcut | C. Shortcut only |
|---|---|---|---|
| Discoverable | ✓ Menu shows the shortcut | ✓ | ✕ |
| Toolbar stays uncluttered | ✓ | ✕ | ✓ |
| Clicks to turn on | △ Two | ✓ One | ✓ Key press |

</details>

</details>

### Q7. Which keyboard shortcut toggles the mode?

> **Your decision: A.** Cmd+Shift+Enter on macOS, Ctrl+Shift+Enter elsewhere, after confirming Chrome passes it to the page.

<details>
<summary>Full question</summary>

The shortcut must work while typing in Source, where Cmd/Ctrl+Enter already inserts a blank line, and must avoid shortcuts Chrome keeps for itself. Markside already uses Cmd/Ctrl+O, P, S, B, Cmd/Ctrl+Option/Alt+1–4, and Ctrl+E.

- **A. Cmd+Shift+Enter on macOS, Ctrl+Shift+Enter elsewhere.** A single chord that the editor does not use. Quick and easy to remember, but I still need to confirm Chrome passes it to the page on every platform.
- **B. Cmd/Ctrl+K, then Z.** The same two-step shortcut VS Code uses for Zen Mode. Familiar to VS Code users, but two-step shortcuts are slower and new to Markside.
- **C. No shortcut.** Turn it on and off only through the menu and the exit control. Nothing to remember, but every switch takes a pointer.

**Recommended: A.** One chord is fastest and fits Markside's existing shortcuts; I will verify it in Chrome before implementing.

<details open>
<summary>Compare tradeoffs</summary>

| Criterion | A. Cmd/Ctrl+Shift+Enter | B. Cmd/Ctrl+K, then Z | C. None |
|---|---|---|---|
| Speed | ✓ One chord | △ Two steps | ✕ Pointer only |
| Free in the editor | ✓ | ✓ | — |
| Free in Chrome | ? Needs checking | ✓ | — |
| Familiar | △ | ✓ VS Code users | — |

</details>

</details>

### Q8. How do you leave the mode?

> **Your decision: A.** Leave with Escape (when nothing else would close), the shortcut, or an exit button revealed at the top edge, with a short hint on entry.

<details>
<summary>Full question</summary>

With the toolbar hidden, there is no visible menu to turn the mode off. Escape already closes the Review panel, dialogs, the quick file switcher, and an expanded Mermaid diagram.

- **A. Escape, the shortcut, or a button that appears at the top edge.** Escape leaves the mode only when nothing else would close; moving the pointer to the top of the page reveals an exit button; a short hint names both when you enter. Easy to escape from, but Escape takes on one more job.
- **B. The shortcut or the top-edge button only.** Escape keeps its current meaning. Nothing closes the mode by accident, but people who press Escape to get out will be stuck until they find the button.
- **C. A small exit button always in a corner.** Always visible and obvious. Nobody gets stuck, but it is a permanent control on the calm screen.

**Recommended: A.** Escape is the first key people try to leave a full-screen-like view, and letting other uses of Escape go first avoids surprises.

<details open>
<summary>Compare tradeoffs</summary>

| Criterion | A. Escape, shortcut, top-edge button | B. Shortcut, top-edge button | C. Corner button |
|---|---|---|---|
| Hard to get stuck | ✓ | △ | ✓ |
| Escape meaning unchanged | △ Last in line | ✓ | ✓ |
| Calm screen | ✓ Button hidden until needed | ✓ | △ Always visible |

</details>

</details>

### Q9. Should the mode change the Page width?

> **Your decision: A.** Keep your Page width choice.

<details>
<summary>Full question</summary>

Page width offers Narrow, Standard, and Full width for Preview and the Preview pane in Split; Source has its own width setting. Hiding the sidebars widens the space around the text.

- **A. Keep your Page width choice.** The text column stays exactly as wide as before, centered in the wider space. Predictable and nothing new to configure, but Full width becomes a very long line.
- **B. Use Narrow while the mode is on.** The text switches to the shorter reading line and returns afterward. Comfortable for reading, but it overrides a choice you made and does nothing for Source.

**Recommended: A.** You can already choose Narrow from the same menu, and keeping the choice avoids two settings disagreeing.

</details>

### Q10. Should Zen mode apply to images and other non-Markdown files?

> **Your decision: A.** Zen mode applies to every file type; outside Markdown it is entered with the shortcut.

<details>
<summary>Full question</summary>

Q2 decided Zen mode stays on in the tab while you switch files. Images open in the image viewer and other files open in the source editor; neither shows the file actions menu, which today appears only for Markdown.

- **A. Every file type.** Once on, the interface stays hidden for images and code too, and the shortcut turns it on anywhere. One rule for every file, but for non-Markdown files you can only enter it with the shortcut.
- **B. Markdown only, paused elsewhere.** Opening an image or other file shows the interface again; returning to a Markdown file hides it again. Non-Markdown files keep their usual controls, but the screen changes as you move between file types.
- **C. Markdown only, turned off elsewhere.** Opening a non-Markdown file ends Zen mode. Simple to understand, but browsing a folder with mixed files keeps turning it off.

**Recommended: A.** It matches Q2's rule that Zen mode stays on until you turn it off, and the exit methods work the same for every file.

<details open>
<summary>Compare tradeoffs</summary>

| Criterion | A. Every file | B. Paused elsewhere | C. Off elsewhere |
|---|---|---|---|
| One rule to explain | ✓ | △ | ✓ |
| Screen stays steady while browsing | ✓ | ✕ Interface flickers back | ✕ |
| Enter from any file | △ Shortcut only outside Markdown | ✕ | ✕ |

</details>

</details>

### Q11. When should the exit hint appear?

> **Your decision: A.** Show the exit hint for a few seconds every time you enter.

<details>
<summary>Full question</summary>

Q8 decided a short hint names Escape and the top-edge exit button when you enter Zen mode. Chrome shows "Press Esc to exit full screen" every time you enter full screen.

- **A. Every time you enter, for a few seconds.** A small hint fades after about two seconds. Nobody gets lost, but frequent users see it repeatedly.
- **B. Only the first time.** Markside remembers that you have seen it. Quieter after the first use, but someone who forgot how to leave gets no reminder.
- **C. Never.** Rely on the menu item showing the shortcut. The calmest option, but new users may not know how to get out.

**Recommended: A.** A brief hint each time follows Chrome's own full-screen convention and costs only a couple of seconds.

</details>

### Q12. Should the interface animate as it hides and returns?

> **Your decision: A.** Hide and show the interface instantly.

<details>
<summary>Full question</summary>

The visual design guidelines say not to animate layout dimensions during theme changes and to respect reduced-motion preferences. Hiding the toolbar and sidebars moves and widens the document.

- **A. Hide and show instantly.** The document jumps to its new position in one frame. No motion and nothing to tune, but the change can feel abrupt.
- **B. A short fade or slide.** The interface eases away over a fraction of a second, with no motion when reduced motion is on. Feels smoother, but the document reflows during the animation, which can blur text and cost performance in long documents.

**Recommended: A.** It follows the existing guidance against animating layout and avoids reflowing long documents mid-animation.

</details>
