# How the Review loop works

Markside lets you review an agent's document the way you would review a
colleague's: you point at passages, the agent changes the file, and you check
the result. Nothing is synced or uploaded. Two local files carry the whole
conversation: the document itself and a `.review.json` file beside it.

## One round, step by step

Press play, or step through with the arrow keys after clicking the diagram.

![The Review loop animated across three lanes: you in Markside, the Review file, and the agent](./review-loop.explain.assets/review-loop.html)

The agent never sees your browser. It only waits for the Review file to change,
which is why the loop works the same with Claude Code, Codex, or Cursor.

## What each side may change

| | Document | Review file |
|---|---|---|
| You, in Markside | Only by saving edits yourself | Add comments, send, resolve, finish |
| The agent | Edits the text and any HTML Embeds | Marks comments addressed and replies |

Only you resolve a comment. "Addressed" means the agent thinks it is done;
"Resolved" means you agree.

## Why the visuals above cannot phone home

The diagram is an HTML Embed: a separate HTML file shown in place. Its scripts
run, but several layers stand between it and the network. Turn layers off to
see which requests each one stops.

![Sandbox simulation: requests from an embed bounce off the content policy, the page's frame policy, and the sandbox; only WebRTC gets through](./review-loop.explain.assets/sandbox-layers.html)

WebRTC is the one channel Chrome cannot close for a frame whose scripts run.
It can carry only what the embed already contains and your IP address, the same
exposure a remote image in Markdown has.
