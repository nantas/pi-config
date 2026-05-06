# Specification Delta

## Capability 对齐（已确认）

- Capability: `browse-session-tree`
- 来源: `proposal.md` / 已确认 capabilities
- 变更类型: `new`
- 用户确认摘要: 用户通过 ask_user 确认命令名为 `/browse`，DetailPanel 默认折叠，完整子树折叠语义，DetailPanel 完整显示可滚动，全局同步部署

## 规范真源声明

- 本文件是 `browse-session-tree`  capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: register-browse-command
The system SHALL register a slash command `/browse` that launches an enhanced session tree browser rendered INLINE (replacing the editor container, same architecture as built-in `/tree`).

#### Scenario: command-registration
- **WHEN** the extension loads and a session is active
- **THEN** the `/browse` command MUST be available in the command palette
- **AND** invoking `/browse` MUST open the tree browser UI as an inline component
- **AND** the TUI MUST auto-render after every keyboard/mouse input event (no explicit requestRender needed)

### Requirement: tree-flatten-and-render
The system SHALL flatten the session tree into a navigable list with visual tree connectors (├─, └─, │) and active path markers (•).

#### Scenario: tree-visualization
- **WHEN** the browser opens
- **THEN** it MUST display all session entries from `ctx.sessionManager.getTree()`
- **AND** entries MUST be ordered with current branch prioritized (active path entries shown first)
- **AND** the current leaf entry MUST be marked with `•`
- **AND** tree connectors MUST use the same indentation semantics as the built-in `/tree`

### Requirement: fold-any-subtree
The system SHALL allow folding/unfolding of ANY node that has visible children, not just branch points.

#### Scenario: fold-linear-chain
- **WHEN** a node has visible children (e.g., an assistant node with tool results)
- **THEN** pressing the fold key (`h` or `left` when configured) MUST hide all descendants
- **AND** the node MUST display `⊞` indicator when folded
- **AND** the node MUST display `⊟` indicator when expanded and has children
- **AND** this behavior MUST apply even if the node is in a linear chain (single child)

#### Scenario: unfold-node
- **WHEN** a folded node is selected and the unfold key (`l` or `right`) is pressed
- **THEN** all hidden descendants MUST become visible again
- **AND** the `⊞` indicator MUST change back to `⊟`

### Requirement: detail-panel-preview
The system SHALL display a DetailPanel showing the complete content of the selected node.

#### Scenario: detail-panel-default-collapsed
- **WHEN** the browser opens
- **THEN** the DetailPanel MUST be collapsed by default
- **AND** only the TreePanel MUST be visible

#### Scenario: detail-panel-expand
- **WHEN** the user presses `Space`
- **THEN** the DetailPanel MUST expand below the TreePanel
- **AND** it MUST display the selected node's complete content
- **AND** pressing `Space` again MUST collapse the panel

#### Scenario: detail-panel-content-assistant
- **WHEN** an `assistant` message node is selected and DetailPanel is expanded
- **THEN** it MUST display the assistant's role, model, and full text content
- **AND** if the content includes tool calls, it MUST list each tool name and arguments
- **AND** the content MUST be scrollable within the panel via keyboard (↑/↓/PageUp/PageDown) and mouse wheel

#### Scenario: detail-panel-scroll-mouse-wheel
- **WHEN** DetailPanel is expanded and has content exceeding its visible height
- **THEN** scrolling the mouse wheel up MUST scroll the panel content up by 3 lines
- **AND** scrolling the mouse wheel down MUST scroll the panel content down by 3 lines
- **AND** SGR mouse mode MUST be enabled when DetailPanel expands and disabled when it collapses or the browser closes
- **AND** SGR mouse mode MUST be disabled on browser close via dispose()

#### Scenario: detail-panel-content-tool-result
- **WHEN** a `toolResult` node is selected and DetailPanel is expanded
- **THEN** it MUST display the tool name, tool call ID, execution result content
- **AND** if the result is an error, it MUST highlight the error state

#### Scenario: detail-panel-content-user
- **WHEN** a `user` message node is selected and DetailPanel is expanded
- **THEN** it MUST display the user's complete input text
- **AND** if images are attached, it MUST indicate the number of images

#### Scenario: detail-panel-content-other
- **WHEN** a `compaction`, `branch_summary`, `model_change`, or other entry type is selected
- **THEN** it MUST display the entry's type-specific fields in a readable format

### Requirement: search-and-filter
The system SHALL support search filtering and mode cycling similar to the built-in `/tree`.

#### Scenario: search-filtering
- **WHEN** the user types characters while the browser is focused
- **THEN** the tree list MUST filter to entries whose searchable text matches the query
- **AND** the search query MUST be displayed in the UI
- **AND** pressing `Escape` or `backspace` on empty query MUST clear the filter

#### Scenario: filter-mode-cycling
- **WHEN** the user presses `f`
- **THEN** the filter mode MUST cycle through: `default` → `no-tools` → `user-only` → `all` → `default`
- **AND** the current filter mode MUST be displayed in the status line

### Requirement: navigate-to-node
The system SHALL allow the user to jump to any selected node in the session tree.

#### Scenario: navigate-on-confirm
- **WHEN** the user presses `Enter` on a selected node
- **THEN** the browser MUST close
- **AND** it MUST call `ctx.navigateTree(selectedEntryId)` to move the session leaf to that node
- **AND** the user MUST be able to continue the conversation from that point

#### Scenario: cancel-navigation
- **WHEN** the user presses `q` or `Escape`
- **THEN** the browser MUST close without navigating
- **AND** the session MUST remain at its current leaf

### Requirement: keyboard-navigation
The system SHALL provide intuitive keyboard navigation within the browser.

#### Scenario: tree-navigation
- **WHEN** the user presses `↑` / `↓`
- **THEN** the selection MUST move up/down in the tree list
- **AND** the list MUST scroll to keep the selected item visible

#### Scenario: page-navigation
- **WHEN** the user presses `PageUp` / `PageDown`
- **THEN** the selection MUST jump by one page of visible entries

#### Scenario: jump-to-active-leaf
- **WHEN** the user presses `g`
- **THEN** the selection MUST jump to the current active leaf entry

### Requirement: global-dedup
The system SHALL include session shutdown dedup to prevent duplicate registration across session replacements.

#### Scenario: session-reload
- **WHEN** the user runs `/reload`, `/new`, or `/resume`
- **THEN** the extension MUST re-register correctly without being blocked by a stale `globalThis` flag
