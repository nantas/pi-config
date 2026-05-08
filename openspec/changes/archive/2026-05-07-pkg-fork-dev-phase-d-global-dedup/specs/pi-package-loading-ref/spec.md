# Specification Delta

## Capability 对齐（已确认）

- Capability: `pi-package-loading-ref`
- 来源: `proposal.md`
- 变更类型: `new`
- 用户确认摘要: 新增参考文档，记录 Pi 包加载、identity 计算与去重机制

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: pi-package-identity-doc
The document SHALL describe Pi's `getPackageIdentity()` mechanism, covering identity key generation for npm, git, and local source types.

#### Scenario: developer reads reference to predict dedup behavior
- **WHEN** a developer reads `docs/reference/pi-package-loading.md`
- **THEN** the document contains a table mapping each source type to its identity key format, with examples

### Requirement: dedup-rule-doc
The document SHALL describe `dedupePackages()` behavior: project scope wins over user scope for same identity; different identities are not deduplicated.

#### Scenario: developer encounters dual-load conflict
- **WHEN** a developer has a local path in project settings and a git source in global settings for the same package
- **THEN** the document explains why the two sources produce different identities and thus both load, causing tool name conflicts

### Requirement: loading-lifecycle-doc
The document SHALL describe the full package loading lifecycle: `resolve()` → `dedupePackages()` → `resolvePackageSources()` → extension loading, including scope precedence.

#### Scenario: developer traces why a package loads or doesn't load
- **WHEN** a developer needs to understand package loading order
- **THEN** the document provides a flow diagram or step-by-step description of the resolve → load pipeline

### Requirement: conflict-diagnosis-guide
The document SHALL include a conflict diagnosis section with common patterns and remediation steps.

#### Scenario: "Tool X conflicts with Y" error on startup
- **WHEN** Pi reports tool name conflict errors
- **THEN** the document provides a checklist to identify whether the cause is global/project source identity mismatch
