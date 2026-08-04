# Proposal

## 问题定义

Notion skill 已覆盖 resolve / schema / query / edit / write，但**缺少在 data_source 中创建新 page（行）的封装**。高频「新增 term / 新行」场景必须手写：

```bash
ntn api -X POST v1/pages -d '{"parent":{"data_source_id":"..."},"properties":{...Notion 嵌套格式...}}'
```

外部 session（`docs/plans/notion-skill-multi-datasource-and-create-handoff.md`）在两个字段结构完全不同的 datasource 上批量维护多语言文案时确认：

1. `ntn-create` 已在 SKILL.md Extending 节列为候选，但未实现 → 每条 create 都要查 schema 并手拼 rich_text/select/checkbox 嵌套 JSON，token 高且易错。
2. Workflow Guide 只演示单一 datasource 读写循环，**没有多 datasource 字段差异提醒** → agent 可能跨库复用字段名。
3. `ntn-write --set` 已能 schema 翻译更新 property，但文档未把它标成「改 property 默认路径」→ agent 常退化成手写 `PATCH v1/pages`。

根因不是 API 能力缺失，而是 skill wrapper 与文档闭环缺「增」与跨库纪律。

## 范围边界

**In scope**

- 新增 `scripts/ntn-create`：对 data_source 创建 page，`--set` plain JSON（与 `ntn-write --set` 同语义）
- `--set` 支持内联 JSON 与 `@file.json`
- 抽取 `build_property_value` + schema 读取到共享模块，供 `ntn-write` / `ntn-create` 共用
- `ntn-write --set` 同步支持 `@file.json`（行为兼容）
- SKILL.md：登记 `ntn-create`；补多 datasource 提醒；明确 property 默认写路径；从 Extending 移除 `ntn-create` 候选
- delta spec 覆盖 create、共享翻译、文档指引

**Out of scope**

- `ntn-batch-edit` / `ntn-move` / filter DSL / schema cache
- relation / people / files 等尚未覆盖的 property 类型扩展
- 把 create 并入 `ntn-write`
- 修改 `capabilities.yaml`（skill 已注册）
- 自动全局 sync（需用户另确认）
- 项目级 na2-notion-cms / NeonSpark 工作流扩展

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `notion`: 新增 `ntn-create`（data_source 行创建 + plain `--set` / `@file`）；共享 property 翻译；SKILL 补多 datasource 与默认写路径指引

## Capabilities 待确认项

- [x] 能力清单已与用户确认：仅 Modified `notion`；A+B 方案；含 `--set @file.json`

## Impact

### 对 notion skill

- **新增脚本**：`.pi/skills/notion/scripts/ntn-create`
- **共享库**：`.pi/skills/notion/scripts/ntn_resolve.py`（或等价共享模块）承接 property 翻译
- **既有脚本**：`ntn-write` 改为调用共享翻译；`--set` 增加 `@file` 支持
- **文档**：`.pi/skills/notion/SKILL.md`
- **全局 runtime**：需用户确认后 `scripts/sync-pi-agent.sh` → `~/.pi/agent/skills/notion/`

### 对主 spec / 治理

- `openspec/specs/notion/spec.md`：归档时同步 create、共享翻译、文档要求
- `CONTEXT.md`：`notion` 已在 OpenSpec 索引，无需新 slug；归档摘要可注明能力扩展
- 不改 `capabilities.yaml`

### 对 agent 行为

- create 行：`ntn-schema` → `ntn-create --set`
- update property：`ntn-schema` → `ntn-write --set`
- 多库：每个 datasource 各自 schema，禁止假设字段一致
- 仅未覆盖类型才降级 `ntn api` 原生

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页 / 项目页 / 回写目标：
  - `spec_standard_ref`: `repo://orbitos/99_系统/Harness/OrbitOS_Spec_Standard/OrbitOS_Spec_Standard_v0.3.1.md`
  - `project_page_ref`: `repo://orbitos/20_项目/Pi_Config/Pi_Config.md`
  - `writeback_targets`: `repo://orbitos/20_项目/Pi_Config/项目进度总览.md`
