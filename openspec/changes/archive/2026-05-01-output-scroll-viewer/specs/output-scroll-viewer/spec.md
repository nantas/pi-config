# Specification Delta

## Capability 对齐（已确认）

- Capability: `output-scroll-viewer`
- 来源: `proposal.md` / 已确认 capabilities
- 变更类型: `new`
- 用户确认摘要: 仅针对最后一条 assistant 消息，需要 Markdown 渲染，不覆盖 tool result

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: agent-completion-detection

The extension SHALL detect when the agent completes processing a user prompt by subscribing to the `agent_end` event from the ExtensionAPI.

#### Scenario: detect-agent-end
- **WHEN** the agent finishes processing the current user prompt (all tool calls and final response generated)
- **THEN** the extension receives an `agent_end` event and proceeds to check the output length

#### Scenario: no-false-trigger-during-streaming
- **WHEN** the agent is still streaming intermediate updates (`message_update`)
- **THEN** the extension SHALL NOT trigger any interaction

### Requirement: assistant-message-capture

The extension SHALL capture the final assistant message's text content for subsequent length analysis and display.

#### Scenario: capture-from-session-manager
- **WHEN** `agent_end` fires
- **THEN** the extension reads the last assistant message from `ctx.sessionManager.getBranch()`, extracts its text content, and stores it for rendering

#### Scenario: ignore-non-assistant-messages
- **WHEN** the last message is a user message, tool result, or custom message (not role "assistant")
- **THEN** the extension SHALL NOT trigger any interaction

### Requirement: multi-screen-detection

The extension SHALL determine whether the captured text, when rendered as Markdown at the current terminal width, exceeds the terminal's visible rows.

#### Scenario: short-output-no-action
- **WHEN** the rendered Markdown line count is less than or equal to `terminal.rows`
- **THEN** the extension SHALL NOT present any dialog or overlay

#### Scenario: long-output-triggers-prompt
- **WHEN** the rendered Markdown line count exceeds `terminal.rows`
- **THEN** the extension SHALL present a confirmation dialog asking the user whether to view from the output beginning

### Requirement: confirmation-dialog

The extension SHALL present a `ctx.ui.confirm()` dialog to the user before showing the scrollable overlay, with a clear message about the output length.

#### Scenario: user-confirms
- **WHEN** the user selects "Yes" (confirm returns `true`)
- **THEN** the extension opens the scrollable overlay viewer

#### Scenario: user-declines-or-idle
- **WHEN** the user selects "No" (confirm returns `false`)
- **THEN** the extension does nothing and returns to normal interactive state

### Requirement: scrollable-overlay-viewer

The extension SHALL render the captured assistant text in a `ctx.ui.custom({ overlay: true })` component that supports keyboard-driven vertical scrolling and Markdown formatting.

#### Scenario: markdown-rendering
- **WHEN** the overlay is displayed
- **THEN** the text SHALL be rendered using the pi-tui `Markdown` component with current theme styling, supporting headings, code blocks, links, lists, bold/italic/strikethrough

#### Scenario: keyboard-scroll-up
- **WHEN** the user presses `↑` or `k`
- **THEN** the viewport SHALL scroll up by one line (if not at the start)

#### Scenario: keyboard-scroll-down
- **WHEN** the user presses `↓` or `j`
- **THEN** the viewport SHALL scroll down by one line (if not at the end)

#### Scenario: page-up-scroll
- **WHEN** the user presses `Page Up` or `Ctrl+u`
- **THEN** the viewport SHALL scroll up by one page (visible line count)

#### Scenario: page-down-scroll
- **WHEN** the user presses `Page Down` or `Ctrl+d`
- **THEN** the viewport SHALL scroll down by one page (visible line count)

#### Scenario: jump-to-start
- **WHEN** the user presses `Home` or `g`
- **THEN** the viewport SHALL jump to the beginning of the text

#### Scenario: jump-to-end
- **WHEN** the user presses `End` or `G` or `Shift+g`
- **THEN** the viewport SHALL jump to the end of the text

#### Scenario: close-overlay
- **WHEN** the user presses `Escape`, `q`, or `Ctrl+c`
- **THEN** the overlay SHALL close and return to normal interactive state

#### Scenario: scroll-indicators
- **WHEN** the overlay is displayed and content exceeds the viewport
- **THEN** scroll indicators SHALL be shown (e.g., `↑N | ↓M` or a progress bar)

#### Scenario: full-viewport-usage
- **WHEN** the overlay is displayed
- **THEN** it SHALL use the full terminal width and available height (with appropriate border/padding) for maximum readability

### Requirement: dedup-and-lifecycle

The extension SHALL include the globalThis self-dedup marker and `session_shutdown` cleanup handler required by the pi-extension-dev skill for globally deployable extensions.

#### Scenario: dedup-on-duplicate-load
- **WHEN** the same extension is loaded from both project-local (`.pi/extensions/`) and global (`~/.pi/agent/extensions/`) paths
- **THEN** the dedup marker SHALL skip the duplicate registration

#### Scenario: cleanup-on-session-shutdown
- **WHEN** a session shutdown occurs (`/new`, `/reload`, `/resume`)
- **THEN** the `session_shutdown` handler SHALL clear the `globalThis` dedup flag

#### Scenario: re-registration-after-session-replace
- **WHEN** the user runs `/new` or `/reload` after the extension was previously loaded
- **THEN** the cleared dedup flag SHALL allow the extension to re-register its event handlers
