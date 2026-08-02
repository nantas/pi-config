# Binding

## 标准与项目页面绑定

- `spec_standard_ref`: `repo://orbitos/99_系统/Harness/OrbitOS_Spec_Standard/OrbitOS_Spec_Standard_v0.3.1.md`
- `project_page_ref`:
  - `CONTEXT.md`（OpenSpec 索引，x-reach-skill slug 已登记，本 change 不新增 slug）
  - `.pi/capabilities.yaml`（manifest，本 change 不改条目，skill 已注册）
- `additional_context_refs`:
  - `openspec/specs/x-reach-skill/spec.md` — x-reach-skill 主 spec（本 change 对其 R5/R9 做 MODIFIED，新增 R10）
  - `openspec/changes/archive/2026-08-02-add-x-reach-skill/` — 原 change（引入错误多账号工作流的来源）
  - `.pi/skills/x-reach/{SKILL.md, references/setup.md, references/architecture.md, scripts/x-reach-grab-cookie.sh}` — 待修正的实现文件
  - twscrape 源码证据：`xclid.py`（`XClIdAccountError` 触发于 `entry-client-logged-out` bundle 检测）、`queue_client.py`（捕获后冷却 15min 换号，本质已失效）
  - twscrape issue #268（2 年生产用户经验：账号轮换不封号；`login_accounts` + 每账号绑定独立代理为正道）

## Source of Truth

- 行为规范真源：`specs/x-reach-skill/spec.md`（本次 change 对既有主 spec 做 MODIFIED + ADDED delta）
- 项目页面角色：上下文输入 / 治理展示 / 结果回写
- 非真源说明：项目页面不得替代 spec delta 作为实现与验证依据

## 回写目标

- `writeback_targets`: 无（CONTEXT.md 已登记 `x-reach-skill` slug；本 change 是 spec/文档修正，不新增能力域分组条目）
- `writeback_owner`: 本 change 实现者
- `writeback_timing`: 不需要页面回写

## 同步约束

- 页面与 spec 不一致时，以 `specs/` 为准
- 回写只同步结论、状态、摘要与链接，不复制整份 spec/design/tasks
- `~/.x-reach/accounts.db`（含 cookie）仍为本机敏感数据，永不进仓、永不同步（延续 ADR-001）
- 同步到全局 runtime 需用户确认后执行 `scripts/sync-pi-agent.sh`，仅同步文档与脚本
- 不修改 `.pi/skills/agent-reach/`

## 待确认项

- [x] 已确认标准页引用（OrbitOS Spec Standard v0.3.1，与原 change 一致）
- [x] 已确认项目页引用（CONTEXT.md + capabilities.yaml，均无需变更）
- [x] 已确认回写目标（无需页面回写，纯 spec/文档修正）
- [x] 已确认根因与修正方向（twscrape 源码 + README + issue #268 实战证据齐全，见 design.md）
