# Binding

## 标准与项目页面绑定

- `spec_standard_ref`: `repo://orbitos/99_系统/Harness/OrbitOS_Spec_Standard/OrbitOS_Spec_Standard_v0.3.1.md`
- `project_page_ref`:
  - `repo://orbitos/20_项目/Pi_Config/Pi_Config.md`（项目主页，治理判断与索引入口）
  - `.pi/capabilities.yaml`（manifest 实例：新增 `global.extensions` 条目 `self-compact`、`global.files` 条目 `self-compact.json: managed/self-compact.json`、`global.env` 条目 `self-compact`）
  - `.pi/managed/sol-pi.json`（SoL-Pi 托管配置：将 `onlineContextCompact` 设为 `false`，消除与 `self-compact` 的 hook 竞争）
  - `.pi/managed/self-compact.json`（`self-compact` 托管默认配置：三档百分比阈值、Jev 供应商与超时参数）
  - `CONTEXT.md`（领域模型与 OpenSpec 索引）
  - `README.md` / `docs/getting-started.md`（按 `docs/reference/readme-governance.md` 同步扩展能力说明）
- `additional_context_refs`:
  - `/Users/nantasmac/projects/my-wiki/20-synthesis/digest/讲座/IndyDevDan/near-the-loop/self-compact.md`（IndyDevDan Self-Compaction 设计精要）
  - `/Users/nantasmac/projects/my-wiki/20-synthesis/design-docs/durable-agents/stacks/jev.md`（Jev System One 决策门控与 Level 7 智能压缩设计）
  - `/Users/nantasmac/projects/my-wiki/20-synthesis/design-docs/durable-agents/stacks/indiedevdan-patterns.md`（自压缩状态机、崩溃恢复与上下文水印）
  - `/Volumes/Shuttle/projects/data/dan-repo/self-compact-pi-agent/apps/self-compact/extensions/self-compact/`（`self-compact` 参考实现：状态机、阈值计算、进度条与模板）
  - `/Volumes/Shuttle/projects/data/dan-repo/ten-levels-of-jev/apps/ten-levels/`（`jev-compact.ts`、`src/core/client.ts`、`src/levels/level07/{should-compact.ts,pick-cut-point.ts}` 参考实现）
  - `/Users/nantasmac/.pi/agent/git/github.com/NVlabs/SoL-Pi/src/sol-pi/extensions/`（SoL-Pi 观测减重层与 `online-context-compact` 源码）
  - `openspec/specs/extension-self-dedup/spec.md`（扩展自去重规范）
  - `openspec/specs/capability-manifest/spec.md`、`openspec/specs/capabilities-env-schema/spec.md`（清单与环境变量治理规范）
  - `docs/pi-change-closeout-governance.md`（verification 与全局同步收尾规范）

## Source of Truth

- 行为规范真源：`specs/self-compact/spec.md`（本次 change 新增的核心能力 spec delta）
- 项目页面角色：上下文输入 / 治理展示 / 结果回写
- 非真源说明：`repo://orbitos/20_项目/Pi_Config/Pi_Config.md`、`.pi/capabilities.yaml`、`CONTEXT.md` 及 `README.md` 均不替代 `specs/self-compact/spec.md` 作为实现与验证依据

## 回写目标

- `writeback_targets`:
  - `CONTEXT.md`（在「OpenSpec 索引 → 扩展」表中注册 `self-compact`）
  - `repo://orbitos/20_项目/Pi_Config/Pi_Config.md`（项目页摘要回写：`self-compact` 扩展与 `SoL-Pi` 协同分层结论）
- 运行时副本（非 repo 回写，属全局同步操作，需在 verification 阶段获用户确认后执行 `scripts/sync-pi-agent.sh`）：
  - `~/.pi/agent/extensions/self-compact/`
  - `~/.pi/agent/self-compact.json`
  - `~/.pi/agent/sol-pi.json`
- `writeback_owner`: 本 change 实现者（agent）
- `writeback_timing`: verification 完成后按 `docs/pi-change-closeout-governance.md` 确认全局同步；归档阶段（`/opsx-archive`）更新 `CONTEXT.md` 索引并回写 `repo://orbitos/20_项目/Pi_Config/Pi_Config.md`

## 同步约束

- 页面与 spec 不一致时，以 `specs/self-compact/spec.md` 为准
- 回写只同步结论、状态、摘要与链接，不复制整份 spec/design/tasks
- orbitos 项目页回写须经 `repo-registry` 解析 `repo://orbitos` 路径后直接编辑目标文件

## 待确认项

- [x] 已确认标准页引用（`OrbitOS_Spec_Standard_v0.3.1.md`）
- [x] 已确认项目页引用与参考源码路径
- [x] 已确认回写目标与权限
- [x] 已确认异常处理与冲突策略（全局同步执行与否由用户在 closeout 阶段确认）
