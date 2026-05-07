# Writeback Plan: pkg-fork-dev

## Target

- **File:** `repo://orbitos/20_项目/Pi_Config/项目进度总览.md`
- **Resolved Path:** `/Users/nantasmac/projects/obsidian-mind/20_项目/Pi_Config/项目进度总览.md`
- **Section:** Append after the last existing writeback section (`2026-05-04 sync-settings-merge-strategy 回写`)

## Content

```markdown
## 2026-05-07 pkg-fork-dev 回写

- 变更：`pkg-fork-dev` — 新增 fork 开发与维护闭环 skill + fork 注册表
- 本轮交付：
  - `.pi/skills/pkg-fork-dev/SKILL.md` — 6 阶段 fork 开发工作流 skill（A: Fork & Setup → B: Modification Planning → C: Implementation → D: Local Testing → E: Commit & Ship → F: Maintenance）
  - `forks/manifest.yaml` — fork 注册表，记录 canonical 元数据（fork_url、upstream_url、upstream_source、status、last_upstream_sync、changes_summary），不记录机器特定路径
  - `.pi/capabilities.yaml` — `catalog.skills` 新增 `pkg-fork-dev` 条目
  - `AGENTS.md` — 已记录 pkg-fork-dev 与 pkg-research/pi-extension-dev 的边界说明
- Pilot 验证：
  - Pilot 1 — pi-tool-display（git→git fork）：fork `nantas/pi-tool-display`，本地 clone `/Users/nantasmac/projects/forks/pi-tool-display`，settings.json 来源切换完成
  - Pilot 2 — pi-mcp-adapter（npm→git fork）：fork `nantas/pi-mcp-adapter`，本地 clone `/Users/nantasmac/projects/forks/pi-mcp-adapter`，npm 残留清理完成，settings.json + capabilities.yaml 来源切换完成
- 当前能力边界：
  - `pkg-research`：负责新包的安全审查与引入决策
  - `pi-extension-dev`：负责自有扩展的完整开发
  - `pkg-fork-dev`：负责已有包的 fork 开发闭环（互补不冲突）
- 仓库 settings 状态：`repo-settings-updated`（settings.json 2 项来源切换，capabilities.yaml 2 项来源 + 1 项 skill 追加）
- 全局 sync 状态：`pending-user-confirmation`（settings.json packages 变更需用户确认后同步）
- 关联：`openspec/changes/pkg-fork-dev/`
```

## Field Mapping

| Writeback Field | Source | Value |
|-----------------|--------|-------|
| 变更名 | change name | pkg-fork-dev |
| 交付物列表 | implementation artifacts | SKILL.md, manifest.yaml, capabilities.yaml updates |
| Pilot 结果 | pilot execution evidence | pi-tool-display (git→git), pi-mcp-adapter (npm→git) |
| Settings 状态 | tasks.md + actual changes | repo-settings-updated |
| Sync 状态 | current state | pending-user-confirmation |
| 关联 change | change directory | openspec/changes/pkg-fork-dev/ |

## Preconditions

- [x] verification.md 已完成
- [x] 所有 implementation tasks (2.1–3.2) 已完成
- [x] 目标文件存在且可写

## Execution

Append the Content section above to the target file at the end of the document.
