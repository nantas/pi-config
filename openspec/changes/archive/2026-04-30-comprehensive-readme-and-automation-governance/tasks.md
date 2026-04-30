# Tasks

## 1. Spec 覆盖与实现准备

- [x] 1.1 确认 capability spec 实现范围：`readme-documentation`（README 内容设计）和 `readme-automation-governance`（治理工作流定义）
- [x] 1.2 依赖前置条件：所有 spec 和 design 已就绪；无外部协作项

## 2. 核心实现任务：README 内容

- [x] 2.1 编写 README 概述段落与架构分层概览（spec: `readme-structure-by-data-type` → scenario: `layer-diagram`）
  - 标注 `.pi/`、`.agents/`、`openspec/`、`docs/`、`scripts/` 各层角色与关系
  - 包含 ASCII/文字示意图
- [x] 2.2 编写"自定义扩展"节（spec scenario: `custom-extensions-section`）
  - 条目：`dollar-skill-invoke` → 描述 + 解决的问题 + 链接 `.pi/extensions/dollar-skill-invoke.ts`
  - 条目：`planner-toggle` → 描述 + 解决的问题 + 链接 `.pi/extensions/planner-toggle.ts`
  - 每个条目包含 OpenSpec spec 链接
- [x] 2.3 编写"外部 Pi 包"节（spec scenario: `external-packages-section`）
  - 条目：`pi-mcp-adapter`、`pi-ask-tool-extension`、`pi-tab-status`、`pi-subagents`
  - 每个包含：包名/来源、功能说明、解决的问题、settings.json 引用
- [x] 2.4 编写"Agent 定义"节（spec scenario: `agent-definitions-section`）
  - 条目：`code-writer`、`dispatch-planner`
  - 每个包含：角色说明、链接 `.pi/agents/*.md`
- [x] 2.5 编写"工作流技能"节（spec scenario: `governance-workflows-section`）
  - 元技能：`pi-extension-dev`、`pkg-research`
  - OpenSpec 工作流以链接 https://github.com/Fission-AI/OpenSpec 替代详细列表
  - 每个包含：名称、功能说明、解决的问题
- [x] 2.6 编写"配置与同步"节（spec scenario: `configuration-and-sync-section`）
  - `.pi/settings.json` 配置说明，重点是如何修改各参数（provider、model、thinking level、packages、subagent overrides），而非列出当前值
  - `scripts/sync-pi-agent.sh` 同步机制说明
  - Closeout 治理流程说明（`docs/pi-change-closeout-governance.md`）
- [x] 2.7 编写"OpenSpec 规划系统"节（spec scenario: `openspec-section`）
  - 架构：schema、manifest、specs、changes、pkg-backlog
  - 变更生命周期概览
- [x] 2.8 编写"Subagent 模型覆盖"节
  - 说明如何通过 `subagents.agentOverrides` 自定义 subagent 模型分配
  - 不列出具体使用的模型，而是给出配置示例
- [x] 2.9 编写"快速开始"与"工作流速查"
  - 快速开始：克隆 → 查看当前状态 → settings 概览
  - 工作流速查：安装包、创建扩展、变更管理、同步配置
- [x] 2.10 编写"项目演进历史"节（spec: `readme-archived-changes`）
  - 已归档变更分类统计与链接
- [x] 2.11 编写"文件索引速查表"
  - 关键路径速查表（含 `.pi/`、`.agents/`、`openspec/`、`docs/`、`scripts/` 的关键文件）

## 3. 核心实现任务：自动维护治理

- [x] 3.1 在 README 末尾编写"README 维护工作流"节（覆盖 `readme-automation-governance` spec 全部 requirement）
  - 触发条件（新增 extension / package / skill / agent / capability spec）
  - 更新检查清单（7 步）
  - 异常处理说明（自指跳过、新数据类型节、链接失效）
  - 同步声明：README 不通过 sync 脚本部署，仅通过 git 管理
  - （closeout 集成已在 `docs/pi-change-closeout-governance.md` 中定义，此处不重复）
- [x] 3.2 验证 README 中所有链接有效

## 4. 收敛与验证准备

- [x] 4.1 准备 verification 证据：
  - README.md 文件存在且完整
  - 每个 spec requirement 有对应 README 内容
  - 所有链接可解析
  - 无占位符或 TBD 残留
- [x] 4.2 准备 writeback 摘要：
  - 产出摘要：README.md（主产出）+ 治理工作流定义
  - 目标：`repo://orbitos/20_项目/Pi_Config/项目进度总览.md`
  - 格式：结论 + 状态 + 链接 + 验证结果

## 5. 验证与回写收敛

 - [x] 5.1 基于真实实现结果生成 `verification.md`
- [x] 5.2 基于 `verification.md` 生成 `writeback.md` 并执行回写
