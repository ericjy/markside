# git merge vs git rebase

Both commands bring the work from one branch into another. The code you end up
with is the same. What differs is the history you leave behind.

![git merge and git rebase animated side by side on the same two branches](./merge-vs-rebase.assets/merge-vs-rebase.html)

## Merge

- Adds one new commit with two parents.
- Never changes an existing commit, so it is always safe on a shared branch.
- History shows exactly when work forked and joined, which can make
  `git log --graph` busy.

## Rebase

- Copies your commits onto the new base. The copies get new hashes.
- History reads as one straight line, which is easier to review and to search
  with `git bisect`.
- Rewrites commits. Anyone who already pulled the old ones now has a history
  that no longer matches yours.

| | Merge | Rebase |
|---|---|---|
| Changes existing commits | No | Yes, it replaces them with copies |
| Shape of history | A graph with merge commits | A straight line |
| Conflicts | Resolved once, in the merge commit | Possibly once per replayed commit |
| Safe on a shared branch | Yes | No |

## Rule of thumb

> Rebase your own branch to tidy it up. Merge anything other people already
> have.

```bash
# Bring your feature branch up to date before opening a pull request
git switch feature
git fetch origin
git rebase origin/main

# Already pushed the branch? Overwrite it, but only if nobody else pushed to it
git push --force-with-lease
```
