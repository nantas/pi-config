# Proposal

## 问题定义

当前 `pi-config` 仓库中，`.pi/prompts/` 目录存放了 opsx-* 命令模板，但**不受 `capabilities.yaml` 管理**：

1. **同步方式是全量目录覆盖**（`sync_prompts_and_themes()`），没有白名单过滤或过期清理
2. **与全局 `~/.pi/agent/prompts/` 同名冲突时无任何治理规则**：项目副本被静默忽略，用户修改项目副本期望生效但实际不生效
3. **缺少全局优先的声明**：用户在维护时无法区分生效版本和过期副本

这与 extensions/agents/skills 的 manifest 管理模式不一致，导致维护混淆和同步漂移风险。

## 范围边界

### 包含

- `capabilities.yaml`：新增 `global.prompts` 白名单段
- `scripts/sync-pi-agent.sh`：将 prompts 同步从全量目录覆盖改建为 manifest 驱动（与 extensions/agents/skills 一致）
- `AGENTS.md`：Capability Manifest Governance 表新增 prompts 行 + 全局优先的治理规则声明
- 保留 themes 的全量同步模式（不在本 change 范围内）

### 不包含

- pi-core 层的 prompts 碰撞检测（依赖上游变更）
- catalog 级别的 prompts 分发（暂不需要）
- themes 的 manifest 管理（留待后续）

## Capabilities

### New Capabilities

- `prompts-manifest-governance`: 将 `.pi/prompts/` 纳入 `capabilities.yaml` 清单管理，同步脚本改建为白名单驱动 + 过期清理，并在 AGENTS.md 中声明全局优先的治理规则

### Modified Capabilities

- `capability-manifest-governance`: 在 AGENTS.md 的 Capability Manifest Governance 表中新增 Prompts 资源类型，说明全局与项目优先级关系，并约束 manifest 更新流程

## Capabilities 待确认项

- [x] 能力清单已与用户确认

## Impact

### 正向影响

- **治理一致性**：prompts 与其他资源类型（extensions/agents/skills）使用相同的 manifest 管理模式
- **可审计性**：`capabilities.yaml` 成为 prompts 全局分发的唯一入口，删除白名单条目即可自动清理
- **维护明确性**：AGENTS.md 声明全局优先规则，用户知道项目副本被忽略时应通过 sync 脚本更新全局

### 兼容性

- 当前 `~/.pi/agent/prompts/` 中已有的 opsx-* 文件在下次 sync 后被 manifest 白名单接管，不在白名单中的文件被自动清理
- `.pi/prompts/` 目录保留作为源文件存放位置，不会被删除（但 sync 脚本只同步白名单内的文件）

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页 / 项目页 / 回写目标：
  - `repo://pi-config` > `.pi/capabilities.yaml`
  - `repo://pi-config` > `AGENTS.md`
  - `repo://pi-config` > `scripts/sync-pi-agent.sh`
