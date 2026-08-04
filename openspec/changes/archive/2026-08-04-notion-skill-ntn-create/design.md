# Design

## Context

行为规范见 `specs/notion/spec.md`（delta）。现状：

- `ntn-write` 内嵌 `build_property_value` + `get_page_schema`，仅服务既有 page 的 `--set`
- 无 create 脚本；agent 手写 `POST v1/pages` + 嵌套 properties
- SKILL 未强制「每库先 schema」与「property 默认走 wrapper」

目标文件均在 `.pi/skills/notion/`；全局 runtime 靠既有 `sync-pi-agent.sh`（本 change 不自动 sync）。

## Goals / Non-Goals

**Goals:**

- 满足 `ntn-create-row`：data_source → `POST v1/pages` + plain `--set` / `@file`
- 满足 `shared-property-translation`：翻译逻辑单点，write/create 共用
- 满足 `skill-docs-create-and-multi-ds`：Scripts / Workflow / Extending 三处文档补齐
- 扩展 `ntn-write-props-and-content` 的 `--set @file`，其余 write 行为兼容
- 扩展 `shared-library` 导出翻译函数，保留 `ntn_api` / `extract_id_from_url` / `resolve_id`

**Non-Goals:**

- batch create、move、filter DSL、schema cache
- relation/people/files 类型扩展
- 改 `capabilities.yaml`、自动全局 sync
- create 并入 `ntn-write`

## Decisions

1. **共享落点：`ntn_resolve.py`**  
   已有共享入口。迁入 `build_property_value`、`load_set_arg`（内联 JSON 或 `@path`）、以及按 data_source_id 取 schema 的 helper。不新建第三文件，避免目录膨胀。

2. **`ntn-create` 独立脚本，不扩展 `ntn-write` 目标语义**  
   write 解析 page；create 解析 data_source。CLI 形状对齐：`ntn-create <ds> --set ...`，输出 `{id, url, properties_set}`。

3. **schema 来源**  
   create：对 resolved `data_source_id` 调 `v1/data_sources/{id}`。  
   write：仍从 page.parent 找 data_source/database（逻辑迁共享后行为不变）。  
   database 输入：与 `ntn-schema` 相同，取第一个 data_source。

4. **`--set @file`**  
   参数以 `@` 开头则读文件；否则 `json.loads`。非法 JSON / 缺文件 → stderr JSON error。write 与 create 共用 `load_set_arg`。

5. **类型覆盖**  
   直接迁移现有 `build_property_value` 分支，不扩类型。未知/无 schema → rich_text 回退（与现状一致）。

6. **文档**  
   - Scripts：加 `ntn-create`  
   - Workflow：多 datasource 提醒 + create/update 默认路径  
   - Extending：删除 `ntn-create` 候选  
   保留既有 safe-replace 指引，不回退。

7. **验证策略**  
   - 静态：`ast.parse`、`--help`、共享 import 存在  
   - 可选 live：用户提供可写 probe data_source 时 create → write → 人工 trash；无 live 环境则静态 + dry 逻辑自检（load_set_arg / build_property_value 单元式 `__main__` 或一次性 python -c）即可合入，live 标 deferred

## Risks / Migration

| 风险 | 缓解 |
|------|------|
| 抽共享时改坏 write `--set` | 先搬函数再改 import；行为对照既有分支；不改 type 映射 |
| agent 仍手写 `ntn api` | SKILL 明确默认路径；Extending 去掉 create 候选 |
| 全局 runtime 与仓库漂移 | closeout 记录 sync 待确认；不自动 sync |
| `@file` 路径歧义 | 相对 cwd 解析；失败即 JSON error |
| database 多 data_source 取 first 不符合预期 | 与 `ntn-schema` 一致；文档要求优先传 data_source id |

迁移：仓库改完后，用户确认再 `scripts/sync-pi-agent.sh`。无数据迁移。
