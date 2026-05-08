# Proposal

## 问题定义

`pkg-fork-dev` skill 的 Phase D（本地测试）存在一个未处理的全局/项目包冲突问题：

1. **根因**：Pi 的包去重机制 `getPackageIdentity()` 按源类型生成 identity key。`git:github.com/nantas/pi-tool-display` 的 identity 是 `git:github.com/nantas/pi-tool-display`，而本地路径 `/Users/.../forks/pi-tool-display` 的 identity 是 `local:/Users/.../forks/pi-tool-display`。两个 identity 不匹配 → `dedupePackages()` 无法识别为同一包 → 双重加载 → 工具名冲突报错。

2. **触发条件**：项目 `.pi/settings.json` 使用本地路径源，全局 `~/.pi/agent/settings.json` 使用 git/npm 源指向同一包时触发。

3. **Phase D 缺陷**：D1 步骤仅切换项目源到本地路径，未处理全局侧的同名包条目。也无持久化记录，session 丢失后无法恢复全局 settings 原始状态。

4. **知识缺口**：`docs/reference/` 中缺少 Pi 包加载和去重机制的参考文档，导致开发者无法预判此类冲突。

## 范围边界

**纳入范围：**
- 更新 `pkg-fork-dev` SKILL.md：Phase D 新增 D1a（全局去重门禁）、D5a（持久化确认）、E4 扩展（全局恢复）
- 新增 `docs/reference/pi-package-loading.md`：记录 Pi 包加载链路、identity 计算、去重规则、冲突检测
- 更新 `pkg-fork-dev` Phase E5a 验证步骤

**不纳入范围：**
- 不修改 Pi 运行时源码（去重机制是 Pi 的设计选择，不是 bug）
- 不修改 `capabilities.yaml` 或全局同步策略
- 不涉及新的 Pi extension 或 skill

## Capabilities

### New Capabilities
- `pi-package-loading-ref`: Pi 包加载、identity 计算与去重机制的参考文档

### Modified Capabilities
- `pkg-fork-dev-workflow`: Phase D/E 新增全局去重门禁、持久化记录与恢复步骤

## Capabilities 待确认项

- [x] 能力清单已与用户确认

## Impact

- `pkg-fork-dev` 的 Phase D 流程增加 2-3 个步骤，对现有工作流的最小侵入
- 新增参考文档降低后续开发者在 fork 开发场景下的试错成本
- 不影响不使用本地测试路径的 fork 开发场景

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页 / 项目页 / 回写目标：
  - 项目页：`repo://pi-config`
  - 回写目标：`.pi/skills/pkg-fork-dev/SKILL.md`, `docs/reference/pi-package-loading.md`
