# Specification Delta

## Capability 对齐（已确认）

- Capability: `extension-dedup-mechanism`
- 来源: `proposal.md`
- 变更类型: `modified`
- 用户确认摘要: 修改 pi-config 仓库中所有扩展的去重逻辑，从布尔旗标 + session_shutdown 清理模式改为会话计数器 + 会话绑定 key 模式

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## MODIFIED Requirements

### Requirement: cross-path-dedup
Each extension SHALL allow at most one copy (project or global) to register handlers per session, preferring the first-loaded copy. The dedup mechanism SHALL NOT rely on `session_shutdown` timing for correctness.

#### Scenario: project copy loads before global copy
- **WHEN** both `.pi/extensions/x.ts` and `~/.pi/agent/extensions/x.ts` exist for the same extension
- **AND** the project copy is loaded first
- **THEN** the project copy registers its handlers
- **AND** the global copy detects that registration already happened for this session and skips

### Requirement: cross-session-isolation
A new session (created by `/new`) SHALL NOT inherit dedup state from the previous session. Extensions SHALL register handlers correctly after `/new` regardless of whether `session_shutdown` fired successfully.

#### Scenario: /new after working session
- **WHEN** user types `/new` in Pi
- **THEN** all extensions register handlers in the new session
- **AND** no extension shows "[Extension issues]" warnings about stale state

### Requirement: /reload-compatibility
The `/reload` command SHALL correctly re-register all extension handlers. The dedup mechanism SHALL NOT prevent re-registration after a reload.

#### Scenario: /reload after modifying an extension file
- **WHEN** user types `/reload` in Pi
- **THEN** all extensions re-register their handlers
- **AND** the new handlers reflect any code changes in the extension files

### Requirement: no-regression-on-double-path
When an extension exists in both project and global directories, Pi SHALL NOT report tool/command conflict errors for that extension. The dedup mechanism SHALL prevent duplicate registration before Pi's conflict detection runs.

#### Scenario: duplicate paths with working dedup
- **WHEN** `browse-session-tree.ts` exists in both `.pi/extensions/` and `~/.pi/agent/extensions/`
- **THEN** the `/browse` command is registered exactly once
- **AND** no "[Extension issues]" warning shows "Tool '...' conflicts with ..." for this extension
