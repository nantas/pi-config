# Proposal

## 问题定义

当前项目中缺少一套机制来管理跨 session 的全局 agent 行为指导（如工具调用规范）。LLM agent 的工具调用错误（如 edit 参数遗漏、重复重试）暴露了需要系统级约束的需求，但目前：

- `~/.pi/agent/AGENTS.md` 不存在，全局无指导
- `.pi/agent/` 目录不存在，项目内无从管理
- `scripts/sync-pi-agent.sh` 未包含 AGENTS.md 的同步映射
- 根 `AGENTS.md` 未定义更新全局指导的工作流

需要一个可版本化管理、可同步部署的方案。

## 范围边界

**In scope:**
- 创建 `.pi/agent/AGENTS.md`，写入工具调用指导（edit/bash 使用规则、错误恢复流程）
- 更新 `scripts/sync-pi-agent.sh`，增加 `.pi/agent/AGENTS.md` → `~/.pi/agent/AGENTS.md` 同步
- 更新根 `AGENTS.md`，定义"更新全局 agent 指导"的工作流规则

**Out of scope:**
- 其他 `.pi/agent/` 下的文件管理（如 SYSTEM.md、APPEND_SYSTEM.md）
- 扩展机制实现（如通过 extension 动态注入 tool call 指导）
- 全局指导的自动校验或 lint

## Capabilities

### New Capabilities
- `global-agent-md-sync`: 在项目内管理 `.pi/agent/AGENTS.md`，通过 `scripts/sync-pi-agent.sh` 同步到 `~/.pi/agent/AGENTS.md`，并在根 `AGENTS.md` 中记录工作流规则

### Modified Capabilities

（无）

## Capabilities 待确认项

- [x] 能力清单已与用户确认（用户明确要求的三项：创建 AGENTS.md、更新同步脚本、更新根 AGENTS.md）

## Impact

- **新增文件**: `.pi/agent/AGENTS.md` — 全局 agent 指导，含工具调用规则
- **修改文件**: `scripts/sync-pi-agent.sh` — 增加 AGENTS.md 同步映射
- **修改文件**: `AGENTS.md` — 新增全局指导更新工作流规则
- **无删除**

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页 / 项目页 / 回写目标：
  - 标准页: `repo://orbitos`
  - 项目页: `openspec/pkg-backlog.md`
  - 回写目标: `repo://pi-config` → `openspec/pkg-backlog.md`
