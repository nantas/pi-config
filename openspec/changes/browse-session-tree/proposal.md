# Proposal

## 问题定义

Pi 内置 `/tree` 命令的 session 浏览器存在两个核心交互缺陷：

1. **Fold 快捷键语义受限**：`app.tree.foldOrUp` / `app.tree.unfoldOrDown`（`Ctrl+←/→` 或 `Alt+←/→`）仅对**分支点**节点生效（要求父节点有多个可见子节点）。线性对话链上的节点不可折叠，用户按快捷键时无视觉反馈，产生"快捷键无效"的困惑。

2. **无法预览节点详情**：`/tree` 只有导航功能（选中后 Enter 跳转），没有详情预览面板。用户无法在选择节点前查看其完整内容（如 assistant 的完整回复、tool 调用的参数和结果），必须跳转后才能看到内容。

## 范围边界

**In Scope：**
- 注册新的扩展命令 `/browse`，提供增强版 session 树浏览器
- 任意有子节点的节点均可折叠/展开（不限于分支点）
- 选中节点后可在 DetailPanel 中预览完整内容
- 支持搜索过滤（类似内置 `/tree`）
- 支持 Enter 跳转到选中节点并恢复上下文
- 默认 DetailPanel 折叠，按 Space 展开
- DetailPanel 内可滚动浏览完整内容

**Out of Scope：**
- 不修改或覆盖内置 `/tree` 命令（扩展无法覆盖内置命令）
- 不支持 label 编辑（已有内置 `/bookmark`）
- 不支持分支总结（branch summary）生成
- 不引入新的 npm 依赖（仅使用 `pi-coding-agent` + `pi-tui`）

## Capabilities

### New Capabilities
- `browse-session-tree`: 通过 `/browse` 命令启动增强版 session 树浏览器，支持完整子树折叠、节点详情预览和跳转导航

### Modified Capabilities
- （无）

## Capabilities 待确认项

- [x] 能力清单已与用户确认

## Impact

**新增文件：**
- `.pi/extensions/browse-session-tree.ts` — 单文件扩展实现

**修改文件：**
- `.pi/capabilities.yaml` — 将扩展加入 `global.extensions` 列表（全局同步）

**无破坏性变更：**
- 不修改内置 `/tree` 的行为
- 不影响现有 session 数据格式
- 不修改 settings.json

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页 / 项目页 / 回写目标：
  - `repo://pi-mono/packages/coding-agent/docs/extensions.md`
  - `docs/plans/pi-customization-reference.md`
  - `.pi/skills/pi-extension-dev/SKILL.md`
  - 回写目标：`.pi/extensions/browse-session-tree.ts`、`capabilities.yaml`
