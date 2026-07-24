# pi-xai-prompt-suggest

## Purpose

Constrain the nantas fork of `pi-xai` so next-prompt ghost is not registered at package entry. Prevents ANSI dim ghost text from being written into the real editor buffer after agent turns.

## Requirements

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
