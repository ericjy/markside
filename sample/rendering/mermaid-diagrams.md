---
title: Diagram Tests
description: Mermaid diagram examples for testing rendering
---

# Diagram Tests

Test file for Mermaid diagram rendering.

## Flowchart

```mermaid
flowchart TD
    A([Open .md file]) --> B{Extension active?}
    B -- No --> C[Show raw text]
    B -- Yes --> D[Fetch content via background]
    D --> E[Parse frontmatter]
    E --> F[Render markdown]
    F --> G[Highlight code blocks]
    G --> H[Extract headings]
    H --> I([Show three-panel layout])
```

## Sequence Diagram

```mermaid
sequenceDiagram
    participant Browser
    participant ContentScript as Content Script
    participant Background as Background SW
    participant FileSystem as File System

    Browser->>ContentScript: Page load (file://*.md)
    ContentScript->>Background: sendMessage fetch-file
    Background->>FileSystem: fetch(file:// URL)
    FileSystem-->>Background: raw text
    Background-->>ContentScript: { text }
    ContentScript->>ContentScript: parseFrontmatter()
    ContentScript->>ContentScript: md.render()
    ContentScript->>ContentScript: highlightCodeBlocks()
    ContentScript-->>Browser: Render layout
```

## State Diagram

```mermaid
stateDiagram-v2
    [*] --> loading: mount
    loading --> idle: no saved handle
    loading --> prompt: handle found, permission expired
    loading --> granted: handle found, permission ok

    idle --> granted: user opens folder
    prompt --> granted: user re-authorizes
    granted --> prompt: browser restarted

    granted --> granted: user changes folder
```

## Entity Relationship

```mermaid
erDiagram
    DIRECTORY_ENTRY {
        FileSystemDirectoryHandle handle
        string rootUrl
    }
    FILE_NODE {
        string name
        string path
        FileSystemFileHandle handle
    }
    DIR_NODE {
        string name
        string path
        FileSystemDirectoryHandle handle
        TreeNode[] children
    }
    DIRECTORY_ENTRY ||--o{ FILE_NODE : contains
    DIRECTORY_ENTRY ||--o{ DIR_NODE : contains
    DIR_NODE ||--o{ FILE_NODE : contains
    DIR_NODE ||--o{ DIR_NODE : contains
```

## Git Graph

```mermaid
gitGraph
    commit id: "initial"
    branch feature/sidebar-redesign
    checkout feature/sidebar-redesign
    commit id: "add deriveRootUrl"
    commit id: "add IndexedDB wrapper"
    commit id: "add usePersistedDirectory"
    commit id: "add SidebarLeft"
    commit id: "add SidebarRight onHeadingClick"
    commit id: "rename to markside.tsx"
    commit id: "remove tab UI"
    checkout main
    merge feature/sidebar-redesign
```

## Pie Chart

```mermaid
pie title Markside File Types
    "Components" : 5
    "Hooks" : 3
    "Lib utilities" : 5
    "Content scripts" : 1
    "Background" : 1
```

## Animated Edges

Give an edge an ID with `id@-->`, then set `animate` on it. `animation` accepts `slow` or `fast` and defaults to `fast`.

```mermaid
flowchart LR
  A("Client") r1@-->|Request| B["Ingress"]
  B r2@--> C["Service"]
  C r3@-->|Query| D[("Database")]
  r1@{ animate: true, animation: slow }
  r2@{ animate: true }
  r3@{ animate: true, animation: fast }
```
