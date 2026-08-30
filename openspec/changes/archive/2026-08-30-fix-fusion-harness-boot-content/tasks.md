# Tasks

> 开发过程遵守 `pkg-fork-dev` 工作流；规范依据 `specs/fusion-harness-integration/spec.md`，实现依据 `design.md`。
> fork dev clone：`repo://fusion-harness` → `/Users/nantasmac/projects/forks/fusion-harness`

## 1. Spec 覆盖与实现准备

- [x] 1.1 确认 spec 实现范围与边界：仅 `extensions/fusion-harness/fusion-harness.ts` 的 `panel()` 出口分流（空串 → 空数组），不触碰 pi 本体、不清洗存量 session（对照 specs 的 MODIFIED requirement 四个 Scenario）
- [x] 1.2 **pkg-fork-dev Phase C0 门禁**：验证 `.pi/settings.json` 中 fusion-harness 处于 development 模式（本地绝对路径）。当前为 `git:` 生产源 → 按 skill 流程切换：manifest 解析 clone 路径 → settings.json 换本地路径 → `pi install -l` → 复验通过
- [x] 1.3 **pkg-fork-dev Phase D1 门禁（前置执行）**：检测 `~/.pi/agent/settings.json` 全局 packages 中 `git:github.com/nantas/fusion-harness` 条目，临时移除并按 D1a 规范将 override 记录写入本 change `writeback.md`（恢复依据）

## 2. 核心实现任务

- [x] 2.1 修改 `panel()`（`extensions/fusion-harness/fusion-harness.ts:1614`）：`content` 为 `""` 时发送 `[]`，否则维持 `truncateBytes(content, ANSWER_MAX_BYTES)`；附注释说明空串会经 pi `convertToLlm` 变成空文本块 user 消息、被 OpenAI 兼容后端（Zhipu 1210）拒绝的因果链
- [x] 2.2 运行 fork 仓库现有测试套件（`npm test`，含 `child-extensions.test.ts`、`merge-source.test.ts`）确认无回归；无 test script 则用加载冒烟（`node -e require` 等价物 / TS 编译检查）替代
- [x] 2.3 **Phase C4**：向用户展示 `git diff` 并确认后进入本地测试
- [x] 2.4 **Phase D2/D3 本地测试**：pi TUI `/reload` 后验证 (a) 扩展加载无警告；(b) boot banner 渲染正常（Scenario: 空数组 content / 渲染零损失）；(c) 用本地记录代理捕获新 session 的请求体，确认不含空文本块消息；(d) glm-5.3-flash 读图请求 200 无 1210（Scenario: Tool-sequence requests succeed；多模态不受影响）
- [x] 2.5 **Phase D4**：本地测试通过后向用户确认进入 Commit & Ship

## 3. 收敛与验证准备

- [x] 3.1 汇总 verification 证据清单：最小复现矩阵（修复前 FAIL → 修复后 OK）、代理抓包对比、测试套件结果、TUI 渲染截图/描述、读图 200 证据
- [x] 3.2 标记 writeback 项：fork push（repo://fusion-harness）、`forks/manifest.yaml` changes_summary、`openspec/pkg-backlog.md` modification 记录、全局 override 恢复

## 4. 验证与回写收敛

- [x] 4.1 **Phase E1-E3a**：conventional commit + semver tag（v0.2.5）+ push；E3a 门禁验证 origin/main 与 HEAD 一致、`.pi/git/` 克隆同步
- [x] 4.2 **Phase E4-E5a**：切回生产模式（settings.json → `git:` URL）、按 writeback.md override 记录恢复全局 packages、`pi install -l` 远端重装、门禁复验（E4a/E5a：无本地路径残留、克隆 HEAD 一致、override 记录清除）
- [x] 4.3 **Phase E6-E7 回写**：更新 `forks/manifest.yaml` changes_summary（追加 v0.2.5 描述）；`openspec/pkg-backlog.md` 追加 modification 记录；记录可审计证据（commit hash、tag、时间）
- [x] 4.4 基于真实实现结果生成 verification.md（spec-to-implementation 与 task-to-evidence 覆盖）
- [x] 4.5 基于 verification.md 结论完善 writeback.md 并执行回写
