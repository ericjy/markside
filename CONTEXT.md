# Markside

Markside is a browser-based viewer and editor for local text files, with rich rendering for Markdown.

## Language

**Auto Save**:
A preference that writes an edited file after a short period without input. It is disabled by default.
_Avoid_: Automatic saving, background save

**Typeface**:
A preference that sets the font of rendered Markdown. It offers a fixed set of installed system fonts and defaults to Sans.
_Avoid_: Font, theme

**Unsaved Draft**:
Edits in the source editor that have not been written to the local file. Leaving an unsaved draft requires the user to save it, discard it, or cancel navigation.
_Avoid_: Dirty file, pending changes

**Review Comment**:
A private annotation on a selected passage or UI element in a local Markdown document or localhost application. It leaves the reviewed content unchanged and may be revised or removed before handoff to an agent.
_Avoid_: Agent comment, feedback

**Unanchored Review Comment**:
A Review Comment whose referenced passage cannot be located uniquely in the document's current content. It remains part of the Review without appearing beside a passage.
_Avoid_: Orphaned comment, stale comment

**Reload Comparison**:
The additions and removals between the previously loaded or saved document and the version read by an explicit Reload. It lets the user inspect changes and comment on removed passages as historical context.
_Avoid_: Agent response, accepted edits

**Review Note**:
Optional overall guidance that applies to a Review as a whole rather than to a specific passage.
*Avoid*: Document comment, general comment

**Review**:
A feedback package that the user explicitly prepares for handoff to an agent. It may contain one Review Note, Review Comments, and Text Replacements.
_Avoid_: Comment bundle, feedback file

**Readability Check**:
An assessment of paragraphs for difficult wording, including tangled sentences, unclear references, and unnecessarily complicated phrasing. It does not assess whether the content is substantive, correct, or complete and is separate from a Review.
_Avoid_: AI review, quality check

**Text Replacement**:
A pending instruction to change selected text to exact wording supplied by the user. It leaves the rendered content unchanged; the coding agent makes the source change after handoff.
_Avoid_: Applied edit, live edit

**Suggest Edits**:
A shortcut that starts an editable Review Comment asking the coding agent to improve selected wording. It does not generate wording suggestions inside Markside.
_Avoid_: AI rewrite, automatic replacement

**Active Review**:
A Review retained for a local document or localhost application until the user explicitly clears it. A localhost Active Review spans pages on the same origin, including port; copying an Active Review does not clear it.
_Avoid_: Review draft, open review

**PDF Export**:
A polished, neutral, light-theme PDF representation of a Markdown document. Physical printing remains available but is not the primary purpose.
_Avoid_: Print export, PDF printing

**Link Snapshot**:
An immutable, read-only copy of successfully saved local Markdown carried entirely inside a link and rendered in the recipient's browser. It excludes local assets, cannot be revoked or expired, and can be read by anyone with the complete link without Markside receiving or storing its contents.
_Avoid_: Published Snapshot, shared file, synced document, live document

**Hosted Snapshot**:
An immutable, read-only copy of successfully saved local Markdown encrypted in the sender's browser before Markside stores its ciphertext. Its decryption key stays in the URL fragment, it expires after 7, 30, or 90 days, and it cannot be revoked early.
_Avoid_: Uploaded document, cloud file, live document

**Addressed Review Comment**:
A Review Comment the agent reports having handled, with an optional reply. It
stays visible for the user to check and may be resolved or reopened by the user.
_Avoid_: Accepted comment, completed review

**Resolved Review Comment**:
A Review Comment the user has accepted after checking the agent's response. It
is grouped under Resolved and can be reopened by the user.
_Avoid_: Agent-resolved comment, deleted comment


