# Tasks

## 1. Spec 覆盖与实现准备

- [x] 1.1 确认 `global-agent-md-sync` spec 中 4 个 requirement 的覆盖范围与边界
- [x] 1.2 确认同步脚本修改方案（独立同步步骤，不走 MAPPINGS file 类型）

## 2. 核心实现任务

### 2.1 创建 `.pi/agent/AGENTS.md`
- [x] 2.1 创建目录 `.pi/agent/`，写入 `AGENTS.md` 工具调用指导
  - 覆盖 spec: Project-Managed AGENTS.md
  - 指导内容：edit 工具使用规则、bash 工具偏好、错误恢复协议
  - 验证: 文件存在，语法正确

### 2.2 更新同步脚本
- [x] 2.2 修改 `scripts/sync-pi-agent.sh`，增加 AGENTS.md 同步步骤
  - 覆盖 spec: Sync Script Update
  - 源文件存在时 cp 到 `~/.pi/agent/AGENTS.md`；不存在时清理目标
  - 验证: 运行脚本后 `~/.pi/agent/AGENTS.md` 内容与 `.pi/agent/AGENTS.md` 一致

### 2.3 更新根 AGENTS.md
- [x] 2.3 在根 `AGENTS.md` 新增 `## Global Agent Guidance` 章节，定义工作流规则
  - 覆盖 spec: Root AGENTS.md Workflow Rule
  - 规则：更新 `.pi/agent/AGENTS.md` → 用户确认 → 执行同步脚本
  - 验证: 文件包含定义的流程规则

## 3. 收敛与验证准备

- [x] 3.1 整理 verification 检查点清单（每个 spec scenario 对应验证步骤）
- [x] 3.2 标记 writeback 摘要所需的变更状态与交付物清单

## 4. 验证与回写收敛

- [x] 4.1 基于真实实现结果生成或更新 verification.md（覆盖 spec-to-implementation 与 task-to-evidence）
- [x] 4.2 基于 verification.md 结论生成或更新 writeback.md（目标、字段映射、前置条件）
- [x] 4.3 执行 writeback.md 中定义的回写目标，并记录可审计证据（链接、时间、执行人、结果）
