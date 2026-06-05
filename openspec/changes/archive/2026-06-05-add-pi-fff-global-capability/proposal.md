# Proposal

## 问题定义

经过 `pkg-research` 完整调研（安全审查通过、Phase 2 深度分析），已将 `@ff-labs/pi-fff` 确认为值得引入的 Pi 能力。当前存在以下待解决问题：

1. **包未全球化**：`pi-fff` 以本地 `npm install file://` 安装，未纳入 `capabilities.yaml` 全局管理，其他项目无法通过 `pi install` 获取，sync 脚本也无法同步
2. **frecency 数据无法持久化**：pi-fff 默认不初始化 frecency 和历史查询数据库，进程退出即丢失，无法利用跨会话的学习效应
3. **环境变量配置无治理**：`capabilities.yaml` 当前无字段描述能力所需的环境变量，能力引入时缺少对 shell 环境一致性的校验机制
4. **catalog 能力未来可能也需要 env 配置**：需设计可扩展的 schema，catalog 下的能力也能声明所需环境变量

## 范围边界

| 包含 | 不包含 |
|------|--------|
| 将 `npm:@ff-labs/pi-fff` 加入 `global.settings.packages` | 修改 pi-fff 源码或 fff-core 实现 |
| 在 `capabilities.yaml` 新增 `global.env` 字段，支持按能力分组声明环境变量 | 为所有现有全局能力补全 env 声明（仅本次变更涉及的 pi-fff） |
| 扩展 `sync-pi-agent.sh` 实现 env 变量检查步骤 | 修改 catalog 安装流程（仅预留 schema 设计） |
| 在 `~/.zshenv` 中为 pi-fff 配置 frecency/history DB 路径 | 自动修改 shell 配置文件（sync 脚本仅检查告警） |

## Capabilities

### New Capabilities

- `capabilities-env-schema`: 在 `capabilities.yaml` 中新增 `global.env` 和 `catalog.env` 字段，按能力 ID 分组声明所需环境变量，支持 `value`（期望值）、`required`（是否必需）、`description`（用途说明）
- `sync-env-check`: 在 `sync-pi-agent.sh` 中新增 env 变量检查步骤，解析 manifest 中已激活能力的 env 声明，验证 shell 环境一致性，检测孤立 env 块

### Modified Capabilities

- `pi-fff-global-package`: 将 `npm:@ff-labs/pi-fff` 添加到 `global.settings.packages`，使其成为全局包
- `pi-fff-env-config`: 在 `~/.zshenv` 中配置 `FFF_FRECENCY_DB` 和 `FFF_HISTORY_DB`，指向 `$HOME/.cache/pi/` 下的 LMDB 数据库

## Capabilities 待确认项

- [x] 能力清单已与用户确认：上述 4 个 capability 覆盖了用户反馈的全部诉求

## Impact

- **`capabilities.yaml`**：新增 `global.env` 节（与能力 ID 关联），`global.settings.packages` 新增一条
- **`sync-pi-agent.sh`**：新增约 60 行 env 检查逻辑（python3 内联），不修改现有同步步骤
- **`README.md`**：外部 Pi 包节新增 pi-fff 描述
- **`~/.zshenv`**：新增 2 行 export
- **运行时**：pi-fff 将具备跨会话 frecency 学习能力，文件搜索结果随使用频次提升精度

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页 / 项目页 / 回写目标：
  - 标准页：`repo://pi-config` — `.pi/capabilities.yaml`、`docs/reference/readme-governance.md`
  - 项目页：`openspec/changes/add-pi-fff-global-capability/`
  - 回写目标：`.pi/capabilities.yaml`、`scripts/sync-pi-agent.sh`、`README.md`、`~/.zshenv`
