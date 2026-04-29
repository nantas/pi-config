# Tasks

## 1. Spec 覆盖与实现准备

- [x] 1.1 确认 `extension-self-dedup` spec 的 4 个 scenario 覆盖
- [x] 1.2 确定 globalThis 标记变量名与插入位置

## 2. 核心实现任务

### 2.1 撤回错误的同步排除提交
- [x] 2.1 撤回 `a0ed55e` (git revert)，恢复 `scripts/sync-pi-agent.sh` 到包含 `planner-toggle.ts` 全局同步的状态
  - 覆盖 spec: Global sync preserved
  - 验证: `scripts/sync-pi-agent.sh` 不再包含 EXTENSIONS_EXCLUDE 逻辑

### 2.2 添加去重标记
- [x] 2.2 在 `.pi/extensions/planner-toggle.ts` 入口添加 globalThis 标记检查
  - 在 `export default function` 函数体最开头添加去重逻辑
  - 后加载副本 `return` 跳过所有注册
  - 覆盖 spec: Extension Self-Deduplication (所有 3 个 scenario)
  - 验证: 文件语法正确，`bash -n scripts/sync-pi-agent.sh` 通过

## 3. 收敛与验证准备

- [x] 3.1 整理 verification 检查点清单（每个 spec scenario 对应验证步骤）
- [x] 3.2 标记 writeback 摘要所需的变更状态与交付物清单

## 4. 验证与回写收敛

- [x] 4.1 基于真实实现结果生成或更新 verification.md（覆盖 spec-to-implementation 与 task-to-evidence）
- [x] 4.2 基于 verification.md 结论生成或更新 writeback.md（目标、字段映射、前置条件）
- [x] 4.3 执行 writeback.md 中定义的回写目标，并记录可审计证据（链接、时间、执行人、结果）
