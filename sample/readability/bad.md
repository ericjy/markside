# Rotating an API key

> Expected Readability Check results for each section, from Jev's raw 0 to 4 scores. Scores below 2.0 count as low. Values are in parentheses and were measured on 2026-09-23 with the rubric that counts "not X" framing and disclaimers against Naturalness and Conciseness. Scores near 2.0 can flip between runs of a changed rubric.

| Section | Main problem | Expected low | Expected fine |
| --- | --- | --- | --- |
| Introduction | Slogan opening and buzzword padding | <ul><li>Scannability (0.9)</li><li>Conciseness (1.7)</li><li>Naturalness (1.7)</li></ul> | <ul><li>Directness (2.0)</li><li>Simplicity (2.1)</li><li>Coherence (3.0)</li><li>Format Fit (3.5)</li></ul> |
| Background and context | Rambling, with the rotation triggers buried in one sentence | <ul><li>Scannability (0.4)</li><li>Conciseness (0.8)</li><li>Format Fit (1.6)</li><li>Directness (1.9)</li></ul> | <ul><li>Simplicity (2.1)</li><li>Naturalness (2.4)</li><li>Coherence (2.5)</li></ul> |
| The process | Dramatic fragments, then steps written as one long sentence | <ul><li>Scannability (0.5)</li><li>Format Fit (1.1)</li><li>Naturalness (1.3)</li><li>Conciseness (1.4)</li><li>Simplicity (1.8)</li></ul> | <ul><li>Coherence (2.1)</li><li>Directness (2.4)</li></ul> |
| Who can rotate a key | Contradictions and connectives that link nothing | <ul><li>Coherence (0.1)</li><li>Scannability (0.4)</li><li>Conciseness (1.0)</li><li>Format Fit (1.3)</li><li>Directness (1.6)</li><li>Simplicity (1.7)</li></ul> | <ul><li>Naturalness (2.8)</li></ul> |
| Limits | One run-on sentence that should be a table | <ul><li>Scannability (0.4)</li><li>Format Fit (1.2)</li><li>Simplicity (1.4)</li><li>Conciseness (1.5)</li><li>Naturalness (1.9)</li></ul> | <ul><li>Coherence (2.3)</li><li>Directness (2.4)</li></ul> |

## Introduction

It's not just about security, it's about trust. In today's fast-moving landscape, where organizations increasingly leverage a wide variety of cloud-native services and credentials, the practice of key rotation has emerged as one of the most important operational hygiene activities that any responsible engineering team might reasonably consider undertaking at some point.

## Background and context

Before getting into anything specific, it is worth saying a few words about keys in general. Keys are, at their core, strings. They are long strings, and they are strings that grant access. Access is a powerful thing. Historically, systems have used many kinds of credentials, including passwords, tokens, certificates, and keys, and each has its own history, and this history is interesting but beyond what we need here. A key in our context is the thing you put in the header. You might rotate a key when it leaks, or when someone leaves, or when it gets old, and by old we generally mean that it has been around for more than ninety days, although some teams prefer other numbers, and that is fine too, and also of course if a key shows up in a log or a commit or a chat message, which happens more than anyone likes to admit, then you should rotate it, and also if a teammate with access leaves.

## The process

Failure happens. It's not a question of if, it's a question of when. That's why rotation isn't a chore, it's a superpower.

So the first thing you will want to do, after having decided that rotating is the right move, is to remove the old key, because leaving it around is risky, and then make a new one under Settings, then API keys, naming it something with the date, and then go into every service that uses the key and swap the secret, and redeploy, and hope nothing breaks, and if things break, which they will if you removed the old key first, because the services still hold it, then you'll see 401 errors, which is when you should check the secrets against the new key, or make yet another key. Verify with the Last used column. Once that looks right, the rotation is done, and the old key has, in a sense, already been revoked, as mentioned.

## Who can rotate a key

Anyone on the team can rotate a key. Revoking is immediate, so the old key stays valid until Friday. Project owners are listed on the billing page, which is why the new key has a date in its name. Only admins can see the key list, so rotation is done by whoever wrote the service. That is also the reason keys expire after 90 days. It takes about 15 minutes, because the secret is stored in each service and the rate limit is shared. Rotation must be done by an admin. Audits happen quarterly, so nobody needs to rotate a key that leaked.

## Limits

There are limits, and these limits matter, and they interact with each other in ways that deserve care. You can have up to five active keys per project, but keys never expire, and when you revoke one it happens immediately with no delay at all, and rate limiting is shared, so a second key doesn't give you more capacity even though you might expect it to, since the rate limit applies to the project as a whole across every one of its keys, whichever key they use, which means capacity stays the same however many keys exist, and the five-key cap is separate from that.
