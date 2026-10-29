---
date: 2026-10-28
status: accepted
interview: grill.md
design: spec.md
---

# Intent: Choosing the Interface language

## Problem

Markside follows the browser Interface language, so a user cannot choose a
separate language for the product without changing the browser.

## Proposed outcome

Let the user choose the Interface language independently, while retaining an
option to follow the browser.

## Affected users and systems

The Settings page and all open extension surfaces, their local preferences,
rendered interface labels, and accessibility language metadata.

## Constraints

- Keep English, Simplified Chinese, Traditional Chinese, Korean, Japanese, and
  Spanish available, with the browser language as the default.
- Preserve user-authored content, Review data, and unsaved edits.
- The browser owns extension metadata and selects its language separately.

## Open questions

- Native-speaker review of existing translations remains a follow-up.
