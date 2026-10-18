# Show changes after reloading Markdown

Status: Implemented. Tested by the user.

## Problem

After a user gives Review Comments to an agent and the agent edits the local
Markdown file, browser reload shows the new document without making the edits
obvious.

## Confirmed direction

- Put the existing Reload from disk action directly in the document toolbar.
- Remove the duplicate Reload action from the file actions menu.
- After an explicit reload, show added text in green and removed text in red
  with strikethrough. Offer a toggle back to clean reading.
- Keep existing comments. Users who dislike changes can add follow-up comments,
  including on removed text, and copy the revised Review to the agent.
- Defer selective accept/reject and restoring the file to a previous version.

## First version

- Reload compares the last loaded or saved file contents with the new disk
  contents. Discarded Unsaved Drafts are not treated as external changes.
- The comparison runs on blocks first and on words only inside a block that was
  rewritten, so a removed list item or paragraph is shown as a whole block in
  its original position rather than as words spliced into its neighbours.
- Preview shows additions and removals inline. Show changes returns to clean
  reading. Reloading from Source switches to Preview when there are changes.
- Show only the rendered comparison. Source-only changes, such as link
  destinations, have no dedicated indicator in this version.
- The comparison controls sit in the document toolbar beside Reload, never in a
  bar above the document, so showing changes does not shift the text. Done
  closes the comparison and returns to clean reading. Another Reload starts a
  fresh comparison.
- Code and Mermaid definitions stay as plain code while changes are shown, so
  their added and removed text remains selectable.
- Each explicit reload replaces the comparison, including a reload that finds
  no changes. A reload with no changes reports that beside the Reload button
  and shows no other comparison controls. Editing, navigating away, or refreshing the browser clears it.
- Clearing a Review stays explicit. The Done menu offers Done and clear
  comments, which clears the whole Review, and the panel's full-Review clear
  action remains available. Hiding the comparison never clears anything on its
  own.
- Comments on removed text retain the quote as historical context. They cannot
  attach to identical text elsewhere in the current file. Copied prompts explain
  that the quote was removed.
- Select current text or removed text separately when adding a comment.
- Copying the rendered document and PDF Export exclude comparison markings and
  removed text. Reload never writes the comparison to disk.

## Existing constraints

- Reload remains an explicit user action. No file watching or polling.
- Unsaved Draft handling must protect edits in Markside.
- Changed text does not prove that a Review Comment has been addressed.

## Discussion

The initial suggestion to prioritize commented passages has not been accepted.
The confirmed request is to make added and removed text visible after reload.

The user approved implementing the temporary comparison with no persistent
version history. Existing work was committed as `0f5f7ca` before implementation.

## Verification

The production build completed. The new comparison tests cover preservation of
both versions, block-aligned removals, removed blocks returning as list items,
table rows, and containers, current-text anchors, deleted-text comments, and
copying without removed text. Browser verification is left to the user at their
request.
