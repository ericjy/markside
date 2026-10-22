---
date: 2026-10-22
status: implemented
---

# Typeface in the file menu

Move Typeface from Options to a submenu in the file actions menu, alongside
Page width. Show the current choice on the parent row. The submenu contains
Sans, Serif, Charter, Iowan, and Avenir with one selected item; each option uses
its own system font stack as a preview.

Keep the existing `typeface` storage key, Sans default, installed-font fallbacks,
and immediate updates across open documents. The control appears in Preview and
Split Preview. Code, Source, and PDF Export keep their existing fonts.

Retain the product term Typeface. "Font type" can suggest a font category rather
than the particular typeface being selected.
