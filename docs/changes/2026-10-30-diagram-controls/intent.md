---
date: 2026-10-30
status: accepted
author: Eric Yang
interview: grill.md
design: spec.md
---

# Intent: Quieter diagram controls

## Problem

The toolbar above every diagram makes a document look busy while someone is only
reading it.

## Proposed outcome

Controls stay out of sight until the reader points at a diagram or reaches it
with the keyboard.

## Affected users and systems

People reading Mermaid diagrams and Vega-Lite charts in Preview and Split. The
website's Snapshot viewer has no diagram toolbar and does not change.

## Constraints

- Selecting diagram text for Review Comments keeps working.
- Keyboard and touch users can still reach the controls.

## Open questions

None.
