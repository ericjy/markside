# ADR-0005: Anchor Review Comments by text

**Status:** Accepted

Review Comment anchors use rendered-text quote context (`exact`, `prefix`, and `suffix`) plus rendered-text positions and a heading path, following the W3C Web Annotation selector model. Positions are used only when the reviewed document hash still matches and the selected text verifies; after content changes, Markside reattaches only a unique normalized text match narrowed by its context and otherwise marks the Review Comment unanchored. DOM element indexes and CSS paths are not persisted because rendering changes can make them resolve to the wrong passage.
