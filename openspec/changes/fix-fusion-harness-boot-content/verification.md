# Verification

Change: `fix-fusion-harness-boot-content` · Schema: orbitos-change-v1 · Date: 2026-08-30
验证方式：reviewer subagent（fork session）独立验证 + 主会话实测证据复核。

## Spec-to-Implementation 覆盖

**Requirement: Boot Banner Context Hygiene**（`specs/fusion-harness-integration/spec.md`）

| # | Scenario | 实现位置 | 证据 | 判定 |
|---|----------|----------|------|------|
| 1 | Boot banner content is an empty array | `fusion-harness.ts` `panel()`（commit `a953ebd`） | `content: content === "" ? [] : truncateBytes(...)`；boot 调用点传入 `""` 命中空数组分支 | ✓ |
| 2 | Empty banner message is skipped by all protocol serializers | pi-ai 序列化器守卫（实现侧无需改动） | 源码确认四协议均有 `content.length === 0 → skip` 守卫（openai-completions:946 / openai-responses-shared:121 / anthropic-messages filteredBlocks / google 同族） | ✓ |
| 3 | Tool-sequence requests on OpenAI-compatible backends succeed | 同上 | **对照实验**：同一请求体（boot 空消息 + tool_calls + tool 结果 + 图片），`content: ""` → Zhipu 1210；`content: []` → 200 流式返回。pi 实跑：加载修改版扩展后 `glm-5.3-flash` 读 jpg 成功输出描述 | ✓ |
| 4 | Non-boot panels keep real text content | `panel()` 守卫形态 | 代码审读：守卫仅 `=== ""` 严格命中，非空 content 走 `truncateBytes` 原路径 | ✓（无自动化测试） |

## Task-to-Evidence 覆盖

| Task | 证据 |
|------|------|
| 1.2 C0 dev 模式 | `.pi/settings.json` 本地路径 + `pi install -l` + `pi list` 解析回 fork clone |
| 1.3 D1 全局 dedup | 全局 git 条目移除，override 记录写入 `writeback.md` |
| 2.1 实现 | commit `a953ebd`（1 file, +5/-1） |
| 2.2 测试 | fork 无 test runner（`npm test` 不存在）→ 按 pkg-fork-dev C2 降级为加载冒烟：0 错误，`pi list` 确认本地路径加载 |
| 2.3 C4 diff | 与 spec/design 批准方案逐字一致 |
| 2.4 D2/D3 本地验证 | Scenario 3 对照实验 + pi 实跑读图 200 |
| 2.5 D4 确认 | 用户于会话中明确确认「D4 确认，继续」 |
| 4.1 E1-E3a ship | commit `a953ebd` / tag `v0.2.5` / push 成功；origin/main == HEAD == `.pi/git` 克隆 == `~/.pi/agent/git` 克隆 |
| 4.2 E4-E5a 生产模式 | project/global settings 均为 `git:` 源；无本地路径残留；override 已恢复并清理 |
| 4.3 E6-E7 回写 | `forks/manifest.yaml` changes_summary 前置 v0.2.5 条目；`openspec/pkg-backlog.md` 追加 modification 记录 |

## 已知残留（记录，不阻塞）

1. **TUI boot banner 渲染未视觉验证** — headless 无法驱动交互 TUI；banner 渲染器只读 `details`（v0.2.4 已证明不读 content），预期零影响。留待用户下次 TUI session 目视确认。
2. **无自动化测试** — fork 无 test runner；验证依赖一次性对照实验（证据链完整但不可回归）。可选加固：fork 内为 `panel()` 出口加轻量单测。
3. **存量 session 历史空串 content** — 旧 session 在 openai-completions + 工具序列场景仍可能触发 1210；属 spec Non-Goals。根治在 pi 上游（convertToLlm 跳过空文本块），建议另行提 issue。
4. **主 spec 未同步** — `openspec/specs/fusion-harness-integration/spec.md` 的旧 requirement（空字符串 SHALL）将在 `/opsx-archive` 归档时由 spec delta 合并更新。

## Closeout 记录（pi-change-closeout-governance）

- 受管面评估：仓库 `.pi/settings.json` 净变化为零（dev 模式临时条目已随 E4/E5 清理，项目级 git 重复条目已移除——全局注册为准）
- Repository settings outcome: **`repo-settings-unchanged`**
- Global sync outcome: **`global-sync-confirmed-and-run`**（2026-08-30，`scripts/sync-pi-agent.sh` 执行，结果为预期 no-op；复核：全局 fusion 条目在位，全局克隆 HEAD = `a953ebd`）

## 结论

- Completeness: 15/15 tasks（ship 前的 8 项门禁待办已全部完成）
- Correctness: 1/1 requirement，4/4 scenario 有实证
- Coherence: 4/4 design decisions 遵循（汇点守卫 / 严格 `=== ""` / 数组形态 / 门禁流程）

**All checks passed. Ready for archive.**
