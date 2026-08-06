# Binding

## 标准与项目页面绑定

- `spec_standard_ref`: `openspec/specs/pi-fff-env-config/spec.md`（本仓 pi-config，capability = `pi-fff-env-config`）
- `project_page_ref`:
  - `.pi/capabilities.yaml`（`global.env.pi-fff.PI_FFF_MODE` 声明值与描述）
  - `~/.zshenv`（`PI_FFF_MODE` 实际 export，runtime SSOT）
- `additional_context_refs`:
  - pi-fff v0.10.1 源码：`~/.pi/agent/npm/node_modules/@ff-labs/pi-fff/src/index.ts`（确认无 `setEditorComponent` 调用，已迁移至 `addAutocompleteProvider`）
  - pi-powerline 源码：`~/.pi/agent/git/github.com/jwu/pi-powerline/extensions/editor.ts:184`（`setEditorComponent` 排他 API 使用方）

## Source of Truth

- 行为规范真源：`specs/pi-fff-env-config/spec.md`（本次 change 在其下新增 `PI_FFF_MODE` requirement）
- 项目页面角色：上下文输入 / 治理展示 / 结果回写
- 非真源说明：`.pi/capabilities.yaml` 和 `~/.zshenv` 仅承载配置值，不替代 spec delta 作为实现与验证依据

## 回写目标

- `writeback_targets`:
  - 本仓 `.pi/capabilities.yaml` → `global.env.pi-fff.variables.PI_FFF_MODE`（值 `tools-only` → `override`，描述更新）—— 已完成
  - 全局 `~/.zshenv:19` → `export PI_FFF_MODE`（值 `tools-only` → `override`）—— 已完成
- `writeback_owner`: 本 change 实现者（change 创建时已同步执行）
- `writeback_timing`: 即时（env 值翻转 + sync-pi-agent.sh 已跑，重启 pi 后生效）

## 同步约束

- 页面与 spec 不一致时，以 `specs/` 为准
- 回写只同步结论、状态、摘要与链接，不复制整份 spec/design/tasks
- `global.env` 为声明性 schema：sync 脚本仅校验 `os.environ`，不写文件；真正生效值必须由 `~/.zshenv` export
- 两处值（capabilities.yaml 声明 + zshenv export）必须一致，否则 sync 报 WARNING

## 待确认项

- [x] 已确认标准页引用（`openspec/specs/pi-fff-env-config/spec.md`）
- [x] 已确认项目页引用（`.pi/capabilities.yaml` + `~/.zshenv`）
- [x] 已确认回写目标与权限（本仓文件，直接编辑）
- [x] 已确认异常处理与冲突策略（用户实测 `@` 补全与 powerline 共存通过；若未来 powerline 回归排他行为，降级为 `tools-and-ui`）
