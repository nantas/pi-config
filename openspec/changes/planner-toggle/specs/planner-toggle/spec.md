# Specification Delta

## Capability 对齐（已确认）

- Capability: `planner-toggle`
- 来源: `proposal.md` / Phase A-B 需求讨论
- 变更类型: new
- 用户确认摘要: 快捷键 `Ctrl+Alt+P`，附加命令 `/planner`。Planner 模式使用 `deepseek/deepseek-v4-pro` 模型，限制工具为只读（参考 pi-mono plan-mode 示例的白名单策略），退出时恢复原模型。状态栏指示、toast 通知、session 持久化均需支持。无 CLI flag。

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: Shortcut Toggle
The system SHALL toggle between default mode and planner mode when the user presses `Ctrl+Alt+P`.

#### Scenario: Toggle from default to planner
- **WHEN** user presses `Ctrl+Alt+P` while in default mode
- **THEN** planner mode activates, model switches to `deepseek/deepseek-v4-pro`, active tools switch to read-only set, status bar shows planner indicator, toast notification confirms activation

#### Scenario: Toggle from planner to default
- **WHEN** user presses `Ctrl+Alt+P` while in planner mode
- **THEN** planner mode deactivates, model restores to the model that was active before entering planner mode, active tools restore to default set, status bar indicator clears, toast notification confirms deactivation

### Requirement: Command Toggle
The system SHALL register a `/planner` command as an alternative toggle mechanism with identical behavior to the shortcut.

#### Scenario: Toggle via command
- **WHEN** user types `/planner`
- **THEN** the same toggle logic executes as when pressing `Ctrl+Alt+P`

### Requirement: Planner Mode Model
The system SHALL switch the active model to `deepseek/deepseek-v4-pro` when entering planner mode.

#### Scenario: Model switch on planner activation
- **WHEN** planner mode is activated
- **THEN** the active model changes to `deepseek/deepseek-v4-pro`

#### Scenario: Unknown model handling
- **WHEN** planner mode is activated and `deepseek/deepseek-v4-pro` is not found in the model registry
- **THEN** the extension SHALL notify the user with an error message and planner mode SHALL NOT activate

### Requirement: Default Mode Model Restore
The system SHALL memorize the active model before entering planner mode and restore it when planner mode is deactivated.

#### Scenario: Model restore on planner deactivation
- **WHEN** planner mode is deactivated
- **THEN** the active model is set to the model that was active immediately before planner mode was activated

#### Scenario: First activation without prior model context
- **WHEN** planner mode is activated at session start without a previously memorized model (e.g., via `--planner`-like startup, though flag is out of scope)
- **THEN** the system SHALL use the current active model as the restore target

### Requirement: Read-Only Tool Restriction
The system SHALL restrict active tools to a read-only set when planner mode is active.

#### Scenario: Tool set switch on activation
- **WHEN** planner mode activates
- **THEN** active tools SHALL be set to `["read", "bash", "grep", "find", "ls"]`

#### Scenario: Tool set restore on deactivation
- **WHEN** planner mode deactivates
- **THEN** active tools SHALL be restored to the default set: `["read", "bash", "edit", "write"]`

#### Scenario: Write tool blocked in planner mode
- **WHEN** the LLM attempts to call `write` or `edit` while in planner mode
- **THEN** the `tool_call` handler SHALL block the call and return a reason indicating planner mode restricts file modifications

### Requirement: Bash Command Whitelist
The system SHALL filter bash commands in planner mode to allow only read-only operations, following the allowlist strategy from pi-mono's plan-mode example.

#### Scenario: Safe command allowed
- **WHEN** planner mode is active and the LLM attempts a read-only bash command (e.g., `ls`, `cat`, `grep`, `find`, `git log`, `git diff`, `git status`)
- **THEN** the bash command executes normally

#### Scenario: Destructive command blocked
- **WHEN** planner mode is active and the LLM attempts a destructive bash command (e.g., `rm`, `mv`, file redirection with `>`)
- **THEN** the `tool_call` handler SHALL block the call with a reason indicating the command is not safe in planner mode

### Requirement: UI Status Indicator
The system SHALL display a persistent status indicator when planner mode is active and SHALL show toast notifications on mode transitions.

#### Scenario: Status bar in planner mode
- **WHEN** planner mode is active
- **THEN** the TUI status bar SHALL display a planner mode indicator (e.g., "⏸ planner")

#### Scenario: Status bar cleared on exit
- **WHEN** planner mode is deactivated
- **THEN** the planner mode status indicator SHALL be removed from the status bar

#### Scenario: Toast on activation
- **WHEN** planner mode activates
- **THEN** a toast notification SHALL display the activation message including the active tool list

#### Scenario: Toast on deactivation
- **WHEN** planner mode deactivates
- **THEN** a toast notification SHALL display the deactivation message

### Requirement: Stale Context Cleanup
The system SHALL filter stale planner-mode context messages from the message history when planner mode is not active.

#### Scenario: Context messages stripped on deactivation
- **WHEN** the `context` event fires and planner mode is not active
- **THEN** any messages with `customType` equal to `planner-mode-context` SHALL be removed from the message list

### Requirement: State Persistence
The system SHALL persist planner mode state across session restarts and SHALL restore it on session resume.

#### Scenario: State saved on change
- **WHEN** planner mode is toggled
- **THEN** the current planner mode state SHALL be persisted via `pi.appendEntry`

#### Scenario: State restored on resume
- **WHEN** a session starts or resumes and a persisted planner state entry exists
- **THEN** planner mode SHALL be restored to the persisted state (tool set, model, status indicator)

### Requirement: Planner Mode System Instruction
The system SHALL inject a minimal instruction message when planner mode is active, informing the LLM that it is in read-only analysis mode.

#### Scenario: Instruction injected before agent start
- **WHEN** the `before_agent_start` event fires and planner mode is active
- **THEN** a message with `customType` `planner-mode-context` and `display: false` SHALL be injected describing the read-only restrictions and available tools
