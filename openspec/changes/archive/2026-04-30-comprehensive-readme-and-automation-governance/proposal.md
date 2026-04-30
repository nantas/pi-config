# Proposal

## 问题定义

`pi-config` 仓库经过多轮开发，已积累了丰富的自定义扩展、外部包集成、治理工作流和 OpenSpec 规划系统。但目前缺少一份结构化的 README 文档：

- 新开发者/用户无法快速理解仓库定位和功能全景
- 仓库的能力按数据类型（自定义扩展、外部包、治理工作流、技能、Agent 定义等）分散在各处，缺乏统一索引
- 没有清晰的 README 维护工作流，容易随新增功能而落后于实际状态
- 各能力的"解决什么问题"没有被显式记录，不利于复用和推广

## 范围边界

### 包含

- 产出仓库根目录 `README.md`，覆盖所有已实现的能力
- 按数据结构分层：自定义扩展 / 外部包 / 治理工作流 / 技能 / Agent 定义 / OpenSpec 规划 / 配置同步等
- 每个能力含功能说明与解决的问题
- 定义 README 后续自动维护的治理工作流

### 不包含

- 修改任何现有 `.pi/`、`.agents/`、`openspec/` 内容
- 创建新的扩展、包或技能
- 重新组织现有文档结构

## Capabilities

### New Capabilities
- `readme-documentation`: 产出仓库根目录 `README.md`，按数据类型分类展示所有能力的功能描述与解决的问题，并为后续维护提供结构基础
- `readme-automation-governance`: 定义 README 随仓库新增功能自动更新的治理工作流，包括触发条件、更新检查清单和同步约束

### Modified Capabilities
- 无

## Capabilities 待确认项

- [x] 能力清单已与用户确认

## Impact

| 受影响的文件/区域 | 变更类型 | 说明 |
|---|---|---|
| `README.md` | 新增 | 仓库根目录的完整文档（本 change 的主产出） |
| `.pi/agent/AGENTS.md` | 无变更 | Global 指导不变 |
| `AGENTS.md` | 无变更 | 仓库工作流规则不变 |
| `scripts/sync-pi-agent.sh` | 无变更 | 同步脚本不变 |
| 现有 `.pi/` 文件 | 无变更 | 不修改任何扩展/配置/包/技能 |

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页 / 项目页 / 回写目标：
  - `spec_standard_ref`: `repo://orbitos`
  - `project_page_ref`: `repo://orbitos/20_项目/Pi_Config/项目进度总览.md`
  - `writeback_targets`: `README.md`（主产出）+ `repo://orbitos/20_项目/Pi_Config/项目进度总览.md`（治理回写）
