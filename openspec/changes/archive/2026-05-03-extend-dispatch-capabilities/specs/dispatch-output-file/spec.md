# Specification Delta

## Capability 对齐（已确认）

- Capability: `dispatch-output-file`
- 来源: `proposal.md`
- 变更类型: `new`
- 用户确认摘要: 已确认能力清单

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: Tasks May Specify Output File Path

Each task in the `tasks[]` array SHALL support an optional `output` field (string path or boolean false) to write the task result to a file.

#### Scenario: Task with output file path
- **WHEN** a caller submits `{ tasks: [{agent: "worker", task: "Do X", output: "output/result.md"}] }`
- **THEN** the worker's result text is written to `output/result.md`
- **AND** the path appears in `savedOutputPath` in the result

#### Scenario: Output disabled with false
- **WHEN** a caller submits `{ tasks: [{agent: "worker", task: "Do X", output: false}] }`
- **THEN** no output file is written for that task
- **AND** the result still includes `finalOutput` text

### Requirement: Output Path Resolution

The `output` path SHALL resolve relative to the effective `cwd` of the task, or be treated as an absolute path if it starts with `/`. A `~` prefix SHALL be expanded to the user's home directory.

#### Scenario: Relative output path
- **WHEN** `output: "results/task1.md"` with no `cwd` override
- **THEN** the file is written to `<project_root>/results/task1.md`

#### Scenario: Absolute output path
- **WHEN** `output: "/tmp/dispatch/output.md"`
- **THEN** the file is written to `/tmp/dispatch/output.md`
