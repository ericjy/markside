# Markside CLI

Review a local Markdown file in Google Chrome and receive the user's comments
in the waiting agent session. Requires Node.js 20+, Chrome, and Markside with
**Allow access to file URLs** enabled.

```sh
markside review PLAN.md
markside review PLAN.md --timeout 540 --no-open
markside comments PLAN.md
markside resolve PLAN.md c1 --reply "Added the missing detail."
```

`review` opens Chrome and waits up to 540 seconds. It prints an agent prompt on
send and exits 0. On timeout it prints `STILL_WAITING:` and exits 2; rerun the
same command. Ctrl+C exits 130 and leaves the request pending. Progress goes to
stderr; comments and timeout instructions go to stdout. Other errors exit 1.

The only communication channel is `PLAN.md.review.json` beside the document.
A retry preserves the pending request, and returns an existing send immediately.
After all comments are resolved, `review` starts a new request. Writes use a
temporary sibling file and rename. The waiting process watches the directory
and polls every second as a fallback. It stops when sent, interrupted, or timed
out. There is no server or persistent background process.

Add `*.review.json` to your project's `.gitignore` to keep local comments private.

For local development, run `node cli/markside.mjs review PLAN.md` from the
Markside repository. The package can be installed with `npm install ./cli`.
Publishing to npm is a separate release step; `npx markside` requires that
release and should only be used once this CLI is published under that name.
