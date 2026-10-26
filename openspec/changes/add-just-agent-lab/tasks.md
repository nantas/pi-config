# Tasks

## 1. Spec 覆盖与实现准备

- [x] 1.1 通读 `specs/just-agent-lab/spec.md` 的 9 个 requirement，建立 requirement → 任务映射；确认全部 requirement 均有对应实现任务（spec「Capability 对齐」为唯一验收清单）
- [x] 1.2 前置确认（design.md 待确认项）：经 `repo://pi-mono` 确认 `PI_SUBAGENT_NAME` 在 subagent 工具调用链中的传递方式，并确认 `pi.exec` 与工具输出截断工具的确切 API（extensions.md/skills.md）；若结论与 D1/D2 假设不符，先更新 design.md 再开工
- [x] 1.3 以官方 Just release 实测核对 arm64 tar.gz 资产及其 SHA256，确定钉扎版本（design D4；禁止沿用未验证的版本号）

## 2. 核心实现任务

- [x] 2.1 实现 `scripts/bootstrap-just.sh`：平台守卫（非 darwin/arm64 明确失败）→ 下载钉扎资产 → SHA256 校验 → 解压安装至 `.scratch/bin/just`；运行一次完成安装。验证：`.scratch/bin/just --version` 输出钉扎版本；篡改 SHA256 时脚本失败退出（spec「可审计 Just Bootstrap」三个场景）
- [x] 2.2 实现根 `justfile` 六个 Approved Recipes（status/diff/test/validate-openspec/check-extension/verify），全部带 `[metadata("agent:approved")]`，位置参数 + quote；`check-extension` 内置 `.pi/extensions` `.ts` 路径守卫。验证：`just --list` 恰好六项；越界路径被拒（spec「初始 Approved Recipe 集」两场景）
- [x] 2.3 实现 `.pi/extensions/just-agent-lab/`（`index.ts` 工具 + `policy.ts` 纯策略，目录型防 discovery 误载策略文件）：`just` 工具四动作（list/show/run/propose）、`pi.exec` argv 执行、flag 黑名单拒绝、`--dump --dump-format json` 解析与默认拒绝、propose 落盘 bundle、Pi 标准截断；策略函数导出为纯函数。验证：单元测试覆盖默认拒绝、flag 拒绝、propose 不触正式 justfile（spec「Just 工具四动作契约」三场景）
- [x] 2.4 同 extension 内实现 Run Trace：`PI_SUBAGENT_NAME=just-worker` 识别、惰性创建 `.scratch/just-agent-runs/<run-id>/`、JSONL 全量工具调用留痕（脱敏/截断参数摘要、路径、状态、时长），无自动清理。验证：tmpdir 测试断言 trace 记录字段与脱敏行为（spec「Run Trace 与 Experiment Bundle 记录」两场景）
- [x] 2.5 实现 `.agents/just-worker.md`：model `zhipuai-coding-plan/glm-5.2`、工具白名单 `read, ffgrep, fffind, ls, edit, write, just`、契约正文（从 `just: list` 开始、缺口→`propose`、固定六字段 Markdown 收尾、行为边界声明）。验证：`/agents` 列表可见且配置与 spec「受限 Agent just-worker 契约」一致
- [x] 2.6 实现 `.agents/skills/just-agent-lab/SKILL.md`：仅显式调用、preflight → fork 委派 → 失败即停 → 读 bundle/report → 双轴评估 → 根因归类 → ≤1 个 Root-Cause Change Set → 等待批准。验证：人工走查 SKILL.md 覆盖 spec「编排 Skill」全部场景（含合法 blocked 组合与禁止回退）
- [x] 2.7 实现 `tests/just-agent-lab.test.mjs`（node:test，策略层纯函数 + tmpdir），并删除 `tests/subagent-dispatch-core.test.mjs`。验证：`node --test tests/just-agent-lab.test.mjs` 全绿；`grep -r "subagent-dispatch-core" tests/` 无结果（spec「焦点测试与遗留测试清理」场景）
- [x] 2.8 治理更新：`.pi/capabilities.yaml` catalog.extensions 追加 just-agent-lab（仅 extension，无 agent/skill 条目）；按 readme-governance 更新 `README.md` 与 `docs/getting-started.md`。验证：`scripts/sync-pi-agent.sh` dry-run 或等价检查无漂移新增（spec「能力清单与文档治理」场景 1）

## 3. 收敛与验证准备

- [x] 3.1 验证检查点清单：six-recipe 完整性、flag 黑名单、trace 留痕与脱敏、propose 边界、bootstrap 校验失败路径、catalog 边界、closeout 记录「全局 sync 未运行」——汇总为 verification.md 输入证据
- [ ] 3.2 执行首次探索性运行：由用户在 verification 检查点提供真实任务，走 `$just-agent-lab` 全流程，产出 Experiment Bundle + 父 Agent 双轴评估（Compliance Outcome / Task Outcome）
- [ ] 3.3 基于运行证据提出至多一个 Root-Cause Change Set（2–3 项相关变更），获用户显式批准后实施并复验一次；无证据支持的改动不夹带
- [ ] 3.4 标记进入 writeback 的摘要与状态：CONTEXT.md OpenSpec 索引条目、README/getting-started 已在 2.8 完成的能力描述、closeout 结论

## 4. 验证与回写收敛

- [ ] 4.1 基于真实实现结果生成或更新 verification.md（覆盖 spec-to-implementation 与 task-to-evidence，含 3.2/3.3 运行证据）
- [ ] 4.2 基于 verification.md 结论生成或更新 writeback.md（目标、字段映射、前置条件）
- [ ] 4.3 执行 writeback.md 定义的回写（CONTEXT.md 索引等），记录可审计证据（链接、时间、执行人、结果）；closeout 遵循 `docs/pi-change-closeout-governance.md` 并记录全局 sync 未运行及原因
