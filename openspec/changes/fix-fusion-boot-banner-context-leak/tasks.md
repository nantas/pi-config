# Tasks

## 1. Spec 覆盖与实现准备

- [ ] 1.1 确认 `specs/fusion-harness-integration/spec.md` 中 Boot Banner Context Hygiene 的实现边界：仅 `fusion-harness.ts:1767` 的 boot `panel()` 调用
- [ ] 1.2 确认 fork clone 可写：`~/.pi/agent/git/github.com/nantas/fusion-harness/extensions/fusion-harness/fusion-harness.ts`
- [ ] 1.3 grep fork clone 确认无其它代码读取 boot 消息的 `content` 字段（验证 D1 风险缓解）

## 2. 核心实现任务

- [ ] 2.1 修改 `fusion-harness.ts:1767`：将 `panel({ kind: "boot", ok: true }, "FUSION HARNESS")` 改为 `panel({ kind: "boot", ok: true }, "")`（spec: Boot Banner Context Hygiene · Scenario: Boot banner content is empty）
- [ ] 2.2 验证改动后该行 `content` 实参为空字符串，且 `details`（`{ kind: "boot", ok: true }`）与 `display: true`（由 `panel()` 内部提供）保持不变
- [ ] 2.3 在 fork clone 内启动一个 TUI session（`pi -e extensions/fusion-harness/fusion-harness.ts` 或已安装的全局 pi），确认 boot banner 视觉渲染完全不变（spec: Scenario: Boot banner visual rendering is unchanged）

## 3. 收敛与验证准备

- [ ] 3.1 确认其它 panel（`prompt`/`banner`/`duo`/`opinion`/`fused` 等）的 content 未被改动（spec: Scenario: Other panels keep their semantic content）
- [ ] 3.2 确认 headless / 非 startup session 路径未受影响（spec: Scenario: Headless and non-startup sessions are unaffected）—— 本次未改 `session_start` 守卫，逻辑天然成立
- [ ] 3.3 准备 verification 证据：boot 消息 content 为空的源码证据 + banner 渲染截图/目测记录

## 4. 验证与回写收敛

- [ ] 4.1 基于真实实现结果生成 verification.md（spec-to-implementation 映射 + task-to-evidence）
- [ ] 4.2 基于 verification.md 结论生成 writeback.md（回写目标：fork 源码 + manifest）
- [ ] 4.3 执行 writeback：更新 `forks/manifest.yaml` 的 `changes_summary` 追加本次修复条目；记录可审计证据
- [ ] 4.4 全局 sync 明确延后（不在本 change 执行 `scripts/sync-pi-agent.sh`），在 writeback 中记录"sync deferred"
