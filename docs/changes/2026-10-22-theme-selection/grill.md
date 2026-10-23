# Theme selection

## Confirmed details

These scope details were proposed by the agent and confirmed when the reviewer finished the Review.

- **Inferred:** The selected theme also applies when viewing other text files and to the background around images.
- **Inferred:** Changing theme keeps your Typeface, Page width, and layout choices.
- **Inferred:** This chooser belongs to the extension's document workspace. The separate Link Snapshot and Hosted Snapshot viewer keeps its own appearance controls.

## Question history

### Q1. Is the goal to choose a visual style for reading?

> **Your decision: A.** Choose a visual style for reading.

<details>
<summary>Full question</summary>

What prompted this feature? These choices describe different problems, and the answer will determine which controls and theme choices we design next. If you have a specific example in mind, add it in your own words.

- **A. Choose a visual style for reading.** Let readers choose a look such as warm paper or a different color palette. This adds more personal choice, but each style needs to remain readable across Markdown, code, diagrams, and Review controls.
- **B. Make light, dark, and system settings explicit.** Give readers a clear way to select these modes and return to following their system. This is a smaller feature, but it adds no new color palettes.
- **C. Match a familiar editor theme.** Let readers use a named look they already use in their editor. This provides a familiar appearance, but we need to decide which themes and how closely Markside should match them.

**Recommended: A.** A small set of reading styles would add a visible choice beyond the existing light/dark toggle. If your frustration is controlling that toggle, choose B so we keep the scope smaller.

</details>

### Q2. Should the first release add just a warm Paper theme?

> **Your decision: C.** Start with several named light and dark palettes.

<details>
<summary>Full question</summary>

Markside already has light and dark appearances. We can add a distinct reading style without taking on a large catalog. The names here describe the intended appearance; we will decide the exact colors after settling scope.

- **A. Light, Dark, and Paper.** Keep the existing appearances and add a warm off-white page with dark text. This gives a visible new choice with a small set to maintain, but readers seeking other palettes will have to wait.
- **B. Light, Dark, Paper, and a softer dark theme.** Add both a warm light style and a dark style with a muted charcoal background. This serves more reading preferences, but adds another palette to check across the interface.
- **C. Start with several named palettes.** Offer a broader selection of distinct light and dark looks. This makes theme selection a larger feature, but increases design and verification work before shipping.

**Recommended: A.** One new palette keeps this a small feature and gives us a concrete style to refine first.

</details>

### Q3. Should a selected theme cover the whole document workspace?

> **Your decision: A.** Theme the whole document workspace, keeping Settings, the popup, and PDF Export on their existing separate designs.

<details>
<summary>Full question</summary>

The current light/dark setting affects the toolbar, file tree, Outline, Review panel, Preview, Source, code blocks, and Mermaid diagrams. Settings and the popup have their own appearance, and PDF Export uses a neutral light layout.

~~~mermaid
flowchart TD
  T[Selected theme] --> W[Document workspace]
  W --> P[Preview and code blocks]
  W --> E[Source editor]
  W --> N[Toolbar, file tree, Outline, and Review]
~~~

- **A. Theme the whole document workspace.** Apply a coherent appearance to the document and its surrounding controls, with readable code and diagrams. This feels consistent, but each palette needs checks across all these areas.
- **B. Theme only Preview.** Change the rendered page while Source and surrounding controls keep their current light/dark appearance. This reduces scope, but Split can show two different visual styles side by side.

**Recommended: A.** A workspace theme fits how the existing toggle behaves. Keep Settings, the popup, and PDF Export on their existing separate designs.

</details>

### Q4. Should theme selection replace the existing toolbar toggle?

> **Your decision: A.** Replace the toolbar toggle with a theme menu.

<details>
<summary>Full question</summary>

Readers currently click a sun or moon in the toolbar. Page width and Typeface live in the file actions menu, so there are two existing places where a theme chooser could fit.

- **A. Replace the toggle with a theme menu.** Clicking the current theme control opens the available choices. This keeps appearance selection easy to find, but switching light and dark takes a menu selection.
- **B. Put Theme beside Page width and Typeface.** Add a submenu in the file actions menu and remove the separate toolbar toggle. This groups reading preferences together, but makes theme selection less visible.
- **C. Keep the toggle and add a Theme submenu.** Preserve quick light/dark switching and put the full selection in the file menu. This keeps the shortcut, but we must define how it behaves when a different palette is selected.

**Recommended: A.** Reusing the existing control makes the new choices discoverable with one clear place to select them.

</details>

### Q5. Should we start with six themes spanning neutral, warm, and colored palettes?

> **Your decision: A.** Offer Light, Dark, Paper, Solarized Light, Nord, and Dracula.

<details>
<summary>Full question</summary>

You chose several named palettes. We still need a concrete first set. Existing Light and Dark would retain their appearance; the new names below describe proposed workspace styles, rather than a promise to reproduce another application's interface exactly.

- **A. Light, Dark, Paper, Solarized Light, Nord, and Dracula.** Keep the existing pair and add warm paper, a pale yellow palette, a cool blue-gray dark palette, and a purple-accented dark palette. This offers varied choices in six themes, but requires adapting both code colors and workspace controls for the new palettes.
- **B. Light, Dark, Paper, Sepia, Midnight, and Slate.** Build six Markside styles with neutral, warm, deep blue, and muted gray appearances. This gives us freedom to tune them for reading, but the names will not carry familiar editor color expectations.
- **C. Use a different specific set.** Name the themes you want through Something else…. This targets your preferences directly, but we need to settle the names before deciding the palette details.

**Recommended: A.** This gives a small catalog with visibly different light and dark choices while preserving the existing defaults.

</details>

### Q6. Should System be one additional choice that follows the existing Light and Dark themes?

> **Your decision: A.** Offer System alongside fixed named themes; System follows the existing Light and Dark appearances, starts selected for new installations, and preserves existing saved Light or Dark choices.

<details>
<summary>Full question</summary>

Today Markside follows the system until you manually toggle light or dark, with no visible way to return. Named themes add a choice between selecting one fixed appearance and automatically switching appearances.

~~~mermaid
flowchart TD
  S[Saved selection] --> M[System or a named theme]
  M --> W[Document workspace appearance]
~~~

- **A. One list with System and the named themes.** System automatically switches between the existing Light and Dark appearances; choosing any named theme fixes that appearance. This keeps one simple setting, but System cannot automatically switch between your favorite custom palettes.
- **B. Let readers choose a light theme and a dark theme for System.** System uses the two selected palettes as the operating system changes modes. This preserves personal palettes throughout the day, but adds two more settings and a more complex chooser.
- **C. Offer only fixed named themes.** Readers always choose the exact appearance they want. This keeps the chooser short, but removes system-following behavior for new users.

**Recommended: A.** An explicit System choice restores a missing control and keeps this release to one theme setting. New installations would start with System, and existing saved Light or Dark choices would stay selected.

</details>

### Q7. Should a theme choice apply to every open Markside document and future documents?

> **Your decision: A.** Save one choice across browser restarts and update every open Markside document tab.

<details>
<summary>Full question</summary>

The current light/dark choice is saved across browser restarts and used by newly loaded documents. Other open tabs do not update immediately today. A full theme chooser can make that behavior consistent with Typeface and Page width.

- **A. Save one choice and update all open document tabs.** Selecting a theme updates other Markside document tabs and remains selected after restarting Chrome. This is predictable across documents, but changing one tab also changes other open reading sessions.
- **B. Save one default but leave other open tabs unchanged.** The current tab and future documents use the new choice, while existing tabs keep their appearance until reloaded. This preserves their current look, but tabs can disagree about which theme is selected.
- **C. Remember a separate choice for each file.** Each document reopens in its own selected theme. This supports different reading contexts, but adds per-file state and makes general preferences harder to predict.

**Recommended: A.** One shared preference matches the existing reading settings and avoids theme differences between open documents.

</details>

### Q8. Should the menu show small color samples and apply a theme only when selected?

> **Your decision: A.** Show background/text/accent samples and a checkmark; selecting a theme applies and saves it, then closes the menu, without hover previews.

<details>
<summary>Full question</summary>

The chooser needs to help readers distinguish several palettes. It can do that inside the menu, or temporarily recolor the workspace as they explore.

- **A. Show samples and select to apply.** Each row shows the theme name, a small background/text/accent sample, and a checkmark for the saved choice. This is stable for mouse and keyboard use, but readers need to select a theme to see the whole workspace in it.
- **B. Preview on hover or keyboard focus.** Moving over a theme temporarily recolors the workspace, and selecting it saves the choice. This makes comparison immediate, but requires restoring the previous appearance on dismissal and avoiding unnecessary diagram redraws.

**Recommended: A.** Samples make the choices recognizable without introducing temporary appearance changes. Selecting a row would apply and save the theme, then close the menu.

</details>

### Q9. Should code and diagrams use colors adapted to the selected theme?

> **Your decision: A.** Coordinate Preview code, Source syntax colors, and Mermaid with each selected theme, preserving existing Light and Dark appearances and authored diagram colors and image pixels.

<details>
<summary>Full question</summary>

You chose themes for the whole workspace. The remaining question is how far that applies inside technical content. Markside can use existing Solarized Light, Nord, and Dracula syntax palettes for Preview code blocks. Source and Mermaid need their colors adapted because their current setup only distinguishes light and dark.

- **A. Coordinate code and diagrams with each theme.** Preview code blocks and Source use syntax colors suited to the named palette, while Mermaid uses matching backgrounds, text, lines, and accents. This gives the workspace a coherent look, but requires palette work and readability checks across both editors and diagrams.
- **B. Keep the existing light/dark colors inside technical content.** Surrounding controls and prose use the selected palette, while Source, code blocks, and diagrams use their current light or dark colors. This is quicker to ship, but the document can contain visibly different palettes.

**Recommended: A.** It follows the whole-workspace choice. Preserve the existing Light and Dark appearances, tune Paper for its warm background, and keep authored diagram colors and image pixels unchanged.

</details>

### Q10. Should we revisit only the explanatory System diagram?

> **Your decision: A.** Revise the explanatory System diagram while keeping the theme decisions.

> **Withdrawn at Q11.** The requester said the diagram request was a test/typo.

<details>
<summary>Full question</summary>

Your Review Note says, "Let's revisit the last diagram." The last Mermaid diagram shown in this interview is the one from Q6 about System and named themes, reproduced below. The most recent question, Q9, instead decided how code and diagram colors follow a theme. Which part should we reopen?

~~~mermaid
flowchart TD
  S[Saved selection] --> M[System or a named theme]
  M --> W[Document workspace appearance]
~~~

- **A. Revise the explanatory System diagram.** Keep the theme decisions and improve what this figure explains. This focuses on the drawing, but I need your note about what is unclear or missing before changing it.
- **B. Reopen how System chooses a theme.** Reconsider Q6, where System follows the existing Light and Dark appearances. This lets us change that behavior, but may require a different chooser or additional settings.
- **C. Reopen diagram colors.** Reconsider the diagram part of Q9, where Mermaid colors follow the selected theme. This lets us choose a different diagram appearance without reopening the other theme decisions.

**Recommended: A.** This treats your note as referring to the last figure actually shown. Use Something else… to describe the change directly if you already know what you want.

</details>

### Q11. Should this revised diagram replace the earlier System diagram?

> **Your decision:** Ignore my last ask related to diagram; it was a test/typo.

<details>
<summary>Full question</summary>

The earlier diagram showed only that a saved selection reaches the workspace. This version explains how that selection determines the appearance. System responds to later OS changes; a named theme stays fixed until you choose something else.

~~~mermaid
flowchart TD
  S[Saved theme selection] --> C{System selected?}
  C -->|Yes| O{OS appearance}
  O -->|Light| L[Use existing Light theme]
  O -->|Dark| D[Use existing Dark theme]
  C -->|No| N[Use the selected named theme]
  L --> W[Apply colors across the document workspace]
  D --> W
  N --> W
~~~

- **A. Use this explanation.** Keep this diagram as the explanation of the agreed System behavior. This makes the automatic and fixed paths explicit, but leaves the individual palette colors to the theme design.
- **B. Revise the explanation further.** Use Something else… to point out what the figure should add or change. This lets us target the missing detail, but we need that detail before changing the drawing again.

**Recommended: A.** The diagram now shows the actual choice System makes rather than just the connection between a preference and the workspace.

</details>
