# Specification Delta

## Capability 对齐（已确认）

- Capability: `notion`
- 来源: `proposal.md` / 已确认 capabilities
- 变更类型: modified
- 用户确认摘要: 同意 A+B；含 `--set @file.json`；仅 Modified `notion`；无 New Capability；不做 batch/move/未覆盖类型扩展

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: ntn-create-row
系统 SHALL 提供 `ntn-create <data_source_id_or_url> --set <json_or_@file>` 命令，在指定 data_source 中创建新 page（行）。

#### Scenario: 用 plain JSON 创建行
- **WHEN** 调用 `ntn-create <ds> --set '{"Key":"tut_x","Type":"UI","使用":true}'`（key 为该 data_source 实际属性名）
- **THEN** 根据该 data_source schema 将 plain value 翻译为 Notion API properties 格式，调用 `POST v1/pages`，`parent` 为 `{"data_source_id": "<resolved_id>"}`，stdout 输出 JSON 至少含 `id`、`url`、`properties_set`（已设置的属性名列表）

#### Scenario: 从文件读取 --set
- **WHEN** `--set @props.json` 且文件内容为 JSON object
- **THEN** 读取文件内容作为 plain properties，行为与内联 JSON 一致

#### Scenario: data_source URL / database ID 输入
- **WHEN** 输入为 data_source URL，或 database ID/URL
- **THEN** 解析到目标 data_source（database 输入时与 `ntn-schema` 一致：使用其第一个 data_source），再创建

#### Scenario: 缺少 --set
- **WHEN** 未提供 `--set`
- **THEN** stderr JSON error，exit 1，不调用写 API

#### Scenario: 无法解析 data_source
- **WHEN** 目标无法解析为 data_source
- **THEN** stderr JSON error，exit 1

#### Scenario: API 创建失败
- **WHEN** `ntn api` 返回非零
- **THEN** 按 `error-json-output` 透传错误，exit 1

### Requirement: shared-property-translation
系统 SHALL 将 plain value → Notion API property 的翻译逻辑放在共享模块（`ntn_resolve.py` 或同目录等价共享模块）中，供 `ntn-write --set` 与 `ntn-create --set` 共用；至少覆盖既有类型：title、rich_text、select、multi_select、status、number、checkbox、date、url、email、phone_number；未知类型或无 schema 时回退 rich_text。

#### Scenario: write 与 create 共用翻译
- **WHEN** 同一 plain value 与同一 property schema 分别经 `ntn-write --set` 与 `ntn-create --set` 翻译
- **THEN** 生成的 Notion property payload 结构一致（由共享函数产出）

#### Scenario: 零新依赖
- **WHEN** 检查共享模块与 `ntn-create` / `ntn-write` 的 import
- **THEN** 仅标准库与既有 `ntn` CLI 调用，无新第三方依赖

### Requirement: skill-docs-create-and-multi-ds
系统 SHALL 在 `.pi/skills/notion/SKILL.md` 中登记 `ntn-create`、多 datasource 纪律，以及 property 默认写路径。

#### Scenario: Scripts 节包含 ntn-create
- **WHEN** agent 阅读 SKILL.md Scripts 节
- **THEN** 可见 `ntn-create` 用法（含 `--set` 内联与 `@file`），且 Extending 候选列表不再包含 `ntn-create`

#### Scenario: 多 datasource 字段差异提醒
- **WHEN** agent 阅读 Workflow Guide
- **THEN** 文档明确：同一项目可有多个字段结构不同的 datasource；每个 datasource 必须先 `ntn-schema`；filter / `--set` 的 key 必须按目标 schema 填写，不得跨库假设字段一致

#### Scenario: property 默认写路径
- **WHEN** agent 需要创建行或更新 property
- **THEN** 文档引导：创建用 `ntn-create --set`；更新用 `ntn-write --set`；仅未覆盖 property 类型才降级 `ntn api` 原生调用

## MODIFIED Requirements

### Requirement: ntn-write-props-and-content
系统 SHALL 提供 `ntn-write <page_id_or_url>` 命令，支持 `--set`、`--append`、`--replace`、`--safe-replace` 四种互斥内容/属性操作（同一调用只执行其中一种）。`--set` 接受内联 JSON object 或 `@file.json`；属性翻译必须调用共享 property 翻译逻辑（见 `shared-property-translation`）。

#### Scenario: 更新属性
- **WHEN** 使用 `--set '{"prop": "value"}'`
- **THEN** 根据 data_source schema 自动翻译值为 Notion API 格式，调用 `PATCH v1/pages/{id}`

#### Scenario: 从文件更新属性
- **WHEN** 使用 `--set @props.json` 且文件内容为 JSON object
- **THEN** 读取文件后与内联 `--set` 行为一致

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

### Requirement: shared-library
所有脚本 SHALL 共享 `ntn_resolve.py`（或同目录等价共享模块），至少包含 `ntn_api()`、`extract_id_from_url()`、`resolve_id()`，以及 plain→Notion property 翻译相关函数；各脚本通过 `sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))` 引用。

#### Scenario: create 与 write 引用同一共享模块
- **WHEN** 检查 `ntn-create` 与 `ntn-write` 源码
- **THEN** 二者均 import 共享模块中的 property 翻译函数，而不是各自内联完整翻译实现

#### Scenario: 既有公共函数保留
- **WHEN** 检查共享模块
- **THEN** 仍提供 `ntn_api`、`extract_id_from_url`、`resolve_id`，既有调用方行为兼容
