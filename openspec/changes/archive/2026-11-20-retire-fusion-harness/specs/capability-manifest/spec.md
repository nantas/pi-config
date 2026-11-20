# Specification Delta

## Capability 对齐（已确认）

- Capability: `capability-manifest`
- 来源: `proposal.md` / 已确认 capabilities
- 变更类型: removed
- 用户确认摘要: 用户要求去掉 fusion harness 扩展与配置，并选择全清（移除此 capability 的相关 requirement）

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## REMOVED Requirements

### Requirement: Fork Manifest Must Register Fusion Harness
**Reason**: fusion-harness 已从能力表移除，要求 manifest 必须携带 fusion 包或 fusionHarness 配置已与实际相反。
**Migration**: 能力表按通用 packages / settings 规则维护，不再为单个包保留专属 requirement。

### Requirement: Global Settings Packages MUST Include Fusion Harness Without Version Pin
**Reason**: fusion-harness 已从能力表移除，要求 manifest 必须携带 fusion 包或 fusionHarness 配置已与实际相反。
**Migration**: 能力表按通用 packages / settings 规则维护，不再为单个包保留专属 requirement。

### Requirement: Global Settings MUST Define FusionHarness Configuration Block
**Reason**: fusion-harness 已从能力表移除，要求 manifest 必须携带 fusion 包或 fusionHarness 配置已与实际相反。
**Migration**: 能力表按通用 packages / settings 规则维护，不再为单个包保留专属 requirement。

### Requirement: Settings.json Must Reference Fusion Harness Package
**Reason**: fusion-harness 已从能力表移除，要求 manifest 必须携带 fusion 包或 fusionHarness 配置已与实际相反。
**Migration**: 能力表按通用 packages / settings 规则维护，不再为单个包保留专属 requirement。

### Requirement: Settings.json Must Define Fusion Harness Configuration Block
**Reason**: fusion-harness 已从能力表移除，要求 manifest 必须携带 fusion 包或 fusionHarness 配置已与实际相反。
**Migration**: 能力表按通用 packages / settings 规则维护，不再为单个包保留专属 requirement。

### Requirement: Global Package Conflict Must Be Resolved
**Reason**: fusion-harness 已从能力表移除，要求 manifest 必须携带 fusion 包或 fusionHarness 配置已与实际相反。
**Migration**: 能力表按通用 packages / settings 规则维护，不再为单个包保留专属 requirement。
