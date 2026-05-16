# Writeback

## 回写摘要

- change: `dollar-skill-invoke-context`
- 回写结论: ✅ 全部完成
- 关键结果：`dollar-skill-invoke` 扩展将 `$skill-name` 展开机制从 `input` 事件文本替换切换为 `context` 事件消息级追加。原始 prompt 保留完整语义，每个 skill 作为独立 `CustomMessage`（`display: false`）注入，自然支持多 skill。

## Capability / Spec 增量摘要

| Capability | 变更类型 | 对应 spec 文件 | 增量摘要 |
|------------|----------|---------------|----------|
| `dollar-skill-invoke` | Modified | `openspec/specs/dollar-skill-invoke/spec.md` | 从 `input` 文本替换切换为 `context` 消息注入；全量展开所有 `$skill-name`（非仅首个）；原始 prompt 保留标记；去重机制防止同一 turn 重复注入 |

## 验证结论与证据入口

| 验证维度 | 结论 | 证据入口 |
|----------|------|----------|
| Spec-to-Implementation | ✅ 全部覆盖 (6 requirements, 17 scenarios) | `verification.md` → Spec-to-Implementation Coverage 表格 |
| Task-to-Evidence | ✅ 全部完成 (15 tasks) | `verification.md` → Task-to-Evidence Coverage 表格；用户 session 实测试：`$pkg-research` + `$gitnexus-cli` |

## 回写目标与字段映射

| 目标页 | 同步字段/区块 | 回写内容 |
|--------|-------------|----------|
| `openspec/specs/dollar-skill-invoke/spec.md` | Purpose | 更新为 `context` 事件 + 消息级追加描述 |
| `openspec/specs/dollar-skill-invoke/spec.md` | Dollar Skill Token Expansion | 全量展开 + 保留原始文本 + `context` 事件 |
| `openspec/specs/dollar-skill-invoke/spec.md` | Input Event Interception | REMOVED |
| `openspec/specs/dollar-skill-invoke/spec.md` | Input Handler Single Registration | 替换为 Context Handler Single Registration |
| `openspec/specs/dollar-skill-invoke/spec.md` | Skill Content Format | 更新为 CustomMessage 格式 |

## 回写执行结果

| 目标页 | 执行结果 | 执行时间 | 执行人 | 结果说明/链接 |
|--------|----------|----------|--------|---------------|
| `openspec/specs/dollar-skill-invoke/spec.md` | ✅ 成功 | 2026-05-16 | Agent (opsx-apply) | Purpose 更新、Dollar Token Expansion 全量展开 + 保留原文、新增 Context Event Injection / Repeat Injection Prevention、移除 Input Event Interception、Input Handler → Context Handler

## 回写前置条件

- [x] 已读取 `spec_standard_ref`（`openspec/specs/dollar-skill-invoke/spec.md`）
- [x] `verification.md` 已生成且无阻塞项
- [x] 回写目标页已确认存在且可编辑
- [x] capability/spec 增量摘要已核对 proposal 与 specs 一致

## 不回写的内容

- 不复制完整 `proposal.md`、`design.md`、`specs/dollar-skill-invoke/spec.md`、`tasks.md` 正文
- 不写与本次 change 无关的历史信息
