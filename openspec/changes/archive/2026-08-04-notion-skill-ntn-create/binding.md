# Binding

## 标准与项目页面绑定

- `spec_standard_ref`: `repo://orbitos/99_系统/Harness/OrbitOS_Spec_Standard/OrbitOS_Spec_Standard_v0.3.1.md`
- `project_page_ref`: `repo://orbitos/20_项目/Pi_Config/Pi_Config.md`
- `additional_context_refs`:
  - `.pi/skills/notion/SKILL.md` — notion skill 文档；本 change 登记 `ntn-create`，补多 datasource 与 property 默认写路径指引
  - `.pi/skills/notion/scripts/ntn-write` — 既有 property 更新；抽取共享翻译逻辑并支持 `--set @file.json`
  - `.pi/skills/notion/scripts/ntn_resolve.py` — 共享库；承接 property 翻译与 schema 读取
  - `openspec/specs/notion/spec.md` — 既有 notion capability 主 spec（本 change 对其增量修改）
  - `docs/plans/notion-skill-multi-datasource-and-create-handoff.md` — 外部 session 问题汇报与改动建议
  - `openspec/changes/archive/2026-07-24-notion-skill-safe-replace/` — 最近一次 notion skill 增量（safe-replace）
  - `openspec/changes/archive/2026-06-13-add-notion-cli-skill/` — notion skill 原始引入 change

## Source of Truth

- 行为规范真源：`specs/notion/spec.md`
- 项目页面角色：上下文输入 / 治理展示 / 结果回写
- 非真源说明：项目页面不得替代 spec delta 作为实现与验证依据

## 回写目标

- `writeback_targets`: `repo://orbitos/20_项目/Pi_Config/项目进度总览.md`
- `writeback_owner`: pi-config change owner（当前仓库）
- `writeback_timing`: verification 完成、change 进入 archival 阶段

## 同步约束

- 页面与 spec 不一致时，以 `specs/` 为准
- 回写只同步结论、状态、摘要与链接，不复制整份 spec/design/tasks
- 本 change 修改 `.pi/skills/notion/`（SKILL.md + scripts）；同步到全局 runtime 需用户确认后执行 `scripts/sync-pi-agent.sh`
- 不修改 `capabilities.yaml`（`notion` 已在 `global.skills`）
- 不扩展 relation/people/files 等未覆盖 property 类型；不新增 `ntn-batch-edit` / `ntn-move`
- 不把 create 塞进 `ntn-write`（write 目标是既有 page，create 目标是 data_source）

## 待确认项

- [x] 已确认标准页引用
- [x] 已确认项目页引用
- [x] 已确认回写目标与权限
- [x] 已确认异常处理与冲突策略：以用户确认的 A+B 方案为准（`ntn-create` + SKILL 文档；含 `--set @file.json`）
- [x] 已确认 capabilities：仅 Modified `notion`，无 New Capability
