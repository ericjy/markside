# Localhost review

Status: Implemented. See `docs/system-design.md` and ADR-0006.

## Purpose

Let users review a rendered localhost application and hand precise comments and pending text replacements to a coding agent, which locates and changes the source implementation.

## Agreed decisions

- Batch handoff uses one copied prompt that the user pastes into their coding agent. Reuse the existing Review export workflow.
- One Active Review spans routes on the same localhost origin, including port. Each annotation records its own URL, and the panel groups annotations by page. The user copies the Review as one prompt.
- Selecting text reveals Comment, Replace, and Reword, plus an icon-only Delete text button in its own trailing segment.
- To comment on an element, the user clicks "Pick element" in Markside, then clicks the target. Markside prevents that click from activating the application control and opens a comment box. Subsequent clicks work normally again.
- "Reword" opens an editable preset Review Comment asking the coding agent to suggest alternative wordings for the selection. The user can revise the request before adding it. Markside does not call AI or display generated wording suggestions. This supersedes the original brief's in-extension AI suggestion flow.
- If an annotation's target disappears or cannot be located uniquely after the page changes, retain the annotation in the Review panel with "Target not found". Include its original text, page URL, and captured context in the copied prompt. Do not attach it to an ambiguous match. An annotation on another route is not missing merely because that route is not currently open.
- Persist pending Reviews across tab closure and browser restarts until the user explicitly clears them. Copying a Review does not clear it, allowing the user to check the agent's changes afterward.
- Users click the Markside extension icon, then "Review this page" to open the Review panel on a localhost page. Closing the panel removes review controls and preserves saved feedback.
- Replace shows the original selection and a replacement text box. "Add replacement" saves the exact requested wording and stays disabled until text is entered. Delete text is its own toolbar action and commits without a composer, since the selection is the whole input. Neither action changes the website.
- The first version supports local development addresses only, such as localhost and 127.0.0.1. Deployed preview sites are outside this version's scope.
- The Review panel floats over the page without shrinking or reflowing the application, opening near the top-right corner. Users can drag it by its header to uncover content underneath, or close it. Its position persists per origin.
- Review stays open when the user follows links between pages of the same localhost application.

## Requirements from the brief

- Offer Comment, Replace, Reword, and Delete text for selected or targeted rendered content.
- Comments contain natural-language feedback about a passage or UI element.
- Text replacements record the original and desired text without changing the website.
- Reword provides a preset comment that the user can edit before adding it to the Review.
- Support multiple annotations with visual anchors and controls to review, edit, and remove them before handoff.
- Include page/route, selected text, relevant element context, and nearby text so the agent can locate the source.
- Preserve normal application behavior as much as possible.
- Reuse the existing Review, annotation, and agent handoff architecture.
- Do not use contenteditable, mutate website text, or build a source editor or DOM-to-source mapping.

## Resolved decisions

- A localhost target is either selected text or a picked element. Text targets reuse the existing Review Comment quote anchoring. Element targets resolve by identity attributes and rendered text, never by a positional CSS path. See ADR-0006.
- An annotation belongs to the page URL it was captured on, with the fragment removed, and a Review belongs to the origin including port.
- The first version covers `localhost`, `*.localhost`, and `127.0.0.1` on http and https at any port. The IPv6 loopback is excluded because a Chrome content-script match pattern cannot express it.
- Reviews persist in `chrome.storage.local` under `localhostReview:<origin>`, not in the reviewed application's own storage, so a Review survives tab closure and browser restarts and never touches application data. The panel's open state is a separate per-origin flag under `localhostReviewPanel:<origin>`.
