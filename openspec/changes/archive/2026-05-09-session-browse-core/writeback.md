# Writeback

## Target: `.pi/capabilities.yaml`

### Operation: Append to `global.extensions`

```yaml
- id: session-browse
  path: .pi/extensions/session-browse
  description: "Session browse extension — FTS5 full-text search and retrieval tools for historical Pi sessions"
  files:
    - .pi/extensions/session-browse/package.json
    - .pi/extensions/session-browse/index.ts
    - .pi/extensions/session-browse/indexer.ts
    - .pi/extensions/session-browse/expander.ts
    - .pi/extensions/session-browse/html-parser.ts
    - .pi/extensions/session-browse/types.ts
```

### Field Mapping

| Field | Value |
|-------|-------|
| `id` | `session-browse` |
| `path` | `.pi/extensions/session-browse` |
| Scope | global |
| Dependencies | `better-sqlite3` (native), `@sinclair/typebox` (peer) |

## New Files (Change 1)

1. `.pi/extensions/session-browse/package.json` — Extension manifest with dependencies
2. `.pi/extensions/session-browse/index.ts` — Extension entry (3 tools, global dedup, shutdown handler)
3. `.pi/extensions/session-browse/indexer.ts` — FTS5 index engine (SQLite, discovery, extraction, search)
4. `.pi/extensions/session-browse/expander.ts` — Turn expansion algorithm
5. `.pi/extensions/session-browse/html-parser.ts` — HTML export parser (base64 decode, entry extraction)
6. `.pi/extensions/session-browse/types.ts` — Shared TypeScript type definitions

## Sync Command

```bash
./scripts/sync-pi-agent.sh
```

This will copy the extension to `~/.pi/agent/extensions/session-browse/` and install npm dependencies.

## Data Storage

- **Index DB**: `~/.pi/session-browse/index.db` (created at runtime, not synced)
- **Estimated size**: ~30MB per 100 sessions
