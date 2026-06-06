# Design

## Context

`obsidian-cli` tool 曾在 `2026-05-01-obsidian-tools` 中实现（`raw-tool.ts` + `cli-runner.ts`），在 `2026-06-04-remove-obsidian-cli-dependency` 中因底层模块被删除而失效。现在需要恢复该 tool，但不恢复启动时的 CLI 调用。

上次实现将 preload 逻辑（`preloadKnownVaults`）和 execute 逻辑（`runCli`）耦合在同一个 `cli-runner.ts` 中。本次恢复需拆分职责，只恢复 execute 部分。

## Goals / Non-Goals

**Goals:**
- 新建 `cli-exec.ts`：纯 spawn 封装，只含 `runCli()` 函数
- 恢复 `raw-tool.ts`：obsidian_cli tool 定义、参数校验、调用 cli-exec
- 更新 `index.ts`：注册第二个 tool
- 修正二进制名为 `obsidian-cli`（纯 CLI 工具，非 GUI 启动器）
- `vault` 参数改为 required，接受名称直接透传

**Non-Goals:**
- 不恢复 `session_start` 中的任何 CLI 调用
- 不恢复 `cli-runner.ts`（用更干净的 `cli-exec.ts` 替代）
- 不修改 `vault-resolver.ts`、`search-tool.ts`、`search-config.ts`
- 不修改 `capabilities.yaml`（扩展注册条目不变）
- 不做 vault 名称自动推断（agent 通过 AGENTS.md 知识传入）

## Decisions

### D1: 新建 `cli-exec.ts` 而非复原 `cli-runner.ts`

旧的 `cli-runner.ts` 包含 `preloadKnownVaults()`、`parseTextPathLines()`、`parseSearchLines()` 等搜索相关解析器。这些在搜索后端迁移到 fff-node 后已无用。新的 `cli-exec.ts` 只需一个函数：

```typescript
export function runCli(args: string[], timeoutMs: number, signal?: AbortSignal): Promise<{ ok: boolean; stdout: string; stderr: string; code: number | null }>
```

职责：spawn `obsidian-cli` + 超时控制 + AbortSignal 支持。约 30 行。

### D2: `raw-tool.ts` 不依赖 vault-resolver

`obsidian-cli` 只接受 vault 名称（如 `my-wiki`），不接受路径。而 `vault-resolver.resolveVault()` 返回绝对路径。两者标识体系不同，不复用。

`raw-tool.ts` 直接将 `vault` 参数拼接到命令行，不做任何路径解析。

### D3: 二进制名修正

上次实现 spawn 的是 `obsidian`（GUI 启动器，102KB），这会在某些场景触发 Obsidian.app 窗口。正确的 CLI 二进制是 `obsidian-cli`（135KB），PATH 中已可直接访问。

不需要 fallback 路径——`obsidian-cli` 不在 PATH 等同于 Obsidian 未安装。

### D4: vault 参数 required

不传 vault 时直接返回校验错误，不尝试从 cwd 推断。Vault 名称映射知识由 AGENTS.md 提供（agent 在调用时自行判断传什么名称）。

## Risks / Migration

- **Risk**: Agent 不知道 vault 名称导致调用失败。
  - **Mitigation**: AGENTS.md 中已记录 vault 名称映射。首次使用时 tool 错误信息会提示需要 vault 名称。

- **Risk**: `obsidian-cli` 要求 Obsidian app 处于运行状态才能执行部分命令。
  - **Mitigation**: tool 错误信息中明确提示"Ensure Obsidian is running"。

- **Risk**: 旧 spec `openspec/specs/obsidian-cli-tool/spec.md` 中 Vault Resolution requirement 被标记为 REMOVED，可能导致消费方混淆。
  - **Mitigation**: 本 change 的 spec delta 明确标注了迁移路径：`vault` 参数从 optional → required。
