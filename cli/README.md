# Markside CLI

Review a local Markdown file in Google Chrome and receive the user's comments
in the waiting agent session. Requires Node.js 20+, Chrome, and Markside with
**Allow access to file URLs** enabled.

```sh
markside review PLAN.md
markside review PLAN.md --timeout 540 --no-open
markside comments PLAN.md
markside address PLAN.md c1 --reply "Added the missing detail."
markside review PLAN.md --continue --no-open
```

`review` opens Chrome and waits up to 540 seconds. It prints an agent prompt on
send and exits 0. If the user finishes the Review while
it is waiting, it reports `Review resolved for ...` and exits 0. On timeout it prints `STILL_WAITING:` and exits 2; run the
printed command, which adds `--no-open` so retries don't open another tab. Ctrl+C exits 130 and leaves the request pending. Progress goes to
stderr; comments and timeout instructions go to stdout. Other errors exit 1.

The only communication channel is `PLAN.md.review.json` beside the document.
A retry preserves the pending request, and returns an existing send immediately.
Addressing and resolving keep the current request active. After the reviewer
finishes the Review, `review`
starts a new request; resolved comments and their replies stay in the file as
history. Writes use a
temporary sibling file and rename. The waiting process watches the directory
and polls every second as a fallback. It stops when sent, interrupted, or timed
out. There is no server or persistent background process.

After addressing all received comments, the agent runs `review --continue --no-open`
and waits for the reviewer to check the changes. This preserves the current request
and its replies, without opening another tab. Further sends return the next open
comments. Finishing the Review in Markside ends the loop, including when it happens
before the continuation command starts. Timeout retries keep `--continue --no-open`.
The agent repeats this loop until the reviewer finishes the Review or asks it to stop.

Add `*.review.json` to your project's `.gitignore` to keep local comments private.

For local development, run `node cli/markside.mjs review PLAN.md` from the
Markside repository. The package can be installed with `npm install ./cli`.
Publishing to npm is a separate release step; `npx markside` requires that
release and should only be used once this CLI is published under that name.

Comments move through Open → Addressed → Resolved. The agent uses `address` to
report its work and reply. The user checks the result in Markside, then chooses
Resolve or Reopen. Reopen returns a comment to Open and requires an explicit
Send comments to agent before the agent receives it again. The former CLI
`resolve` command is rejected; resolution belongs to the reviewer.

`review` returns only open comments; `comments` lists every comment with its
status and reply. The file keeps one flat comment list; see
[ADR-0008](../docs/adr/0008-flat-agent-review-file.md).
