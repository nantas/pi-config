# Specification Delta

## Capability 对齐（已确认）

- Capability: `editor-conflict-reference`
- 来源: `proposal.md` / 需求确认
- 变更类型: new
- 用户确认摘要: 新增 `docs/reference/pi-extension-editor-conflict.md`，记录 `setEditorComponent` 独占覆盖模式的原理、冲突痕迹、兼容策略和后续 extension 开发约束

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: Reference Document Created
The system SHALL create `docs/reference/pi-extension-editor-conflict.md` that documents the `ctx.ui.setEditorComponent()` exclusive-replace constraint pattern, serving as a design reference for future Pi extension development.

#### Scenario: Document covers root cause
- **WHEN** a developer reads the document
- **THEN** it SHALL explain that `setEditorComponent` is an exclusive-replace API: the last caller wins, and there is no composition/decorator pattern for editor customization in the current Pi Extension API

#### Scenario: Document identifies conflict traces
- **WHEN** a developer reads the document
- **THEN** it SHALL list diagnostic traces to identify when an editor conflict is occurring

#### Scenario: Document provides compatibility strategies
- **WHEN** a developer reads the document
- **THEN** it SHALL describe the available strategies:
  1. Avoid `setEditorComponent` when `addAutocompleteProvider` suffices
  2. Accept Tab-trigger for custom autocomplete prefixes
  3. Coordinate loading order when editor replacement is unavoidable

#### Scenario: Document provides code pattern
- **WHEN** a developer reads the document
- **THEN** it SHALL include a code example showing the recommended pattern: `addAutocompleteProvider` + top-level `input` handler (no `setEditorComponent`)
