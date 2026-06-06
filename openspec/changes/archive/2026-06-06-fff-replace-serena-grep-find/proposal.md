# Proposal

## 问题定义

当前全局配置依赖 serena MCP 提供 LSP 代码智能（符号查找、引用追踪、跨文件重命名等），以及内置 `grep`/`find` 工具做文本和路径检索。实际使用中：

1. **serena 超时频繁**：在大项目中 LSP 语义操作（`find_symbol`、`find_referencing_symbols` 等）经常超时，阻塞 agent 工作流
2. **内置 grep/find 无智能排序**：返回原始匹配列表，agent 需要大量 token 过滤噪声
3. **维护成本高**：serena MCP 进程需要 lazy lifecycle 管理、`.serena/project.yml` 配置、LSP server 兼容性维护

已验证 fff（`ffgrep` + `fffind`）在 neonspark 仓库的实战表现优于上述组合，提供 frecency 排名 + git-aware + smart-case 等特性，且无外部进程依赖。

用户明确接受用效率换准确性：放弃 LSP 精准符号操作，回退到 `edit` + `bash sed` 做代码编辑。

## 范围边界

### IN

- AGENTS.md 工具指导重构（删除 Grep/Find Tool、LSP 代码智能 section，新增 fff 指导 section）
- 委派判断表重写（以信息掌握度为判断轴，去掉工具名）
- serena MCP 配置移除（`.pi/agent/mcp.json` 删除 serena 条目）
- serena-code-intelligence skill 归档（移至 `archive/`）
- `.pi/capabilities.yaml` 更新（移除 global.skills 中 serena 条目）
- 4 个 agent 定义文件的 tools 行更新（`grep` → `ffgrep`，`find` → `fffind`）
- `AGENTS.d/subagent-usage.md` 更新 serena 相关引用
- 全局同步执行

### OUT

- fff 工具本身的安装或配置（已作为全局包安装）
- serena 持久化记忆的迁移或保留（用户明确不需要）
- fff 工具的 bug 修复或功能增强
- reviewer / planner / oracle agent 定义修改（无 grep/find 工具，保持现状）

## Capabilities

### New Capabilities

- `fff-retrieval`: 全局代码检索与文件定位指导 — 基于 ffgrep/fffind 的决策表、使用原则、反模式和编辑工作流串联

### Modified Capabilities

- `global-agent-guidance`: 更新 AGENTS.md 核心工具指导 — 删除 Grep/Find Tool 和 LSP 代码智能 section，新增 fff 指导 section，重写委派判断表
- `global-mcp-config`: 移除 serena MCP server 配置
- `global-agent-definitions`: 更新 4 个 agent 的 tools 白名单（grep→ffgrep, find→fffind）

## Capabilities 待确认项

- [x] 能力清单已与用户确认

## Impact

- **所有使用 pi-config 全局配置的仓库**均受影响：检索行为从 serena+grep/find 切换到 fff
- **丧失能力**：LSP 语义符号查找、跨文件原子重命名、实时代码诊断、项目记忆持久化
- **代码编辑方式回退**：从 serena 的 `replace_content`/`rename_symbol` 回退到 `edit` tool + `bash sed`
- **serena 持久化记忆**：不迁移，已有记忆保留在原项目 `.serena/` 目录中但不再被 agent 使用

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页 / 项目页 / 回写目标：无外部标准页，变更文件均在 pi-config 仓库内（AGENTS.md、mcp.json、capabilities.yaml、agent 定义、AGENTS.d）
