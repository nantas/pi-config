# Proposal

## 问题定义

pi-config 项目缺乏 LSP 支持，agent 在编码和分析时只能依赖文本搜索（grep/rg）来定位代码定义、引用和类型信息，效率较低。同时，项目缺少 TypeScript 配置，导致 LSP 无法正确解析 `.pi/extensions/` 中的扩展源码。

## 范围边界

- **包含**: 调研并安装 `lsp-pi` package，创建项目 tsconfig.json 以启用 LSP
- **不含**: 修改任何已有扩展代码、新建扩展、修改其他项目配置

## Capabilities

### New Capabilities
- `lsp-pi-package`: 调研安全审查、安装、全局同步 lsp-pi（LSP 协议集成扩展），提供 9 种语义代码操作替代文本搜索
- `tsconfig-setup`: 创建项目根 tsconfig.json，配置 pi SDK 类型引用路径，使 LSP/编辑器能正确分析扩展代码

### Modified Capabilities
- 无

## Impact

- `.pi/settings.json`: 新增 `npm:lsp-pi` 到 packages 数组
- `tsconfig.json`: 新建文件，配置 TypeScript 项目选项和 pi SDK 路径映射
- `openspec/pkg-backlog.md`: 新增 lsp-pi 条目记录全局决策
- 全局 `~/.pi/agent/settings.json`: 通过 `sync-pi-agent.sh` 同步

## 关联绑定

- 关联 binding: `binding.md`
- 项目页面: `openspec/pkg-backlog.md`
- 回写目标: 无跨仓回写
