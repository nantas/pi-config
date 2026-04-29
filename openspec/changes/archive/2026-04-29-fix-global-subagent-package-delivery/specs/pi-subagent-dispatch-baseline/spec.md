# Specification Delta

## Capability 对齐（已确认）

- Capability: `pi-subagent-dispatch-baseline`
- 来源: `proposal.md` / 已确认 capabilities
- 变更类型: `modified`
- 用户确认摘要: 用户确认保留仓库自有 `dispatch` contract，但把运行时交付从“同步裸扩展目录”改成“package-backed 全局入口”

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

## MODIFIED Requirements

### Requirement: The Repository Must Expose A Repository-Owned Dispatch Tool
The system SHALL provide a repository-owned `dispatch` tool through a package-backed runtime entry so that the same dispatch contract can load both inside `pi-config` and in any other repository where the global package source is enabled.

#### Scenario: Contributor inspects the subagent entrypoint after the packaging change
- **WHEN** a contributor reviews how multi-agent delegation is initiated after the global delivery fix
- **THEN** the contributor can still identify a repository-owned `dispatch` tool as the formal entrypoint
- **AND** the contributor can see that the runtime entry is package-backed rather than a synced raw global extension directory

### Requirement: The Repository Must Expose A Dispatch Command Wrapper
The system SHALL provide a `/dispatch` command wrapper that remains bound to the repository-owned dispatch behavior regardless of whether the runtime session starts inside `pi-config` or another repository.

#### Scenario: Contributor invokes dispatch outside pi-config
- **WHEN** a contributor starts Pi in another repository with the global package source enabled
- **THEN** `/dispatch` is still available as the convenience wrapper over the same repository-owned dispatch flow

### Requirement: Dispatch Must Bridge To Real Pi-Subagents Execution
The system SHALL bridge the repository-owned `dispatch` tool to real `pi-subagents` execution through package-owned dependency resolution rather than through a filesystem assumption tied to `~/.pi/agent/npm/`.

#### Scenario: Contributor reviews the execution path after the delivery fix
- **WHEN** a contributor inspects how `dispatch` resolves the `pi-subagents` substrate
- **THEN** the execution path can be traced to package-managed imports
- **AND** the bridge no longer requires a mirrored `~/.pi/agent/npm/node_modules/pi-subagents` directory to exist

## REMOVED Requirements

## RENAMED Requirements
