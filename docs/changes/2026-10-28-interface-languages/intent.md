---
date: 2026-10-28
status: accepted
interview: grill.md
design: spec.md
---

# Intent: Interface languages

## Problem

Markside's English interface can make setup and later actions difficult for
people who use the browser in other languages. Translating just the onboarding
would leave the rest of their experience in English.

## Proposed outcome

Translate the full extension interface into English, Simplified Chinese,
Traditional Chinese, Korean, Japanese, and Spanish, and check the translations
and interface after implementation. Follow the browser's interface language.

## Affected users and systems

Users of the extension popup, Settings, New Draft, local file viewer and editor,
and Review controls. Language resources, error handling, accessibility,
extension packaging, tests, and product documentation are affected.

## Constraints

- English is the fallback for unsupported languages.
- Do not translate or transmit the user's document content.
- Preserve Review data and the meaning of agent instructions.
- Use natural Traditional Chinese wording rather than character conversion.

## Open questions

- How should the translations be reviewed by native speakers after release?
