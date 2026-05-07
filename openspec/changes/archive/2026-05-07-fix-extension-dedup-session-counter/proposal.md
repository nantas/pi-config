# Proposal

## 问题定义

pi-config 仓库的扩展（extensions）同时部署在两个位置：

- **项目级** `.pi/extensions/` — 开发环境与源码真源
- **全局级** `~/.pi/agent/extensions/` — 通过 `scripts/sync-pi-agent.sh` 同步，供其他仓库使用

每个扩展使用 `globalThis.__pi_ext_*_loaded` 布尔旗标做双重去重：

1. **跨路径去重**：项目副本先加载 → 设置旗标 → 全局副本检测到旗标 → 跳过，避免双注册
2. **跨会话清理**：`session_shutdown` 事件 → `delete globalThis.__pi_ext_*_loaded`，为下次 `/new` 做准备

**问题一：`/new` 后所有扩展不注册。** 当 `session_shutdown` 未在扩展重新加载前完成清理时（时序竞争、extension runner 状态异常、模块缓存副作用），旗标残留 → 两个副本的 `if (flag) return` 都命中 → **0 个 handler 注册** → 无 `/init`、`/browse`、`$skill` 自动补全等扩展功能。

**问题二：`globalThis` 布尔旗标是跨会话共享的可变状态。** 单个 `true/false` 不足以区分「这是哪个会话的旗标」和「这是哪个路径注册的」。

## 范围边界

**纳入范围：**
- 修改 pi-config 仓库中所有 7 个扩展的去重模式
- 从「布尔旗标 + session_shutdown delete」改为「会话 ID + 会话绑定 key」
- 部署后执行全局同步，确保全局副本也采用新模式

**不纳入范围：**
- 不修改 Pi 运行时源码（去重是扩展层合约，不是 Pi 的 bug）
- 不修改 `capabilities.yaml` 或同步策略
- 不新增扩展能力，仅修复既有扩展的加载可靠性

## Capabilities

### New Capabilities

（无 — 本次为已有扩展的代码级修复，不引入新 capability）

### Modified Capabilities

- `extension-dedup-mechanism`: 修改 pi-config 仓库中所有扩展的去重逻辑，从**布尔旗标 + session_shutdown 清理**模式改为**会话计数器 + 会话绑定 key**模式，消除 `/new` 后扩展不注册的问题

## Capabilities 待确认项

- [x] 能力清单已确认 — 本 change 为扩展代码修复，`extension-dedup-mechanism` 为本次变更的内部能力标识，不需要单独产出 specs/

## Impact

- 影响 7 个扩展文件（6 个 `.ts` + 1 个子目录 `subagent-dispatch`）
- 每个扩展的 `default export` 函数中约 5 行去重逻辑需要修改，模式统一
- 全局 `~/.pi/agent/extensions/` 副本需同步更新
- 无运行时 API 变更，无配置变更，无性能影响

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页 / 项目页 / 回写目标
