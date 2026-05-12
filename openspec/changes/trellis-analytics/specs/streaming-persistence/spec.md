# Specification Delta

## Capability 对齐（已确认）

- Capability: `streaming-persistence`
- 来源: `proposal.md` / 已确认 capabilities
- 变更类型: new
- 用户确认摘要: 用户已确认四项 capability 清单

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: streaming-jsonl-write
The extension SHALL write each recorded event to JSONL immediately upon capture, not buffered until session shutdown.

#### Scenario: write-on-event
- **WHEN** a `skill_load` event is recorded
- **THEN** within the same event handler, the extension appends one JSON line to the target JSONL file

#### Scenario: event-schema
- **WHEN** a line is appended
- **THEN** the line SHALL be valid JSON with fields: `{ ts: "<ISO8601>", session: "<session-id>", turn: <number>, event: "<event-type>", data: { ... } }`

#### Scenario: newline-convention
- **WHEN** writing to JSONL
- **THEN** each record SHALL be terminated by `\n`

### Requirement: session-continuation
The extension SHALL detect on initialization whether the current session has a pre-existing analytics JSONL file, and if so, append new events to it rather than creating a new file.

#### Scenario: continue-existing-task
- **WHEN** extension initializes and `.trellis/.current-task` points to task `05-12-my-task` AND `.trellis/.analytics/tasks/05-12-my-task/events.jsonl` already exists
- **THEN** extension opens the existing file in append mode and writes new events to it

#### Scenario: create-new-task
- **WHEN** extension initializes and `.trellis/.current-task` points to a new task AND no JSONL file exists for it
- **THEN** extension creates `.trellis/.analytics/tasks/<new-slug>/events.jsonl` and writes from the first event

#### Scenario: orphan-session
- **WHEN** extension initializes and `.trellis/.current-task` does not exist
- **THEN** extension writes to `.trellis/.analytics/orphans/<pi-session-id>.jsonl`

### Requirement: task-based-directory-structure
The extension SHALL organize analytics files by trellis task slug under `.trellis/.analytics/tasks/<task-slug>/`.

#### Scenario: create-dir-on-demand
- **WHEN** a new task directory is detected
- **THEN** extension creates the directory path (with parents) if it does not exist

#### Scenario: file-naming
- **WHEN** writing events for a task
- **THEN** the filename SHALL always be `events.jsonl` (single file per task, continuous append)

### Requirement: crash-recovery
The extension SHALL help ensure data is not lost on session crash by calling `fsync()` on the underlying file descriptor after each write.

#### Scenario: fsync-after-write
- **WHEN** a JSON line is written and the file descriptor is available
- **THEN** extension calls `fsync()` on the file descriptor before returning

#### Scenario: graceful-degradation
- **WHEN** `fsync()` throws an error (e.g., non-file descriptor in test mode)
- **THEN** extension catches the error and continues without crashing

### Requirement: bounded-file-size
The extension SHALL NOT implement file size limits in v1. Files grow unbounded per task. This is an acknowledged limitation for future improvement.

#### Scenario: acknowledge-limitation
- **WHEN** a task spans many Pi sessions and the events.jsonl grows large
- **THEN** the extension does NOT rotate, truncate, or compress the file
