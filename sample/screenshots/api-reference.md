# API Reference

Base URL: `https://api.orbit.dev/v2`

All requests require `Authorization: Bearer <token>`.

---

## Jobs

### List jobs

```http
GET /jobs?status=running&limit=20
Authorization: Bearer <token>
```

**Query parameters**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `status` | `string` | all | `scheduled` · `running` · `success` · `failed` |
| `limit` | `int` | 20 | Results per page (max 100) |
| `cursor` | `string` | — | Pagination cursor |

**Response**

```http
HTTP/1.1 200 OK
Content-Type: application/json
X-RateLimit-Remaining: 847
```

### Create job

```http
POST /jobs
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "nightly-report",
  "command": "python report.py",
  "schedule": "0 0 * * *",
  "dependencies": ["daily-sync"],
  "retries": 3
}
```

**Error codes**

| Code | Error | Description |
|---|---|---|
| `400` | `INVALID_CRON` | Schedule expression is malformed |
| `400` | `CYCLE_DETECTED` | Dependency graph has a cycle |
| `409` | `NAME_CONFLICT` | Job name already exists |
| `422` | `UNKNOWN_DEPENDENCY` | Referenced job not found |

### Trigger job

```http
POST /jobs/:id/trigger
Authorization: Bearer <token>
```

Runs the job immediately, ignoring schedule.

### Delete job

```http
DELETE /jobs/:id
Authorization: Bearer <token>
```

---

## Webhooks

### Register webhook

```http
POST /webhooks
Content-Type: application/json

{
  "url": "https://your-app.com/hooks/orbit",
  "events": ["job.success", "job.failed"],
  "secret": "whsec_..."
}
```

### List webhooks

```http
GET /webhooks
Authorization: Bearer <token>
```

### Delete webhook

```http
DELETE /webhooks/:id
Authorization: Bearer <token>
```

---

## Rate Limits

| Plan | Requests/min | Concurrent jobs |
|---|---|---|
| Free | 60 | 2 |
| Pro | 1,000 | 20 |
| Enterprise | Custom | Custom |

Rate limit headers on every response:

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 847
X-RateLimit-Reset: 1745071260
```

---

## Errors

All errors follow the same shape:

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "error": "CYCLE_DETECTED",
  "message": "Job 'report' depends on 'sync', which depends on 'report'",
  "docs": "https://docs.orbit.dev/errors#CYCLE_DETECTED"
}
```
