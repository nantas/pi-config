# Writeback

## 回写摘要

- change：ask-user-prompt-self-containment
- 回写结论：实现完成，无缺口
- 关键结果：新增 `AGENTS.d/tool-ask-user.md`（prompt 自包含规则 + 反模式 + 正确做法），修改 `AGENTS.md`（新增 ask_user Tool 引用节）

## Capability / Spec 增量摘要

| Capability | 变更类型 | 对应 spec 文件 | 增量摘要 |
|------------|----------|---------------|----------|
| ask-user-guidance | New | specs/ask-user-guidance/spec.md | prompt 自包含规则（3 req：prompt-self-containment、anti-pattern-documentation、agents-md-reference） |
| global-agent-guidance | Modified | specs/global-agent-guidance/spec.md | AGENTS.md Tool Call Guidelines 新增 ask_user Tool 引用节（1 req：agents-md-tool-call-guidelines） |

## 验证结论与证据入口

| 验证维度 | 结论 | 证据入口 |
|----------|------|----------|
| Spec-to-Implementation | 4/4 requirement 覆盖 | `verification.md` Spec-to-Implementation Coverage 表 |
| Task-to-Evidence | 9/9 task 覆盖 | `verification.md` Task-to-Evidence Coverage 表 |

## 回写目标与字段映射

| 目标页 | 同步字段/区块 | 回写内容 |
|--------|-------------|----------|
| `.pi/agent/AGENTS.d/tool-ask-user.md` | 全文件（新建） | prompt 自包含规则、反模式、正确做法、触发条件 |
| `.pi/agent/AGENTS.md` | `### ask_user Tool` 小节（新增） | 触发条件 + 链接到 tool-ask-user.md |

## 回写执行结果

| 目标页 | 执行结果 | 执行时间 | 执行人 | 结果说明/链接 |
|--------|----------|----------|--------|--------------|
| `.pi/agent/AGENTS.d/tool-ask-user.md` | 成功 | 2025-05-06 | agent | 文件已创建（85 行），含四部分内容 |
| `.pi/agent/AGENTS.md` | 成功 | 2025-05-06 | agent | `### ask_user Tool` 小节已插入第 40 行，位置正确 |

## 回写前置条件

- [x] 已读取 `spec_standard_ref`（本 change 无外部标准页）
- [x] `verification.md` 已生成且无阻塞项
- [x] 回写目标页已确认存在且可编辑
- [x] capability/spec 增量摘要已核对 proposal 与 specs 一致

## 不回写的内容

- 不复制完整 `proposal.md`、`design.md`、`specs/*/spec.md`、`tasks.md` 正文
- 不写与本次 change 无关的历史信息
