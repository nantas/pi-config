# Specification Delta

## Capability 对齐（已确认）

- Capability: `fork-manifest`
- 来源: `proposal.md`
- 变更类型: new
- 用户确认摘要: `forks/manifest.yaml` 记录所有 fork 的 canonical 元数据；字段包括 fork_url、upstream_url、upstream_source、status、last_upstream_sync、changes_summary；不记录机器特定的 clone 路径（由 repo-registry 管理）。

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: Manifest file location and format
The fork manifest SHALL be located at `forks/manifest.yaml` in the pi-config repository root. It SHALL be a valid YAML file with a top-level `forks` key containing a list of fork entries.

#### Scenario: Reading the manifest
- **WHEN** the agent or a user reads `forks/manifest.yaml`
- **THEN** they SHALL see a `forks` list where each entry conforms to the fork entry schema

---

### Requirement: Fork entry schema
Each fork entry in `forks/manifest.yaml` SHALL contain the following fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | yes | Fork package name (matching the package's primary identifier) |
| `fork_url` | url | yes | Fork repository URL (e.g., `https://github.com/nantasmac/pi-mcp-adapter`) |
| `upstream_url` | url | yes | Upstream repository URL (e.g., `https://github.com/nicobailon/pi-mcp-adapter`) |
| `upstream_source` | string | yes | Original install source string in pi-config (`npm:xxx`, `git:xxx`) |
| `status` | enum | yes | One of: `active`, `archived`, `upstreamed` |
| `last_upstream_sync` | date\|null | yes | Date of last upstream merge, or `null` if never synced |
| `changes_summary` | string | yes | Brief description of fork modifications and reason |

No additional fields SHALL be required. Machine-specific dev clone paths SHALL NOT be recorded in this manifest; they are managed via `repo-registry` under `repo://<name>`.

#### Scenario: Adding a new fork entry
- **WHEN** a new package is forked via Phase A of `pkg-fork-dev`
- **THEN** a new entry SHALL be appended to the `forks` list with all required fields populated

#### Scenario: Updating an existing fork entry
- **WHEN** a fork's status changes or modifications are shipped (Phase E)
- **THEN** the corresponding entry's `status`, `changes_summary`, or `last_upstream_sync` SHALL be updated

---

### Requirement: Manifest as single source of fork truth
The `forks/manifest.yaml` SHALL be the canonical registry of all forked packages managed by pi-config. Any package that has been forked for customization and is referenced by pi-config's `settings.json` SHALL have a corresponding entry in this manifest.

#### Scenario: Auditing fork status
- **WHEN** the user or agent wants to see all active forks
- **THEN** reading `forks/manifest.yaml` SHALL provide a complete list with status, URLs, and modification summaries

#### Scenario: Fork not in manifest
- **WHEN** a git: package in settings.json points to a user-owned repo but has no manifest entry
- **THEN** the agent SHALL flag this as a missing registration and suggest completing the fork workflow

---

### Requirement: Manifest read/write by skill
The `pkg-fork-dev` and `pkg-research` skills SHALL be the primary writers of `forks/manifest.yaml`. Manual edits are permitted but should follow the same schema.

#### Scenario: Skill writes to manifest
- **WHEN** `pkg-fork-dev` Phase A completes
- **THEN** a new entry SHALL be appended to `forks/manifest.yaml` using the defined schema

#### Scenario: Skill updates manifest
- **WHEN** `pkg-fork-dev` Phase E or F completes
- **THEN** the corresponding entry's mutable fields SHALL be updated in-place
