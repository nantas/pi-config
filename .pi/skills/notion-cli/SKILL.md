---
name: notion-cli
description: Read, search, query, and edit Notion pages and databases via the ntn CLI. Use when user mentions Notion, asks to read/edit a Notion page, query a Notion database, or provides a notion.so URL.
---

# Notion CLI Skill

Wraps `ntn api` (Notion CLI) into focused scripts that handle URL resolution, authentication, and response flattening. All scripts output JSON to stdout; errors go to stderr as JSON.

## Prerequisites

- `ntn` CLI ≥ 0.16.0 installed and authenticated via `ntn login` (keychain OAuth)
- No `NOTION_API_TOKEN` env var needed — scripts strip it to ensure keychain auth is used

## Scripts

All scripts live in `scripts/` under this skill directory. Call them via full path or add the directory to PATH.

### ntn-resolve — URL / keyword → structured metadata

```
ntn-resolve --url <notion_url>        # Resolve a Notion URL
ntn-resolve --search <keyword>        # Search by title
ntn-resolve --search <keyword> --type data_source  # Filter by type
ntn-resolve <raw_id>                  # Resolve a raw ID
```

Output: JSON array of `{type, id, title, url, data_sources?, view_id?}`.

Resolution order for URLs: pages → databases → data_sources. Databases include their `data_sources` array.

### ntn-read — Read page as markdown

```
ntn-read <page_id_or_url>
```

Output: `{id, title, markdown, truncated, unknown_block_ids}`.

Uses the `v1/pages/{id}/markdown` endpoint. Returns the full page content as enhanced markdown in one call.

### ntn-schema — Show data_source property structure

```
ntn-schema <data_source_id_or_url>          # Summary: name + type + options
ntn-schema <data_source_id_or_url> --all    # Full schema with IDs and descriptions
```

Output: `{id, title, properties: {name: {type, options?}}}`.

Accepts data_source ID, database ID, or URL. If a database ID is given, uses its first data_source.

### ntn-query — Query data_source rows (flattened)

```
ntn-query <data_source_id_or_url>                          # All rows (first 100)
ntn-query <id> --filter '<notion_filter_json>'             # With filter
ntn-query <id> --sorts '<notion_sorts_json>'               # With sort
ntn-query <id> --limit 20                                  # Page size
ntn-query <id> --all                                       # Auto-paginate all results
```

Output: `{data_source_id, has_more, next_cursor, count, results: [{id, prop1: value, ...}]}`.

All property values are flattened to plain values (strings, numbers, lists). Use `ntn-schema` first to understand property types before constructing filters.

### ntn-edit — Search-and-replace page edits (markdown)

```
ntn-edit <page_id_or_url> --old "old text" --new "new text"       # Single replace
ntn-edit <page_id_or_url> --old "text" --new "text" --replace-all # All occurrences
ntn-edit <page_id_or_url> --ops edits.json                        # Batch from file
```

The `edits.json` format: `[{"old": "...", "new": "...", "replace_all": false}, ...]`

Output: `{id, truncated, changes}`.

Uses `update_content` — the recommended Notion API edit mode. For large content swaps, use `ntn-write --replace`.

### ntn-write — Update properties or append/replace content

```
ntn-write <page_id_or_url> --set '{"Status": "done", "Priority": 2}'
ntn-write <page_id_or_url> --append "## New Section\n\nContent here."
ntn-write <page_id_or_url> --replace "## Replaced\n\nAll new content."
```

`--set` auto-translates plain values to Notion API format based on the data_source schema.

## Workflow Guide

### Reading a page from URL

```
1. ntn-read "https://app.notion.com/p/veewo/37c63e9b..."
   → Returns {markdown: "...", truncated: false}
2. If truncated, use unknown_block_ids to fetch missing sections
```

### Querying a database from URL

```
1. ntn-resolve --url "https://app.notion.com/p/veewo/2ed63e9b...?v=..."
   → Returns {type: "database", data_sources: [{id: "...", name: "..."}]}
2. ntn-schema <data_source_id>
   → Returns property names, types, and select options
3. ntn-query <data_source_id> --filter '{"property":"Status","status":{"equals":"done"}}'
   → Returns flattened rows
```

### Editing a long page

```
1. ntn-read <page_id> → get full markdown
2. Identify sections to change
3. ntn-edit <page_id> --old "exact old text" --new "new text"
   → For multiple changes, write a JSON file and use --ops
```

## Key Concepts

- **Database ≠ Data Source**: A database is a container with one or more data sources. Always query `data_sources`, not `databases`.
- **URL format**: `/p/{workspace}/{id}` for both pages and databases. Use `ntn-resolve` to determine the type.
- **Error format**: All errors are JSON on stderr: `{"error": "message"}`. Pass these through to the user.

## Extending This Skill

This skill is designed for incremental improvement. When you encounter repeated friction patterns (e.g. a new property type not handled, a common multi-step workflow that should be one command), follow these steps:

1. **Identify the friction**: Note what the agent consistently gets wrong or takes too many steps to accomplish.
2. **Read the existing scripts**: Scripts are in `.pi/skills/notion-cli/scripts/` (source) synced to `~/.pi/agent/skills/notion-cli/scripts/` (runtime). All share `ntn_resolve.py` for common utilities.
3. **Add or modify a script**: Keep scripts focused — one responsibility per script. Use the shared library for URL resolution, API calls, and property flattening.
4. **Update this SKILL.md**: Add the new script to the Scripts section and add relevant workflow examples.
5. **Test with a live Notion page/database**: Verify with real data before committing.

Common extension candidates:
- **ntn-create**: Create new pages in a data_source (row creation)
- **ntn-move**: Move pages between databases
- **ntn-batch-edit**: Multi-page property updates
- Improved filter DSL for `ntn-query`
- Schema caching to reduce API calls
