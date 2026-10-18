# ADR-0006: Resolve localhost review targets by identity, not by DOM position

**Status:** Accepted

A localhost annotation targets either selected text or a picked element.

Text targets reuse the Review Comment anchoring of [ADR-0005](0005-anchor-review-comments-by-text.md): quote context (`exact`, `prefix`, `suffix`) plus a heading path, resolved against the rendered text of the current page. Rendered-text positions are captured but never trusted across page changes, because a localhost application re-renders continuously.

Element targets cannot always rely on text — an icon button may render none — so they persist an identity descriptor instead: tag name, `id`, `data-testid`, `role`, `aria-label`, `name`, class names, and the element's rendered text. Resolution narrows candidates by identity and requires exactly one match. The readable ancestor path is persisted for the coding agent's benefit only; Markside never resolves through it, because positional CSS paths break on the ordinary re-layouts this feature exists to review.

An annotation that resolves to nothing, or to more than one candidate, stays in the Review panel marked "Target not found" and is copied with its captured context and a warning. Markside does not attach an annotation to an ambiguous match. An annotation captured on another route is not missing merely because that route is not open.
