# Binding

## 标准与项目页面绑定

- `spec_standard_ref`: `repo://orbitos/99_系统/Harness/OrbitOS_Spec_Standard/OrbitOS_Spec_Standard_v0.3.1.md`
- `project_page_ref`: `repo://orbitos/20_项目/Pi_Config/Pi_Config.md`
- `additional_context_refs`:
  - `.pi/skills/notion/SKILL.md` — notion skill 文档；本 change 修正 `--replace` 误导并补充 `--safe-replace` 指引
  - `.pi/skills/notion/scripts/ntn-write` — 页面写入脚本；本 change 新增 `--safe-replace`
  - `.pi/skills/notion/scripts/ntn-edit` — 块级 `update_content` 安全编辑路径（对照实现，不改行为）
  - `openspec/specs/notion/spec.md` — 既有 notion capability 主 spec（本 change 对其增量修改）
  - `docs/plans/notion-skill-replace-childpage-trap-handoff.md` — 外部仓库问题汇报与修改方案
  - `.scratch/fusion-harness/fusion-harness-o9p9QA/fused-report-deepseek-v4-pro-glm-5.2.md` — 融合方案与裁决
  - `.scratch/fusion-harness/fusion-harness-o9p9QA/ntn-write-fused-deepseek-v4-pro-glm-5.2` — 融合版 ntn-write 参考实现
  - `.scratch/fusion-harness/fusion-harness-o9p9QA/SKILL-patches-fused-deepseek-v4-pro-glm-5.2.md` — SKILL.md 三处补丁参考
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
- 本 change 修改 `.pi/skills/notion/`（SKILL.md + scripts/ntn-write）；同步到全局 runtime 需用户确认后执行 `scripts/sync-pi-agent.sh`
- 不修改 `ntn-edit`、`ntn-resolve`、`capabilities.yaml`（skill 已注册）
- 不在本 change 中处理 `ntn-resolve` slug URL 独立 friction

## 待确认项

- [x] 已确认标准页引用
- [x] 已确认项目页引用
- [x] 已确认回写目标与权限
- [x] 已确认异常处理与冲突策略：以 fusion 裁决为准（扩展 ntn-write、保留 --replace、暂不做预检/URL 正则）
