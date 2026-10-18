# Orbit API

Lightweight job orchestration for distributed teams. Handles scheduling, dependency resolution, and real-time log streaming.

## Requirements

- Node.js 20+
- Redis 7+
- PostgreSQL 15+

## Installation

```bash
# Clone the repo
git clone https://github.com/your-org/orbit-api.git
cd orbit-api

# Install dependencies
pnpm install

# Copy environment config
cp .env.example .env
```

## Configuration

Edit `.env`:

```bash
DATABASE_URL=postgres://localhost:5432/orbit
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-here
WEBHOOK_SIGNING_KEY=whsec_your-key-here
PORT=3000
```

## Running

```bash
# Start development server (with hot reload)
pnpm dev

# Run database migrations
pnpm db:migrate

# Seed with sample data
pnpm db:seed

# Start worker process
pnpm worker
```

## Testing

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage report
pnpm test:coverage
```

## Deployment

```bash
# Build for production
pnpm build

# Run production server
NODE_ENV=production pnpm start

# Docker
docker build -t orbit-api .
docker run -p 3000:3000 --env-file .env orbit-api
```

## Project Structure

```
src/
  api/          HTTP handlers and routing
  scheduler/    Job dependency resolution (DAG)
  worker/       Job execution and retry logic
  webhooks/     Event delivery with HMAC signing
  db/           Postgres migrations and queries
  queue/        Redis Streams consumer group
tests/
  unit/
  integration/
docs/
```

## License

MIT
