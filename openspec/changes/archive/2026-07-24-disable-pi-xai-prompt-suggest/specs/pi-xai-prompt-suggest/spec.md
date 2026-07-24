# Specification Delta

## Capability 对齐（已确认）

- Capability: `pi-xai-prompt-suggest`
- 来源: `proposal.md` / 已确认 capabilities
- 变更类型: `new`
- 用户确认摘要: 确认仅新增 `pi-xai-prompt-suggest`；策略为直接不注册，而非仅 `enabled=false`

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: Prompt-suggest extension is not registered at package entry
The pi-xai package entry (`index.ts` extension default export setup) SHALL NOT call `registerXaiPromptSuggest` (or otherwise register the next-prompt ghost command/handlers) when the package loads in the nantas fork used by pi-config.

#### Scenario: Package loads without prompt-suggest hooks
- **WHEN** pi loads package `git:github.com/nantas/pi-xai` (or its local `file:` dev path)
- **THEN** the next-prompt ghost feature is not registered
- **AND** `/xai-suggest` is not available as a command from this registration path

#### Scenario: Agent turn ends without ghost prefill
- **WHEN** an agent turn ends (`agent_end`) while pi-xai is loaded under this fork policy
- **THEN** the editor textbox is not filled with ANSI dim ghost suggestion text via `setEditorText(asGhostText(...))`

### Requirement: Source module may remain in the repository
The repository MAY retain `xai-prompt-suggest.ts` and its unit tests for upstream comparison or future opt-in restoration, but dead registration MUST remain the default runtime path.

#### Scenario: Source file present but inactive
- **WHEN** a developer inspects the fork tree
- **THEN** `xai-prompt-suggest.ts` may still exist
- **AND** absence of entry-point registration is the authoritative disable mechanism

### Requirement: Fork metadata and docs record the disable policy
The fork CHANGELOG/README and pi-config `forks/manifest.yaml` `changes_summary` SHALL record that next-prompt ghost registration is disabled in this fork.

#### Scenario: Operators discover the policy
- **WHEN** an operator reads the fork changelog, README, or `forks/manifest.yaml`
- **THEN** they can determine that prompt suggestion is not registered by default in the nantas fork

## REMOVED Requirements

### Requirement: Default next-prompt ghost after each turn
**Reason**: ANSI ghost in the real editor buffer corrupts partial deletes and conflicts with custom editors (e.g. powerline prefix editor).
**Migration**: Do not rely on `/xai-suggest` or post-turn ghost prefill. Type the next instruction manually. Restoration would require re-enabling registration and a non-ANSI ghost mechanism.
