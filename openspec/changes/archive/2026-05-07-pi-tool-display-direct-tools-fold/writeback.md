# Writeback

## 回写目标

### 1. `forks/manifest.yaml` — 更新 pi-tool-display changes_summary

**Action**: 更新 `changes_summary` 字段，记录本次缺陷修复

**Content**:
```yaml
changes_summary: "fix: isMcpToolCandidate() now checks label field for MCP Direct Tool recognition; formatMcpCallLine() handles MCP: colon format"
```

### 2. `openspec/pkg-backlog.md` — 更新 pi-tool-display 条目

**Action**: 在 pi-tool-display backlog 条目中追加 fork 修复记录

**Content**:
```
- **fork-fix/direct-tool-label-recognition** (2025-05-07): Fixed isMcpToolCandidate() to check label field, enabling MCP Direct Tools to be recognized and respect mcpOutputMode settings. Also fixed formatMcpCallLine() for MCP: colon format. Commit: bd352d4 on nantas/pi-tool-display main.
```

## 回写状态

- [x] forks/manifest.yaml 已更新
- [x] openspec/pkg-backlog.md 已更新
