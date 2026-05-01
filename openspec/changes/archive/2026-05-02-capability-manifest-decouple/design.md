# Design

## Context

当前 `scripts/sync-pi-agent.sh` 使用硬编码 MAPPINGS 数组执行全量目录覆盖式同步：所有 extensions、agents、settings.json 键一律推向全局。skills 完全隔离不参与同步。其他仓库无法发现或按需安装 pi-config 的能力。本 change 引入 `.pi/capabilities.yaml` 作为能力清单，将同步行为改造为选择性，并为其他仓库提供标准化安装工作流。

## Goals / Non-Goals

**Goals:**
- 建立 `.pi/capabilities.yaml` 数据结构：声明 global（全局同步）与 catalog（按需安装）两层能力
- 改造 sync 脚本：按 manifest 选择性同步 + settings.json 白名单过滤 + catalog 发布
- 创建 `install-from-pi-config` 全局技能：双路径安装工作流
- 建立治理闭环：AGENTS.md 规则 + pkg-research/pi-extension-dev 工作流增强

**Non-Goals:**
- 不修改 Pi 核心代码
- 不改变 `~/.pi/agent/` 的目录结构（仅新增 catalog/ 子目录）
- 不为 catalog 能力提供版本锁定（首次实现）
- 不变更 `.pi/prompts/` 和 `.pi/themes/` 的同步方式

## Decisions

### Decision 1: Manifest 作为单一能力清单，替代硬编码 MAPPINGS

**选择**：用 `.pi/capabilities.yaml` 定义 global 和 catalog 两层，sync 脚本和 install 技能都读取该文件。

**替代方案**：在 sync 脚本内维护白名单数组。但这样 install 技能无法读取同一份数据，会导致两处维护漂移。

### Decision 2: 双路径安装模型

**选择**：install-from-pi-config 支持两种安装路径：
- **File-based** (skills/extensions)：直接复制文件到目标仓库 `.pi/`
- **Settings-entry** (packages)：编辑目标仓库 `.pi/settings.json` 的 packages 数组

**理由**：npm/git 包无法通过文件复制安装，必须通过 Pi 的包管理系统加载。编辑 settings.json 后引导用户重启 Pi 是 Pi 的标准化包安装流程。

### Decision 3: Catalog 发布到 ~/.pi/agent/catalog/

**选择**：sync 脚本将 catalog 段写入 `~/.pi/agent/catalog/pi-config.yaml`，附加 `source_repo_path`。

**理由**：其他仓库的 agent 需要一个已知路径来发现可安装能力。`~/.pi/agent/` 是全局共享路径，任何仓库的 Pi 都能访问。

### Decision 4: Settings 过滤采用白名单 + 排除键

**选择**：`global.settings.packages` 白名单控制哪些包推到全局；`global.settings.exclude_keys` 排除模型/子代理等仓库特定键。

**理由**：白名单保证安全（不会意外泄漏新包），排除键避免仓库特定设置污染其他仓库的运行时。未列出的 settings 键（如 `lastChangelogVersion`）保持原样同步。

### Decision 5: 治理闭环通过 AGENTS.md 规则 + 技能工作流增强

**选择**：
1. AGENTS.md 新增规则：`.pi/` 资源变更必须同步更新 capabilities.yaml
2. pkg-research Phase 3 新增 manifest 写入
3. pi-extension-dev Phase F 新增 manifest 写入

**理由**：不依赖人工记忆。工作流自动执行写入，AGENTS.md 规则提供兜底约束。

### Decision 6: 首次实现不包含版本锁定

**选择**：catalog 不记录能力版本号，安装时总是复制"当前最新"。

**理由**：当前 catalog 能力数量少（~6 项），版本锁定增加了复杂性而无实际收益。后续 change 可扩展。

## Risks / Migration

### Risk 1: Sync 脚本行为变化可能导致全局能力缺失

- **影响**：如果 manifest 漏写了某个当前全局的 extension/agent，下一次 sync 会将其删除
- **缓解**：
  1. manifest 初始化时严格审计当前全局状态，确保所有现有全局项都在 `global` 中声明
  2. 首次 sync 前与用户确认 manifest 内容
  3. `~/.pi/agent/` 的 git 历史（如有）可作为回滚依据

### Risk 2: 其他仓库安装后需要重启 Pi

- **影响**：settings-entry 安装后用户可能忽略重启提示，导致 package 未生效
- **缓解**：install skill 明确输出重启指令，不用静默完成

### Risk 3: Manifest 与 settings.json 漂移

- **影响**：手动编辑 settings.json 添加 package 但忘记更新 manifest，或反之
- **缓解**：AGENTS.md 治理规则明确要求同步；pkg-research 工作流自动写入

### Risk 4: Catalog 路径有效性

- **影响**：若 pi-config 仓库移动或重命名，catalog 中的 `source_repo_path` 失效
- **缓解**：sync 脚本每次运行时重新计算绝对路径并写入 catalog
