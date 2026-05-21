# Tasks

## 1. Spec 覆盖与实现准备

- [x] 1.1 确认每个 capability spec 的实现范围与边界
  - `serena-code-intelligence`: 创建 skill + 删除旧 skill
  - `reference-docs-consolidation`: 移动 2 个文档 + 更新引用
  - `agent-guidance-simplify`: 删除 4 个 AGENTS.d 文件 + 精简 AGENTS.md
- [x] 1.2 确认依赖前置条件与外部协作项
  - serena MCP 已在当前会话安装并配置（不在本次 change 范围内）

## 2. 核心实现任务

### 2.1 Reference docs consolidation

- [x] 2.1.1 创建 `docs/reference/pi-provider-model.md`
  - 内容来源: `.pi/agent/AGENTS.d/pi-provider-model.md` 完整内容
  - 验证: 文件存在，内容完整非空
- [x] 2.1.2 创建 `docs/reference/readme-governance.md`
  - 内容来源: `.pi/agent/AGENTS.d/readme-governance.md` 完整内容
  - 验证: 文件存在，内容完整非空
- [x] 2.1.3 删除 `.pi/agent/AGENTS.d/pi-provider-model.md`
  - 验证: 文件不存在
- [x] 2.1.4 删除 `.pi/agent/AGENTS.d/readme-governance.md`
  - 验证: 文件不存在

### 2.2 AGENTS.d unneeded files removal

- [x] 2.2.1 删除 `.pi/agent/AGENTS.d/tool-ask-user.md`
  - 验证: 文件不存在
- [x] 2.2.2 删除 `.pi/agent/AGENTS.d/output-quality.md`
  - 验证: 文件不存在
- [x] 2.2.3 删除 `.pi/agent/AGENTS.d/tool-mcp.md`
  - 验证: 文件不存在
- [x] 2.2.4 删除 `.pi/agent/AGENTS.d/lsp-guide.md`
  - 验证: 文件不存在

### 2.3 Serena skill creation

- [x] 2.3.1 创建 `.pi/skills/serena-code-intelligence/SKILL.md`
  - 包含: 工具概览、决策表（serena vs Pi 内建工具）、项目初始化工作流、代码探索流程、代码编辑流程、诊断流程
  - 验证: skill 内容覆盖 spec `serena-code-intelligence` 的全部 requirement
- [x] 2.3.2 删除 `.pi/skills/lsp-code-intelligence/` 目录
  - 验证: 目录不存在

### 2.4 Global AGENTS.md simplification

- [x] 2.4.1 精简 `.pi/agent/AGENTS.md` 内容
  - Core Rules: 保留 (3 行)
  - Edit Tool: 精简为 3 条自检，移除 JSON schema
  - Bash Tool: 保留 (2 行)
  - Error Recovery: 保留 (3 行)
  - MCP Tool / Dispatch: 删除整节
  - ask_user Tool: 删除整节
  - Web Search: 移除参数表，保留 5 条使用原则
  - Markdown Output Quality: 删除引用
  - LSP/Serena: 改为 serena 条目 + 引用 `serena-code-intelligence` skill
  - Subagent 委派: 精简为触发原则表 + 链接到 `AGENTS.d/subagent-usage.md`
  - README 维护: 精简，指向 `docs/reference/readme-governance.md`
  - Pi 供应商/模型: 精简，指向 `docs/reference/pi-provider-model.md`
  - 验证: 内容覆盖 spec `agent-guidance-simplify` 的全部 requirement

### 2.5 Project-level AGENTS.md update

- [x] 2.5.1 更新根目录 `AGENTS.md`
  - 在项目级指导中增加 `docs/reference/pi-provider-model.md` 和 `docs/reference/readme-governance.md` 的引用
  - 验证: 两个文档链接存在且路径正确

### 2.6 Capabilities.yaml update

- [x] 2.6.1 更新 `.pi/capabilities.yaml`
  - `global.skills`: 删除 `lsp-code-intelligence`，添加 `serena-code-intelligence`
  - 验证: 新旧条目正确替换

## 3. 收敛与验证准备

- [x] 3.1 整理需要进入 verification 的证据与检查点
  - 被删除文件列表（6 个 AGENTS.d + 1 个 skill 目录）
  - 新建文件路径（2 个 docs/reference + 1 个 skill + 1 个 skill 目录）
  - AGENTS.md 行数（精简前后）
  - capabilities.yaml skill 列表
- [x] 3.2 标记需要进入 writeback 的摘要与状态变更
  - 文件增删清单
  - AGENTS.md 精简前后对比
  - capabilities.yaml 变更

## 4. 验证与回写收敛

- [x] 4.1 基于真实实现结果生成或更新 verification.md
  - 覆盖 spec-to-implementation 对照
  - task-to-evidence 对照
- [x] 4.2 基于 verification.md 结论生成或更新 writeback.md
  - 目标、字段映射、前置条件
- [x] 4.3 执行 writeback.md 中定义的回写目标
  - 记录可审计证据
