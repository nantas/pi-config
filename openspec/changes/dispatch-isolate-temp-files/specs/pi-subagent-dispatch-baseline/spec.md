# Specification Delta

## Capability 对齐（已确认）

- Capability: `pi-subagent-dispatch-baseline`
- 来源: `proposal.md`
- 变更类型: `modified`
- 用户确认摘要: 用户确认按方案 A 修复：移除 dispatch executor 调用中的 `cwd: PROJECT_ROOT` 参数

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## MODIFIED Requirements

### Requirement: dispatch-executor-cwd-scope

The system SHALL NOT pass the repository root (`PROJECT_ROOT`) as a default `cwd` to the dispatch subagent executor. Each dispatched task SHALL use the Pi session's runtime `cwd` (`ctx.cwd`) or an explicit per-task `cwd` override, rather than a hardcoded `PROJECT_ROOT`.

#### Scenario: Dispatch does not write progress.md to repo root
- **WHEN** `/dispatch` is invoked with a multi-task request
- **THEN** the dispatch executor SHALL NOT create `progress.md` or other temporary runtime files in the repository root directory
- **AND** the executor session root SHALL continue to resolve to `os.tmpdir()` via `getSubagentSessionRoot`

#### Scenario: Per-task cwd still supported
- **WHEN** a dispatch task specifies an explicit `cwd` field
- **THEN** the subagent SHALL run in that explicit directory as expected
- **AND** the fix SHALL NOT affect per-task `cwd` resolution
