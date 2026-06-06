# Proposal

## 问题定义

`obsidian-tools` 扩展曾在 `2026-05-01-obsidian-tools` change 中同时注册了 `obsidian_search` 和 `obsidian_cli` 两个 tool。后者提供 Obsidian CLI 命令透传能力（create/move/rename/delete/append/property:set 等），自动处理 wikilink 更新。

在 `2026-06-04-remove-obsidian-cli-dependency` change 中，为消除 `session_start` 时不必要的 `preloadKnownVaults()` CLI 进程启动，删除了 `cli-runner.ts` 底层模块。由于 `raw-tool.ts`（obsidian_cli tool 实现）依赖 `cli-runner.ts` 的 `runCli()` 函数，导致 obsidian_cli tool 实质失效并被移除。

**核心矛盾**：解决启动时 CLI 依赖的 change 过度删除了运行时 CLI 透传能力。消费仓库的 skill 文档仍引用 obsidian-cli 做文件操作（move/rename/delete），但已无执行路径。

**现状**：
- `obsidian-cli` 二进制可用，支持 create/move/rename/delete/append/property:set 等命令
- `openspec/specs/obsidian-cli-tool/spec.md` 仍存在且完整，但 spec 中二进制名需修正（`obsidian` → `obsidian-cli`）
- 消费仓库 `work-with-me.md` 写了"创建/移动/删除文件使用 obsidian-cli"但无工具可用
- 8 个工作流 skill 需要评估是否受益于恢复此能力

## 范围边界

| 维度 | 说明 |
|------|------|
| **In scope** | 新建 `cli-exec.ts`（纯 spawn 封装，不含 preload 逻辑） |
| **In scope** | 恢复 `raw-tool.ts`（obsidian_cli tool 定义，参数校验，调用 cli-exec） |
| **In scope** | 更新 `index.ts` 注册第二个 tool |
| **In scope** | 更新 `package.json` description（当前已过时） |
| **Out of scope** | 不恢复 `session_start` 中的任何 CLI 调用 |
| **Out of scope** | 不恢复 `cli-runner.ts`（用更干净的 `cli-exec.ts` 替代） |
| **Out of scope** | 不修改 `vault-resolver.ts`、`search-tool.ts`、`search-config.ts` |
| **Out of scope** | 不修改 `capabilities.yaml`（扩展注册条目不变） |

## Capabilities

### New Capabilities

（无新增 capability）

### Modified Capabilities

- `obsidian-cli-tool`: 恢复 `obsidian_cli` tool 注册与实现；修正二进制名为 `obsidian-cli`（纯 CLI 二进制），移除 fallback 逻辑；vault 参数改为 required（接受名称直接透传，不依赖 vault-resolver）

## Capabilities 待确认项

- [x] 能力清单已与用户确认：仅修改 `obsidian-cli-tool` 一项能力
- [x] 二进制名修正已确认：只调 `obsidian-cli`，不用 `obsidian` GUI 二进制
- [x] vault 参数策略已确认：required，接受名称直接透传
- [x] 不依赖 vault-resolver 已确认

## Impact

- **工具恢复**：agent 可通过 MCP 工具调用 `obsidian_cli` 执行文件操作（create/move/rename/delete 等）
- **wikilink 维护**：obsidian-cli 的 move/rename 原生处理所有 wikilink 更新（`[[完整路径|...]]`、`[[裸文件名]]`、frontmatter 路径引用）
- **启动行为不变**：不恢复 `session_start` 中的任何 CLI 调用，启动行为与当前一致
- **搜索功能不变**：`obsidian_search` 工具全部行为不受影响
- **实现量**：新增 ~80 行代码（`cli-exec.ts` ~30 行 + `raw-tool.ts` ~50 行），`index.ts` 增加 1 行注册

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页 / 项目页 / 回写目标：无外部标准页；spec 真源为 `openspec/specs/obsidian-cli-tool/spec.md`；无外部回写目标
- 历史关联：`openspec/changes/archive/2026-05-01-obsidian-tools/`（原始创建）、`openspec/changes/archive/2026-06-04-remove-obsidian-cli-dependency/`（过度删除）
