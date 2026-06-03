# Binding

## 标准与项目页面绑定

- `spec_standard_ref`: repo://pi-mono (pi-coding-agent extension API standards)
- `project_page_ref`: `.pi/capabilities.yaml`, `.pi/settings.json`, `~/.pi/agent/settings.json`
- `additional_context_refs`:
  - Phase 1 安全审查克隆: `/tmp/pkg-research-pi-subagents.laGWsC/repo` (johnnywu 版本源码)
  - 当前全局安装: `/Users/nantasmac/.nvm/versions/node/v24.15.0/lib/node_modules/pi-subagents/` (旧版 0.24.0)
  - 当前全局 skill: `~/.pi/agent/skills/pi-subagents/` → 指向旧版 npm 包内 skill
  - 当前 session 中的 skill 定义: `/Users/nantasmac/.nvm/versions/node/v24.15.0/lib/node_modules/pi-subagents/skills/pi-subagents/SKILL.md`

## Source of Truth

- 行为规范真源：`specs/replace-pi-subagents/spec.md`
- 项目页面角色：上下文输入 / 治理展示 / 结果回写
- 非真源说明：项目页面不得替代 spec delta 作为实现与验证依据

## 回写目标

- `writeback_targets`:
  - `.pi/capabilities.yaml` — 更新 packages 条目从 `npm:pi-subagents@0.24.0` → `npm:@johnnywu/pi-subagents@1.5.0`
  - `~/.pi/agent/settings.json` — 更新 packages 数组中对应条目
  - `.pi/settings.json` — 移除 subagents agentOverrides 中旧版特有的配置项（如有不兼容字段）
  - `.pi/agents/` — 创建新版格式的 agent 定义文件
- `writeback_owner`: 执行本 change 的 agent
- `writeback_timing`: tasks 全部完成后，通过 `scripts/sync-pi-agent.sh` 同步到全局

## 同步约束

- 页面与 spec 不一致时，以 `specs/` 为准
- 回写只同步结论、状态、摘要与链接，不复制整份 spec/design/tasks
- 全局同步需用户确认后执行 `scripts/sync-pi-agent.sh`
- 新版 `@johnnywu/pi-subagents` 不提供 skills 和 prompts，旧版 skill 引用需在替换后更新

## 待确认项

- [x] 已确认标准页引用 — pi-mono extension API
- [x] 已确认项目页引用 — capabilities.yaml, settings.json
- [x] 已确认回写目标与权限 — 全局同步需用户确认
- [ ] 已确认异常处理与冲突策略 — 新版不含 async/chain/parallel，需确认是否接受功能降级
