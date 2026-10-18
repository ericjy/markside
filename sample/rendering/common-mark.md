# Markside Test File

A comprehensive test of every markdown element and code block language the renderer supports.

---

## Typography

Regular paragraph with **bold text**, *italic text*, ~~strikethrough~~, and `inline code`. You can also combine **_bold italic_** and `code with backticks`.

> This is a blockquote. It can span multiple lines and contain **bold**, *italic*, and other inline formatting.
>
> Second paragraph inside the blockquote.

> Nested blockquotes:
> > This is a nested blockquote.
> > > And one level deeper.

---

## Headings

# H1 Heading
## H2 Heading
### H3 Heading
#### H4 Heading
##### H5 Heading
###### H6 Heading

---

## Lists

### Unordered

- Item one
- Item two
  - Nested item A
  - Nested item B
    - Deeply nested
- Item three

### Ordered

1. First item
2. Second item
   1. Nested ordered
   2. Another nested
3. Third item

### Task List

- [x] Completed task
- [x] Another done item
- [ ] Pending task
- [ ] Not started yet

---

## Links & Images

[Visit GitHub](https://github.com)  
[Relative link to README](./README.md)  
Auto-linked URL: https://example.com

---

## Tables

| Language   | Paradigm       | Typing   | Year |
|------------|----------------|----------|------|
| TypeScript | Multi-paradigm | Static   | 2012 |
| Python     | Multi-paradigm | Dynamic  | 1991 |
| Rust       | Systems        | Static   | 2015 |
| Go         | Concurrent     | Static   | 2009 |
| Haskell    | Functional     | Static   | 1990 |

Aligned columns:

| Left-aligned | Center-aligned | Right-aligned |
|:-------------|:--------------:|--------------:|
| foo          | bar            | baz           |
| longer text  | centered       |         42    |

---

## Code Blocks

### TypeScript

```typescript
interface User {
  id: number
  name: string
  email: string
  role: "admin" | "user" | "guest"
}

async function fetchUser(id: number): Promise<User> {
  const res = await fetch(`/api/users/${id}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<User>
}

const formatName = (user: User): string =>
  `${user.name} <${user.email}>`
```

### TSX / React

```tsx
import { useState, useEffect } from "react"

interface Props {
  userId: number
  onLoad?: (user: User) => void
}

export function UserCard({ userId, onLoad }: Props) {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    fetchUser(userId).then((u) => {
      setUser(u)
      onLoad?.(u)
    })
  }, [userId])

  if (!user) return <div className="skeleton h-12 w-full rounded" />

  return (
    <div className="flex items-center gap-3 rounded-lg border p-4">
      <div className="h-10 w-10 rounded-full bg-purple-100 grid place-items-center">
        {user.name[0]}
      </div>
      <div>
        <p className="font-medium">{user.name}</p>
        <p className="text-sm text-muted-foreground">{user.email}</p>
      </div>
    </div>
  )
}
```

### JavaScript

```javascript
const debounce = (fn, delay) => {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

const search = debounce(async (query) => {
  const results = await fetch(`/search?q=${encodeURIComponent(query)}`)
    .then(r => r.json())
  console.log(results)
}, 300)

document.querySelector('#input').addEventListener('input', e => {
  search(e.target.value)
})
```

### Python

```python
from dataclasses import dataclass
from typing import Optional
import httpx

@dataclass
class Config:
    base_url: str
    api_key: str
    timeout: float = 30.0

async def fetch_completion(
    prompt: str,
    config: Config,
    model: str = "claude-sonnet-4-6",
    max_tokens: Optional[int] = None,
) -> str:
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{config.base_url}/messages",
            headers={"x-api-key": config.api_key},
            json={
                "model": model,
                "max_tokens": max_tokens or 1024,
                "messages": [{"role": "user", "content": prompt}],
            },
            timeout=config.timeout,
        )
        response.raise_for_status()
        return response.json()["content"][0]["text"]
```

### Bash / Shell

```bash
#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${1:-.}"
BRANCH=$(git -C "$REPO_DIR" rev-parse --abbrev-ref HEAD)
DIRTY=$(git -C "$REPO_DIR" status --porcelain | wc -l | tr -d ' ')

echo "Branch: $BRANCH"
echo "Uncommitted changes: $DIRTY"

if [[ "$DIRTY" -gt 0 ]]; then
  echo "⚠ Working tree is dirty"
  git -C "$REPO_DIR" status --short
fi

# Run tests if on main
if [[ "$BRANCH" == "main" ]]; then
  echo "Running full test suite..."
  pnpm test --reporter=verbose
fi
```

### Go

```go
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"
)

type Response struct {
	Message string    `json:"message"`
	At      time.Time `json:"at"`
}

func handler(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	select {
	case <-ctx.Done():
		http.Error(w, "timeout", http.StatusGatewayTimeout)
	default:
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(Response{
			Message: "hello",
			At:      time.Now().UTC(),
		})
	}
}

func main() {
	http.HandleFunc("/", handler)
	fmt.Println("Listening on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
```

### Rust

```rust
use std::collections::HashMap;

#[derive(Debug, Clone)]
struct Cache<V> {
    store: HashMap<String, V>,
    max_size: usize,
}

impl<V: Clone> Cache<V> {
    fn new(max_size: usize) -> Self {
        Self {
            store: HashMap::new(),
            max_size,
        }
    }

    fn get(&self, key: &str) -> Option<&V> {
        self.store.get(key)
    }

    fn insert(&mut self, key: String, value: V) -> bool {
        if self.store.len() >= self.max_size {
            return false;
        }
        self.store.insert(key, value);
        true
    }
}

fn main() {
    let mut cache: Cache<i32> = Cache::new(3);
    cache.insert("a".to_string(), 1);
    cache.insert("b".to_string(), 2);
    println!("{:?}", cache.get("a"));
}
```

### SQL

```sql
WITH monthly_revenue AS (
  SELECT
    date_trunc('month', created_at)  AS month,
    SUM(amount_cents) / 100.0        AS revenue,
    COUNT(DISTINCT user_id)          AS paying_users
  FROM payments
  WHERE
    status = 'completed'
    AND created_at >= NOW() - INTERVAL '12 months'
  GROUP BY 1
),
ranked AS (
  SELECT
    *,
    LAG(revenue) OVER (ORDER BY month) AS prev_revenue
  FROM monthly_revenue
)
SELECT
  month,
  revenue,
  paying_users,
  ROUND(
    (revenue - prev_revenue) / NULLIF(prev_revenue, 0) * 100, 1
  ) AS mom_growth_pct
FROM ranked
ORDER BY month;
```

### JSON

```json
{
  "name": "markside",
  "version": "1.0.0",
  "description": "Beautiful markdown viewer",
  "scripts": {
    "dev": "plasmo dev",
    "build": "plasmo build"
  },
  "features": {
    "syntaxHighlighting": true,
    "darkMode": true,
    "outline": true,
    "themes": ["github-light", "github-dark"]
  },
  "supportedLanguages": [
    "typescript", "tsx", "javascript", "jsx",
    "python", "bash", "go", "rust", "sql",
    "json", "css", "html", "yaml", "markdown"
  ]
}
```

### YAML

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20, 22]

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: pnpm

      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm test --reporter=verbose
```

### CSS

```css
:root {
  --color-primary: oklch(60% 0.2 250);
  --color-surface: oklch(98% 0 0);
  --radius-md: 0.5rem;
  --shadow-sm: 0 1px 3px oklch(0% 0 0 / 0.1);
}

.card {
  background: var(--color-surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  padding: 1.5rem;
  transition: box-shadow 200ms ease;
}

.card:hover {
  box-shadow: 0 4px 12px oklch(0% 0 0 / 0.15);
}

@media (prefers-reduced-motion: reduce) {
  .card {
    transition: none;
  }
}
```

### HTML

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Example</title>
  <link rel="stylesheet" href="/style.css" />
</head>
<body>
  <header class="site-header">
    <nav aria-label="Main navigation">
      <a href="/" class="logo">Markside</a>
      <ul role="list">
        <li><a href="/docs">Docs</a></li>
        <li><a href="/about">About</a></li>
      </ul>
    </nav>
  </header>
  <main id="content">
    <h1>Hello, world!</h1>
  </main>
  <script type="module" src="/app.js"></script>
</body>
</html>
```

### Markdown (meta!)

```markdown
# Nested Markdown Example

This is a **markdown** code block inside a markdown file.

- Bullet one
- Bullet two

> A blockquote inside a code block.

```ts
const hello = "world"
```
```

### TOML

```toml
[package]
name = "my-crate"
version = "0.1.0"
edition = "2021"
authors = ["Eric <eric@example.com>"]
description = "A fast CLI tool"

[dependencies]
serde = { version = "1", features = ["derive"] }
tokio = { version = "1", features = ["full"] }
clap = { version = "4", features = ["derive"] }

[profile.release]
opt-level = 3
lto = true
codegen-units = 1
strip = true
```

### Diff

```diff
- const old = "highlight.js"
+ const new = "shiki"

  function renderMarkdown(content: string) {
-   return hljs.highlightAuto(content).value
+   return highlightCodeBlocks(content)
  }
```

---

## Horizontal Rules

Three ways:

### Way 1
---

### Way 2
***

### Way 3
___

---

## Footnotes

Here's a statement with a footnote.[^1]

Another claim.[^note]

[^1]: This is the first footnote.
[^note]: Footnotes can have any label.

---

## Inline HTML

### Accordian / Expandable
<details>
<summary>Click to expand</summary>

Some hidden content. Works in most markdown renderers.

</details>

### Keyboard
Press <kbd>Cmd</kbd> + <kbd>P</kbd>

### Highlight
This is <mark>important</mark>.

---

## Long code block (scroll test)

```typescript
// This block is intentionally wide to test horizontal scrolling
export const createSlice = <S, A extends Record<string, (state: S, payload: any) => S>>(initialState: S, reducers: A) => {
  type ActionTypes = { [K in keyof A]: A[K] extends (state: S, payload: infer P) => S ? { type: K; payload: P } : never }[keyof A]

  const reducer = (state: S = initialState, action: ActionTypes): S => {
    const handler = reducers[action.type as keyof A]
    return handler ? handler(state, (action as any).payload) : state
  }

  const actions = Object.keys(reducers).reduce((acc, key) => {
    acc[key as keyof A] = (payload: any) => ({ type: key, payload })
    return acc
  }, {} as { [K in keyof A]: (payload: Parameters<A[K]>[1]) => { type: K; payload: Parameters<A[K]>[1] } })

  return { reducer, actions }
}
```

---

*End of test file. If everything looks good, Markside is working correctly.*
