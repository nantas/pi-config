# Binding

## 标准与项目页面绑定

- `spec_standard_ref`: `repo://orbitos/99_系统/Harness/OrbitOS_Spec_Standard/OrbitOS_Spec_Standard_v0.3.1.md`
- `project_page_ref`:
  - `CONTEXT.md`（OpenSpec 索引，归档后追加 `x-reach-skill` slug）
  - `.pi/capabilities.yaml`（manifest 治理真源，`global.skills` 追加 `x-reach`）
- `additional_context_refs`:
  - `.pi/skills/agent-reach/SKILL.md` + `references/social.md` — agent-reach twitter 模块现状（分工参照，本 change 不改 agent-reach）
  - `vladkens/twscrape` README — twscrape CLI 能力面、账号池、JSONL 输出、环境变量（`TWS_PROXY`/`TWS_RAISE_WHEN_NO_ACCOUNT` 等）
  - `docs/reference/pi-provider-model.md` / `docs/reference/readme-governance.md` — README 与能力描述评估参照

## Source of Truth

- 行为规范真源：`specs/x-reach-skill/spec.md`（本次 change 新增 capability spec）
- 项目页面角色：上下文输入 / 治理展示 / 结果回写
- 非真源说明：`CONTEXT.md`、`.pi/capabilities.yaml`、SKILL.md 文档仅承担展示与治理登记，不替代 spec delta 作为实现与验证依据

## 回写目标

- `writeback_targets`: `CONTEXT.md`（归档后 OpenSpec 索引追加 `x-reach-skill`）
- `writeback_owner`: 本 change 实现者
- `writeback_timing`: verification 通过、change 进入 archive 阶段后追加 CONTEXT.md 索引

## 同步约束

- 页面与 spec 不一致时，以 `specs/` 为准
- 回写只同步结论、状态、摘要与链接，不复制整份 spec/design/tasks
- `~/.x-reach/accounts.db`（含 X cookie）为本机敏感数据，**永不进 pi-config 仓库、永不随 `sync-pi-agent.sh` 同步**；仓库只保留 `accounts.txt.example` 占位模板
- 同步到全局 runtime（`~/.pi/agent/skills/x-reach/`）需用户确认后执行 `scripts/sync-pi-agent.sh`，且仅同步文档与 init 脚本，不同步任何 cookie/db
- 不修改 `.pi/skills/agent-reach/`（与 agent-reach 按场景分工，靠 description wording 区分，不动其文档）

## 待确认项

- [x] 已确认标准页引用（OrbitOS Spec Standard v0.3.1）
- [x] 已确认项目页引用（CONTEXT.md + capabilities.yaml）
- [x] 已确认回写目标与权限（CONTEXT.md，repo-local，无跨仓 writeback）
- [x] 已确认异常处理与冲突策略（twscrape 同样依赖 GraphQL 端点，端点失效靠上游维护者跟进，非本 skill 可控；账号池轮换处理限流，详见 design.md「预期管理」）
