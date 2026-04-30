# Tasks

## 1. Spec 覆盖与实现准备

- [x] 1.1 确认每个 capability spec 的实现范围与边界
  - `lsp-pi-package`: 安全审查 → 安装 → 测试 → 全局同步
  - `tsconfig-setup`: 创建 tsconfig.json，配置 paths 引用 pi SDK 类型
- [x] 1.2 确认依赖前置条件与外部协作项
  - 前置条件: 安装 `typescript-language-server` 全局
  - 外部依赖: 无

## 2. 核心实现任务

### lsp-pi-package

- [x] 2.1 Phase 1 — 安全审查: git clone 源码，扫描网络/命令执行/混淆/依赖，报告 CLEAN
- [x] 2.2 Phase 2 — 安装 & 测试: `pi install -l npm:lsp-pi`，运行 69+18 单元测试全部通过
- [x] 2.3 Phase 2 — 集成测试: 验证 TypeScript 诊断、definition、symbols、hover 功能正常
- [x] 2.4 Phase 3 — 决策: 用户选择 Option A（加入全局）
- [x] 2.5 Backlog 记录: 写入 `openspec/pkg-backlog.md`
- [x] 2.6 Phase 4 — 全局同步: 执行 `scripts/sync-pi-agent.sh` 并验证

### tsconfig-setup

- [x] 2.7 创建 `tsconfig.json`: ES2022 target, NodeNext module, strict, noEmit
- [x] 2.8 配置 paths 映射 4 个 pi SDK 包类型声明
- [x] 2.9 验证: `npx tsc --noEmit` 能正确解析配置

## 3. 收敛与验证准备

- [x] 3.1 整理需要进入 verification 的证据与检查点
  - 安全审查报告 (CLEAN)
  - 单元测试结果 (69+18=87 passed)
  - 集成测试结果 (TypeScript 诊断正常)
  - 全局同步验证 (lsp-pi 在 `~/.pi/agent/settings.json`)
  - tsconfig 配置验证 (tsc --noEmit 解析成功)
- [x] 3.2 标记需要进入 writeback 的摘要与状态变更
  - `.pi/settings.json`: 已变更
  - `tsconfig.json`: 新建
  - `openspec/pkg-backlog.md`: 已写入

## 4. 验证与回写收敛

- [ ] 4.1 基于真实实现结果生成或更新 verification.md（覆盖 spec-to-implementation 与 task-to-evidence）
- [ ] 4.2 基于 verification.md 结论生成或更新 writeback.md（目标、字段映射、前置条件）
- [ ] 4.3 执行 writeback.md 中定义的回写目标，并记录可审计证据（链接、时间、执行人、结果）
