# Markside Visual Design

Markside has two related visual surfaces:

- The content-script application uses shadcn-style semantic tokens from `style.css`.
- The popup and options page use a warmer, Clay-inspired presentation.

Do not apply the popup's decorative style wholesale to the document viewer. Reading and editing local files should remain quiet, dense, and familiar.

## Content Application

Use semantic tokens such as `--background`, `--foreground`, `--muted`, `--border`, and `--accent`. The `.dark` class on `<html>` switches the palette.

Guidelines:

- Keep document content visually dominant over application chrome.
- Use compact controls and restrained borders.
- Preserve strong keyboard focus indicators.
- Keep file-tree and outline density comparable to an editor sidebar.
- Use the existing 180–520px sidebar bounds.
- Do not animate layout dimensions during theme changes.
- Use monospaced typography for source, paths, shortcuts, and code.

Rendered Markdown follows the typography plugin, while Shiki uses dual light/dark CSS variables so theme changes do not require re-highlighting.

## Popup and Options

The popup and options page use:

- Warm cream background: `#faf9f7`
- Oat border: `#dad4c8`
- Matcha accent: `#078a52`
- Supporting green: `#84e7a5`
- Black primary text with warm muted grays
- Roobert when available, with system sans-serif fallbacks
- Space Mono for shortcuts and technical labels

Small hover rotations and hard shadows may be used for primary actions, but motion should remain subtle and must not move controls far enough to harm pointer or keyboard use.

## Accessibility

- Maintain visible focus states.
- Do not communicate state through color alone.
- Keep icon-only controls labelled with `aria-label` or a tooltip.
- Preserve the keyboard-operable Split divider.
- Keep text and controls at WCAG-compatible contrast.
- Respect reduced-motion preferences when adding new animation.

## Scope

Before introducing a new token or visual pattern, prefer an existing semantic token or component. If a design rule applies to only one surface, keep it local to that surface instead of expanding the global system.
