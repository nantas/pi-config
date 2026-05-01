# Tasks

## 1. Spec 覆盖与实现准备

- [x] 1.1 确认四个 spec 文件的实现范围：
  - `pkg-security-review`: clone 保留逻辑（Phase 1 不清理 → Phase 3 清理）
  - `pkg-install-research`: 源类型检测分支 + raw extension test-first 流程
  - `pkg-raw-extension-research`: 扩展列表展示、npm 依赖检测、pi -e 命令、等待反馈
  - `pkg-decision-backlog`: 三选项重构、sub-decision、backlog schema 扩展
- [x] 1.2 确认 `.pi/skills/pkg-research/SKILL.md` 是唯一需要修改的技能文件
- [x] 1.3 确认 `openspec/pkg-backlog.md` 的 schema header 更新内容和向后兼容策略

## 2. 核心实现任务

### 2.1 — 修改 pkg-research SKILL.md Phase 2

- [x] 2.1.1 在 Phase 2 入口新增**源类型检测**步骤：
  - 检测根目录 `package.json` → package 源
  - 检测 `extensions/*.ts` 且无根 `package.json` → raw extension 源
  - 都不匹配 → 报告未识别类型，询问用户
- [x] 2.1.2 新增 **Raw Extension 分支**子流程，包含：
  - 列出 `extensions/` 目录下的所有 `.ts` 文件和发现信息
  - 检查每个 extension 目录是否有 `package.json`（`extensions/<name>/package.json`）
  - 如果有 → 在该目录执行 `npm install`
  - 输出 `pi -e /tmp/<clone>/extensions/<name>.ts`（或 `.../index.ts`）测试命令
  - 等待用户测试后反馈
- [x] 2.1.3 在 Phase 2 研究中注明：raw extension 分支不修改 `.pi/` 目录

### 2.2 — 修改 pkg-research SKILL.md Phase 1

- [x] 2.2.1 移除 Phase 1 Step 5 的"unconditionally remove temp directory"，改为：
  - 安全审查报告完成后**保留 clone**
  - 在报告中通知用户："克隆保留用于 Phase 2 测试，在 Phase 3 决策完成后清理"
- [x] 2.2.2 在 Phase 3 各选项执行步骤末尾新增清理步骤：`rm -rf "$TMPDIR"`

### 2.3 — 重写 pkg-research SKILL.md Phase 3

- [x] 2.3.1 将三选项语义更新为新模型，包含完整说明：
  - **Option A: 加入本仓库能力** — 安装后子选分发范围
  - **Option B: 加入 backlog 列表** — 纯记录，不安装，不写 manifest
  - **Option C: 放弃** — 清理，可选拒绝记录
- [x] 2.3.2 新增 Option A 子决策流程：
  - A1) **Global** — 安装 + `global.*` manifest 写入 + Phase 4 sync
  - A2) **Catalog** — 安装 + `catalog.*` manifest 写入（无 sync）
- [x] 2.3.3 重写各选项的执行步骤：

  **Option A (Global):**
  - Package: 保留 `settings.json` 修改 → `global.settings.packages`
  - Raw extension: 复制文件到 `.pi/extensions/` → `global.extensions`
  - 写入 backlog 条目（决定=global）
  - 进入 Phase 4 sync

  **Option A (Catalog):**
  - Package: 保留 `settings.json` 修改 → `catalog.packages`
  - Raw extension: 复制文件到 `.pi/extensions/` → `catalog.extensions`
  - 写入 backlog 条目（决定=catalog）
  - 不回滚本地安装
  - 跳过 Phase 4（catalog 下次 sync 时自动发布）

  **Option B (Backlog):**
  - Raw extension: 不复制文件，不写 manifest
  - Package: 回滚 `settings.json` + `pi remove <source>`
  - 写入 backlog 条目（决定=backlog）

  **Option C (Discard):**
  - 询问用户是否记录拒绝原因
  - 如果是：写入 backlog 条目（决定=discarded）
  - 清理临时 clone
  - Package: 额外回滚 `settings.json` + `pi remove <source>`

### 2.4 — 更新 backlog schema

- [x] 2.4.1 更新 `openspec/pkg-backlog.md` 的 schema 注释，新增字段：
  - `Source Type`: `<npm-package | git-package | raw-extension>`
  - `Source Repo`: `<URL>`（raw-extension 时必填）
  - `Install Method`: `<pi-install | raw-copy>`
  - `Has Dependencies`: `<true | false>`
- [x] 2.4.2 更新 backlog 示例条目以展示新字段
- [x] 2.4.3 确保已有条目向后兼容（新字段为可选，已有条目保持不变）

### 2.5 — 更新 Phase 4

- [x] 2.5.1 明确 Phase 4 只在 Option A1 (Global) 后触发
- [x] 2.5.2 Phase 4 验证步骤增加 extensions 的 global 同步验证

### 2.6 — 更新 AGENTS.md 治理规则

- [x] 2.6.1 在 `## Package Management` 或 `## Working Rules` 中更新有关三选项的引用描述

## 3. 收敛与验证准备

- [x] 3.1 验证 checklist 准备：
  - [x] Package 源的原有流程是否正常运行（回归测试信号）— ✅ 原有 Package Source Branch (Steps 1-6) 完整保留，未修改
  - [x] Raw extension 分支是否走 test-first 路径 — ✅ Phase 2 新增 Raw Extension Branch (Steps R1-R4)，使用 clone 中的 `pi -e` ephemeral 测试
  - [x] Option A sub-decision 是否正确写入 manifest（global vs catalog）— ✅ A1 → `global.*`；A2 → `catalog.*`，包含 manifest 更新示例
  - [x] Option B 是否不安装、不写 manifest — ✅ 明确：不复制文件、不回写 manifest、package 源需回滚 settings.json
  - [x] Option C discarded 是否可选记录 — ✅ 询问用户后可选写入 backlog
  - [x] Clone 是否在 Phase 3 清理 — ✅ 各选项末尾均有 `rm -rf "$TMPDIR"`
  - [x] Backlog 条目是否使用新 schema — ✅ backlog.md header 已更新，包含 Source Type / Source Repo / Install Method / Has Dependencies 字段
- [x] 3.2 标记需要写入 writeback 的摘要信息：实现的 capability 清单、改动文件列表

## 4. 验证与回写收敛

- [x] 4.1 基于真实实现结果生成 `verification.md`
- [x] 4.2 基于 verification.md 生成 `writeback.md`
- [x] 4.3 执行 writeback — 回写到 `repo://orbitos/20_项目/Pi_Config/项目进度总览.md`
