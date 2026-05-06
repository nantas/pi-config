# Proposal

## 问题定义

pi-config 仓库当前 README 面向的是已有 Pi 使用经验的用户，缺乏面向初学者的系统入门指引。当初学者（使用非 Pi 的 coding agent）在仓库中启动后，无法快速了解应该优先执行的行动顺序：

1. 如何配置模型供应商（login 流程 vs custom provider 流程）
2. 如何配置常用模型范围（enabledModels）
3. 如何查看本仓库的能力清单并确认同步范围
4. 如何执行全局同步
5. 后续有哪些扩展工作流可用

这导致初学者需要自行摸索多个配置文件和文档，上手门槛较高。

## 范围边界

**包含：**
- 创建独立的 `docs/getting-started.md` 新手上路文档，包含六步工作流
- 在 `README.md` 最开头增加「新手上路」章节引用，指向独立文档
- 在 `.pi/agent/AGENTS.md` 中增加使用情景描述和链接
- 文档内容需与现有 `capabilities.yaml` 和 `AGENTS.d/pi-provider-model.md` 保持一致

**不包含：**
- 不修改任何现有扩展、skill、agent 的实现代码
- 不修改 `capabilities.yaml` 的能力清单内容
- 不修改 `.pi/settings.json` 的默认配置
- 不涉及 Pi 核心功能的变更

## Capabilities

### New Capabilities
- `getting-started-guide`: 为 pi-config 仓库创建面向初学者的六步入门工作流文档，覆盖模型配置、能力确认、全局同步和验证

### Modified Capabilities
- `comprehensive-readme`: 在 README 最开头增加「新手上路」章节引用，优化初学者入口体验
- `global-agent-guidance`: 在 AGENTS.md 中增加「初学者首次配置」使用情景描述和链接

## Capabilities 待确认项

- [x] 能力清单已与用户确认（用户在需求中明确了文档结构、示例供应商类型、install-from-pi-config 使用场景、openspec 工作流入口等细节）

## Impact

- **用户影响**：显著降低 pi-config 仓库的初学者上手门槛，提供清晰的六步行动指南
- **文档影响**：README 结构微调（开头增加引用章节），新增独立入门文档
- **维护影响**：`docs/getting-started.md` 需要随 `capabilities.yaml` 内容变化同步更新
- **同步影响**：AGENTS.md 变更将通过 `scripts/sync-pi-agent.sh` 同步到全局运行时

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页 / 项目页 / 回写目标：
  - `repo://pi-config/README.md` — 增加「新手上路」引用章节
  - `repo://pi-config/.pi/agent/AGENTS.md` — 增加使用情景和链接
  - `repo://pi-config/docs/getting-started.md` — 新建独立入门文档
