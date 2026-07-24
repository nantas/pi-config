# Capability: capability-manifest

## Purpose

Define the structure, governance, and update workflow for `.pi/capabilities.yaml`, the single source of truth for which `.pi/` resources are globally synced and which are available for on-demand installation.

## Requirements

### Requirement: Repository Must Define A Capability Manifest File
The system SHALL define a `.pi/capabilities.yaml` file in the pi-config repository as the single source of truth for which `.pi/` resources are globally synced and which are available for on-demand installation.

#### Scenario: Manifest file exists
- **WHEN** a contributor inspects the pi-config repository
- **THEN** a `.pi/capabilities.yaml` file is present at the repository root of the `.pi/` directory

#### Scenario: Manifest is machine-readable
- **WHEN** the sync script or install skill reads the manifest
- **THEN** it can parse `global` and `catalog` sections with stable field names

### Requirement: Manifest Must Define Global Tier
The system SHALL include a `global` section in the manifest that declares all resources always synced to `~/.pi/agent/`, including `agent_md`, `extensions`, `agents`, `skills`, and `settings` with package whitelist and key exclusions.

#### Scenario: Global tier declares extensions
- **WHEN** the manifest is inspected
- **THEN** `global.extensions` lists extension names that the sync script copies to `~/.pi/agent/extensions/`

#### Scenario: Global tier declares agents
- **WHEN** the manifest is inspected
- **THEN** `global.agents` lists agent names that the sync script copies to `~/.pi/agent/agents/`

#### Scenario: Global tier declares skills
- **WHEN** the manifest is inspected
- **THEN** `global.skills` lists skill names that the sync script copies to `~/.pi/agent/skills/`

#### Scenario: Global tier declares settings packages
- **WHEN** the manifest is inspected
- **THEN** `global.settings.packages` lists package sources that the sync script retains in `~/.pi/agent/settings.json`

#### Scenario: Global tier declares settings exclusions
- **WHEN** the manifest is inspected
- **THEN** `global.settings.exclude_keys` lists top-level settings keys that the sync script removes from `~/.pi/agent/settings.json`

### Requirement: Manifest Must Define Catalog Tier
The system SHALL include a `catalog` section in the manifest that declares all resources available for on-demand installation by other repositories, including `skills`, `extensions`, and `packages`.

#### Scenario: Catalog lists skills
- **WHEN** the manifest is inspected
- **THEN** `catalog.skills` contains entries with `name`, `source`, `description`, and optional `requires` fields

#### Scenario: Catalog lists extensions
- **WHEN** the manifest is inspected
- **THEN** `catalog.extensions` contains entries with `name`, `source`, `description`, and optional `has_package_json` fields

#### Scenario: Catalog lists packages
- **WHEN** the manifest is inspected
- **THEN** `catalog.packages` contains entries with `name`, `source`, `description`, and `type: "settings-entry"` fields

### Requirement: Catalog Entries Must Declare Dependencies
The system SHALL allow catalog entries to declare dependencies via a `requires` field so the install workflow can resolve transitive requirements.

#### Scenario: Skill requires extension
- **WHEN** a catalog skill entry has `requires.extensions: [obsidian-tools]`
- **THEN** the install workflow identifies `obsidian-tools` as a prerequisite

#### Scenario: Skill has no dependencies
- **WHEN** a catalog skill entry has no `requires` field
- **THEN** the install workflow treats it as standalone

### Requirement: Manifest Must Distinguish File-Based And Settings-Based Packages
The system SHALL distinguish between file-based catalog entries (skills, extensions) and settings-based catalog packages via a `type` field, enabling the install workflow to choose the correct installation path.

#### Scenario: Package has type settings-entry
- **WHEN** a catalog package entry has `type: "settings-entry"`
- **THEN** the install workflow adds the package source to the target repository's `.pi/settings.json` rather than copying files

#### Scenario: Skill has no type field
- **WHEN** a catalog skill entry has no `type` field
- **THEN** the install workflow treats it as file-based and copies files

### Requirement: Global Settings Packages List Is Authoritative
`.pi/capabilities.yaml` 的 `global.settings.packages` 列表 SHALL 是全局同步到 `~/.pi/agent/settings.json` 的权威 packages 来源。运行 `scripts/sync-pi-agent.sh` 时，该列表 MUST 作为 authoritative 列表驱动 settings.json 的 packages 字段——列表中不存在的条目 MUST 从 settings.json 移除。

#### Scenario: 移除 package 后同步 settings
- **WHEN** `global.settings.packages` 不再包含某个 package 且运行 sync 脚本
- **THEN** `~/.pi/agent/settings.json` 的 `packages` 数组不再包含该 package 条目

#### Scenario: manifest 为权威列表
- **WHEN** 检查 `.pi/capabilities.yaml` 与 `~/.pi/agent/settings.json` 的 packages
- **THEN** settings.json 的 packages 与 manifest 列表一致，manifest 为唯一权威来源

### Requirement: Package Removal Must Clean Node Modules
当从全局能力移除一个已安装的 package 时，MUST 在 sync 脚本重写 `settings.json` 之外，额外执行 `pi remove <source>`（或等价的手动清理 `~/.pi/agent/npm/node_modules/<pkg>`），因为 sync 脚本只重写配置文件、不卸载已安装的 node_modules。验证 MUST 确认 `~/.pi/agent/` 下不再存在该包目录。

#### Scenario: 完整移除已安装 package
- **WHEN** 从 manifest 移除一个已安装的 package 并完成同步
- **THEN** 执行 `pi remove <source>` 后 `~/.pi/agent/npm/node_modules/<pkg>` 目录不再存在
- **THEN** 新 session 不再加载该 package 注册的工具

### Requirement: Fork Manifest Must Register Fusion Harness
The system SHALL include the fusion-harness fork entry in `forks/manifest.yaml` with canonical metadata (name, fork URL, upstream URL, upstream source, status).

#### Scenario: Manifest contains fusion-harness entry
- **WHEN** `forks/manifest.yaml` is inspected
- **THEN** it SHALL contain a `forks` list entry with `name: fusion-harness`, `fork_url: https://github.com/nantas/fusion-harness`, `upstream_url: https://github.com/disler/fusion-harness`, `upstream_source: git:github.com/disler/fusion-harness`, and `status: active`

### Requirement: Settings.json Must Reference Fusion Harness Package
The system SHALL include the fusion-harness package reference in `.pi/settings.json` packages array, using a local path during development and a git URL after shipping.

#### Scenario: Development mode uses local path
- **WHEN** the fork is under active modification
- **THEN** `.pi/settings.json` packages SHALL contain the absolute local path to the dev clone

#### Scenario: Production mode uses git URL
- **WHEN** the fork modifications are committed and pushed
- **THEN** `.pi/settings.json` packages SHALL contain `git:github.com/nantas/fusion-harness`

### Requirement: Settings.json Must Define Fusion Harness Configuration Block
The system SHALL support a `fusionHarness` block in `.pi/settings.json` that specifies the architect model, builder model, architect thinking level, and builder thinking level.

#### Scenario: Fusion harness block present after setup
- **WHEN** the change is complete
- **THEN** `.pi/settings.json` SHALL contain a `fusionHarness` object with `architect`, `builder`, `architectThinking`, and `builderThinking` keys

### Requirement: Global Package Conflict Must Be Resolved
When the fusion-harness fork is in development mode (local path), any conflicting global package entry in `~/.pi/agent/settings.json` SHALL be removed and the removal recorded for later restoration.

#### Scenario: Global conflict detected and resolved
- **GIVEN** `~/.pi/agent/settings.json` contains a package entry matching fusion-harness
- **WHEN** the project package source is switched to a local dev path
- **THEN** the conflicting global entry SHALL be removed and recorded in `.pi-dev-state.json` or OpenSpec `writeback.md`

#### Scenario: Global entries restored after shipping
- **GIVEN** global entries were removed during development
- **WHEN** the fork transitions to production mode (git URL)
- **THEN** the removed global entries SHALL be restored from the override record
