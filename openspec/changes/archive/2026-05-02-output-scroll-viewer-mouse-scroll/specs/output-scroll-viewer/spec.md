# Specification Delta

## Capability 对齐（已确认）

- Capability: `output-scroll-viewer`
- 来源: `proposal.md` / 已确认 capabilities
- 变更类型: `modified`
- 用户确认摘要: 在现有 output-scroll-viewer 的 ScrollableOutputViewer 组件中增加鼠标滚轮滚屏支持

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## MODIFIED Requirements

### Requirement: scrollable-overlay-viewer

The extension SHALL render the captured assistant text in a `ctx.ui.custom({ overlay: true })` component that supports keyboard-driven vertical scrolling, Markdown formatting, **and mouse wheel scrolling via SGR mouse protocol**.

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
- **THEN** scroll indicators SHALL be shown (e.g., `▲N | ▼M` or a progress bar)

#### Scenario: full-viewport-usage
- **WHEN** the overlay is displayed
- **THEN** it SHALL use the full terminal width and available height (with appropriate border/padding) for maximum readability

#### Scenario: mouse-wheel-scroll-up
- **WHEN** the user scrolls the mouse wheel upward while the overlay has focus
- **THEN** the viewport SHALL scroll up by 3 lines (or to the start if fewer lines remain)

#### Scenario: mouse-wheel-scroll-down
- **WHEN** the user scrolls the mouse wheel downward while the overlay has focus
- **THEN** the viewport SHALL scroll down by 3 lines (or to the end if fewer lines remain)

#### Scenario: mouse-mode-enable-on-open
- **WHEN** the overlay is displayed
- **THEN** SGR extended mouse mode (DECSET 1000 + 1006) SHALL be enabled via terminal write so the terminal sends mouse button events to the application

#### Scenario: mouse-mode-disable-on-close
- **WHEN** the overlay is closed (user presses Esc/q/Ctrl+c)
- **THEN** SGR mouse mode SHALL be disabled (DECRST 1000 + 1006) via terminal write

#### Scenario: mouse-other-buttons-ignored
- **WHEN** a mouse button event with a button code other than 64 (scroll up) or 65 (scroll down) is received
- **THEN** the event SHALL be silently ignored and the overlay continues functioning normally
