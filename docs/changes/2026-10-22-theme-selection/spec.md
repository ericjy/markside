---
date: 2026-10-22
status: confirmed
intent: intent.md
interview: grill.md
guidelines:
  - ../../visual-design.md
---

# Theme selection

Replace the toolbar light/dark toggle with a menu of six named workspace
themes and System. This specification records a confirmed design; it is not
implemented.

## Requirements

| ID | Requirement | Decided by |
|---|---|---|
| R1 | Let readers choose a visual style for reading. | [Q1](grill.md#q1-is-the-goal-to-choose-a-visual-style-for-reading) |
| R2 | Offer Light, Dark, Paper, Solarized Light, Nord, and Dracula. Keep existing Light and Dark appearances. | [Q2](grill.md#q2-should-the-first-release-add-just-a-warm-paper-theme), [Q5](grill.md#q5-should-we-start-with-six-themes-spanning-neutral-warm-and-colored-palettes), [Q9](grill.md#q9-should-code-and-diagrams-use-colors-adapted-to-the-selected-theme) |
| R3 | Apply the selected theme to the toolbar, file tree, Outline, Review controls, Preview, Source, code blocks, and Mermaid. | [Q3](grill.md#q3-should-a-selected-theme-cover-the-whole-document-workspace) |
| R4 | Replace the existing toolbar toggle with a theme menu. | [Q4](grill.md#q4-should-theme-selection-replace-the-existing-toolbar-toggle) |
| R5 | Add System to the same list. It follows the OS using existing Light and Dark, including later OS changes. Named themes stay fixed. | [Q6](grill.md#q6-should-system-be-one-additional-choice-that-follows-the-existing-light-and-dark-themes) |
| R6 | Default new installations to System and preserve existing saved Light or Dark choices. | [Q6](grill.md#q6-should-system-be-one-additional-choice-that-follows-the-existing-light-and-dark-themes) |
| R7 | Persist one choice across browser restarts and update all open Markside document tabs immediately. | [Q7](grill.md#q7-should-a-theme-choice-apply-to-every-open-markside-document-and-future-documents) |
| R8 | Show each named theme's name and small background/text/accent sample, with a checkmark on the saved selection. Selecting applies and saves the theme, then closes the menu. Hover and focus do not preview it. | [Q8](grill.md#q8-should-the-menu-show-small-color-samples-and-apply-a-theme-only-when-selected) |
| R9 | Coordinate Preview syntax, Source syntax, and Mermaid defaults with each palette. Preserve authored diagram colors and image pixels. | [Q9](grill.md#q9-should-code-and-diagrams-use-colors-adapted-to-the-selected-theme) |
| R10 | Apply the theme to other text files and image-viewer backgrounds, while retaining Typeface, Page width, and layout choices. | [Confirmed details](grill.md#confirmed-details) |
| R11 | Keep Settings, popup, PDF Export, and the separate Link Snapshot and Hosted Snapshot viewer on their existing appearance policies. | [Q3](grill.md#q3-should-a-selected-theme-cover-the-whole-document-workspace), [Confirmed details](grill.md#confirmed-details) |

The request to revise an explanatory diagram was withdrawn as a test/typo in
[Q11](grill.md#q11-should-this-revised-diagram-replace-the-earlier-system-diagram).
It changes none of these requirements.

## Menu

Keep the theme control in its existing toolbar position and label it Theme for
assistive technology. Use the existing accessible menu patterns for focus,
keyboard selection, and dismissal. List System followed by the six named
themes in R2 order. System's sample reflects the currently resolved Light or
Dark appearance; its checkmark still identifies System as the saved choice.

Color samples supplement the names and checkmark. They do not replace text or
communicate selection by color alone. Theme changes affect colors without
animating layout dimensions, following the visual guidelines.

## Preference and application

Represent the saved selection separately from the resolved palette. A proposed
storage representation extends `themePreference` with `system`, `light`,
`dark`, `paper`, `solarized-light`, `nord`, and `dracula`. Existing `light` and
`dark` values retain their meaning; a missing or unsupported value resolves to
System. No per-document preference is needed.

Resolve System through `prefers-color-scheme`. Subscribe to OS changes while
System is selected and to `chrome.storage.onChanged` for changes from other
tabs. Named selections ignore OS appearance changes. Keep a light/dark
classification for existing browser controls and styling, alongside the
specific resolved palette. Apply the saved appearance during bootstrap so
loading a document does not deliberately show the default palette first.

Reuse semantic color tokens for workspace and Review controls. Audit hardcoded
light/dark colors, prose, focus indicators, selection, and transient controls
so new palettes remain coherent and readable. Saving failures must remain
actionable rather than silently claiming the preference was saved.

## Syntax and diagrams

- Preview code uses the available Solarized Light, Nord, and Dracula syntax
  palettes through the Shiki wrapper. Paper needs syntax colors readable on its
  warm background; Light and Dark retain their current colors.
- Source uses CodeMirror palettes authored through the existing wrapper APIs.
  Include editor chrome, selections, search results, and Markdown highlighting,
  as well as programming-language syntax.
- Mermaid receives theme variables coordinated with the resolved palette.
  Re-render when that palette changes, preserving the existing viewport state
  and controls. Retain Question Card diagram behavior and existing Light/Dark
  treatments; explicit author styling remains authoritative.

Use the existing dependency wrappers. Update matching bundle scripts where
needed and run `pnpm bundle-engine`, as required by
[ADR-0001](../../adr/0001-prebundle-esm-only-dependencies.md). No new ADR is
needed: palette selection does not conflict with the existing decisions.

## Intent constraints

| Intent constraint | How the design meets it |
|---|---|
| Six named themes plus System | R2, R5, one menu |
| Coordinated technical content | R3, R9, syntax and diagram policy |
| Existing appearance and preference continuity | R2, R6, preference compatibility |
| Samples without hover preview | R8, select-to-apply menu |
| Retain reading and layout choices | R10, palette changes affect colors |
| Separate appearance policies stay separate | R11 |
| Preserve authored visuals | R9 |

## Open questions and concerns

No product-scope questions remain. The intent's exact palette tokens and
contrast checks belong to implementation; usage frequency was not established
and is not an implementation prerequisite.

| Concern | Owner | Required outcome |
|---|---|---|
| Readability across six palettes | Implementer | Choose final tokens and verify prose, controls, focus, selection, Review states, syntax, and diagrams. |
| Named palette consistency | Implementer | Derive named styles from their palette references and installed syntax themes; adapt workspace controls for reading. |
| Theme changes across rendering engines | Implementer | Preserve editor content, Unsaved Drafts, diagram views, and Review anchors when colors change. |
| Saved choice across tabs | Implementer | Separate System selection from its resolved palette and avoid storage change loops. |
| Current documentation says session-only override | Implementer | Update the user guide and system design to the shipped behavior, adding the Theme domain term when implemented. |

## Verification for implementation

Test preference parsing and compatibility, System resolution, OS changes,
cross-tab updates, and explicit selections. Exercise the menu with keyboard
and pointer, confirming samples, checkmarks, dismissal, and absence of hover
preview. Run the repository's typecheck, tests, bundles, and production build.

Manually verify every palette in Preview, Source, Split, source-only files,
and the image viewer, including code, Mermaid, Question Cards, and Review
controls. Check switching themes with an Unsaved Draft and an expanded or
panned diagram, plus browser restart and multiple tabs. Verify retained
Typeface, Page width, layout choices, and separate PDF appearance. Follow
`docs/manual-test.md` for browser integrations rather than mocking filesystem
or IndexedDB behavior.
