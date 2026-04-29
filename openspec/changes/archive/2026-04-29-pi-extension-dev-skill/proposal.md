# Proposal

## 问题定义

当前在 pi-config 仓库中开发一个新的 Pi extension 时，开发者（或 LLM agent）需要自行跨文档拼凑上下文：pi-mono 源码中的 extensions.md（2548 行完整 API）、`docs/plans/pi-customization-reference.md` 的 Section 3 摘要、蓝图的第 4 节生命周期指引。没有一个统一的 entrypoint skill 将这些知识编排为可执行的工作流。

导致以下问题：
- 每次开发 extension 都需要重复加载和消化相同的参考文档
- 设计决策（事件选择、Tool vs Command、文件组织方式）没有结构化的决策引导
- Extension 开发与 OpenSpec change 流程的衔接是 ad hoc 的，容易遗漏 proposal/specs/verification 步骤
- 部署同步到 `~/.pi/agent/extensions/` 依赖开发者记住运行 `scripts/sync-pi-agent.sh`

## 范围边界

- **本次 change 产出**：`.pi/skills/pi-extension-dev/SKILL.md`——一个引用型 skill，编排 extension 开发的完整工作流
- **不产出**：任何具体的 extension 实现代码、对 `scripts/sync-pi-agent.sh` 的修改、对蓝图的修改、对 pi-mono 的修改
- **Skill 定位**：pi-specific，存放在 `.pi/skills/`，知识模式为引用型（指向已有的 reference doc 和 pi-mono 源文档）
- **工作流覆盖**：需求澄清 → 设计决策 → OpenSpec change 创建 → 实现 → 验证 → 部署同步与归档

## Capabilities

### New Capabilities

- `pi-extension-dev-skill`: 一个 pi-specific skill，加载后引导按完整流程完成 Pi extension 的需求澄清、设计决策、OpenSpec 管控实现、验证与部署同步

## Capabilities 待确认项

- [x] 能力清单已与用户确认（讨论中确认：`.pi/skills/pi-extension-dev/SKILL.md`，引用型，走完整 OpenSpec 流程）

## Impact

- `.pi/skills/pi-extension-dev/SKILL.md`：新增文件，skill 正文
- `.pi/extensions/`：无直接变更；后续通过该 skill 产出的 extension 会写入此目录
- `.pi/settings.json`：不需要变更（skill 在 `.pi/skills/` 下 pi 自动发现，extension 在 `.pi/extensions/` 下自动发现）
- `scripts/sync-pi-agent.sh`：不需要变更（已有的 extensions 同步映射满足需求）
- `docs/plans/pi-customization-blueprint.md`：不需要变更（本次为 Phase 3 的第一个具体产出，不修改蓝图）
- 下游 impact：该 skill 加载后，后续的 extension 开发将通过结构化的 OpenSpec change 流程完成，提升一致性和可追溯性

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页 / 项目页 / 回写目标：`repo://orbitos/99_系统/Harness/OrbitOS_Spec_Standard/OrbitOS_Spec_Standard_v0.3.1.md` / `repo://orbitos/20_项目/Pi_Config/Pi_Config.md` / `repo://orbitos/20_项目/Pi_Config/项目进度总览.md`
