# Choosing the Interface language

The interview took place in chat on 2026-10-28, following the six-language
interface implementation. The user learned that Markside followed the browser
language and asked whether it could also be changed independently.

## Q1. Why change language independently?

> **Decision:** Let a user choose Markside's Interface language independently
> of the browser language.

## Q2. What should the choice offer?

> **Implementation decision:** Keep following the browser as the default and
> offer the six existing Interface languages. Show each language in its own
> language so it remains recognizable.

## Q3. Where and when should the choice take effect?

> **Implementation decision:** Put the choice in Settings, including before
> file access is enabled. Save it locally and update open Markside surfaces
> without reloading documents or discarding an Unsaved Draft.

## Q4. What remains outside the choice?

> **Existing decision:** Do not translate user content, filenames, Review
> data, or instructions sent to an agent. Browser-owned extension metadata
> continues to follow the browser's language.
