# Binding

## 标准与项目页面绑定

- `spec_standard_ref`: 无外部标准页引用（本 change 为项目级 AGENTS.d 补充，不涉及 orbitos 规范页）
- `project_page_ref`: `.pi/agent/AGENTS.md`、`.pi/agent/AGENTS.d/tool-ask-user.md`
- `additional_context_refs`: `.pi/npm/node_modules/@eko24ive/pi-ask/src/ask-tool-helpers.ts`（ASK_TOOL_PROMPT_GUIDELINES 源码）、`.pi/npm/node_modules/@eko24ive/pi-ask/skills/ask-user/SKILL.md`（bundled skill）

## Source of Truth

- 行为规范真源：`specs/ask-user-guidance/spec.md`（本 change 创建）
- 项目页面角色：上下文输入 / 治理展示 / 结果回写
- 非真源说明：`AGENTS.md` 和 `AGENTS.d/tool-ask-user.md` 是规范的实施载体（通过 sync 脚本部署），不是规范本身

## 回写目标

- `writeback_targets`: `repo://pi-config` → `.pi/agent/AGENTS.d/tool-ask-user.md`（新建）、`.pi/agent/AGENTS.md`（修改引用节）
- `writeback_owner`: 本 change 执行者
- `writeback_timing`: apply 阶段直接写入，不依赖外部同步

## 同步约束

- 页面与 spec 不一致时，以 `specs/` 为准
- 回写只同步结论、状态、摘要与链接，不复制整份 spec/design/tasks
- `AGENTS.md` 和 `AGENTS.d/` 通过 `scripts/sync-pi-agent.sh` 同步到 `~/.pi/agent/`，apply 后需提示用户确认同步

## 待确认项

- [x] 已确认标准页引用（不涉及外部标准页）
- [x] 已确认项目页引用（AGENTS.md + AGENTS.d/tool-ask-user.md）
- [x] 已确认回写目标与权限（均为本仓库可写文件）
- [x] 已确认异常处理与冲突策略（sync 前需用户确认）
