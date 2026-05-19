# LSP 参考指南

> **工作流指南**：代码探索、修改验证流程见 `lsp-code-intelligence` skill（自动注入）。
> 本文档提供 hook 配置、环境初始化和进阶用法参考。

---

## Hook 配置

自动诊断默认在 Agent 响应结束后对编辑过的文件运行。

通过 `/lsp` 命令切换模式：

| 模式 | 行为 | 适用场景 |
|------|------|---------|
| `agent_end`（默认）| 每次 agent 响应后诊断 | 通用开发 |
| `edit_write` | 每次 `edit`/`write` 调用后诊断 | 激进的即时反馈 |
| `disabled` | 不自动运行 | 需要手动控制诊断时机 |

## 环境初始化

确保 LSP 服务端可用：

```bash
which pyright-langserver && echo "Python LSP OK"
which typescript-language-server && echo "TypeScript LSP OK"
```

### 安装

```bash
# Python
npm install -g pyright

# TypeScript / JavaScript
npm install -g typescript typescript-language-server
```

## 工具参数参考

| Action | 必填参数 | 可选参数 | 说明 |
|--------|---------|---------|------|
| `symbols` | `file` | `query` | 列出文件中的符号（函数、类、接口等）|
| `definition` | `file` | `query`, `line`, `column` | 跳转到符号定义位置 |
| `references` | `file` | `query`, `line`, `column` | 查找所有引用/调用点 |
| `hover` | `file` | `query`, `line`, `column` | 获取类型签名和文档 |
| `rename` | `file` | `query`, `line`, `column`, `newName` | 跨文件重命名符号 |
| `diagnostics` | `file` | `severity` | 单文件诊断 |
| `workspace-diagnostics` | — | `files`, `severity` | 批量文件诊断 |
| `signature` | `file` | `query`, `line`, `column` | 函数签名信息 |
| `codeAction` | `file` | `line`, `column`, `endLine`, `endColumn` | 代码操作（修复建议）|

> 注意：`lsp-pi` 是 Pi 环境的扩展，不适用于 VS Code 等其他编辑器。
