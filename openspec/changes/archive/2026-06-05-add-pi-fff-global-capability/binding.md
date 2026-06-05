# Binding

## 标准与项目页面绑定

- `spec_standard_ref`: `repo://pi-config` — `.pi/capabilities.yaml`（能力清单 SSOT）、`docs/reference/readme-governance.md`（README 维护治理）、`.pi/agent/AGENTS.md`（全局 agent 行为规范）
- `project_page_ref`: `openspec/changes/add-pi-fff-global-capability/`
- `additional_context_refs`:
  - `repo://pi-config` — `scripts/sync-pi-agent.sh`（全局同步脚本，本次需扩展）
  - `repo://pi-config` — `README.md`（能力描述，本次需更新）

## Source of Truth

- 行为规范真源：`specs/capabilities-env-schema/spec.md` — 定义 `global.env` 及 `catalog.env` 字段 schema、校验规则、与能力 ID 的绑定协议
- 项目页面角色：上下文输入 / 治理展示 / 结果回写
- 非真源说明：`proposal.md`、`design.md` 为规划文档，不得替代 spec 作为实现与验证依据

## 回写目标

- `writeback_targets`:
  - `.pi/capabilities.yaml`（添加 `pi-fff` 包 + `global.env` 节）
  - `scripts/sync-pi-agent.sh`（新增 env 变量检查步骤）
  - `README.md`（更新外部 Pi 包节）
  - `~/.zshenv`（添加 `FFF_FRECENCY_DB`、`FFF_HISTORY_DB`，位于 repo 外部但属于本次交付范围）
- `writeback_owner`: `nantas-agent`
- `writeback_timing`: implementation complete → verify → writeback

## 同步约束

- `capabilities.yaml` 中 `global.env` 的 key 必须与 `global.settings.packages` / `global.extensions` / `global.skills` / `global.agents` 中的能力 ID 对应
- sync 脚本扩展不得破坏现有同步路径（extensions、agents、skills、prompts、settings.json、catalog）
- `~/.zshenv` 修改为一次性操作，sync 脚本仅检查、不修改 shell 配置文件
- 页面与 spec 不一致时，以 `specs/` 为准
- 回写只同步结论、状态、摘要与链接，不复制整份 spec/design/tasks

## 待确认项

- [x] 已确认标准页引用：capabilities.yaml + readme-governance + AGENTS.md
- [x] 已确认项目页引用：openspec/changes/add-pi-fff-global-capability/
- [x] 已确认回写目标与权限：仓库文件可写，~/.zshenv 需用户自行执行
- [x] 已确认异常处理与冲突策略：sync 脚本 env 检查仅告警不修改；孤立 env 块警告但不阻断
