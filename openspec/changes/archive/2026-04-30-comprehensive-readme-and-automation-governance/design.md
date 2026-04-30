# Design

## Context

`pi-config` 仓库目前缺少一份结构化的 README。经过多轮开发，仓库已积累了：

- 2 个自定义扩展（`dollar-skill-invoke`、`planner-toggle`）
- 4 个外部 Pi 包（`pi-mcp-adapter`、`pi-ask-tool-extension`、`pi-tab-status`、`pi-subagents`）
- 2 个仓库本地 Agent 定义
- 2 个元技能（`pi-extension-dev`、`pkg-research`）
- [OpenSpec](https://github.com/Fission-AI/OpenSpec) 变更管理工作流
- 25 个能力规格说明
- 13 个已归档变更
- 完整的同步脚本与 closeout 治理

按 `specs/readme-documentation` 的要求，README 需要按数据类型组织，每项包含功能说明和解决的问题。按 `specs/readme-automation-governance` 的要求，需要定义后续自动维护的工作流。

## Goals / Non-Goals

**Goals:**

1. 产出一份完整的 `README.md`，覆盖仓库所有能力，按数据类型分层展示
2. 每项能力含：名称、功能说明、解决的问题、源文件链接、OpenSpec spec 链接
3. 包含架构分层概览、快速入门指南、工作流速查、文件索引
4. 定义 README 更新的触发条件与检查清单
5. 声明 README 不通过 sync 脚本同步，仅通过 git 管理

**Non-Goals:**

- 不修改任何现有 `.pi/`、`.agents/`、`openspec/` 内容
- 不创建新的扩展、包或技能
- 不重新组织仓库文件结构
- 不将 README 加入 `scripts/sync-pi-agent.sh` 的同步范围

## Decisions

### D1. README 结构设计

```
1. 概述
2. 架构分层概览      ─ 图表展示 .pi / .agents / openspec / docs / scripts 各层角色
3. 快速开始           ─ 克隆 → 查看状态 → 首次同步
4. 核心能力（按数据类型）
   ├── 自定义扩展
   │   ├── dollar-skill-invoke
   │   └── planner-toggle
   ├── 外部 Pi 包
   │   ├── pi-mcp-adapter
   │   ├── pi-ask-tool-extension
   │   ├── pi-tab-status
   │   └── pi-subagents (via subagent-dispatch)
   ├── Agent 定义
   │   ├── code-writer
   │   └── dispatch-planner
   ├── 工作流技能
   │   ├── pi-extension-dev
   │   ├── pkg-research
   │   └── OpenSpec 工作流（链接到 openspec.org）
   ├── Subagent 模型覆盖（说明如何自定义，不列具体模型）
   ├── 配置同步（说明如何修改配置，不列当前值）
   ├── Closeout 治理
   └── OpenSpec 规划系统（链接到 openspec.org）
5. 工作流速查
6. 文件索引速查表
7. 项目演进历史       ─ 已归档变更统计
```

### D2. README 维护工作流

README 维护工作流包含以下要素，直接写入 README 末尾：

- **触发条件表**：新增 extension / package / skill / agent / capability spec 各场景
- **更新检查清单**：7 步标准化步骤
- **异常处理**：自指跳过、新增数据类型节、链接失效
- **同步声明**：README 不通过 sync 脚本部署，仅通过 git 管理

closeout 治理中的 README 检查已在 `docs/pi-change-closeout-governance.md` 中定义，README 中不再重复。

### D4. 异常处理

| 场景 | 处理方式 |
|---|---|
| 本节 change 归档时触发自身治理 | 显式记录异常并跳过，不更新 README（无变更可更新 → 无自指问题） |
| 新增能力没有现成的数据类型节 | 在 README 中新增适当的节，并在后续定期审计中确认结构一致性 |
| 链接失效（文件被移动/删除） | verification 步骤包含链接验证，失效链接 blocking |

## Risks / Migration

- **R1: 信息过时风险** — README 可能在更新后某次变更中被遗忘更新。缓解措施：verification 步骤强制检查"是否需要更新 README"，将检查融入现有 closeout 流程而非独立流程。
- **R2: 结构膨胀风险** — 随时间推移，数据类型节可能过多。缓解措施：该设计已按最高层级数据类型（即文件所在目录）分组，减少未来重组织的需求。
- **R3: 无迁移成本** — README 是新增文件，不涉及任何现有文件的修改或迁移。该变更对仓库的侵入性为零。
