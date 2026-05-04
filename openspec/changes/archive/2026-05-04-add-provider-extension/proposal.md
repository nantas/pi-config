# Proposal

## 问题定义

当前 Pi 的内置 Provider 列表是静态的，用户若要添加非官方 Provider（如私有部署、API 代理、自托管模型），需要：
1. 手动编写 Extension 代码调用 `pi.registerProvider()`
2. 手动填写模型定义（包括 cost、contextWindow、maxTokens 等字段）
3. 处理持久化以便跨 session 可用

这形成了较高的使用门槛，尤其对不熟悉 Extension API 的用户。需要一个零代码、交互式的方式来快速添加自定义 Provider。

## 范围边界

**In Scope**
- 提供一个 `/add-provider` 交互式命令
- 收集用户输入：provider 名称、API key、base URL
- 自动从 OpenAI-compatible `/v1/models` 端点发现模型列表
- 将配置持久化到 `pi.appendEntry()`，并在 session 启动时自动重载
- 支持覆盖已有 Provider（如修改 baseUrl）

**Out of Scope**
- 非 OpenAI-compatible API 的自定义流式实现（保留给高级用户手写 Extension）
- OAuth 认证流程（保留给需要 SSO 的场景）
- 手动编辑模型参数（cost、contextWindow 等）——使用自动发现的默认值
- 删除 Provider 的功能（可通过 `/reload` 清除未持久化的 Provider）

## Capabilities

### New Capabilities
- `add-provider-command`: 注册 `/add-provider` 交互式命令，引导用户输入 provider 名称、API key 和 base URL
- `provider-model-discovery`: 从 OpenAI-compatible `/v1/models` 端点自动拉取并解析模型列表
- `provider-persistence`: 将用户添加的 provider 配置持久化到 `pi.appendEntry()`，并在 `session_start` 时自动重载注册

### Modified Capabilities
- （无修改——本 change 为纯新增 extension）

## Capabilities 待确认项

- [x] 能力清单已与用户确认

## Impact

- **新增文件**: `.pi/extensions/add-provider.ts`
- **用户体验**: 用户可通过 `/add-provider` 在 3 步内完成非官方 Provider 的添加，无需编写代码
- **兼容性**: 仅支持 OpenAI-compatible API（覆盖绝大多数私有部署和代理场景）
- **持久化**: 使用 `pi.appendEntry()` 存储配置，随 Pi 重启自动恢复
- **无破坏性变更**: 不修改现有 Provider、不改动 settings.json、不引入新依赖

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页 / 项目页 / 回写目标：
  - `repo://orbitos/99_系统/Harness/OrbitOS_Spec_Standard/OrbitOS_Spec_Standard_v0.3.1.md`
  - `repo://orbitos/20_项目/Pi_Config/Pi_Config.md`
  - `repo://orbitos/20_项目/Pi_Config/项目进度总览.md`
