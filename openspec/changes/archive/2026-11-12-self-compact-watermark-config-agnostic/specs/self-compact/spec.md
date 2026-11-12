# Specification Delta

## Capability 对齐

- Capability: `self-compact`
- 变更类型: `modified`
- 用户确认摘要: 用户要求主 spec 不得写死水位线数值，数值只能来自配置（`.pi/managed/self-compact.json` 等），spec 只约束解析与夹取规则。

## 规范真源声明

- 本文件是本次变更对 `self-compact` 行为契约的修订真源
- 数值（百分比、token 数）不属于契约，属于配置实例；本文件不声明任何具体水位线取值

## MODIFIED Requirements

### Requirement: Three-Tier Percentage Watermark and Configuration Precedence

The system SHALL compute three monotonically increasing context watermarks (`soft` / Notice, `warning` / Recommend, and `forced` / Hard Cutoff) against the active model's `contextWindow`, supporting both percentage strings and token count strings across a layered configuration hierarchy. The concrete values SHALL come exclusively from configuration; this specification defines how they are read, parsed, clamped and validated, never what they are.

#### Scenario: Watermarks resolve from configuration, not from this specification
- **WHEN** no CLI flags or project overrides are provided and the active model has `contextWindow = W`
- **THEN** the extension SHALL read `softAt`, `at`, `buffer` and `hardCeilingPercent` from `.pi/managed/self-compact.json` and treat them as the default tier specification
- **THEN** a percentage spec `P%` SHALL resolve to `Math.floor(W * P / 100)` tokens, and a bare token spec SHALL resolve to its literal value unchanged
- **THEN** `forced` SHALL resolve to `Math.min(at + buffer, hardCap)` where `hardCap = Math.floor(W * hardCeilingPercent / 100)`
- **THEN** the resolved watermark values SHALL be reported by `view_context` and the status bar, and SHALL NOT be asserted as literals in this specification

#### Scenario: Hard ceiling clamp and ordering validation
- **WHEN** `at + buffer` exceeds the configured `hardCeilingPercent` of `contextWindow`
- **THEN** `forced` SHALL be clamped to `Math.floor(contextWindow * hardCeilingPercent / 100)`
- **WHEN** `soft > warning` or `warning >= forced`
- **THEN** threshold calculation SHALL throw a descriptive configuration error

#### Scenario: Configuration precedence order
- **WHEN** threshold or Jev settings are defined in multiple sources
- **THEN** the system SHALL resolve values in strict precedence: CLI flags (`--compact-soft-at`, `--compact-at`, `--compact-buffer`, `--compact-prompt`) > project config (`<cwd>/.pi/self-compact.json`) > global managed config (`~/.pi/agent/self-compact.json` or repo `.pi/managed/self-compact.json`) > built-in defaults

#### Scenario: Compaction material floor check
- **WHEN** `usedTokens` exceeds `soft` or `warning` on a small-window model, but the session entries since the last compaction do not exceed Pi's `keepRecentTokens` (default `20,000` tokens)
- **THEN** `hasCompactionMaterial` SHALL return `false` and the extension SHALL NOT prompt or lock the agent to compact until compressible history exists

---

### Requirement: Three-Tier Enforcement and Forced Tool Lock

The system SHALL enforce a hard tool execution lock once context usage reaches or exceeds the configured `forced` watermark and compaction material exists.

#### Scenario: Forced threshold blocks non-compaction tools
- **WHEN** `usedTokens >= forced` and `hasCompactionMaterial` is `true` (or a `self_compact` handoff is already locked/pending)
- **AND** the agent invokes any tool other than `self_compact` or `view_context`
- **THEN** the `tool_call` hook SHALL return `{ block: true, reason: ... }` instructing the agent to immediately call `self_compact` with its structured handoff

#### Scenario: Parallel tool call batch mixed with self_compact is rejected
- **WHEN** the agent emits a single assistant message containing `self_compact` alongside any other tool call (e.g., `bash` or `edit`)
- **THEN** the `tool_call` hook SHALL block every tool call in that assistant message (including `self_compact`) and require `self_compact` to be called alone in the next turn
