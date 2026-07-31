# Proposal

## 问题定义

`~/.pi/agent/models.json` 中的自定义 provider 配置**不在** `scripts/sync-pi-agent.sh` 的管理范围（`add-provider.ts` 注释明确标注 "It is NOT managed by sync-pi-agent.sh"）。任何跨设备需要共享的 provider 声明（例如 `deepseek/deepseek-v4-flash` 走 Responses API 的配置）只能靠手工复制，无法随仓库版本化、review 与同步。

当前工作流：
1. 本机手动编辑 `~/.pi/agent/models.json` 添加 `providers.deepseek`（含 deepseek-v4-flash 的 `openai-responses` 覆盖）
2. 该配置只存在于当前设备，无版本化记录
3. 新设备需手工复刻整段配置，且无法审计来源

## 范围边界

**In Scope**
- `.pi/capabilities.yaml` 新增 `global.models` 段：声明跨设备共享的 provider 定义（apiKey 一律用 `$ENV_VAR` 引用，禁止明文）
- `scripts/sync-pi-agent.sh` 新增 `render_models_file()`：manifest 声明的 provider 为权威（整体替换），未声明的 provider（如本机 zhipuai）从目标文件 preserve 保留；复用 settings.json 同款 atomic-write 模式
- 将 deepseek Responses 配置作为首个 manifest 管理的 provider 落地
- README.md / docs/getting-started.md 能力描述更新

**Out of Scope**
- 不改变 pi 运行时读取 models.json 的语义（merge 逻辑由 pi 侧负责）
- 不为 models 增加 OAuth/多级继承等复杂 schema
- 不迁移 zhipuai 等本机私有 provider 进 manifest（保留在目标文件，由 preserve 机制维持）
- 不修改 `add-provider.ts`（本机交互工具维持现状）

## Capabilities

### New Capabilities
- `models-manifest-governance`: 通过 capabilities.yaml `global.models` 段声明跨设备共享的 provider 定义，sync 时渲染 `~/.pi/agent/models.json`（manifest provider 权威、未声明 provider 保留、apiKey 仅允许 env 引用）

### Modified Capabilities
- （无修改——本 change 为纯新增 manifest 治理能力）

## Capabilities 待确认项

- [x] 能力清单已与用户确认（用户选定方案 A：manifest 治理）

## Impact

- **修改文件**: `.pi/capabilities.yaml`、`scripts/sync-pi-agent.sh`、`README.md`、`docs/getting-started.md`
- **目标文件**: `~/.pi/agent/models.json`（首次 sync 后 deepseek provider 由 manifest 渲染，apiKey 变为 `$DEEPSEEK_API_KEY` 引用；zhipuai 等未声明 provider 原样保留）
- **用户体验**: 跨设备 sync 后自动获得 deepseek Responses 配置；本机私有 provider 不受影响
- **兼容性**: 纯新增渲染逻辑；models.json 原有结构（`providers` 对象）不变
- **无破坏性变更**: 不删除目标端未声明 provider；不触碰 settings.json 现有渲染

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页 / 项目页 / 回写目标：
  - `repo://orbitos/99_系统/Harness/OrbitOS_Spec_Standard/OrbitOS_Spec_Standard_v0.3.1.md`
  - `repo://orbitos/20_项目/Pi_Config/Pi_Config.md`
