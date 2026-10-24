# Manual Chrome checks

Run this checklist for changes to the extension UI or browser integrations.
Use disposable local files so save and conflict checks cannot damage your work.
Record the Chrome version, operating system, commit, and any failed step in your
pull request or review response.

## Install and prepare

- [ ] Run `nvm use`, `pnpm install --frozen-lockfile`, `pnpm typecheck`,
  `pnpm test`, and `pnpm build`.
- [ ] Open `chrome://extensions`, enable Developer mode, choose **Load unpacked**,
  and select `build/chrome-mv3-prod`. Reload an existing unpacked installation.
- [ ] In Markside's Details, enable **Allow access to file URLs**. Check that
  the popup explains setup while access is off and reports readiness when on.
- [ ] Prepare a folder containing two Markdown files, a nested folder, an image,
  and a text or code file. Include headings, a relative link, an image link,
  a code block, a Mermaid diagram, and math in one Markdown file.

## Read and change modes

- [ ] Open a local `.md` file in Chrome. With fresh preferences, it opens in
  Preview. Check headings, code highlighting, diagrams, math, links, and images.
- [ ] Switch between Preview, Source, and Split. An edit survives mode changes;
  Split updates its rendered pane while typing.
- [ ] Close the file tree, refresh the page, and navigate to another local file:
  it stays closed without flashing open. Reopen it and repeat: it stays open.
  Enter Split and reload, then return to Preview: the file tree restores the
  saved choice. Enter and leave Zen mode without changing the saved choice.
- [ ] Check the word count and reading time in Preview's top-right margin,
  including Split. They follow unsaved edits in Split, scroll away with the
  document, and stay clear of text, Outline, and docked Review at narrow widths.
  Source-only mode, non-Markdown files, and PDF exports show no label. Empty
  Markdown shows `0 words · 0 min read`; 199, 200, and 201 source words show
  `<1 min read`, `1 min read`, and `2 min read` respectively.
- [ ] Resize the Split divider with the pointer and keyboard. Reload and check
  that the saved divider and mode return. Test independent pane width controls.
- [ ] In Preview and Split, file actions has one Page width row showing the
  current choice. Open its submenu with the pointer or Right arrow, then select
  Narrow, Standard, or Full width. Only one is checked; Left arrow returns to
  the parent menu. After selection, reopening shows the updated choice on the
  parent row. With enough room, Narrow caps
  the body at 48rem and Standard at 64rem; Full width fills the available area.
  Narrow windows and docked Review still fit the body to the available space.
  Headings, paragraphs, tables, code, and images reflow without changing type size
  or side spacing. Review highlights and missing-passage badges follow the text.
- [ ] Reload and open a second Markdown file; the chosen Preview width returns.
  Check existing profiles with the old Full width setting on and off: their
  first load preserves Full width and Standard respectively. Fresh preferences
  default to Standard. Source-only mode has no Page width choices, its Full
  width toggle remains independent, and PDF Export retains its print layout.
- [ ] In Preview and Split, open file actions → Typeface. The parent row shows
  the saved typeface, and the submenu previews Sans, Serif, Charter, Iowan, and
  Avenir with exactly one checked. Change it and verify the rendered text and
  parent label update, including in another open Markdown tab. Reload and open
  another file to check persistence. Code blocks, Source, and PDF Export retain
  their own fonts. Source-only mode has no Typeface submenu, and Settings no
  longer has the old selector.
- [ ] Open file actions → Zen mode, which shows `⌘.` or `Ctrl+.`. The toolbar,
  file tree, and Outline disappear at once; the word count stays and a hint
  shows for about two seconds. Check the faint bar at the top center, which
  darkens as the pointer nears the top; reach the edge or press Tab to reveal the toolbar over the
  document, clear of the first heading, with **Exit Zen mode** at its left end. Show the
  Outline and open Review from it; moving away hides the toolbar unless a menu
  is open. Toggle with Cmd/Ctrl+. in Preview, Source (while typing),
  Split, and a non-Markdown file. With Review open, the first Escape closes
  Review and the second leaves Zen mode; docked Review reaches the window top.
  In Source, Escape with a selection collapses it first. Open another file from
  the file tree, quick switcher, or an ordinary link, and reload: Zen mode stays
  on. A new tab starts with it off.
  Leaving restores the sidebars, and the saved Outline choice is unchanged.
- [ ] Check the outline, heading navigation, light/dark themes, and narrow windows.
- [ ] Open Print or PDF Export with Zen mode off, then with Zen mode on and its
  toolbar revealed. The print preview contains the document without Markside's
  toolbar, breadcrumbs, or action buttons in either layout. Cancel printing and
  confirm the toolbar still works on screen.
- [ ] Print a document with a compact Mermaid sequence diagram and a wider
  flowchart. Each fills the document column without clipping or stretching,
  with no leftover blank viewport above or below. Zoom and pan on screen, then
  print again: the printed size and position stay unchanged. Cancel printing
  and confirm the screen's zoom and pan are preserved.
- [ ] Check Ctrl+E, Cmd/Ctrl+S, Cmd/Ctrl+P, and Cmd/Ctrl+. for Zen mode. Save operates in Source or Split;
  the file switcher requires an opened folder.

## Save, reload, and folder permissions

- [ ] Edit a file in Source, save, and confirm the exact file changed on disk.
  Reload it and check the saved contents.
- [ ] With Auto Save off, wait after typing and confirm disk contents do not
  change. Enable Auto Save in Settings, edit, wait at least 1.5 seconds, and
  confirm the file is written. Turn Auto Save off again after the test.
- [ ] Open a file outside all previously selected folders. Edit and save. Check
  that Markside asks for its folder, then saves in place after permission is
  granted. Cancel the folder flow and confirm the Unsaved Draft remains.
- [ ] Modify a loaded file externally, then try saving an edit in Markside.
  Confirm the conflict offers Overwrite and Reload from disk. Use disposable
  files to exercise both choices.
- [ ] Edit a loaded file externally, switch back to Chrome, and confirm Changed on
  disk appears beside Reload without replacing the document. Reload and confirm it
  disappears. Switch away and back with no external edit and confirm it stays hidden.
- [ ] Reload an externally edited Markdown file and check additions/removals,
  Show changes, and Done. Verify that editing and navigation clear the comparison.
- [ ] Try navigating with an Unsaved Draft. Check Save, Discard, and Cancel.

## Reviews and extension pages

- [ ] Select text in Preview and Split Preview. Add a Review Comment, edit it,
  select a preset, and check that the preset search field receives focus.
- [ ] Click each preset button above the comment field, before and after typing.
  Confirm the text is inserted at the caret, focus stays in the field, nothing
  shifts. On a question card, confirm the buttons are Clarify, Explain, and Example.
- [ ] Add a Review Note, copy a comment and the full Review, and inspect the
  copied prompts. Reopen the file and confirm the Review persists.
- [ ] Select a comment, then click empty space in the comment list and document
  text outside any highlight. Confirm both clear the selection, and clicking a
  card, button, or field does not.
- [ ] Drag and resize the Review overlay. Check its position after reloading,
  passage highlights, badges, keyboard movement, and Escape handling.
- [ ] Change reviewed text externally and confirm copying asks for a reload.
  Reload and inspect anchored and unanchored comments before copying again.
- [ ] Open the popup. Confirm pending Reviews appear with correct counts and
  selecting one opens the corresponding file and Review.
- [ ] Open Settings from the popup. Check Auto Save and guidance.
  Check that preference changes reach already open documents.
- [ ] Open Share, inspect Link and Hosted Snapshot choices, and cancel. If you
  test creating a link, use a disposable document and inspect its rendered view.

## Folder tree and other files

- [ ] Open the test folder. Expand nested directories, switch files, and check
  the tree's expanded state after a full page navigation.
- [ ] Follow relative document links. Open tree links in another tab with
  Cmd/Ctrl-click, middle-click, and the context menu.
- [ ] Use Cmd/Ctrl+P to find a nested file. Create a Markdown file with the
  folder-header action and confirm it opens in Source in a new tab.
- [ ] Select an image in the tree and confirm the image viewer opens.
- [ ] Select a non-Markdown text or code file. Confirm Source-only editing and
  save work, with no Markdown Preview or Split controls.
- [ ] Check the page and extension consoles for uncaught errors during these flows.

## Local agent Review loop

- [ ] In an already open local file, choose Start a review in your agent… (or
  Start another review after completion). Copy the command from both agent tabs
  and confirm it includes `--no-open`. Run it in the agent: no Chrome tab should
  open. Confirm Done only closes setup. After the agent is waiting, switch back to
  Chrome and confirm Send review to agent appears without clicking anything and
  existing unsent comments remain available. Before running the command, click
  Check for review and confirm it briefly shows No review yet. Run the command
  while staying in Chrome, click Check for review, and confirm Send appears.
  With an active review, let the agent address a comment, switch back to Chrome, and
  confirm it shows Addressed without a reload while the document text is unchanged.
- [ ] With no saved folder, open setup and confirm step 3 shows the document's folder.
  Choose a wrong folder and confirm the error; choose the right folder and confirm
  the step confirms access. Once the review is found, the panel shows Send review to agent with
  no folder line below it. With a covering saved folder, step 3 is absent.
- [ ] On macOS with Claude Code, install the local `cli/` package and updated
  `skills/markside` skill. Ask the agent to write a disposable `PLAN.md`, then run
  `/markside review PLAN.md`. Chrome opens Markside; the Review panel retains its
  saved open/closed preference. Click Review to open it if needed.
- [ ] With zero comments, Send review to agent is disabled. The empty state explains
  how to add a comment, without another instruction above Send or a duplicate tooltip.
  No setup link appears while the request is active. Add two comments, send, grant the document's folder access if
  prompted, and confirm the CLI prints Got 2 comments and exits 0. The agent
  revises the plan and marks each ID addressed with a reply in the Review file.
- [ ] With an active request, select a passage and write a comment. The composer
  offers Save & copy prompt and a Save split button whose menu has Save & send
  review; Cmd/Ctrl+Shift+Enter also saves and sends. Save keeps the comment
  local; Save & send review saves it and sends the entire Review, including prior comments and the
  overall feedback. Test the first comment on an empty Review. Cancel folder
  selection or deny permission and confirm the saved comment remains in Review
  for retry, with any send error visible there. Without an active request, or
  after resolution, the composer keeps Save & copy prompt and Save.
- [ ] Click Reload or close and reopen Review after the agent addresses comments.
  Each matching comment shows Addressed and the agent reply, including when
  collapsed. Addressed comments whose quotes changed retain the original quote
  without a passage-not-found warning. Their blue ? markers and passage
  highlights disappear from Preview and stay absent after resizing the window.
  Open comments keep their warnings and markers.
- [ ] On an Addressed card, click Resolve. It moves into the collapsed Resolved
  group. Expand the group and click Reopen; the comment returns to Open with
  its reply retained and Send review to agent available. The waiting CLI must
  not receive it until Send is clicked. Reopen an Addressed card as well.
  Deny folder write access for a status change and confirm an error appears
  without changing the card. Retry with access, then resolve all comments.
- [ ] Send a review and stay in the tab. When the agent edits the document and
  addresses the comment within 2 minutes, confirm the reply appears and Changed
  on disk with Reload shows without switching tabs; the document is not replaced.
  Send again and leave the agent idle for over 2 minutes; confirm DevTools shows
  no further reads of the Review file after the limit.
- [ ] Run the CLI resolve command and confirm it is rejected. After all comments
  are addressed, start another review and confirm it waits and retains replies
  and resolved history. Resolve every comment while the CLI waits and confirm
  it keeps waiting and the panel offers Finish review. Add a new comment and
  confirm Send returns and the CLI receives it. Resolve everything again, click
  Finish review, and confirm the CLI exits with Review resolved for the document.
  In another Review, leave two comments Addressed: confirm the footer shows
  "Anything else to change? Comment on it, or finish." above
  Resolve all, Finish review, and an icon-only Copy review as prompt on one row
  in the docked panel. Resolve all marks both resolved and the CLI keeps
  waiting; Finish review then ends the Review. Repeat with Addressed comments
  and click Finish review directly: both become resolved and the Review ends.
  With Addressed comments and the document changed on disk, the footer says
  "Your agent updated the document. Reload to see its changes." without Resolve
  all or Finish review; after Reload they return. In an interview whose agent
  added new question cards, the footer says "Answer the next questions in the
  document." without them, and they return once only Before you finish remains.
  Addressed and Resolved comments are read-only until reopened. Reopen a
  comment, edit it, and confirm its old reply disappears for the new wording.
- [ ] In an interview with Previous questions, confirm each archived heading and
  decision appears in a Question Card with Full question collapsed. Expand it
  with the mouse and keyboard: original options, recommendation, and comparisons
  remain readable, the recorded option is marked, and clicking or typing letters
  does not change it. Nested comparisons keep their original open state. Confirm
  archived cards are excluded from active-card tracking and question counts and
  do not block Finish review. Check light/dark mode and a narrow window.
- [ ] Click Revisit question while collapsed. Confirm the composer contains a
  revisit instruction and the recorded answer. Cancel: the decision and Review
  are unchanged. Reopen, revise, and Save: a pending Review Comment appears on
  that heading, without sending or replacing the recorded decision. Reopen again:
  the saved revision returns. Send the Review and confirm the agent handles the
  revision and dependent decisions, or restores the question as a current card
  if more input is needed. Repeat for a custom answer and an assumed decision.
- [ ] Run `/grill-me /markside <topic>` and `/grill-me <topic> in Markside`;
  each creates `<topic>.grill.md` at the repository root. Each current question renders as a
  Question card from a fenced `question` block. In Source, confirm the body
  has ordinary Markdown without `>` prefixes; return to Preview and confirm
  its options are tiles with letter keys in the left gutter, each bold
  title on its own line with a smaller, softer description below, and a small
  uppercase RECOMMENDED label above the recommended option's title, aligned with
  its text. The label is muted teal with slight letter spacing and no pill border.
  Before choosing, that tile has the same neutral
  background, border, and letter key as the other options. The Recommended
  paragraph has a smaller heading
  and no thumbs-up icon in its own box below
  the options, with no send button. Something else… is a quieter tile, with a muted hint line,
  directly after the options, before the recommendation and Compare tradeoffs;
  keyboard hints sit at the top right and wrap below the Question label on
  narrow screens. Select and copy an option's text: the copy reads "A. Title. …" and
  the selection opens the comment toolbar without choosing the option. Click a
  non-recommended option: it has a teal border, faint tint, and checked key
  without an outer halo; the others stay readable. Keyboard focus adds an
  outline around the letter or pencil key, not around the tile. The Review panel
  keeps its current open/closed state. Opening it shows a Draft comment quoting the question heading whose body is the
  option letter, the heading has no highlight, and nothing is sent. Press
  another option's letter and confirm the same comment changes; Tab to an
  option and press Enter. Typing a letter in the composer or Source must not
  choose. Click the selected option again before sending: it becomes unchecked,
  its draft comment disappears, and the answered count decreases. Select it
  again, then press Enter or Space on the focused option to clear it. Repeat its
  letter shortcut instead: the answer stays selected. Select an answer again.
  Press Cmd/Ctrl+Shift+Enter: the agent receives the answer and its
  Review card shows Sent. Choose a different option before the agent replies;
  the comment returns to Draft until sent again.
  Choose Something else… and confirm the composer opens on the heading
  with the placeholder "Your answer or question, or pick one above. You can also combine options or push back." without selecting the tile, and that its quick presets read Clarify, Example,
  Skip, Delegate, and Stop, wrapping if needed. Click Skip: its text is inserted,
  not saved. Save a free-text answer: its tile gains the teal
  selected state, shows the saved text in place of its hint, and all lettered options are unchecked. Choose a lettered
  option and confirm the custom tile becomes neutral again. Send a custom
  answer. Print the document and confirm the buttons are absent. In a
  Review with no agent, an option adds a local comment.
- [ ] On a card with Compare tradeoffs, hover each option and confirm the
  other options' columns fade and its header turns teal; on leaving, nothing is
  faded and only the chosen option's header stays teal.
  With an agent Review and three unanswered cards, a bar below the last card,
  outside it, shows **0 / 3 questions answered** and a disabled **Send review**.
  Answer two cards: it shows **2 / 3 questions answered** and **Send review**
  sends those answers while the third remains unanswered. In a new round, answer
  every card and confirm the count reaches **3 / 3 questions answered**.
  After sending it shows the waiting dot and **Check for
  reply**; with no reply it says so. The bar is absent when printing.
  Repeat a Reload after changing only a sidecar reply, without changing the
  Markdown file, and confirm the new reply appears.
- [ ] In an interview round with three cards under Current questions, confirm
  the first card has a deeper teal border, the only visible keyboard hint, and the only
  full-strength letter keys; hovering another card's option restores its key. Press a
  letter: the first card is answered and the border and hint move to the second without reflowing either card;
  when the next card is not fully visible, it scrolls smoothly into view
  (instantly with reduced motion), otherwise the page stays still. Scroll
  until the highlighted card leaves the upper third of the preview: the border
  moves to the card there, and a letter answers that card. Scroll so no card
  is visible and press a letter: nothing is answered. Click into the third
  card and press a letter: it answers the third card. Answer the remaining card, press another letter, and confirm
  it changes the highlighted card's answer. Cmd/Ctrl+Shift+Enter sends all three
  answers as separate comments. Send a round with one card unanswered and
  confirm that card stays after the agent's reply. Print the document and
  confirm no card's border is deepened.
- [ ] Confirm the Markdown file is unchanged by sending, the Review file has a
  matching SHA-256 of the exact disk bytes, and sent time appears in the panel.
  The button stays disabled until a comment is added or edited.
- [ ] Start with no saved folder. Before clicking, confirm the action reads Send
  review to agent and one line below names the folder Chrome will ask for, with
  the full path on hover. Cancel the picker and confirm comments remain.
  Choose the folder through the sidebar and confirm the line disappears and Send
  works without opening another folder picker.
- [ ] Start with no saved folder, cancel the folder picker, select a wrong
  folder, and deny write permission. Comments remain intact; retry with the
  correct folder. Send another Review from the same folder without selecting it
  again. Repeat with a document nested under a saved parent folder.
- [ ] Try sending with an Unsaved Draft, then with an externally changed file.
  Both block sending with a recovery message. Save or explicitly Reload and
  check the comments, then retry. Check removed and unanchored quotes use a null
  line hint rather than pointing at unrelated source text.
- [ ] Let a Review wait beyond ten minutes. The agent reruns after the default
  540-second timeout. Send during the second wait and confirm automatic
  continuation. Also send between timeout and retry; the send is not erased.
- [ ] Interrupt the CLI and confirm the Review stays pending. Rerun to resume.
  Test a filename containing spaces, #, and Unicode.
- [ ] Without a Review file, confirm Copy review as prompt behaves as before.
  Copy is the primary button, disabled with zero comments. Send to your agent
  instead… below it opens the integration dialog with the current file's command.
- [ ] With an active agent Review, click the separate Copy review as prompt button below Send.
  Confirm it copies the Review without sending it. After sending, confirm the primary
  button shows Sent for agent to pick up, with no extra saved-message paragraph and an active
  Copy button below it. Edit a comment and confirm Send returns. Clear drafts sits beside Copy when there is room and wraps without overlap in narrow panels.
  After sending, click start the review now in "Agent not picking up the review sent?" above Sent for agent to pick up. Confirm a centered
  dialog shows the `npx skills` install command and copies it with Copy install
  command. Switch between the Codex and Other agents tabs; confirm the
  review command uses `$markside` and `/markside` respectively, with
  the current file path. Check tab keyboard navigation with arrow keys and Home/End. Copy command
  should copy the selected command exactly, including paths with spaces. Check manual selection
  when clipboard access fails, and close with Done or Escape. Confirm the
  separate Copy review as prompt button remains available.
  Check malformed and unsupported-version sibling files do not enable sending.
  Open a pending request on a document already displayed by closing and opening
  Review. Confirm there is no polling or automatic document reload in Chrome.
- [ ] After the agent addresses comments, confirm it runs `review --continue --no-open`
  without opening another tab. Reload and send another comment; confirm the agent
  handles it and waits again. Resolve every addressed comment and confirm the wait
  continues; click Finish review and confirm it exits with `Review resolved for ...`.
  Also finish before the continuation starts and confirm it exits immediately
  without creating another pending request.
- [ ] Check network activity: this flow performs local file reads and writes
  only, with no HTTP requests.


## Review panel visibility

- [ ] Close Review, choose a Question Card option, then change the answer. The
  panel stays closed, the selected answer updates, and the Review count updates.
  Save a Something else… answer and confirm the same behavior. Repeat with the
  panel open and confirm it stays open.
- [ ] Outside Question Cards, save a new passage comment and update an existing
  one with Review closed. Both stay saved without opening the panel. Save & send
  also leaves it closed. Click a passage's comment highlight or the Review entry
  and confirm the panel opens intentionally.
- [ ] Close Review before an agent request is discovered or a reply arrives.
  Return to the tab or Reload; it stays closed. Addressed replies turn the Review
  badge green; its tooltip names the number of replies to review. Open Review,
  check and resolve the replies, and confirm the badge returns to normal.
- [ ] Cause a send failure with Review closed. The saved comment remains and the
  Review entry shows an error badge with the error in its tooltip. Open Review
  for the error details and retry. Reload the document with Review closed, then
  with it open, and confirm the saved layout choice restores in both cases.
- [ ] Once the agent has addressed everything, close Review. Confirm the top
  Preview bar says Your agent is waiting and offers Finish review; it stays hidden until you Reload changed
  content and answer remaining questions. Finish there and confirm the CLI exits
  and the bar disappears. With Review open, only its panel offers Finish review.
- [ ] With Review closed, save a passage comment. The compact top bar changes to
  1 comment ready to send and Send review. Add a second comment and check the
  count. Send there and confirm the sidebar stays closed and the agent receives
  both. Sent or Addressed comments must not count as drafts. Repeat with only a
  changed Review Note, and with unanswered Question Cards. Force a send failure
  and confirm its error appears in the bar with retry available. Check that both
  actions stay hidden while disk changes await Reload and while Review is open.
  Check the single row and adjacent button at wide widths, and wrapping on a
  narrow window.

## Local Review history verification

Automated checks cover the flat file contract, CLI retry/continuation against
real temporary files, and Active/Resolved panel rendering. Native Chrome
permissions and disk writes require manual verification.

- [ ] Resolve all comments and finish the Review, then start a fresh review. Verify the earlier comments
  stay under Resolved with their replies, new feedback sends normally, and the CLI
  output lists only the new open comments.
- [ ] Clear the browser's local Review draft and verify sent comments remain
  readable from the sidecar and can still be resolved.
- [ ] Use the panel Send and composer Save & send review, including first-folder
  selection. Repeated clicks, cancelled selection, stale tabs, and denied
  permission must not change the sidecar.
- [ ] Run the skill in Claude Code/Codex: address comments, wait with
  `--continue --no-open`, send again, then resolve everything and finish. Verify no
  additional tab opens during continuation. Finish immediately before
  continuation and verify it exits as completed.


## Review drafts and simplified history

- [ ] Clear the local browser draft while retaining a sent sidecar. Reopen Review:
  recovered comments use Active/Resolved cards, with Resolved collapsed. There is
  no Current sent feedback section or storage-source explanation.
- [ ] With only sent feedback, Clear drafts is hidden. Add a new comment, edit a
  sent comment, and change overall feedback. Confirm Clear drafts removes the new
  comment and restores sent text and overall feedback, leaving the panel open.
  Inspect the sidecar: comments, statuses, and replies must be unchanged. Imported snapshot history also remains.
- [ ] Without a sidecar, Clear all clears the local review, including comments,
  overall feedback, and imported history, and closes the panel after confirmation.
  With a sidecar, Clear drafts preserves sent feedback and imported history and
  keeps the panel open. During a send or status write, clearing is disabled.


## Comment badges, manual resolution, and another review

- [ ] Create a copy-prompt comment without an agent review. It shows Open. Copy
  and reload: it stays Open. Resolve it: it moves into collapsed Resolved, hides
  passage warnings/highlights, and persists after reload. Reopen it. No sidecar
  is created or changed. Clear all still removes the local review.
- [ ] During agent review, a new comment shows Draft; sending changes it to Sent.
  A collapsed Sent comment has no action; expanded, it offers a quiet Withdraw that
  resolves it in the sidecar. An agent answer changes it to Addressed, which shows
  Resolve. Edit sent text and verify Draft returns;
  Clear drafts restores the last sent text and status. Local resolved comments
  are not included as new agent work or in Copy review as prompt.
- [ ] Resolve every sent comment and finish the Review, then add new feedback. Review complete disappears
  and Start another review opens the command dialog. Confirm the sidecar remains
  byte-for-byte unchanged until the CLI starts a fresh review. Close/reopen the
  panel after the CLI starts: Send becomes available and completed history stays
  intact. Continuation alone must not start another review.

### Docked Review

- Open Review on a Markdown file. With no saved layout preference it floats;
  choose **Dock Review right** and verify it fills the space below the toolbar.
- Toggle Outline and Review independently: either, both, and neither. With both
  open on a wide window, verify document → Outline → Review ordering.
- Resize Review with its left divider and with arrow keys, Home, and End while
  the divider has keyboard focus. Verify comments scroll and footer stays visible.
- Reload and navigate to another Markdown file; open Review and verify the dock
  preference and width remain. Switch to Float and verify that choice persists.
- Check Preview, Source, and Split. Review must reserve space for the whole
  content area. Check selecting passages, jumping to comments, and Split resizing.
- Narrow the window until Review floats, then widen it: Review docks again.
  Opening Outline must also leave enough document space or float Review.
- Float, move the panel, dock, then float again: verify the floating position
  remains usable. Close Review and verify its reserved space disappears.

### Review update check

- Send a Review and verify the footer shows Review sent, Waiting for the agent’s
  reply, Check for reply, and Copy as prompt. Agent not responding? and its
  Start a review in your agent link are visible without expanding anything;
  click the link to open setup.
- At the 360px minimum dock width, verify Check for reply and Copy as prompt
  fit on one row without overflowing, including No reply yet and copied
  feedback. Repeat with a floating panel and in dark mode.
- Check before the agent replies: No reply yet appears briefly. Have the agent
  address a comment, then check: the reply appears without reloading the document.
- Have the agent edit the document: checking offers Reload in the bottom-centered document bar without
  replacing the visible text. Reload opens the existing change comparison with Show changes and Done in the same bar.
- Repeat with an Unsaved Draft: Reload must ask before discarding it.
- If a check fails, verify the retry message and existing comments remain visible.

- With Outline and docked Review open, verify the reload bar is centered over
  the document, not either sidebar. Check Split too. Scroll to the last line and
  verify it remains readable above the bar. Done dismisses the comparison bar.
