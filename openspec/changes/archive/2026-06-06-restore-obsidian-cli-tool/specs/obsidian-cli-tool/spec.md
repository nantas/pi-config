# Specification Delta

## Capability 对齐（已确认）

- Capability: `obsidian-cli-tool`
- 来源: `proposal.md` / 用户在 grill-with-docs 会话中逐项确认
- 变更类型: modified
- 用户确认摘要: 二进制名修正（obsidian → obsidian-cli）、vault 参数改为 required 且接受名称直接透传、不恢复 session_start CLI 调用、不依赖 vault-resolver

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## MODIFIED Requirements

### Requirement: Tool Registration

The system SHALL register a tool named `obsidian_cli` with the following parameters:

- `command` (string, required): Obsidian CLI command name (e.g., "read", "create", "move", "rename", "delete", "append", "tasks", "tags", "property:set")
- `vault` (string, **required**): 目标 vault 名称（如 `my-wiki`），直接透传给 `obsidian-cli vault=<name>`；不接受路径
- `params` (Record<string, string>, optional): key=value 参数
- `flags` (string[], optional): boolean 标志列表
- `allowDangerous` (boolean, optional, default false): 是否允许执行危险命令
- `timeoutMs` (number, optional, default 30000): 超时毫秒数

The tool SHALL emit promptSnippet and promptGuidelines instructing the LLM on usage.

**变更说明**：`vault` 参数从 optional 改为 required；不再依赖 vault-resolver 推断，agent 通过 AGENTS.md 知识自行传入 vault 名称。

#### Scenario: Tool appears in available tools list

- **WHEN** the extension is loaded at session_start
- **THEN** `obsidian_cli` appears in the available tools list
- **AND** NO Obsidian CLI process SHALL be spawned during startup

#### Scenario: LLM invokes tool to read a note

- **WHEN** LLM calls `obsidian_cli({ command: "read", params: { file: "My Note" }, vault: "my-wiki" })`
- **THEN** the tool SHALL spawn `obsidian-cli vault=my-wiki read "file=My Note"` and return the output

#### Scenario: LLM omits vault parameter

- **WHEN** LLM calls `obsidian_cli({ command: "read", params: { file: "My Note" } })`
- **THEN** the tool SHALL return a validation error: "Parameter 'vault' is required. Provide the vault name (e.g., 'my-wiki')."

---

### Requirement: Command Execution

The system SHALL spawn the `obsidian-cli` binary with constructed arguments:

```
obsidian-cli vault="<vault>" <command> <key>=<value>... <flag>...
```

No fallback binary path is attempted. If `obsidian-cli` is not found in PATH, the tool SHALL return an error immediately.

**变更说明**：二进制名从 `obsidian`（GUI 启动器）修正为 `obsidian-cli`（纯 CLI 工具）；移除 fallback 到 `/Applications/Obsidian.app/Contents/MacOS/obsidian` 的逻辑。

#### Scenario: Successful command

- **WHEN** spawn exits with code 0
- **THEN** the tool SHALL return stdout wrapped with the command line for context

#### Scenario: Command returns non-zero exit

- **WHEN** spawn exits with non-zero code
- **THEN** the tool SHALL return stdout and stderr with `details.ok: false` and `details.code`

#### Scenario: Command times out

- **WHEN** spawn exceeds timeoutMs
- **THEN** the child process SHALL be killed with SIGTERM and an error returned

#### Scenario: Binary not found

- **WHEN** `obsidian-cli` is not found in PATH (ENOENT)
- **THEN** the tool SHALL return an error: "Obsidian CLI not found. Ensure Obsidian is installed and obsidian-cli is in PATH."

## REMOVED Requirements

### Requirement: Vault Resolution

**Reason**: vault-resolver 返回绝对路径，而 `obsidian-cli` 只接受 vault 名称。两者标识体系不同，不再复用。Agent 通过 AGENTS.md 硬编码知识传入 vault 名称。

**Migration**: `vault` 参数从 optional（自动推断）变为 required（显式传入）。调用方必须提供 vault 名称。
