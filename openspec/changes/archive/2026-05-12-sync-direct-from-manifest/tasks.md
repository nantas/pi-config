# Tasks

## 1. Spec 覆盖与实现准备

- [x] 1.1 确认 spec delta 范围：
  - 修改 `pi-runtime-bootstrap-sync` Requirement 3（从 whitelist 过滤改为直接生成）
  - 移除 `exclude_keys` 相关逻辑
  - 保留其他 Requirements 不变
- [x] 1.2 确认 Design Decision 1：用 Python3 + PyYAML 替代 Node.js 手工解析
- [x] 1.3 确认 Design Decision 2-5：合并策略、排除字段、capabilities 结构、本地 settings 清理

## 2. 核心实现任务

### 2.1 扩展 `.pi/capabilities.yaml` global.settings

- [x] 2.1.1 在 `global.settings` 中新增 `defaultThinkingLevel: high`
- [x] 2.1.2 在 `global.settings` 中新增 `defaultProvider: deepseek`
- [x] 2.1.3 在 `global.settings` 中新增 `defaultModel: deepseek-v4-flash`
- [x] 2.1.4 在 `global.settings` 中新增 `subagents`（含 agentOverrides 嵌套结构，内容与当前 pi-config/.pi/settings.json 中的 subagents 一致）
- [x] 2.1.5 删除 `global.settings.exclude_keys` 字段
- [x] 2.1.6 验证：`global.settings.packages` 列表与当前 whitelist 一致（保持 packages 完整性）

### 2.2 重写 `scripts/sync-pi-agent.sh` 中的 `render_settings_file`

- [x] 2.2.1 用 Python3 inline script 替换当前的 Node.js inline script
  - 使用 `python3 -c "import yaml; ..."` 解析 capabilities.yaml
  - 通过 `yaml.safe_load()` 提取 `global.settings` 字典
- [x] 2.2.2 实现目标文件合并逻辑：
  - 读取当前 `~/.pi/agent/settings.json`（如果存在）
  - 提取 capabilities.yaml 中 `global.settings` 的所有 key
  - capabilities 已有的 key → 用 capabilities 值覆盖
  - capabilities 没有的 key（含 `enabledModels`、`lastChangelogVersion` 等）→ 保留目标文件原值
- [x] 2.2.3 移除所有 whitelist 过滤逻辑（不再读取 pi-config/.pi/settings.json 的 packages）
- [x] 2.2.4 移除所有 exclude_keys 处理逻辑（不再需要）
- [x] 2.2.5 移除 `USER_MANAGED_KEYS` 数组中的特殊硬编码（改用通用策略：不在 capabilities 中的 key 自动保留）
- [x] 2.2.6 验证输出内容正确性：先临时输出到临时文件，diff 对比预期结构

### 2.3 清理 `pi-config/.pi/settings.json`

- [x] 2.3.1 移除 `lastChangelogVersion`（不再同步）
- [x] 2.3.2 移除 `defaultThinkingLevel`（迁移到 capabilities.yaml）
- [x] 2.3.3 移除 `defaultProvider`（迁移到 capabilities.yaml）
- [x] 2.3.4 移除 `defaultModel`（迁移到 capabilities.yaml）
- [x] 2.3.5 移除 `subagents`（迁移到 capabilities.yaml）
- [x] 2.3.6 确认 `packages` 中只保留本地开发需要的条目（如 `npm:lsp-pi`）

### 2.4 更新 `pi-runtime-bootstrap-sync` 主 spec

- [x] 2.4.1 将 `specs/pi-runtime-bootstrap-sync/spec.md` 中的旧版 Requirement 3 替换为新版 `Bootstrap Sync Must Generate Settings From Manifest Directly`
- [x] 2.4.2 更新 Requirement 2 中的引用（从 `global.settings.packages` whitelist 改为指向新的直接生成模式）
- [x] 2.4.3 移除 `exclude_keys` 相关的场景描述

### 2.5 更新 AGENTS.md 中的 Capability Manifest Governance

- [x] 2.5.1 更新 Workflow Guidance 表格中关于 settings 的描述
- [x] 2.5.2 移除 settings.json whitelist 相关的说明
- [x] 2.5.3 更新为新的"直接生成"模式的治理规则描述

### 2.6 执行同步验证

- [x] 2.6.1 运行 `bash scripts/sync-pi-agent.sh`
- [x] 2.6.2 对比生成的 `~/.pi/agent/settings.json` 与预期内容
- [x] 2.6.3 确认 `packages` 内容与 capabilities.yaml 一致
- [x] 2.6.4 确认 `enabledModels` 从目标文件保留
- [x] 2.6.5 确认 `lastChangelogVersion` 从目标文件保留
- [x] 2.6.6 确认 `subagents` 结构正确

## 3. 收敛与验证准备

- [x] 3.1 整理 verification 检查点：
  - capabilities.yaml global.settings 结构正确
  - render_settings_file 不再读取 pi-config/.pi/settings.json
  - 生成结果中的 packages 与 capabilities.yaml 一致
  - enabledModels 被保留
  - exclude_keys 相关代码已移除
  - 本地 settings.json 已清理
- [x] 3.2 标记需要写入 writeback 的变更摘要

## 4. 验证与回写收敛

- [x] 4.1 基于真实实现结果生成或更新 `verification.md`（覆盖 spec-to-implementation 与 task-to-evidence）
- [x] 4.2 基于 `verification.md` 结论生成或更新 `writeback.md`
- [x] 4.3 执行 `writeback.md` 中定义的回写目标，并记录可审计证据
