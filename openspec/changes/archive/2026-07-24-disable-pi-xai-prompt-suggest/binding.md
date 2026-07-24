# Binding

## 标准与项目页面绑定

- `spec_standard_ref`: `.pi/skills/pkg-fork-dev/SKILL.md`（fork 包修改生命周期）
- `project_page_ref`:
  - `repo://pi-xai` → `/Users/nantasmac/projects/forks/pi-xai`（开发 clone）
  - `forks/manifest.yaml`（fork 注册元数据）
- `additional_context_refs`:
  - `repo://pi-xai/xai-prompt-suggest.ts`（目标模块）
  - `repo://pi-xai/index.ts`（注册入口）
  - `.pi/capabilities.yaml`（`git:github.com/nantas/pi-xai` 包条目）
  - `.pi/settings.json`（当前 packages 源）

## Source of Truth

- 行为规范真源：`specs/pi-xai-prompt-suggest/spec.md`
- 项目页面角色：上下文输入 / 治理展示 / 结果回写
- 非真源说明：项目页面与 fork README 不得替代 spec delta 作为实现与验证依据

## 回写目标

- `writeback_targets`:
  - `repo://pi-xai`（包源码：`index.ts` / 文档 / 版本）
  - `forks/manifest.yaml`（`changes_summary` 追加）
- `writeback_owner`: pi-config change owner；实现在 `repo://pi-xai`，治理记录在 pi-config
- `writeback_timing`: 实现与验证通过后，commit/tag/push fork，再恢复 production `git:` 源并更新 manifest

## 同步约束

- 页面与 spec 不一致时，以 `specs/` 为准
- 回写只同步结论、状态、摘要与链接，不复制整份 spec/design/tasks
- 运行时加载路径遵循 pkg-fork-dev：开发期用 `file:` 本地路径，ship 后回 `git:github.com/nantas/pi-xai`
- 全局 `~/.pi/agent/settings.json` 与仓库 `.pi/settings.json` 的 packages 源变更需防 double-load（dev 路径与 git 源不可并存）

## 待确认项

- [x] 已确认标准页引用（pkg-fork-dev）
- [x] 已确认项目页引用（pi-xai clone + forks/manifest）
- [x] 已确认回写目标与权限（fork 仓库可写；pi-config manifest 可写）
- [x] 已确认异常处理与冲突策略：以 `specs/` 为准；源切换冲突按 pkg-fork-dev 全局 dedup 门禁处理
