# Proposal

## 问题定义

`output-scroll-viewer` 扩展提供了一个全屏可滚动的 overlay 查看器，但当前仅支持键盘导航（↑↓/jk/PgUp/PgDn/Home/End）。用户在使用中需要通过鼠标滚轮翻页的场景无法满足，效率低下。本 change 为 overlay 查看器增加鼠标滚轮滚屏支持，让用户可以自由选择键盘或鼠标操作。

## 范围边界

- **范围内**：
  - ScrollableOutputViewer 组件中解析 SGR 鼠标滚轮事件
  - 覆层打开时启用 SGR mouse mode（button events），关闭时禁用
  - 滚轮上滚 3 行，下滚 3 行
  - 保持与现有键盘滚动操作不冲突

- **范围外**：
  - 不做点击定位（不支持鼠标点击跳转到某行）
  - 不做 motion tracking（不启用 ?1002）
  - 不修改 pi-tui 自身的输入处理架构
  - 不改变现有的键盘快捷键

## Capabilities

### Modified Capabilities

- `output-scroll-viewer`: 为现有的 ScrollableOutputViewer 增加鼠标滚轮滚屏能力，通过 SGR 鼠标协议解析终端滚轮事件，支持滚动查看长文本

## Capabilities 待确认项

- [x] 能力清单已与用户确认（在前期设计方案讨论中已确认）

## Impact

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `.pi/extensions/output-scroll-viewer.ts` | 修改 | ScrollableOutputViewer 类 - constructor 中启用/禁用 SGR mouse mode，handleInput 中解析鼠标滚轮事件 |
| `openspec/specs/output-scroll-viewer/spec.md` | 追加 | 新增 `mouse-wheel-scroll` Requirement 及相关场景 |

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页 / 项目页 / 回写目标：
  - `spec_standard_ref`: pi-mono docs/extensions.md, pi-mono tui/src/tui.ts, pi-mono tui/src/stdin-buffer.ts
  - 回写目标：无外部项目页面需要回写
