# Proposal

## 问题定义

`fusion-harness-formal-integration` 已使 fusion-harness 在 **pi-config 项目级** 可用（`.pi/settings.json` packages + `fusionHarness` 块），但未写入 `.pi/capabilities.yaml` 的 `global.settings`。

结果：
- `scripts/sync-pi-agent.sh` 生成的 `~/.pi/agent/settings.json` **不含** fusion-harness package
- 其他仓库 session 全局加载不到 `/opinion`、`/fusion`、`/auto-validate`（及日后 ship 的 housekeep）
- 项目 packages 里 `ponytail` / `pi-xai` / `pi-codex-image-gen` 已在 global，fusion 落单，形成交付边界不一致

需要把 fusion-harness 提升为 **全局能力表条目**（无版本 pin + 带 `fusionHarness` 配置字段），使日后用户确认执行全局 sync 后，任意仓库可默认加载该包。

## 范围边界

**在范围内**：
- `.pi/capabilities.yaml`：
  - `global.settings.packages` 追加 `git:github.com/nantas/fusion-harness`（**无** `#v…` pin）
  - `global.settings` 追加 `fusionHarness` 对象（`architect` / `builder` / `architectThinking` / `builderThinking`），取值与当前项目 `.pi/settings.json` 对齐
- 可选对齐项目 `.pi/settings.json` 的 package 源字符串（去掉既有 `#v0.1.3` pin，与 global 策略一致）
- OpenSpec delta：扩展 `capability-manifest` 与 `fusion-harness-integration` 的全局交付要求

**不在范围内**：
- 执行 `scripts/sync-pi-agent.sh` 或修改 `~/.pi/agent/`（**延后**到其他 session / 用户显式确认）
- `repo://fusion-harness` 源码修改、commit、tag、push（其他 session）
- housekeep / v0.1.4 ship 与版本 bump
- 写入 `catalog.packages`（选定 global，不是按需 catalog）
- 把 fusion 登记为 `global.extensions` 本地扩展（它是 git package，不是 `.pi/extensions/*`）
- 改动 AGENTS / skills / prompts / env
- README 大规模改写（若 capabilities 变更触发治理要求，仅做最小必要一句；否则跳过）

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `capability-manifest`: 将 fusion-harness 从仅项目 settings 注册提升为 `global.settings.packages` 权威条目，并在 `global.settings` 声明 `fusionHarness` 配置块
- `fusion-harness-integration`: 明确全局交付形态为无 pin 的 git package 源 + 全局默认 `fusionHarness` 模型配置；项目 settings 可覆盖同名字段

## Capabilities 待确认项

- [x] 能力清单已与用户确认（global；无版本 pin；带 fusionHarness 配置字段；本 change 只产出能力表更新；sync 延后）

## Impact

- **能力表**：`.pi/capabilities.yaml` `global.settings.packages` +1；新增 top-level settings 键 `fusionHarness`
- **日后 sync 效果**（本 change 不执行）：`~/.pi/agent/settings.json` 将含 package 与配置块；script dedupe 可能从各 registry 项目 settings 移除重复 package 条目
- **运行时依赖**：无新增 npm 依赖；加载依赖用户日后在全局安装 git package（sync 只写 settings，不 `pi install`）
- **fork / 其他 session**：housekeep 未 ship 不影响本 change 写入无 pin 源；日后 floating git 源会跟随 remote 默认分支/最新解析策略
- **破坏性**：低。未 sync 前全局行为不变；sync 后所有 session 多一个 extension，可能增加启动与误用成本（可接受，用户已选 global）

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页：`fusion-harness-integration` / `capability-manifest` / `pi-runtime-bootstrap-sync` 主 spec
- 已确认项目页：formal-integration writeback、`forks/manifest.yaml`、当前 `.pi/settings.json` 与 `.pi/capabilities.yaml`
- 已确认回写目标：能力表（+ 可选项目 package 源对齐）；**不** 回写 fork；**不** 执行全局 sync
