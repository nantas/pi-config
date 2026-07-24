# Specification Delta

## Capability 对齐（已确认）

- Capability: `notion`
- 来源: `proposal.md` / 已确认 capabilities
- 变更类型: modified
- 用户确认摘要: 确认仅 Modified `notion`；落地 `ntn-write --safe-replace` + SKILL.md 三补丁；无 New Capability

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## MODIFIED Requirements

### Requirement: ntn-write-props-and-content
系统 SHALL 提供 `ntn-write <page_id_or_url>` 命令，支持 `--set`、`--append`、`--replace`、`--safe-replace` 四种互斥内容/属性操作（同一调用只执行其中一种）。

#### Scenario: 更新属性
- **WHEN** 使用 `--set '{"prop": "value"}'`
- **THEN** 根据 data_source schema 自动翻译值为 Notion API 格式，调用 `PATCH v1/pages/{id}`

#### Scenario: 追加 markdown 内容
- **WHEN** 使用 `--append <markdown>`
- **THEN** 调用 `insert_content` 命令追加到页面末尾

#### Scenario: 替换全部内容（危险路径保留）
- **WHEN** 使用 `--replace <markdown>`
- **THEN** 调用 `replace_content` 命令替换整个页面块树；若页面含 child page(s) 或 child database(s)，Notion API 返回 400 validation_error，脚本按既有 `error-json-output` 透传错误

#### Scenario: 子页面安全的内容替换
- **WHEN** 使用 `--safe-replace <markdown>`
- **THEN** 先读取页面当前 markdown，用 stdlib `difflib` 行级 diff 生成 `content_updates`（每个 hunk 尽量带前缀锚点行以保证 first-match 唯一性），再通过 `update_content` 应用；不调用 `replace_content`，不删除块，子页面/子数据库保留

#### Scenario: safe-replace 空页降级
- **WHEN** `--safe-replace` 且当前页面 markdown 为空（仅空白）
- **THEN** 不走 diff，退化为 `insert_content`（append）写入新内容，返回 action 为 append 或等价摘要

#### Scenario: safe-replace 内容相同
- **WHEN** `--safe-replace` 且新旧 markdown 行级完全一致
- **THEN** 不调用写 API，返回 `{id, action: "safe-replace", changes: 0}`（或等价字段）

#### Scenario: safe-replace diff 过大
- **WHEN** `--safe-replace` 生成的 content_updates 条数超过 100（与 `ntn-edit` ops 上限一致）
- **THEN** 不调用写 API，向 stderr 输出 JSON error（含 `error: "diff_too_large"` 或等价），并包含可操作的降级建议（例如分段 `--safe-replace` / `ntn-edit --ops` / 无子页面时 `--replace`）

#### Scenario: 未提供操作 flag
- **WHEN** 未提供 `--set` / `--append` / `--replace` / `--safe-replace`
- **THEN** 向 stderr 输出 JSON error，提示需提供上述之一

### Requirement: skill-docs-replace-guidance
系统 SHALL 在 `.pi/skills/notion/SKILL.md` 中明确引导 agent 优先使用子页面安全路径，并标注 `--replace` 陷阱。

#### Scenario: ntn-edit 段不再误导向 --replace
- **WHEN** agent 阅读 SKILL.md 的 ntn-edit 段
- **THEN** 文档说明 `update_content` 保留子页面/数据库；大段多节替换优先 `--ops` 或 `ntn-write --safe-replace`，不得再把「大内容替换」唯一指向 `ntn-write --replace`

#### Scenario: ntn-write 段标注 --replace 陷阱并展示 --safe-replace
- **WHEN** agent 阅读 SKILL.md 的 ntn-write 段
- **THEN** 文档展示 `--safe-replace` 用法，并警告 `--replace` 在存在 child pages/databases 时会被 API 拒绝，同时给出 fallback（`--safe-replace` / `ntn-edit --ops` / `--append`）

#### Scenario: Workflow Guide 长页编辑路径
- **WHEN** agent 按 SKILL.md Workflow Guide 中「Editing a long page」操作
- **THEN** 文档明确：页面有子页面/子数据库时 NEVER 使用 `--replace`，应使用 `ntn-write --safe-replace`

## ADDED Requirements

### Requirement: ntn-write-safe-replace-implementation-constraints
系统 SHALL 在实现 `--safe-replace` 时遵守以下约束：仅使用 Python 标准库（含 `difflib`）；不新增第三方依赖；不修改 `phone_number` 等无关属性映射逻辑；不删除或改名既有 `--replace` flag。

#### Scenario: 零新依赖
- **WHEN** 检查 `ntn-write` 的 import
- **THEN** 仅见标准库与既有 `ntn_resolve` 共享模块

#### Scenario: 无关逻辑不改动
- **WHEN** 对比本 change 前后 `build_property_value` / `--set` / `--append` 路径
- **THEN** 行为与输出保持兼容（除 usage 文案可列出新 flag）

## REMOVED Requirements

（无）

## RENAMED Requirements

（无）
