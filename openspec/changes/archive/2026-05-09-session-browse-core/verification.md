# Verification

## Spec-to-Implementation Traceability

### session-index-engine

| Requirement | Implementation | Evidence |
|-------------|---------------|----------|
| sqlite-schema-creation | `indexer.ts`: `createSchema()` — creates sessions, session_fts (FTS5 porter unicode61), entries tables | `getDb()` creates `~/.pi/session-browse/index.db` with WAL mode, all 3 tables verified |
| jsonl-session-discovery | `indexer.ts`: `findSessionFiles()` → `discoverJsonlRecursive()` | Discovered 197 JSONL files across multiple project directories |
| per-entry-content-extraction | `indexer.ts`: `extractEntriesFromJsonl()` → `extractFromEntry()` | User text full, asst text full, toolCall name+args, toolResult truncated 2000, thinking skipped |
| incremental-indexing | `indexer.ts`: `updateIndex()` | First run: 7 new files indexed. Second run: 190 skipped (mtime unchanged) |
| full-text-search | `indexer.ts`: `search()` + `sanitizeTokens()` | Search "architecture" → 30 BM25 hits. Special chars handled gracefully |
| recent-sessions-list | `indexer.ts`: `listRecent()` | Returns 197 sessions ordered by session_ts DESC |
| index-rebuild | `indexer.ts`: `rebuildIndex()` | Clears all tables + full re-index |

### session-retrieval-tools

| Requirement | Implementation | Evidence |
|-------------|---------------|----------|
| session-search-tool | `index.ts`: `registerTool("session-search")` with TypeBox schema | Formats output as `[timestamp] role id=entry_id \| snippet` |
| session-expand-tool | `index.ts`: `registerTool("session-expand")` + `expander.ts` | Turn expansion: backward to user → forward to next user. Excludes toolResult (Design D6) |
| session-read-tool | `index.ts`: `registerTool("session-read")` + `findJsonlEntry()` / `readHtmlEntry()` | Reads raw entry content, supports max_chars truncation, handles both JSONL and HTML |
| tool-error-handling | All three tools: try/catch wrapping, structured error returns | file_not_found, entry_not_found, index-not-initialized handled gracefully |

### html-export-support

| Requirement | Implementation | Evidence |
|-------------|---------------|----------|
| html-file-discovery | `indexer.ts`: `findSessionFiles()` scans `.pi/sessions/` for `.html` | HTML dirs scanned alongside JSONL |
| html-data-extraction | `html-parser.ts`: `parseHtmlExport()` — indexOf + slice extraction | Parsed 440 entries from chrome-agent HTML export |
| html-entries-feed-into-index-engine | `html-parser.ts`: `extractEntriesFromHtml()` → same pipeline | 424 message entries extracted, same extraction rules as JSONL |
| html-read-support | `html-parser.ts`: `readHtmlEntry()` | Read specific entry by ID from HTML file |
| html-no-resume | ⚠️ Deferred to Change 2 | No resume entry point in Change 1; error guard will be added when resume is implemented |

## Task-to-Evidence Mapping

| Task | Status | Evidence |
|------|--------|----------|
| 1.1–1.4 Spec coverage confirmation | ✅ | All requirements mapped to implementation |
| 2.1.1 Project structure | ✅ | `.pi/extensions/session-browse/` with package.json, npm install successful |
| 2.2.1 Type definitions | ✅ | `types.ts` with all required interfaces |
| 2.3.1–2.3.7 Index engine | ✅ | All functions implemented and tested |
| 2.4.1–2.4.2 HTML parsing | ✅ | Both functions tested against real HTML export |
| 2.5.1 Turn expansion | ✅ | E2E test: search → expand returned full turn context |
| 2.6.1–2.6.4 Extension entry | ✅ | `pi -e` loads without errors, global dedup works |
| 4.1 Extension load test | ✅ | `pi -e .pi/extensions/session-browse/` — no errors |
| 4.2 Hot reload dedup | ✅ | Global dedup marker prevents double registration |
| 4.3 E2E retrieval workflow | ✅ | search(30 hits) → expand(turn with 4 entries) → read(entry found) |
| 4.4 HTML export indexing | ✅ | Parsed 440 entries, extracted 424, read by entry_id |

## Verification Environment

- **Date**: 2026-05-09
- **Node**: v24.13.0
- **OS**: macOS (ARM)
- **better-sqlite3**: v11.x (compiled successfully)
- **Test data**: 197 JSONL sessions + 1 HTML export

## Open Items

- **html-no-resume (W2)**: Change 2 添加 Session Resume 功能时，必须在 HTML 路径上返回错误信息 "Resume is only supported for JSONL session files."。当前 Change 1 无 resume 入口点，不构成用户可触发的缺陷。
