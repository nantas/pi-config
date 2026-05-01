# LSP 代码智能工具

项目已安装 `lsp-pi` 扩展（`npm:lsp-pi`），为 Python（`pyright-langserver`）和 TypeScript（`typescript-language-server`）提供代码智能。

## 代码检索操作指南（Agent 必读）

**核心原则：涉及代码理解时，优先用 `lsp` 工具而非 `grep` + `read`。**

| 当需要… | 用 `lsp` action | 而非 |
|---|---|---|
| 找到函数/类/接口的定义位置 | `definition`（一键跳转到定义行）| `grep` + `read` + 人眼扫描 |
| 查看某个函数被哪些地方调用 | `references`（精确返回所有调用点）| `grep` 搜函数名然后人工筛除 import 和注释 |
| 了解一个文件里有哪些函数/类型 | `symbols`（结构化列表，含行号）| `read` 全文然后人眼扫描 |
| 查看变量/函数的类型签名 | `hover`（即时返回类型信息）| 人眼追踪类型声明链 |
| 修改前检查是否影响其他文件 | `references` + `diagnostics` | 凭记忆或手动 grep |
| 跨文件重命名符号 | `rename`（自动更新所有引用）| 逐个文件 `sed` |
| 检查刚编辑的代码是否有错误 | `diagnostics`（单文件）或 `workspace-diagnostics`（批量）| 等 `npm run lint` 或 `ruff check` |

### 典型用法模式

```
# 模式 1：探索陌生代码
lsp symbols(file="web/app/api/search/route.ts")
↓ 发现感兴趣的函数 searchAll
lsp definition(file="web/app/api/search/route.ts", query="searchAll")
↓ 跳转到定义
lsp references(file="web/lib/db.ts", query="searchAll")
↓ 查看所有调用点

# 模式 2：修改前的安全检查
lsp references(file="web/lib/db.ts", query="getVideos")
↓ 确认修改影响范围
# 改代码...
lsp diagnostics(file="web/lib/db.ts")
↓ 验证无新错误
```

## 自动诊断（Hook）

- 默认在每次 Agent 响应结束后，自动对编辑过的文件运行诊断
- 可通过 `/lsp` 命令切换模式：`agent_end`（默认）| `edit_write` | `disabled`

## 新成员环境初始化

除 Python 依赖外，还需确保 LSP 服务端可用：

```bash
which pyright-langserver && echo "Python LSP OK"
which typescript-language-server && echo "TypeScript LSP OK"
```

> 注意：`lsp-pi` 是 Pi 环境的扩展，不适用于 VS Code 等其他编辑器。
