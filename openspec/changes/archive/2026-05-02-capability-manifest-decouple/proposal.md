# Proposal

## 问题定义

当前 `pi-config` 仓库的 `.pi/` 设置与全局运行时 `~/.pi/agent/` 之间通过 `scripts/sync-pi-agent.sh` 执行全量批量同步。所有扩展、代理、设置键一律覆盖，技能完全不同步，其他仓库无法按需获取 pi-config 中的能力。

具体问题：
1. **全量同步无选择性**：仓库特定配置（如 `defaultModel`、`subagents`）也被推送到全局，污染其他仓库的运行时
2. **技能隔离**：`.pi/skills/` 完全不参与同步，obsidian-search、pi-extension-dev、pkg-research 只能在 pi-config 仓库内使用
3. **无跨仓库能力发现机制**：其他仓库的 agent 无法知道 pi-config 提供了哪些可安装能力
4. **无标准化安装工作流**：跨仓库安装能力需手动复制文件，无依赖解析、无 settings.json 集成
5. **治理闭环缺失**：向 `.pi/` 添加新 resource（extension/skill/package）后，没有强制要求更新能力清单，导致清单与实际漂移

## 范围边界

### 在范围内
- 新增 `.pi/capabilities.yaml` 能力清单数据结构，定义 global / catalog 两层
- 改造 `scripts/sync-pi-agent.sh`：按 manifest 选择性同步，settings.json 白名单过滤，catalog 发布
- 新增 `install-from-pi-config` 全局技能：跨仓库双路径安装工作流
- 增强 `pkg-research` 技能：决策阶段写入 capabilities.yaml
- 增强 `pi-extension-dev` 技能：部署阶段写入 capabilities.yaml
- 新增 `AGENTS.md` 治理规则：`.pi/` 资源变更须同步更新 capabilities.yaml
- 全局 runtime 新增 `~/.pi/agent/catalog/pi-config.yaml`：其他仓库的能力发现入口

### 不在范围内
- Pi 核心代码修改（仅操作 pi-config 仓库文件和全局 runtime 目标）
- 其他仓库的 `.pi/settings.json` 自动发现机制（由 install-from-pi-config 技能驱动）
- `.pi/prompts/` 和 `.pi/themes/` 的 catalog 化（当前保持全量同步不变）
- 能力版本管理 / 锁定（首次实现，后续 change 可扩展）

## Capabilities

### New Capabilities
- `capability-manifest`: `.pi/capabilities.yaml` 数据结构——声明 global 层（全局同步项）与 catalog 层（按需安装项），定义 extension/skill/package 的归属、依赖与安装方式
- `install-from-pi-config`: 跨仓库按需安装技能——读取 `~/.pi/agent/catalog/pi-config.yaml`，匹配目标能力，解析依赖图，执行双路径安装（file-based 复制 + settings-entry 编辑引导重启）
- `capability-governance`: 能力清单治理规则——AGENTS.md 中声明 `.pi/` 资源变更须同步更新 capabilities.yaml；pkg-research 和 pi-extension-dev 技能工作流末尾新增 capabilities.yaml 写入步骤

### Modified Capabilities
- `pi-runtime-bootstrap-sync`: 同步合同改造——从全量目录覆盖改为按 capabilities.yaml 中 global 声明选择性同步；settings.json 过滤（白名单 packages + 移除 exclude_keys）；发布 catalog 到 `~/.pi/agent/catalog/`
- `pkg-decision-backlog`: 包决策工作流增强——Decision Phase 末尾新增 capabilities.yaml 写入（global 包写 global.settings.packages，backlog 包写 catalog.packages）
- `pi-extension-dev-skill`: 扩展开发技能增强——Phase F (Deployment) 末尾新增 capabilities.yaml 写入步骤（根据 scope 决策写入 global.extensions 或 catalog.extensions）
- `pkg-global-sync`: 包全局同步策略收紧——从同步全部 packages 改为只同步 capabilities.yaml 中 global.settings.packages 声明的包，其余包留在仓库本地

## Capabilities 待确认项

- [x] 能力清单已与用户确认——global/catalog 分层、双路径安装、治理闭环均已对齐

## Impact

### 对 pi-config 仓库
- **新增文件**：`.pi/capabilities.yaml`、`.pi/skills/install-from-pi-config/SKILL.md`
- **修改文件**：`scripts/sync-pi-agent.sh`、`AGENTS.md`、`.pi/skills/pkg-research/SKILL.md`、`.pi/skills/pi-extension-dev/SKILL.md`
- **全局目标新增**：`~/.pi/agent/catalog/pi-config.yaml`（sync 时自动生成）
- **行为变化**：sync 脚本不再全量覆盖全局 extensions/agents/settings，改为选择性同步

### 对其他仓库
- **新能力**：可通过 `install-from-pi-config` 技能按需安装 pi-config 的 skill/extension/package
- **不变**：已全局同步的能力（planner-toggle、dollar-skill-invoke 等）继续对所有仓库可用

### 向后兼容
- 全局 extensions/agents 的现有内容不变（只是 sync 路径从全量复制改为白名单复制，白名单包含所有当前全局项）
- 已有全局 packages 不变
- AGENTS.md 同步不变

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页：`repo://orbitos/99_系统/Harness/OrbitOS_Spec_Standard/OrbitOS_Spec_Standard_v0.3.1.md`
- 已确认项目页：`repo://orbitos/20_项目/Pi_Config/Pi_Config.md`
- 已确认回写目标：`repo://orbitos/20_项目/Pi_Config/项目进度总览.md`
