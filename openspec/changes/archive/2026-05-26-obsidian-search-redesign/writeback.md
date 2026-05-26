# Writeback Plan

## Targets

### 1. docs/plans/obsidian-search-issue-report.md
**Action**: Update conclusion chapter
**Content**: Confirm root cause is "upstream Obsidian CLI bug + fallback rg defects". Add reference to this change.
**Status**: Ready

### 2. docs/plans/obsidian-search-redesign.md
**Action**: Create new document
**Content**: Summary of the redesign based on design.md and specs — single rg backend, vault-level config, ranking model, snippet generation.
**Status**: Ready

### 3. /Users/nantasmac/projects/my-wiki/docs/design/obsidian-search-tool-design.md
**Action**: Create new document
**Content**: my-wiki reference doc covering search-config.yaml setup, tool interface, usage guidelines.
**Status**: Ready

## Field Mapping

| Source Artifact | Target Document | Field / Section |
|---|---|---|
| proposal.md → Problem Definition | issue-report.md | Conclusion / Root Cause |
| design.md → Decisions D1-D6 | obsidian-search-redesign.md | Architecture & Design Decisions |
| specs/obsidian-search-tool/spec.md | obsidian-search-redesign.md | Tool Interface & Behavior |
| specs/obsidian-search-config/spec.md | obsidian-search-redesign.md | Config Schema Reference |
| verification.md → Test Results | obsidian-search-redesign.md | Verification Summary |
| design.md + specs | my-wiki design doc | Usage Guide + Config Reference |

##前置条件

- [x] All implementation tasks complete
- [x] verification.md generated
- [x] my-wiki vault has search-config.yaml (generated during verification)

## Execution Order

1. Update `docs/plans/obsidian-search-issue-report.md`
2. Create `docs/plans/obsidian-search-redesign.md`
3. Create `/Users/nantasmac/projects/my-wiki/docs/design/obsidian-search-tool-design.md`
