# Specification Delta

## Capability 对齐（已确认）

- Capability: `capability-manifest`
- 来源: `proposal.md` / 已确认 capabilities
- 变更类型: `modified`
- 用户确认摘要: 用户于 specs 阶段确认本次仅修改 `capability-manifest` 一个 capability（新增 `global.shared_skills` 字段语义与同步行为），不新建 capability，agent-reach 内容合并不单列能力域

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: Shared Skills Layer Declaration
The capability manifest SHALL support a `global.shared_skills` list declaring skills that are synced to the user-level shared skills directory (`~/.agents/skills/`), for skills usable by multiple agent harnesses without pi-specific coupling.

#### Scenario: Manifest declares a shared skill
- **WHEN** `.pi/capabilities.yaml` contains `global.shared_skills` with entry `agent-reach`
- **THEN** the sync executor SHALL treat `.pi/skills/agent-reach/` as the source of truth for that skill and sync it to `~/.agents/skills/agent-reach/`

#### Scenario: Shared skill entry conflicts with global.skills
- **WHEN** the same skill name appears in both `global.skills` and `global.shared_skills`
- **THEN** sync validation SHALL report the duplication as an error listing the skill name, and the operator SHALL resolve it by keeping the skill in exactly one list

### Requirement: Shared Skills Sync Is Non-Destructive To Foreign Content
The sync executor SHALL sync each declared `global.shared_skills` entry to `~/.agents/skills/<name>/` by wholesale replacement of that skill's directory, and SHALL NOT remove or modify any other content in `~/.agents/skills/` that is not declared in the manifest.

#### Scenario: Sync updates a shared skill
- **WHEN** sync runs and `.pi/skills/<name>/` differs from `~/.agents/skills/<name>/`
- **THEN** the sync executor SHALL remove `~/.agents/skills/<name>/` and copy the repository version in its place, and log the action

#### Scenario: Shared directory contains undeclared skills
- **WHEN** `~/.agents/skills/` contains directories not listed in `global.shared_skills`
- **THEN** the sync executor SHALL leave them untouched (no stale cleanup, unlike `~/.pi/agent/skills/`)

#### Scenario: Declared skill missing from repository source
- **WHEN** `global.shared_skills` declares a skill with no matching `.pi/skills/<name>/` directory
- **THEN** the sync executor SHALL log a warning and continue, without creating or deleting anything at the shared target

### Requirement: Shared Skills Count As Active Capabilities For Env Validation
Skills declared under `global.shared_skills` SHALL count as active capability IDs when validating `global.env` variable declarations.

#### Scenario: Env variable declared for a shared skill
- **WHEN** `global.env` declares variables keyed by a capability ID that is present in `global.shared_skills`
- **THEN** env validation SHALL accept that capability as active and validate its variables the same way as entries in `global.skills`

## MODIFIED Requirements

### Requirement: Skills Manifest Sync Whitelist
The `global.skills` list SHALL remain the authoritative whitelist for skills synced to `~/.pi/agent/skills/`: entries are synced wholesale, and stale skills present in `~/.pi/agent/skills/` but removed from `global.skills` SHALL be deleted by sync. A skill migrated from `global.skills` to `global.shared_skills` SHALL therefore be automatically removed from `~/.pi/agent/skills/` on the next sync run.

#### Scenario: Skill migrated to shared_skills retires from pi skills dir
- **WHEN** a skill entry moves from `global.skills` to `global.shared_skills` and sync runs
- **THEN** `~/.pi/agent/skills/<name>/` SHALL be deleted (stale cleanup) and `~/.agents/skills/<name>/` SHALL hold the repository version

#### Scenario: Undeclared skill remains untouched only when not previously managed
- **WHEN** `~/.pi/agent/skills/` contains a skill never declared in `global.skills` or `global.shared_skills`
- **THEN** sync SHALL remove it, preserving existing whitelist semantics for the pi-owned skills directory
