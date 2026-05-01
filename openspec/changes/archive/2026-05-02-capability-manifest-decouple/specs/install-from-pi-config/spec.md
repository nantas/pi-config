# Specification Delta: install-from-pi-config

## Capability 对齐（已确认）

- Capability: `install-from-pi-config`
- 来源: `proposal.md` — New Capabilities
- 变更类型: `new`
- 用户确认摘要: 已确认双路径安装工作流、catalog 读取、依赖解析、重启引导

## 规范真源声明

- 本文件是 `install-from-pi-config` 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: Install Skill Must Be Globally Available
The system SHALL place the `install-from-pi-config` skill in `~/.pi/agent/skills/` so it is discoverable by Pi in any repository.

#### Scenario: Skill is synced globally
- **WHEN** the sync script runs
- **THEN** `install-from-pi-config/` is copied to `~/.pi/agent/skills/`

#### Scenario: Skill is discoverable from another repo
- **WHEN** Pi starts in a repository that does not have `install-from-pi-config` locally
- **THEN** the skill is available via `$install-from-pi-config` autocomplete

### Requirement: Install Workflow Must Read The Catalog
The system SHALL define a workflow step that reads `~/.pi/agent/catalog/pi-config.yaml` to discover available capabilities and the source repository path.

#### Scenario: Catalog is read
- **WHEN** the install skill is invoked with a capability name
- **THEN** the workflow reads the catalog file to find matching entries and `source_repo_path`

#### Scenario: Capability not found
- **WHEN** the requested capability name has no match in the catalog
- **THEN** the workflow reports that the capability is not available and lists catalog entries

### Requirement: Install Workflow Must Resolve Dependencies
The system SHALL resolve transitive dependencies declared in catalog entries before installation, and SHALL present the complete installation plan to the user for confirmation.

#### Scenario: Skill depends on an extension
- **WHEN** the requested skill has `requires.extensions: [obsidian-tools]`
- **THEN** the workflow adds `obsidian-tools` to the installation plan and presents the combined list

#### Scenario: Dependency is already installed
- **WHEN** a required dependency already exists in the target repository's `.pi/extensions/`
- **THEN** the workflow skips re-installing that dependency

### Requirement: Install Workflow Must Support File-Based Installation Path
The system SHALL define a file-based install path that copies skill directories or extension files from the source repository to the target repository's `.pi/` directory.

#### Scenario: Skill is copied
- **WHEN** installing a file-based catalog skill
- **THEN** files from `{source_repo}/.pi/skills/{name}/` are copied to `{target_repo}/.pi/skills/{name}/`

#### Scenario: Extension is copied
- **WHEN** installing a file-based catalog extension
- **THEN** files from `{source_repo}/.pi/extensions/{name}/` are copied to `{target_repo}/.pi/extensions/{name}/`

#### Scenario: Existing files prompt overwrite
- **WHEN** the target path already exists
- **THEN** the workflow prompts the user whether to overwrite before copying

### Requirement: Install Workflow Must Handle Extension npm Dependencies
The system SHALL detect extension directories with `package.json` and execute `npm install` in the target directory after copying.

#### Scenario: Extension has package.json
- **WHEN** a catalog extension has `has_package_json: true`
- **THEN** after copying, the workflow runs `npm install --no-package-lock --ignore-scripts` in the target directory

#### Scenario: Extension has no package.json
- **WHEN** a catalog extension has no `has_package_json` field or it is `false`
- **THEN** the workflow skips `npm install`

### Requirement: Install Workflow Must Support Settings-Based Installation Path
The system SHALL define a settings-entry install path for catalog packages with `type: "settings-entry"`, which adds the package source to the target repository's `.pi/settings.json` packages array and guides the user to restart Pi.

#### Scenario: Package is added to settings
- **WHEN** installing a package with `type: "settings-entry"`
- **THEN** the package source string is appended to the `packages` array in `{target_repo}/.pi/settings.json`

#### Scenario: Package already in settings
- **WHEN** the package source already exists in the target's `packages` array
- **THEN** the workflow reports that the package is already installed and skips the edit

#### Scenario: User is guided to restart Pi
- **WHEN** a settings-entry package has been added to `.pi/settings.json`
- **THEN** the workflow instructs the user to exit and restart Pi to trigger package installation

### Requirement: Install Workflow Must Verify Installation
The system SHALL verify after installation that all files exist at the expected target paths or that the settings entry has been written correctly.

#### Scenario: File-based install verification
- **WHEN** a file-based install completes
- **THEN** the workflow checks that the target files exist and reports which capabilities were installed

#### Scenario: Settings-based install verification
- **WHEN** a settings-entry install completes
- **THEN** the workflow confirms the `packages` array was updated and the package source is present
