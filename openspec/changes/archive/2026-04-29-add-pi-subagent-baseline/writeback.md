# Writeback

## 回写摘要

- change：`add-pi-subagent-baseline`
- 回写结论：本轮已把 `pi-config` 的 subagent baseline 从“自然语言入口 + 占位 backend adapter”收敛到“自然语言入口 + repository-owned `dispatch` tool + 真实 `pi-subagents` bridge”，并补齐固定 skill agent contract 样例。
- 关键结果：
  - 将扩展重构为 `.pi/extensions/subagent-dispatch/index.ts`
  - 新增 `.pi/extensions/subagent-dispatch/core.js`
  - 新增 `.pi/agents/code-writer.md`
  - 新增 `.pi/agents/dispatch-planner.md`
  - 更新 `.pi/settings.json`，将 extension 入口改为目录形式 `.pi/extensions/subagent-dispatch`
  - 更新 `scripts/sync-pi-agent.sh`，把 `.pi/npm/` 纳入 managed sync
  - 除 `.pi/settings.json` 与 `scripts/sync-pi-agent.sh` 外，没有新增其他 repository-managed Pi settings 变更需求
  - 同一扩展现在还暴露自然语言 `/dispatch` 命令包装器，并通过 Pi 会话消息注入能力把请求交回主 agent 决定是否拆分
  - dispatch 现在通过 synthetic agent bridge 把 task-level `projectContext`、固定 skills、以及规范化 skill arrays 映射到真实 child execution policy
  - agent resolver 现在兼容全局 `~/.pi/agent/agents` fallback，不再要求每个仓库都存在本地 `.pi/agents`
  - 本轮回归修复进一步把 builtin agents 纳入 dispatch scope，并对 `extensions: []` 空占位做桥接层 sanitize，避免被运行时当作字面路径 `[]`
  - 本轮又补了两项工作流级可用性修复：`dispatch`/`/dispatch` 会显式暴露当前可用 agent 列表，sync 结果在 `finalOutput` 为空时会回退到 artifact output 内容
  - 本轮继续补齐 sync 结果契约：`dispatch` sync 现在会直接内联 child output 正文与真实导出路径，并在 normalized `details.results[]` 中保留 `finalOutput` / `artifactPaths` / `sessionFile` / `savedOutputPath`
  - 同时澄清了顶层 `runId` 的语义：它是 dispatch response 标识，不再暗示可直接交给 `subagent status`
  - 上一轮修改已在用户确认后通过 `./scripts/sync-pi-agent.sh` 同步到全局 `~/.pi/agent/` managed runtime，包括 `.pi/npm/`
  - 本轮回归修复后的 repository-managed extension/agent 文件也已在用户确认后完成新的全局 managed sync
  - 但本轮再次修改了 repository-managed extension 文件与 verification/writeback 工件，因此如需让 Pi runtime 获得最新行为，还需要新的 managed sync 确认

## Capability / Spec 增量摘要

| Capability | 变更类型（New/Modified/Removed/Renamed） | 对应 spec 文件 | 增量摘要 |
| --- | --- | --- | --- |
| `pi-subagent-agent-contract` | New | `openspec/changes/add-pi-subagent-baseline/specs/pi-subagent-agent-contract/spec.md` | 定义 `.pi/agents/*.md` 为项目本地 subagent persona 与 execution policy 的唯一真源，并补充可选固定 `skills` frontmatter |
| `pi-subagent-dispatch-baseline` | New | `openspec/changes/add-pi-subagent-baseline/specs/pi-subagent-dispatch-baseline/spec.md` | 定义 repository-owned `dispatch` tool、自然语言 `/dispatch` 入口、可扩展内部计划字段，以及真实 `pi-subagents` bridge |

## 验证结论与证据入口

| 验证维度 | 结论 | 证据入口 |
| --- | --- | --- |
| Spec-to-Implementation | 通过 | `openspec/changes/add-pi-subagent-baseline/verification.md` |
| Task-to-Evidence | 通过 | `openspec/changes/add-pi-subagent-baseline/verification.md` |

## 回写目标与字段映射

| 目标页 | 同步字段/区块 | 回写内容 |
| --- | --- | --- |
| `repo://orbitos/20_项目/Pi_Config/项目进度总览.md` | 新增/修订 `2026-04-29 Subagent Baseline 回写` 区块 | 同步本轮真实 bridge、fixed skill contract、settings 评估结果与全局 sync 状态 |
| `~/.pi/agent/settings.json` | managed sync 状态记录 | 上一轮与本轮回归修复后的新一轮 sync 均已执行 |
| `~/.pi/agent/npm/` | managed runtime dependency mirror | 为全局 extension 提供 `../npm/node_modules/pi-subagents/...` 可解析路径 |
| `/dispatch` command wrapper | 交互入口补充 | 自然语言用户入口，由主 agent 决定是否调用 repository-owned `dispatch` tool |
| global agent fallback | 解析行为修正 | 默认使用 `~/.pi/agent/agents`，项目内 `.pi/agents` 同名定义覆盖全局定义 |
| fixed skill agent policy | 合同能力补充 | 通过 `.pi/agents/*.md` 表达固定 `skills`，避免依赖原始字符串 `skill` task override |
| dispatch scope alignment | 解析行为修正 | builtin / user / project agents 统一进入 dispatch scope，保持项目 override 优先级 |
| empty extensions sanitize | 运行时防御修正 | `extensions: []` 不再下传为字面量路径 `[]` |
| agent visibility | 编排可见性修正 | `dispatch` tool 与 `/dispatch` 注入消息都会列出当前可用 agent，避免主 agent 猜测无效名称 |
| sync result visibility | 输出可见性修正 | 当 child result 缺少 `finalOutput` 时，dispatch 会从 artifact output 回退提取摘要 |
| sync result parity | 输出契约修正 | sync 响应正文直接暴露 child output 与真实导出路径，不再只返回状态摘要 |
| sync runId semantics | 标识语义修正 | 顶层 `runId` 不再暗示可直接用于 `subagent status` |

## 回写执行结果

| 目标页 | 执行结果（成功/失败/跳过） | 执行时间 | 执行人 | 结果说明/链接 |
| --- | --- | --- | --- | --- |
| `../obsidian-mind/20_项目/Pi_Config/项目进度总览.md` | 跳过 | `2026-04-29T06:49:37Z` | Codex | 旧回写路径当前不存在，需重新确认实际 Obsidian vault 路径后再补写 |
| `~/.pi/agent/settings.json` | 成功 | `2026-04-29T06:49:37Z` | Codex | 已通过 `./scripts/sync-pi-agent.sh` 执行 managed sync |
| `~/.pi/agent/settings.json` | 成功 | `2026-04-29T08:36:48Z` | Codex | 已同步本轮 dispatch scope / empty extensions sanitize 回归修复 |
| `~/.pi/agent/extensions/subagent-dispatch/index.ts` | 成功 | `2026-04-29T08:36:48Z` | Codex | 已同步 builtin+user+project dispatch scope 修复 |
| `~/.pi/agent/extensions/subagent-dispatch/core.js` | 成功 | `2026-04-29T08:36:48Z` | Codex | 已同步 `sanitizeAgentDefinition()` 防御逻辑 |
| `~/.pi/agent/agents/dispatch-planner.md` | 成功 | `2026-04-29T08:36:48Z` | Codex | 已移除 `extensions: []` 空占位并同步到全局 |
| `~/.pi/agent/agents/code-writer.md` | 成功 | `2026-04-29T08:36:48Z` | Codex | 已移除 `extensions: []` 空占位并同步到全局 |
| `~/.pi/agent/settings.json` | 成功 | `2026-04-29T08:47:07Z` | Codex | 已同步本轮 agent visibility / sync result visibility 修复 |
| `~/.pi/agent/extensions/subagent-dispatch/index.ts` | 成功 | `2026-04-29T08:47:07Z` | Codex | 已同步合法 agent 列表暴露与 sync 结果摘要回退逻辑 |
| `~/.pi/agent/extensions/subagent-dispatch/core.js` | 成功 | `2026-04-29T08:47:07Z` | Codex | 已同步 dispatch tool description / missing-agent diagnostic / artifact output summary helpers |
| `~/.pi/agent/settings.json` | 成功 | `2026-04-29T09:15:07Z` | Codex | 已同步本轮 sync result parity / sync runId semantics 修复 |
| `~/.pi/agent/extensions/subagent-dispatch/index.ts` | 成功 | `2026-04-29T09:15:07Z` | Codex | 已同步 rich child result 保留与 sync 文本内联输出逻辑 |
| `~/.pi/agent/extensions/subagent-dispatch/core.js` | 成功 | `2026-04-29T09:15:07Z` | Codex | 已同步 sync 结果格式化与 persisted output fallback 逻辑 |
| `~/.pi/agent/extensions/subagent-dispatch/index.ts` | 成功 | `2026-04-29T06:49:37Z` | Codex | 已同步目录化的真实 `pi-subagents` bridge 版本扩展 |
| `~/.pi/agent/extensions/subagent-dispatch/core.js` | 成功 | `2026-04-29T06:49:37Z` | Codex | helper 已移入子目录，不再被 extension auto-discovery 误加载 |
| `~/.pi/agent/npm/node_modules/pi-subagents/agents.ts` | 成功 | `2026-04-29T06:49:37Z` | Codex | 已同步 managed npm mirror，修复全局 runtime 下的相对依赖解析 |
| `~/.pi/agent/agents/dispatch-planner.md` | 成功 | `2026-04-29T06:49:37Z` | Codex | 已同步固定 `skills` frontmatter 的 agent contract 样例 |
| `/dispatch` command wrapper | 成功 | `2026-04-29` | Codex | 保持自然语言 slash-command 包装器，并补充“不得绕过 repository-owned dispatch”的注入约束 |
| global agent fallback | 成功 | `2026-04-29` | Codex | 继续保留 user-level fallback 与项目 override 语义 |
| fixed skill agent policy | 成功 | `2026-04-29` | Codex | 新增 `.pi/agents/dispatch-planner.md` 作为固定 `skills` frontmatter 样例 |
| dispatch scope alignment | 成功 | `2026-04-29` | Codex | dispatch resolver 现已纳入 builtin / user / project agents，并遵循项目覆盖优先级 |
| empty extensions sanitize | 成功 | `2026-04-29` | Codex | bridge helper 会清除 `extensions: []` 空占位，仓库 agent frontmatter 也已移除该字段 |
| agent visibility | 成功 | `2026-04-29` | Codex | tool description、slash command 注入、missing-agent 诊断均会返回当前 dispatch scope 的合法 agent 列表 |
| sync result visibility | 成功 | `2026-04-29` | Codex | result summary 在 `finalOutput` 为空时改为读取 artifact output，避免只看到 “Subagent completed.” |
| sync result parity | 成功 | `2026-04-29` | Codex | sync 文本现在直接内联 child output、saved output、artifact output、session 路径，且 details.results[] 保留 rich child fields |
| sync runId semantics | 成功 | `2026-04-29` | Codex | 顶层 `runId` 只保留为 dispatch response 标识，不再误导为 async/status handle |

## 回写前置条件

- [x] 已读取 `spec_standard_ref`
- [x] `verification.md` 已生成且无阻塞项
- [x] 回写目标页已确认存在且可编辑
- [x] capability/spec 增量摘要已核对 proposal 与 specs 一致

## 不回写的内容

- 不复制完整 `proposal.md`、`design.md`、`specs/*/spec.md`、`tasks.md` 正文
- 不把 backend adapter 的内部细节写入项目页
- 不把全局 `~/.pi/agent/settings.json` sync 伪装成已执行
- 不把本轮最新 extension 改动在未重新 sync 前伪装成已经进入全局 runtime
- 不在未确认新 vault 路径前继续向失效的项目页路径写入
