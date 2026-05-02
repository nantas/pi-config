# Specification Delta

## Capability 对齐（已确认）

- Capability: `planner-toggle`
- 来源: `proposal.md` / 已确认 capabilities
- 变更类型: modified
- 用户确认摘要: 改造现有 `planner-toggle.ts`，从 whitelist-based（`setActiveTools` + bash regex allowlist）重构为 prompt-based（通过 `before_agent_start` → `systemPrompt` 注入完整 plan mode 指令）。删除工具白名单和 bash regex，改为纯 prompt 指令驱动的只读约束。保留快捷键、命令、模型切换、状态指示、持久化等辅助功能。

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## KEPT Requirements

以下 requirements 行为不变，仅实现细节调整：

### Requirement: Shortcut Toggle
The system SHALL toggle between default mode and planner mode when the user presses `Ctrl+Alt+P`.

#### Scenario: Toggle from default to planner
- **WHEN** user presses `Ctrl+Alt+P` while in default mode
- **THEN** planner mode activates, model switches to `deepseek/deepseek-v4-pro`, status bar shows planner indicator, toast notification confirms activation

#### Scenario: Toggle from planner to default
- **WHEN** user presses `Ctrl+Alt+P` while in planner mode
- **THEN** planner mode deactivates, model restores to the model that was active before entering planner mode, status bar indicator clears, toast notification confirms deactivation

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
- **WHEN** planner mode is activated at session start without a previously memorized model
- **THEN** the system SHALL use the current active model as the restore target

### Requirement: UI Status Indicator
The system SHALL display a persistent status indicator when planner mode is active and SHALL show toast notifications on mode transitions.

#### Scenario: Status bar in planner mode
- **WHEN** planner mode is active
- **THEN** the TUI status bar SHALL display a planner mode indicator (e.g., "⏸ plan")

#### Scenario: Status bar cleared on exit
- **WHEN** planner mode is deactivated
- **THEN** the planner mode status indicator SHALL be removed from the status bar

#### Scenario: Toast on activation
- **WHEN** planner mode activates
- **THEN** a toast notification SHALL display the activation message

#### Scenario: Toast on deactivation
- **WHEN** planner mode deactivates
- **THEN** a toast notification SHALL display the deactivation message

## MODIFIED Requirements

### Requirement: Planner Mode System Instruction
The system SHALL inject comprehensive plan mode instructions into the system prompt when planner mode is active, using `before_agent_start` → `event.systemPrompt` rather than a custom message. The instruction SHALL contain:

1. Mode rules — plan mode persists until explicit toggle
2. Allowed vs. non-allowed actions — described by behavior ("reading files ✅", "editing files ❌"), not by tool name listing
3. Three-phase exploration workflow (ground → intent → implementation plan)
4. Final plan format guidance

#### Scenario: Instruction injected into system prompt
- **WHEN** the `before_agent_start` event fires and planner mode is active
- **THEN** the system prompt SHALL be appended with a comprehensive plan mode instruction block (via `event.systemPrompt`), instead of injecting a custom assistant message

#### Scenario: No custom message overhead
- **WHEN** planner mode is active
- **THEN** no custom assistant message with `customType: "planner-mode-context"` SHALL be injected; the instruction lives in the system prompt only

#### Scenario: Instruction is self-contained
- **WHEN** the instruction is injected
- **THEN** it SHALL describe allowed/non-allowed actions by behavioral principle (not tool names) so that future tool additions do not require maintenance

### Requirement: State Persistence
The system SHALL persist planner mode state across session restarts and restore it on session resume. State is simplified because no tool set needs to be persisted.

#### Scenario: State saved on change
- **WHEN** planner mode is toggled
- **THEN** the current planner mode state SHALL be persisted via `pi.appendEntry` (only `enabled` boolean + `previousModelKey`)

#### Scenario: State restored on resume
- **WHEN** a session starts or resumes and a persisted planner state entry exists
- **THEN** planner mode SHALL be restored to the persisted state

## REMOVED Requirements

### Requirement: Read-Only Tool Restriction
**Reason**: This change eliminates the tool whitelist approach. All tools remain available in planner mode; the LLM is trusted to follow the system prompt instructions to avoid mutations. No `pi.setActiveTools` filtering occurs.

**Migration**: The `PLANNER_TOOLS` and `DEFAULT_TOOLS` constants are deleted. No tool switching happens on plan mode toggle.

### Requirement: Bash Command Whitelist
**Reason**: The bash regex allowlist (both `DESTRUCTIVE_PATTERNS` and `SAFE_PATTERNS`) is deleted. Bash remains fully available in plan mode; the LLM is instructed via system prompt to only use non-mutating commands.

**Migration**: The `isSafeCommand` function and all pattern constants are removed. The `tool_call` handler no longer blocks bash commands.

### Requirement: Write Tool Blocked in Planner Mode
**Reason**: The explicit `write`/`edit` blocking in `tool_call` handler is removed. The LLM is expected to refrain from file writing based on system prompt instructions.

**Migration**: The `tool_call` handler block for `write`/`edit` tools is removed.

### Requirement: Stale Context Cleanup
**Reason**: Since instructions are now injected via `systemPrompt` (not custom assistant messages), there are no stale custom messages to filter from history.

**Migration**: The `context` event filtering logic for `planner-mode-context` messages is removed.
