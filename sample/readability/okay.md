# Rotating an API key

Expected Readability Check results for each section, from Jev's raw 0 to 4 scores. Scores below 2.0 count as low. Values are in parentheses and were measured on 2026-09-23. Scores near 2.0 can flip between runs of a changed rubric.

| Section | Main problem | Expected low | Expected fine |
| --- | --- | --- | --- |
| Introduction | Point delayed by a slogan-style opening and some padding | <ul><li>Scannability (1.5)</li></ul> | <ul><li>Conciseness (2.5)</li><li>Format Fit (2.4)</li><li>Directness (3.3)</li><li>Coherence (3.5)</li><li>Naturalness (3.0)</li><li>Simplicity (3.9)</li></ul> |
| When to rotate | A list written as one sentence, with a hedge | <ul><li>Scannability (1.6)</li><li>Format Fit (1.9)</li></ul> | <ul><li>Conciseness (2.8)</li><li>Coherence (3.3)</li><li>Simplicity (3.7)</li><li>Naturalness (3.8)</li><li>Directness (3.9)</li></ul> |
| Steps | Clear steps, with one "not just" disclaimer and some filler | None | <ul><li>Naturalness (2.8)</li><li>Scannability (3.0)</li><li>Conciseness (3.2)</li><li>Directness (3.5)</li><li>Format Fit (3.5)</li><li>Coherence (3.8)</li><li>Simplicity (3.9)</li></ul> |
| If something goes wrong | One long sentence with a dash aside | <ul><li>Scannability (1.3)</li><li>Format Fit (1.9)</li></ul> | <ul><li>Naturalness (2.8)</li><li>Simplicity (2.8)</li><li>Conciseness (2.9)</li><li>Coherence (3.3)</li><li>Directness (3.3)</li></ul> |
| Limits | Three facts packed into one sentence | <ul><li>Scannability (1.3)</li></ul> | <ul><li>Format Fit (2.4)</li><li>Coherence (3.4)</li><li>Simplicity (3.8)</li><li>Directness (3.8)</li><li>Conciseness (3.9)</li><li>Naturalness (4.0)</li></ul> |

## Introduction

Rotating an API key is one of those routine security practices that every team should build into its regular workflow, and although it is often postponed, it is not difficult. In short, it means creating a new key, moving your services over to it, and then revoking the old one. It usually takes about 15 minutes, and if you follow the steps below in order there is no downtime.

## When to rotate

You should rotate a key whenever it shows up in a log, a commit, or a chat message, when a teammate who had access leaves the team, or when it is more than 90 days old. Of course, these are only guidelines, and some teams choose to rotate more often than that, depending on how sensitive their data happens to be.

## Steps

1. Open **Settings > API keys** and create a new key. It is a good idea to put the date in the name so that you can tell your keys apart later on.
2. In every service that uses the key, replace the secret with the new value and redeploy. Depending on how your deployment works, this may take a few minutes.
3. Check the **Last used** column to make sure the new key is actually being used.
4. Revoke the old key.

Revoke the old key last. This is not just a matter of preference; if you revoke it first, every service that still holds it will start failing immediately.

## If something goes wrong

If a service returns `401` errors after step 2 — and this is the most common problem — it usually means that the secret was not updated or was mistyped, so it is worth comparing it against the new key before you do anything else, and you shouldn't revoke the old one until every service passes. If you have already revoked it, create another key and repeat steps 2 to 4.

## Limits

Each project can have up to five active keys, keys do not expire, and revoking a key takes effect immediately. The rate limit is shared across all keys in a project, so adding a second key does not give you more capacity.
