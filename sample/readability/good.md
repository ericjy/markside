# Rotating an API key

Rotate a key by creating a new one, switching your services to it, and revoking the old one. Plan for about 15 minutes. Rotation causes no downtime if you follow the order below.

## When to rotate

Rotate a key in any of these cases:

- It appeared in a log, a commit, or a chat message.
- A teammate with access has left.
- It is older than 90 days.

## Steps

1. Create a new key in **Settings → API keys**. Name it with today's date, such as `prod-2026-09-23`.
2. Update the `API_KEY` secret in each service that uses the key.
3. Redeploy those services.
4. Check that requests succeed. The **Last used** column in the key list shows a fresh timestamp for the new key.
5. Revoke the old key.

Revoke last. If you revoke first, every service still using the old key starts failing immediately.

## If requests start failing

Requests that fail with `401 Unauthorized` after step 3 mean a service still has the old key or a mistyped new one. Compare the secret against the new key. Do not revoke the old key until every service passes.

If you have already revoked it, create another new key and repeat steps 2 to 4.

## Key limits

| Limit | Value |
| --- | --- |
| Active keys per project | 5 |
| Key lifetime | No expiry |
| Revocation delay | Immediate |
| Rate limit | Shared across all keys in a project |

Because the rate limit is shared, a second key does not raise your capacity.
