# Tasks

## 1. Spec 覆盖与实现准备

- [x] 1.1 确认所有 4 个 capability specs (`pkg-security-review`, `pkg-install-research`, `pkg-decision-backlog`, `pkg-global-sync`) 的 requirement 均有对应实现任务覆盖
- [x] 1.2 确认 pi binary 可用：`which pi` 返回可执行路径，`pi --version` 正常
- [x] 1.3 确认 `scripts/sync-pi-agent.sh` 存在且可执行

## 2. 核心实现任务

### 2-A: 创建 skill 文件

- [x] 2.1 创建 `.pi/skills/pkg-research/SKILL.md`
  - 包含 YAML frontmatter: `name: pkg-research`, description 含触发条件（"Use when: user wants to research, evaluate, test, or install a Pi package...")
  - 包含 4 个 Phase: Security Review → Install & Research → Decision → Global Sync
  - 每个 Phase 有明确的步骤指导和安全检查清单
  - 覆盖 spec `pkg-security-review` 所有 requirements：临时 clone、可疑代码检测（network/exec/eval/obfuscation/deps）、摘要输出、临时目录清理
  - 覆盖 spec `pkg-install-research` 所有 requirements：项目级 `pi install -l`、包结构分析（manifest + 约定目录）、依赖分析、功能冒烟测试、冲突检查、**settings.json 修改感知**
  - 覆盖 spec `pkg-decision-backlog` 所有 requirements：三选一展示、**settings.json 回退逻辑**、**Option A/B 双写 backlog**、`openspec/pkg-backlog.md` 读写、清理 `pi remove`
  - 覆盖 spec `pkg-global-sync` 所有 requirements：`.pi/settings.json` 验证（已存在/追加）、sync 确认询问、`scripts/sync-pi-agent.sh` 执行、成功/失败验证

### 2-B: 创建 backlog 文件模板

- [x] 2.2 创建 `openspec/pkg-backlog.md` 初始模板
  - 包含文件头说明（用途、格式）
  - 初始为空条目的结构：按时间倒序，每条含 package source、version、research date、resource types、decision、reason、notes

### 2-C: 更新 AGENTS.md

- [x] 2.3 在 `AGENTS.md` 中新增 `## Package Management` 章节
  - 引用 skill `.pi/skills/pkg-research/SKILL.md`
  - 申明规则：包管理走 skill 引导；安全审查先于安装；决策全用户驱动；全局 sync 需显式确认
  - 保持 Markdown 中文讨论 + 英文代码惯例

## 3. 收敛与验证准备

- [x] 3.1 整理 verification 证据检查点：
  - skill 文件存在且格式正确 ✓
  - backlog 文件存在且格式正确 ✓
  - AGENTS.md 包含 package management 规则 ✓
  - 使用一个真实或 mock 的 pi package 完成端到端工作流测试
  - 确认 `pi install -l` 隔离行为正常
  - 确认 `pi install -l` 自动修改 `.pi/settings.json` packages 数组 ✓
  - 确认 `pi remove` 清理行为正常
  - 确认 `.pi/settings.json` 回退行为（Option B/C 场景）✓
  - 确认 Option A/B 双写 backlog ✓
  - 确认 `scripts/sync-pi-agent.sh` sync 行为正常

- [x] 3.2 标记 writeback 需要补充的内容：
  - D8: Settings rollback for non-global decisions（Phase 2 install 自动修改 settings.json，非 global 决策需回退）
  - D9: Backlog for all approved packages（Option A 和 B 均写 backlog，仅 discard 豁免）
  - 端到端实测验证：`pi-ask-tool-extension` 完整四阶段工作流 + global sync + backlog 写入

- [x] 3.3 创建 `openspec/pkg-backlog.md` 初始内容（pi-ask-tool-extension 为首条真实记录）

## 4. 验证与回写收敛

- [x] 4.1 基于真实实现结果生成 `verification.md`
  - 逐 spec requirement 验证实现覆盖 ✅
  - 记录端到端工作流测试结果 ✅
  - 记录任何未覆盖项或问题 ✅（无未覆盖项）

- [x] 4.2 基于 verification 结论生成 `writeback.md`
  - 目标: `repo://orbitos/20_项目/Pi_Config/项目进度总览.md`
  - 摘要：变更结论、交付物、验证结果 ✅

- [x] 4.3 执行 writeback 回写并记录审计证据
  - 通过 repo-registry 解析目标路径：`/Users/nantas-agent/projects/obsidian-mind/20_项目/Pi_Config/项目进度总览.md`
  - 编辑目标文件追加摘要：在 `Pi 扩展开发技能回写` 后添加 `Package 调研管理工作流回写` 条目 ✅
  - 记录时间戳：2026-04-29
  - 审计证据：writeback 已写入目标文件，包含变更结论、交付物清单、验证结果
  - repository settings disposition: `repo-settings-unchanged`（skill + backlog 文件，不修改 settings.json）
