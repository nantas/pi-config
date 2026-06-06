# Specification Delta

## Capability 对齐（已确认）

- Capability: `obsidian-tools-extension`
- 来源: `proposal.md`
- 变更类型: `modified`
- 用户确认摘要: session_start 添加 FFF 预索引扫描和 Python worker 惰性初始化；session_shutdown 添加清理逻辑

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## MODIFIED Requirements

### Requirement: Extension Lifecycle Management
The system SHALL manage extension initialization and cleanup through `session_start` / `session_shutdown` event handlers. On `session_start`, the system SHALL lazily initialize the FFF `FileFinder` (pre-index scan) and the jieba Python worker process on first search invocation. On `session_shutdown`, the system SHALL clean up the FFF index and kill the Python worker process.

#### Scenario: Session start — lazy FFF initialization
- **WHEN** the first `obsidian_search` call is made in a session
- **THEN** the system SHALL initialize a `FileFinder` instance with `{ disableWatch: true }`, scanning the vault root directory
- **AND** if the FFF native addon fails to load (`FileFinder.isAvailable()` returns false), the system SHALL fall back to rg without retrying

#### Scenario: Session start — lazy jieba worker startup
- **WHEN** the first `obsidian_search` call that requires Chinese tokenization is made
- **THEN** the system SHALL spawn a `python3` subprocess running `tokenizer-worker.py` with stdin/stdout JSON line protocol
- **AND** if spawning fails, the system SHALL fall back to `Intl.Segmenter`

#### Scenario: Session shutdown — cleanup
- **WHEN** the `session_shutdown` event fires
- **THEN** the system SHALL:
  - Kill the jieba Python worker process (if running)
  - Release the FFF `FileFinder` instance (if initialized)
  - Clear session-scoped caches (config, vault path)

#### Scenario: Reload resilience
- **WHEN** the extension factory function is re-invoked (e.g., via `/reload` or settings change)
- **THEN** the tools SHALL be re-registered correctly; FFF and jieba worker SHALL be reinitialized on first search in the new session

## REMOVED Requirements

### Requirement: Preflight Logic
**Reason**: The original preflight was designed to detect CLI search availability and route to rg. With this change, FFF is the primary backend (rg is fallback), and the availability check is handled lazily via `FileFinder.isAvailable()` on first search. The explicit preflight probe step is no longer needed.
**Migration**: FFF availability is handled by `FileFinder.isAvailable()` check. The rg fallback path is preserved for environments where the FFF native addon is unavailable.

## RENAMED Requirements

- FROM: `### Requirement: Search Init Command Registration`
- TO: `### Requirement: Search Init Command Registration (unchanged)`
