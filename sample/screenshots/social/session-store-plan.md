# Plan: Move sessions to a server-side store

Sessions currently live in a signed cookie. The cookie has grown to 3.8 KB, close to the 4 KB browser limit, and we cannot revoke a session before it expires. This plan moves session data into Postgres and leaves only an opaque session ID in the cookie.

> [!NOTE]
> Written by the coding agent from the issue thread. Comment on anything that looks wrong before I start.

## Goal

- The cookie holds a 32-byte random ID and nothing else
- Signing out on one device can revoke every other session
- No user is signed out during the migration

## Steps

1. **Add the `sessions` table.** One row per session, keyed by a hash of the ID so a database leak does not expose live sessions.

   ```sql
   create table sessions (
     id_hash     bytea primary key,
     user_id     bigint not null references users(id),
     data        jsonb not null default '{}',
     created_at  timestamptz not null default now(),
     last_seen   timestamptz not null default now(),
     revoked_at  timestamptz
   );
   create index sessions_user on sessions (user_id) where revoked_at is null;
   ```

2. **Read from both places.** `loadSession()` checks for a session ID first and falls back to the old signed cookie. This should be fine for a week or so.
3. **Write only to the new store.** On the next request after deploy, an old cookie is converted: we insert a row and replace the cookie with an ID.
4. **Add "Sign out everywhere"** to the account page. It sets `revoked_at` for every session of the user.
5. **Remove the fallback** once fewer than 1% of requests carry an old cookie.

## Changes

```diff
  export async function loadSession(req: Request): Promise<Session | null> {
-   return verifySignedCookie(req.cookies.session)
+   const id = req.cookies.sid
+   if (id) return sessions.findActive(hashId(id))
+   const legacy = verifySignedCookie(req.cookies.session)
+   return legacy ? sessions.migrate(legacy) : null
  }
```

## Risks

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| Every request now hits Postgres | High | Cache active sessions in memory for 30 seconds |
| Two tabs convert the same cookie at once | Medium | Insert with `on conflict do nothing` |
| Table grows without bound | Low | Nightly job deletes rows idle for 90 days |

> [!WARNING]
> A 30-second cache means a revoked session can keep working for up to 30 seconds on another server.

## Verification

- [ ] Unit tests for `migrate()` with valid, expired, and tampered cookies
- [ ] Load test at 2× peak traffic with the cache disabled
- [ ] Manually sign out everywhere from a second browser
