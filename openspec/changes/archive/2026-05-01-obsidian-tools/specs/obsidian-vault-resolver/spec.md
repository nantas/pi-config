# Specification Delta

## Capability 对齐（已确认）

- Capability: `obsidian-vault-resolver`
- 来源: `proposal.md` — 用户于 Phase A/B 设计讨论确认
- 变更类型: `new`

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: Explicit Vault Parameter Takes Priority

When the vault parameter is explicitly provided by the caller, the system SHALL use it directly without any cwd-based detection.

The explicit value SHALL be validated against the known vaults list (from `obsidian vault list`) at preflight time.

#### Scenario: Explicit vault matches known vault

- **WHEN** vault="obsidian-mind" is passed and "obsidian-mind" is in the known vaults list
- **THEN** the resolved vault SHALL be "obsidian-mind"

#### Scenario: Explicit vault not in known list

- **WHEN** vault="unknown-vault" is passed but not in the known vaults list
- **THEN** the tool SHALL return an error: "Vault 'unknown-vault' not found in known vaults"

---

### Requirement: CWD-Based Vault Detection

When no vault parameter is provided, the system SHALL walk up the directory tree from the current working directory, checking for `.obsidian/` subdirectory at each level.

The first parent directory containing `.obsidian/` SHALL be identified as the vault root path.

The system SHALL then match this vault root path against the known vaults list to determine the vault name.

#### Scenario: CWD is inside a vault

- **WHEN** cwd is "/Users/nantas-agent/projects/obsidian-mind/20_项目/OrbitOS" and "/Users/nantas-agent/projects/obsidian-mind/.obsidian/" exists
- **THEN** the resolved vault path SHALL be "/Users/nantas-agent/projects/obsidian-mind" and the matched vault name SHALL be used

#### Scenario: CWD is the vault root

- **WHEN** cwd is "/Users/nantas-agent/projects/obsidian-mind" and ".obsidian/" exists there
- **THEN** the resolved vault path SHALL be "/Users/nantas-agent/projects/obsidian-mind"

#### Scenario: CWD is outside any vault

- **WHEN** cwd is "/Users/nantas-agent/projects/pi-config" and no parent directory contains ".obsidian/"
- **THEN** the resolver SHALL return null/undefined, triggering the "vault required" error

---

### Requirement: Error When No Vault Can Be Resolved

When both explicit and cwd-based detection fail to resolve a vault, the system SHALL return a descriptive error:

> "vault parameter required: current directory is not inside an Obsidian vault. Please specify the vault name explicitly."

#### Scenario: No vault resolvable

- **WHEN** vault is omitted and cwd walk-up finds no .obsidian/
- **THEN** the calling tool SHALL return the descriptive error to the LLM

---

### Requirement: Known Vaults Preloading

The system SHALL preload the known vaults list once per session by parsing the output of `obsidian vaults verbose`.

The preloaded data SHALL map vault names to vault root paths.

The output format of `obsidian vaults verbose` is tab-separated lines:
```
name1\t/path/to/vault1
name2\t/path/to/vault2
```

> ⚠ 勘误：初始实现误用 `obsidian vault list`（不存在的子命令），该命令实际返回当前默认 vault 的元数据字段（path, files, folders, size）。正确的列举命令为 `obsidian vaults verbose`。

#### Scenario: Session start preloading

- **WHEN** the `session_start` event fires
- **THEN** the extension SHALL run `obsidian vaults verbose`, parse the tab-separated `name\tpath` output, and cache the name→path mapping

#### Scenario: CLI unavailable during preloading

- **WHEN** `obsidian vaults verbose` fails during session_start
- **THEN** the vault-resolver SHALL still function: explicit vaults SHALL be accepted after validation via direct path check, and cwd detection SHALL still work via .obsidian/ existence check

---

### Requirement: Vault Path Normalization

The system SHALL normalize vault paths to absolute paths with resolved symlinks before comparison with the known vaults list.

#### Scenario: Symlinked vault path

- **WHEN** a vault's actual path is "/Volumes/Shuttle/projects/vault" but the cwd resolves to "/Users/nantas-agent/projects/vault" (symlink)
- **THEN** the normalized realpath comparison SHALL correctly match the vault
