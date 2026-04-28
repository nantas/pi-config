# Specification Delta

## Capability 对齐（已确认）

- Capability: `pi-reference-curation-model`
- 来源: `proposal.md` / 已确认 capabilities
- 变更类型: `new`
- 用户确认摘要: 用户确认参考仓与现有开源 extension 不应只作为附录，而应被单独建模为参考收集与决策输入体系

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: Reference Curation Must Use Stratified Categories
The system SHALL classify reference inputs into Pi config repositories, Pi extension repositories, and adjacent ecosystem pattern samples, and SHALL document the purpose of each category.

#### Scenario: A new reference is recorded
- **WHEN** a reference repository or sample is added to the planning corpus
- **THEN** it is placed into one of the defined categories with a clear reason for inclusion

### Requirement: Reference Curation Must Define Promotion Decisions
The system SHALL define the decision labels used to convert reference inputs into planning guidance, including direct reuse, partial borrowing, and observe-only.

#### Scenario: A reference is evaluated for adoption
- **WHEN** the planning document discusses a reference
- **THEN** it marks the reference with a promotion decision that explains whether the sample is reused, partially borrowed, or only observed

### Requirement: Reference Curation Must Feed Blueprint Decisions
The system SHALL require curated references to inform blueprint layering, lifecycle guidance, and future extension implementation priorities.

#### Scenario: References are used in planning
- **WHEN** the planning document cites external samples
- **THEN** the citations support concrete architecture or workflow decisions rather than remaining as an unstructured inspiration list
