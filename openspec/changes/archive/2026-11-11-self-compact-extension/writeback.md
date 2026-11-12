# Writeback

## 结论摘要

`self-compact` 扩展实现完成并通过静态/单元/加载验证：纯百分比三档水位线（10% / 20% / forced 30%，硬上限 90%）只负责提醒，真正压缩由 agent 在自然边界以 `self_compact` 写六字段 Handoff 卡片完成；Jev System One 四问门控在 `mid_operation` 期间保持沉默，不可用时降级为水位线判定；`.pi/managed/sol-pi.json` 关闭 `onlineContextCompact`，两层职责不再竞争。

## 回写目标与内容

### 1. `CONTEXT.md`（仓库内）

- 已在「OpenSpec 索引 → 扩展」表新增一行：
  `| 自压缩、交接卡片、Jev 边界门控 | self-compact（change: self-compact-extension，主 spec 待归档生成） |`
- 归档（`/opsx-archive`）生成主 spec 后，把该行的 slug 收敛为 `self-compact`，去掉 change 括号说明。

### 2. `repo://orbitos/20_项目/Pi_Config/项目进度总览.md`（OrbitOS 项目进度页）

- 解析路径：`/Users/nantasmac/projects/obsidian-mind/20_项目/Pi_Config/项目进度总览.md`
- 落位依据：项目主页声明的 `进度页落位` 策略 —— 主页只保留规则与入口，回写明细进进度页
- 追加一节 `## Change 回写 · self-compact-extension（2026-11-12）`，内容为结论、交付、验证、状态，不复制 spec/design 正文

### 3. 不回写的目标

- `repo://orbitos/20_项目/Pi_Config/Pi_Config.md`：本次只是新增能力落位，不改项目定位/主线判断，主页不写明细
- 运行时副本（`~/.pi/agent/extensions/self-compact/`、`~/.pi/agent/self-compact.json`、`~/.pi/agent/sol-pi.json`）：属全局同步操作，需用户确认后由 `scripts/sync-pi-agent.sh` 完成，不走 writeback

## 执行证据

- `CONTEXT.md` 已更新（见 `grep -n self-compact CONTEXT.md`）
- `openspec/changes/self-compact-extension/verification.md` 记录 64 项单测通过、`tsc --strict` 零错误、22 项注册与端到端流程模拟
- 进度页追加位置：文件末尾，紧接上一节 `Change 回写 · notion-skill-ntn-create`
