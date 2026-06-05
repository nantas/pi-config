# Design

## Context

本次 change 将 npm 包 `@ff-labs/pi-fff`（高性能模糊文件搜索 Pi 扩展）纳入 pi-config 全局能力管理，并扩展 `capabilities.yaml` 的 schema 使其能按能力分组声明所需环境变量。ff 已在 `pkg-research` 流程中通过安全审查和深度调研，确认适合全局安装。

核心问题：当前 `capabilities.yaml` 无字段描述能力所需的环境变量，能力引入时缺少对 shell 环境一致性的校验机制。需要一个可扩展的 `env` 字段，支持 global 和 catalog 两种范围，按能力 ID 分组。

## Goals / Non-Goals

**Goals:**

- 将 `npm:@ff-labs/pi-fff` 加入 `global.settings.packages`，通过 sync 脚本同步到 `~/.pi/agent/settings.json`
- 在 `capabilities.yaml` 中新增 `global.env` 和 `catalog.env` 字段，schema 支持按能力 ID 分组声明环境变量
- 在 `sync-pi-agent.sh` 中新增 env 检查步骤，验证已激活能力的环境变量一致性
- 在 `~/.zshenv` 中配置 pi-fff 需要的两条环境变量，启用跨会话 frecency 持久化
- 设计 `catalog.env` 字段但不实现 catalog 安装时的检查（由 `install-from-pi-config` 技能后续实现）

**Non-Goals:**

- 不为所有现有全局能力补全 env 声明（仅本次变更涉及的 pi-fff）
- 不自动修改 shell 配置文件（sync 脚本仅检查告警）
- 不修改 pi-fff 或 fff-core 源码
- 不实现 catalog 安装流程中的 env 检查逻辑

## Decisions

### D1: Env 字段按能力 ID 分组（而非扁平列表）

**选择**：`env: { <capability-id>: { variables: { ... } } }`

**拒绝方案**：扁平化 `variables: [{ name, value, ... }]`

**理由**：按能力 ID 分组使得能力移除时容易识别残留配置（orphaned env detection），且与 `global.settings.packages` / `global.extensions` 等列表直接关联。

### D2: Capability ID 提取规则

对于 `global.settings.packages` 中的条目，通过以下规则提取 capability ID：

| 前缀 | 示例 | 提取 ID |
|------|------|---------|
| `npm:` | `npm:@ff-labs/pi-fff` | `pi-fff` |
| `npm:` | `npm:@scope/pkg@1.0.0` | `pkg` |
| `git:` | `git:github.com/owner/repo` | `repo` |

对于 `global.extensions` / `global.skills` / `global.agents`，ID 直接对应列表项名称。

### D3: Sync 脚本用 Python 3 + PyYAML 实现 env 检查

**选择**：在 `sync-pi-agent.sh` 中以 Python 3 内联脚本实现 YAML 解析和 env 校验。

**理由**：脚本已使用 python3 进行 settings.json 生成（`render_settings_file`），环境一致。PyYAML 随 Python 3 标准安装提供。避免新增 Node.js 依赖。

### D4: Sync 脚本不修改 shell 配置文件

**选择**：env 检查步骤仅报告缺失/不匹配的变量并给出修复命令，不修改 `~/.zshenv` 或 `~/.zshrc`。

**理由**：自动修改 shell 配置文件有风险（破坏现有配置、多行复杂格式难以可靠编辑）。用户应手动确认后执行。

### D5: DB 路径使用 XDG cache 目录

**选择**：`~/.cache/pi/fff_frecency` 和 `~/.cache/pi/fff_history`

**理由**：遵循 XDG Base Directory 规范。LMDB 文件属于非必需缓存数据（丢失后 fff 仍可用，仅失去 frecency 记忆），适合 `~/.cache/` 而非 `~/.local/share/`。

## Risks / Migration

### R1: PyYAML 不可用

**风险**：某些系统上 Python 3 未安装 PyYAML。

**缓解**：本次依赖的 sync 脚本已有 Python 3 + PyYAML 依赖（`render_settings_file` 使用），若无则整个脚本会先失败，不属于新增风险。

### R2: Env 检查误报

**风险**：用户有意使用与 manifest 不同的 env 变量值。

**缓解**：mismatch 仅在 value 明确指定时触发，输出为 warning 而非 error。用户可忽略，或从 manifest 中移除该变量的 `value` 字段（仅保留 `required` 检查）。

### R3: Orphaned env 块累积

**风险**：移除能力后忘记清理 `global.env` 中对应块，累积孤儿配置。

**缓解**：sync 脚本会检测并警告，提示清理。不阻断同步流程。

### R4: ~/.zshenv 修改冲突

**风险**：用户可能在 `~/.zshenv` 中已有 `FFF_*` 相关配置。

**缓解**：本次是新增（该库为首次引入），不存在冲突。若未来值需要变更，sync 脚本会报告 mismatch 供用户手动调整。
