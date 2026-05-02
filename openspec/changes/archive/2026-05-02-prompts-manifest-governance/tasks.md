# Tasks

## 1. Spec 覆盖与实现准备

- [x] 1.1 确认 `prompts-manifest-governance` 和 `capability-manifest-governance` 两个 spec 的实现范围与边界（已完成：design.md 已定义）
- [x] 1.2 确认当前 `~/.pi/agent/prompts/` 为空，迁移无存量冲突

## 2. 核心实现任务

### 2.1 capabilities.yaml — 新增 global.prompts 段

- [x] 2.1.1 在 `capabilities.yaml` 中 `global:` 下新增 `prompts:` 段，列出当前 opsx-* 所有 10 个模板（opsx-apply, opsx-archive, opsx-bulk-archive, opsx-continue, opsx-explore, opsx-ff, opsx-new, opsx-propose, opsx-sync, opsx-verify）
  - Spec 覆盖: `prompts-manifest-governance` > `prompts-manifest-section`
  - 验证: `grep "prompts:" capabilities.yaml` 存在且包含完整列表

### 2.2 sync-pi-agent.sh — manifest 驱动 prompts 同步

- [x] 2.2.1 在 `sync_from_manifest()` node 脚本中 `extractItems()` 下新增 `const globalPrompts = extractItems("global", "prompts");`
  - Spec 覆盖: `prompts-manifest-governance` > `prompts-manifest-driven-sync`
  - 验证: script 运行成功且无语法错误

- [x] 2.2.2 在 SYNC SKILLS 块之后、CATALOG PUBLISH 块之前，新增 prompts sync 段（单文件模式，参考 agents 的 sync 模式：遍历 `globalPrompts`，从 `sourceRoot/prompts/<name>.md` 复制到 `targetRoot/prompts/<name>.md`，未找到时输出 WARNING）
  - Spec 覆盖: `prompts-manifest-driven-sync` > `sync-copies-whitelisted-prompts`
  - 验证: 运行 `scripts/sync-pi-agent.sh` 后 `~/.pi/agent/prompts/` 包含白名单中的所有文件

- [x] 2.2.3 在 prompts sync 后新增 prompts stale cleanup 段（参考 agents 的 stale cleanup 模式：读取 `targetRoot/prompts/` 现有文件，不在 `globalPrompts` 中的 `.md` 文件被删除）
  - Spec 覆盖: `prompts-manifest-driven-sync` > `sync-cleans-stale-prompts`
  - 验证: 从 `global.prompts` 中移除某条目后运行 sync，对应文件从 `~/.pi/agent/prompts/` 中删除

- [x] 2.2.4 从 `sync_prompts_and_themes()` 函数中移除 prompts 的 `rm -rf` + `cp -R` 逻辑，只保留 themes 处理
  - Spec 覆盖: `prompts-manifest-driven-sync` > `sync-preserves-themes-bulk-copy`
  - 验证: `sync_prompts_and_themes()` 不再包含 `prompts` 字符串

- [x] 2.2.5 更新 sync 完成后的 summary footer，将 `prompts/` 从 "Unchanged" 段移到 "Managed by manifest" 段
  - Spec 覆盖: `prompts-manifest-governance` > `prompts-sync-summary`
  - 验证: sync 输出中 `prompts/` 出现在 manifest-managed 段

### 2.3 AGENTS.md — 治理规则更新

- [x] 2.3.1 在 Capability Manifest Governance 段的资源类型列表中新增 `- **Prompts** — \`.md\` files under \`.pi/prompts/\``
  - Spec 覆盖: `capability-manifest-governance` > `manifest-covers-prompt-resources`
  - 验证: AGENTS.md 包含该行

- [x] 2.3.2 在 Workflow Guidance 表中新增 "Add/remove a prompt" 行（映射到 `Append to / Remove from global.prompts`）
  - Spec 覆盖: `capability-manifest-governance` > `manifest-governance-table-includes-prompts`
  - 验证: 表中包含 prompts 行

- [x] 2.3.3 在 Workflow Guidance 表之后新增 Precedence Rule 小节，声明全局优先规则（prompts 和 skills 的全局版本优先，本地修改被静默忽略；如需修改应编辑 pi-config 源文件后运行 sync）
  - Spec 覆盖: `capability-manifest-governance` > `manifest-governance-precedence-rule` 和 `prompts-manifest-governance` > `prompts-precedence-governance`
  - 验证: AGENTS.md 包含 Precedence Rule 小节，内容覆盖 prompts 和 skills 的优先级描述

## 3. 收敛与验证准备

- [x] 3.1 整理 verification 检查点：capabilities.yaml 格式校验、sync 脚本运行验证、AGENTS.md 内容检查
- [x] 3.2 标记需要 writeback 的变更摘要：capabilities.yaml diff、sync 脚本改动、AGENTS.md 治理规则更新

## 4. 验证与回写收敛

- [x] 4.1 基于真实实现结果生成或更新 verification.md（覆盖 spec-to-implementation 与 task-to-evidence）
- [x] 4.2 基于 verification.md 结论生成或更新 writeback.md
- [x] 4.3 执行 writeback.md 中定义的回写目标，并记录可审计证据
