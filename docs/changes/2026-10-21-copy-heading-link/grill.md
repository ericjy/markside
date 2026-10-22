# Copy a link to a heading

## Confirmed details

These details were proposed by the agent and confirmed when the reviewer finished the Review.

- Clicking Copy link keeps your reading position.
- The copied link points to the file you are reading, including after selecting another file in the file tree.
- Heading controls do not appear in printed pages or copied document content. Review Comments on headings attach to the heading text.

## Question history

### Q1. Should the copied link point to the local file?

> **Your decision: A.** Copy a link to the heading in the local file.

<details>
<summary>Full question</summary>

The first decision is what someone should reach after pasting the link. A local file link refers to a path on a computer. Markside also has Link Snapshots and Hosted Snapshots, which let someone read a saved copy in their browser.

- **A. Copy a link to the heading in the local file.** The link contains the file's path and the heading's identifier, such as `file:///Users/eric/notes.md#saving`. It returns you to that section, but another person needs the file at the same path.
- **B. Copy a snapshot link that opens at the heading.** The link opens a saved copy of the document at that section. It works for recipients without the local file, but involves snapshot creation and its existing sharing choices.
- **C. Support both local file links and snapshot links.** Give users both destinations when copying a heading link. This covers personal navigation and sharing, but adds a choice to the interaction.

**Recommended: A.** Start with a direct link back to the section you are reading. Choose B or C if sharing a readable copy with someone else is the main purpose.

</details>

### Q2. Should clicking the existing heading # copy its link?

> **Your decision: B.** Add a separate copy button beside the existing # link.

<details>
<summary>Full question</summary>

Headings already have a # link beside their text. Clicking it currently navigates to the heading, and Chrome's context menu can copy its address.

~~~mermaid
flowchart LR
  H[Rendered heading] --- A[# link beside the heading]
  A --- U[Local file URL with heading identifier]
~~~

- **A. Make an ordinary click on # copy the link.** The existing control copies the heading's address directly. It takes one click and adds no extra control, but changes what an ordinary click does today.
- **B. Add a separate copy button beside #.** Keep # for navigation and add an explicitly named Copy link action. The actions stay distinct, but each heading gains another control.
- **C. Add Copy link to a heading menu.** Open a menu from the heading and choose Copy link there. The action has a visible name, but copying takes more steps and needs a new menu.

**Recommended: A.** The existing # is the smallest place to put this action. Keep it a real link so Chrome's context menu and modified clicks still work.

</details>

### Q3. Should the clipboard contain the full file URL?

> **Your decision: A.** Copy the full local file URL as plain text.

<details>
<summary>Full question</summary>

For a heading named Saving, the destination might be `file:///Users/eric/notes.md#saving`. The clipboard format determines whether pasting produces a bare destination or a named Markdown link.

- **A. Copy the full file URL as plain text.** Pasting inserts `file:///Users/eric/notes.md#saving`. It works wherever that URL format is accepted, but includes the absolute path and needs the same file location on the opening computer.
- **B. Copy a named Markdown link.** Pasting inserts `[Saving](file:///Users/eric/notes.md#saving)`. This is ready for a Markdown document, but other destinations show the Markdown punctuation.
- **C. Offer both formats.** Users choose between the file URL and a named Markdown link. This serves both uses, but adds a format choice to copying.

**Recommended: A.** A plain URL matches Copy link in the browser and keeps the action predictable. Markdown formatting can be added later if it is a frequent need.

</details>

### Q4. Should copying remain available while there is an Unsaved Draft?

> **Your decision: A.** Copy immediately from the displayed heading without saving the Unsaved Draft.

<details>
<summary>Full question</summary>

Split can show a heading added or renamed in the Unsaved Draft. A link to that heading may fail when reopened because the file on disk still has its earlier contents.

- **A. Copy immediately and leave saving to the user.** Build the link from the heading currently shown in Preview or Split. Copying stays quick and never writes the file, but an unsaved heading may not exist after reopening.
- **B. Require a successful save before copying.** Use the normal save flow when an Unsaved Draft exists, then copy the heading link. The link matches the saved document at that moment, but copying can require folder access or encounter a save conflict.
- **C. Disable copying until the user saves.** Explain that the Unsaved Draft must be saved before copying a heading link. This avoids an unexpected save, but interrupts copying even when the heading itself has not changed.

**Recommended: A.** Copying an address should stay a small action that does not write the file. The link already depends on the path and heading continuing to exist.

</details>

### Q5. Should the new copy button appear on hover and keyboard focus?

> **Your decision: A.** Reveal the heading controls on hover or keyboard focus.

<details>
<summary>Full question</summary>

You chose a separate copy button beside the existing # link. The current # appears when hovering over an H1 through H4 heading. The new button also needs an accessible name and a way to appear for keyboard users.

~~~mermaid
flowchart LR
  H[Heading text] --- N[# navigation link]
  N --- C[Copy link button]
~~~

- **A. Reveal heading controls on hover or keyboard focus.** Show the copy button when the pointer is over the heading or a heading control has focus. This keeps reading uncluttered, but users must discover the controls.
- **B. Keep heading controls visible.** Show the # link and copy button beside every supported heading at all times. The actions are easier to discover, but repeat throughout the document.

**Recommended: A.** Match the current quiet heading controls and make both controls visible when reached by keyboard. Touch users should also have a usable way to reveal or reach them.

</details>

### Q6. Should every Markdown heading in Preview and Split get the copy button?

> **Your decision: A.** Support all six heading levels in Preview and Split, including Question Card headings with identifiers.

<details>
<summary>Full question</summary>

Markdown has six heading levels, H1 through H6. Question Cards also contain headings, while Source displays editable Markdown rather than rendered heading controls.

- **A. Support all six heading levels in Preview and Split.** Add the button to rendered Markdown headings, including Question Card headings that have a heading identifier. This makes the action consistent, but adds controls to interview cards too.
- **B. Support document headings outside Question Cards.** Add the button to H1 through H6 in Preview and Split, excluding headings inside Question Cards. This keeps cards focused on answers, but their headings need another way to copy a link.
- **C. Match the currently visible # controls only.** Add copy buttons to H1 through H4 in Preview and Split. This is the smallest visible change, but leaves smaller headings without a copy button.

**Recommended: A.** A heading link should work wherever a rendered Markdown heading has an identifier. Source can continue to offer ordinary text editing.

</details>

### Q7. Should copy feedback stay beside the button?

> **Your decision: A.** Show brief inline success feedback and an actionable error on failure, announced to screen readers.

<details>
<summary>Full question</summary>

A clipboard write can succeed or fail. The user needs to know which happened without losing their place in the document.

- **A. Show brief success feedback beside the button and an actionable error on failure.** Show Copied after a successful write, and keep an error available long enough to retry or use the existing # link's Copy link address menu. This keeps feedback close to the action, but needs room near short headings.
- **B. Use the app's toast feedback.** Show a brief success message or a failure message with retry guidance in the app's notification area. This avoids changing the heading controls, but moves feedback away from the click.

**Recommended: A.** Feedback next to the control makes it clear which heading was copied. Announce success and failure to screen readers as well.

</details>

### Q8. Is it acceptable for a link to break when its heading or file path changes?

> **Your decision: A.** Keep existing file paths and generated heading identifiers, accepting that renames or moves can break links.

<details>
<summary>Full question</summary>

Existing heading identifiers are generated from the heading text. Renaming a heading, moving the file, or changing repeated headings can make an earlier link stop finding its target. Keeping links valid through those changes would require a separate identity and migration design.

- **A. Keep the existing path and heading identifiers.** Copy a link to the current file path and generated heading identifier. This avoids editing Markdown or storing link history, but old links can break after renaming or moving content.
- **B. Require links to survive heading renames.** Design persistent heading identifiers before adding the copy action. This makes links more durable within a file, but expands the feature and still does not solve a moved file by itself.

**Recommended: A.** Match the heading links Markside already renders. This feature can make those links easy to copy without changing document identity.

</details>

### Q9. Should removed historical headings be excluded from copying?

> **Your decision: A.** Exclude removed historical headings shown by Reload Comparison.

<details>
<summary>Full question</summary>

You chose copy buttons for all heading levels. Reload Comparison can also show a heading deleted from the current document, as historical context. The existing outline excludes those removed headings, because a current file link cannot reliably return to them.

- **A. Exclude removed historical headings.** Show copy buttons only on headings in the current rendered document. The links describe current content, but deleted headings shown in Reload Comparison have no copy action.
- **B. Let removed headings copy their former links.** Show the action on historical headings too, using their earlier heading identifiers. This allows copying an old reference, but it can lead nowhere or point to a different heading in the current file.

**Recommended: A.** Match the existing outline and avoid offering a link to content that has been deleted.

</details>

### Q10. Should heading controls stay visible when the device cannot hover?

> **Your decision: A.** Keep heading controls visible on devices without hover support.

<details>
<summary>Full question</summary>

You chose to reveal the # link and copy button on hover or keyboard focus. A device without hover needs another way to discover the same controls.

- **A. Keep controls visible on devices without hover.** Use the quiet hover and focus treatment for pointer devices, but show controls when the device reports no hover support. This makes copying discoverable by touch, but those readers see more repeated controls.
- **B. Reveal controls when the heading is tapped.** Let a tap focus the heading and reveal its controls, then let a second tap copy. This keeps the page quieter, but adds a discovery step and another tap.

**Recommended: A.** Keep the action directly available when hover cannot reveal it. This avoids introducing a separate heading-tap interaction.

</details>
