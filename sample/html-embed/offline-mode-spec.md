# Spec: Offline mode for Jot

**Status:** Proposed, ready for design review · **Owner:** Notes team ·
**Updated:** 2026-10-26 · **Ships in:** Jot 4.2 (iOS, Android, desktop)

## Summary

Jot should work the same with or without a connection. Every edit is saved on
the device first and synced when the device is back online. When two devices
change the same paragraph while one of them is offline, Jot keeps both versions
and asks the person to choose, instead of silently overwriting one.

## Problem

Today Jot needs a connection to save. On a plane, in the subway, or on hotel
Wi-Fi, the editor turns read-only and shows "Can't connect". People work around
it by writing in another app and pasting later, and some lose what they wrote.

- 14% of mobile sessions start without a connection.
- "Lost my notes" is the second most common support topic, and 70% of those
  tickets mention being offline.
- Last-write-wins sync silently drops one side of a conflict. Users only notice
  days later.

## Goals

1. Editing never blocks on the network, on any platform.
2. No edit is lost, including when two devices change the same note.
3. The interface stays calm: people should rarely need to think about sync.

**Not in scope:** real-time co-editing with presence and cursors, offline
attachments larger than 25 MB, and sharing or permissions changes while offline.

## How sync will work

Each note is split into paragraphs, and each paragraph has its own version
number. A device saves every edit locally, puts it in a queue, and sends the
queue in order whenever it has a connection. The cloud accepts an edit if it was
made on top of the latest version of that paragraph. Otherwise, it keeps both
versions and marks a conflict.

Because versions are tracked per paragraph, two people editing different parts
of a note never conflict. Watch the airplane scenario, or switch a device
offline and edit it yourself.

![Interactive model of two devices syncing a note through the cloud, including an offline phone that comes back with a conflict](./offline-mode-spec.assets/sync-model.html)

| Situation | What Jot does |
|---|---|
| Edit while online | Sends within about a second. Other devices update live. |
| Edit while offline | Saves on the device and adds the edit to the queue. |
| Several edits to one paragraph while offline | Sends only the latest one. |
| Different paragraphs changed on two devices | Merges both automatically. |
| Same paragraph changed on two devices | Keeps both versions and asks the person to choose. |

## Proposed UX

### Sync status

A single status in the toolbar replaces today's "Can't connect" banner. It
reassures first and never takes over the screen. The states cycle below; click a
tab to stay on one. Numbered callouts mark what changed.

![Annotated mockups of the sync status in four states: synced, offline, syncing, and needs review](./offline-mode-spec.assets/sync-status-ux.html)

### Reviewing a conflict

Selecting **Review** opens the conflicting paragraph in place, not in a separate
screen, so the rest of the note gives context. Each version shows which device
made it, when, and what changed from the version before it. The choice can be
undone, and the version that was not kept stays in the note's history.

![Clickable prototype of resolving a conflict: keep one version, keep both, or undo](./offline-mode-spec.assets/conflict-review.html)

## Edge cases

- **A conflict on a paragraph that is then deleted on one device.** The delete
  is treated as one more version, so the person can choose "deleted".
- **The queue grows very large.** After 30 days offline, Jot asks to connect
  before accepting more edits. The queue itself is never discarded.
- **The same account signs in on a new device while another is offline.** The
  new device sees the cloud's version. Queued edits merge in when the offline
  device reconnects.
- **App updated while edits are queued.** The queue format is versioned, and
  migrations run before sync resumes.

## Rollout

1. Internal dogfood for two weeks, with conflict telemetry only.
2. 10% of mobile users, behind the `offline-editing` flag.
3. Everyone, after conflict rates stay below 0.5% of synced notes for a week.

**Success measures:** "lost notes" tickets drop by 60%, and fewer than 1 in 200
synced notes ever reaches the review step.

## Open questions

- Should "Decide later" have a reminder, or rely on the toolbar status?
- Do we show conflicts from other people in shared notes the same way, or do
  they need a name and avatar on each version?
