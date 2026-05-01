# obsidian-cli-tool

## Purpose

Behavior specification for the obsidian-cli-tool capability.

---

# Specification Delta

## Capability 对齐（已确认）

- Capability: `obsidian-cli-tool`
- 来源: `proposal.md` — 用户于 Phase A/B 设计讨论确认
- 变更类型: `new`

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: Tool Registration

The system SHALL register a tool named `obsidian_cli` with the following parameters:

- `command` (string, required): Obsidian CLI command name (e.g., "read", "create", "search", "tasks", "tags", "property:set")
- `vault` (string, optional): 目标 vault 名称或路径；省略时按 vault-resolver 规则推断
- `params` (Record<string, string>, optional): key=value 参数
- `flags` (string[], optional): boolean 标志列表
- `allowDangerous` (boolean, optional, default false): 是否允许执行危险命令
- `timeoutMs` (number, optional, default 30000): 超时毫秒数

The tool SHALL emit promptSnippet and promptGuidelines instructing the LLM on usage.

#### Scenario: Tool appears in available tools list

- **WHEN** the extension is loaded at session_start
- **THEN** `obsidian_cli` appears in the available tools list

#### Scenario: LLM invokes tool to read a note

- **WHEN** LLM calls `obsidian_cli({ command: "read", params: { file: "My Note" }, vault: "obsidian-mind" })`
- **THEN** the tool SHALL spawn `obsidian vault=obsidian-mind read file=My Note` and return the output

---

### Requirement: Input Validation

The system SHALL validate command, param keys, and flag values against the regex `/^[a-z0-9:_-]+$/i`.

#### Scenario: Valid command

- **WHEN** command is "search" or "property:set"
- **THEN** the tool SHALL proceed with execution

#### Scenario: Invalid command characters

- **WHEN** command contains spaces, slashes, or special characters
- **THEN** the tool SHALL return an error: "Invalid command. Use only letters, numbers, :, _, -."

#### Scenario: Invalid flag

- **WHEN** a flag contains disallowed characters
- **THEN** the tool SHALL return an error identifying the invalid flag

---

### Requirement: Dangerous Command Blocking

The system SHALL block known dangerous commands unless `allowDangerous` is explicitly true.

Dangerous commands: `eval`, `dev:cdp`, `dev:debug`, `restart`.

#### Scenario: Dangerous command without allowDangerous

- **WHEN** command is "eval" and allowDangerous is false or omitted
- **THEN** the tool SHALL return a blocking error: "Blocked dangerous command 'eval'. Re-run with allowDangerous=true if intentional."

#### Scenario: Dangerous command with allowDangerous

- **WHEN** command is "eval" and allowDangerous is true
- **THEN** the tool SHALL proceed with execution

---

### Requirement: Command Execution

The system SHALL spawn the `obsidian` binary with constructed arguments:

```
obsidian vault="<vault>" <command> <key>=<value>... <flag>...
```

If `obsidian` is not in PATH (ENOENT), the system SHALL fall back to `/Applications/Obsidian.app/Contents/MacOS/obsidian`.

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

- **WHEN** both `obsidian` and the fallback path fail with ENOENT
- **THEN** the tool SHALL return an error: "Obsidian CLI not found. Ensure Obsidian 1.12.0+ is installed and CLI is enabled."

---

### Requirement: Vault Resolution

The system SHALL resolve the vault parameter using the same vault-resolver rules as `obsidian_search`: explicit → cwd detection → error.

#### Scenario: No vault and cwd not in a vault

- **WHEN** vault is omitted and cwd is not inside an Obsidian vault
- **THEN** the tool SHALL return an error asking for explicit vault parameter

---

### Requirement: Timeout and Cancellation

The system SHALL support AbortSignal cancellation. On abort, all in-flight child processes SHALL be killed.

#### Scenario: User aborts during execution

- **WHEN** AbortSignal is triggered
- **THEN** the child process SHALL receive SIGTERM and the tool SHALL return a cancelled error
