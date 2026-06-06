# Specification Delta

## Capability 对齐（已确认）

- Capability: `global-agent-definitions`
- 来源: `proposal.md` / 已确认 capabilities
- 变更类型: modified
- 用户确认摘要: 4 个 agent 定义文件（context-builder、scout、unity-worker、worker）的 tools 白名单中 grep→ffgrep、find→fffind

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## MODIFIED Requirements

### Requirement: agent-tools-whitelist
以下 agent 定义文件的 `tools` frontmatter 行 MUST 将 `grep` 替换为 `ffgrep`、`find` 替换为 `fffind`：
- `.pi/agents/context-builder.md`
- `.pi/agents/scout.md`
- `.pi/agents/unity-worker.md`
- `.pi/agents/worker.md`

其余 tools 列表项保持不变。

#### Scenario: agent 进程启动时获取工具白名单
- **WHEN** Pi 调度上述 agent
- **THEN** agent 的工具列表包含 `ffgrep` 和 `fffind`
- **THEN** agent 的工具列表不包含内置 `grep` 和 `find`

## REMOVED Requirements

（无）
