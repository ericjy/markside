# Local agent Review loop

The user sends Review Comments to a waiting coding agent through a JSON file
beside the Markdown document. Nothing is uploaded. The extension never watches
or polls the filesystem; only the foreground CLI waits for the response.

## Prototype setup

Build and load the extension using [the manual checks](manual-test.md). Install
Node.js 20+ and install the CLI from this checkout:

```sh
npm install --global ./cli
```

Install the `skills/markside` Agent Skill using the existing installation
instructions. `/markside review PLAN.md` starts a review; `/markside PLAN.md`
still just opens the file. The CLI has not been published by this change.
`npx markside` is the intended npm invocation after publication. During
repository development, `node /absolute/path/to/markside/cli/markside.mjs`
can replace `markside` in every command.

```sh
markside review PLAN.md
markside comments PLAN.md
markside address PLAN.md c1 --reply "Clarified the scope."
```

The agent waits with a 600-second tool timeout. The CLI waits for 540 seconds by
default, exits 2 with `STILL_WAITING:`, and the agent reruns it until the user
sends comments or asks to stop. An existing pending request keeps its timestamp;
a send received between invocations is returned immediately. After all comments
are addressed or resolved, the next review creates a new pending request while
retaining the previous comments and replies. If the user resolves every comment
during a wait, the CLI exits 0 with `Review resolved for ...`.

## Shared contract

The path is `<document path>.review.json`, for example `docs/PLAN.md.review.json`.
`cli/review-file.mjs` validates the same contract in Node and the extension.

```json
{
  "version": 1,
  "doc": "PLAN.md",
  "docHash": "",
  "status": "pending",
  "requestedAt": "2026-10-18T12:00:00.000Z",
  "comments": []
}
```

On send, `status` becomes `sent`, `sentAt` is an ISO timestamp, and `docHash` is
64 lowercase hexadecimal characters containing the SHA-256 of the document's
exact bytes on disk. The extension refuses to send against an Unsaved Draft or
a document that changed since loading. The optional `note` field carries the
Review Note so existing overall guidance is not lost.

Each comment has `id`, `quote`, `line`, `body`, and `status`. `quote` is the exact
rendered text selected by the user. `line` is a one-based source block line from
Markside's renderer, or `null` for unanchored or removed passages. It is a hint;
the quote identifies the passage.

Comment status is `open`, `addressed`, or `resolved`. The agent uses
`markside address <file> <id> --reply "..."` to mark its work Addressed and record
a reply. This does not mean the user has accepted the change. The CLI rejects
`resolve`; only the reviewer resolves a comment in Markside.

Addressed cards stay in the Comments list with the reply and Resolve and Reopen
buttons. Resolve moves a comment into a collapsed Resolved group. Reopen moves
an addressed or resolved comment back to Open, preserving its reply for context.
It makes the request pending, so the user can add feedback before explicitly
sending it again. Resolving the final outstanding comment marks the file
`resolved`. All status changes use the remembered folder access and a staged
writable stream, leaving the Markdown file unchanged.

The extension refreshes results on explicit Reload and when Review is reopened.
Editing a comment hides the old result until that revision is addressed. Both
Addressed and Resolved comments retain the original quote as context and hide
the passage-not-found warning, Preview markers, and highlights. Open comments
keep their usual markers. Existing files with resolved comments remain readable.

The agent handoff sends the user's current Review Comments and Review Note.
Imported snapshot Review Rounds are omitted from this local handoff.

## File access and writes

`use-content-save` already gets writable document handles by traversing the
longest matching directory entry stored in IndexedDB. The directory API also
supports `getFileHandle(name, { create: true })` for sibling files. A document
handle alone does not grant sibling access.

The CLI creates the Review file before opening Chrome. The extension discovers
it through the existing local-file read relay on load and Review-panel open.
A pending request opens the panel once for that document. Sending uses the
stored directory permission, or the existing folder picker in read-write mode
when no saved directory contains the document. A wrong folder or denied
permission leaves the request and comments intact. Successful folder selection
is remembered using Markside's existing directory catalog.

The CLI writes a unique temporary sibling and renames it over the Review file.
Chrome cannot generally rename local files through `FileSystemHandle.move()`.
Its `createWritable()` stream stages writes and commits on `close()`, preserving
the complete-file handoff without an exposed rename API. See [Chrome's File
System Access documentation](https://developer.chrome.com/docs/capabilities/web-apis/file-system-access)
and [the File System standard](https://fs.spec.whatwg.org/#api-filesystemfilehandle-createwritable).

The CLI watches the parent directory so atomic inode replacement does not
strand a watcher on the old file. A one-second poll handles missed events and
unavailable watching. It closes watchers and timers on send, timeout, or signal.
No server, native messaging host, network request, or persistent process is used.
The prototype assumes one agent owns a document's Review at a time.

Use `*.review.json` in `.gitignore` to keep comments local. There is no global
`~/.markside` review directory.
