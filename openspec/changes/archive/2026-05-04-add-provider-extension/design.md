# Design

## Context

本次 change 在 `pi-config` 仓库中新增一个 Pi Extension（`.pi/extensions/add-provider.ts`），提供 `/add-provider` 交互式命令。用户输入 provider 名称、base URL 和 API key 后，Extension 自动从 OpenAI-compatible `/v1/models` 端点拉取模型列表，并通过 `pi.registerProvider()` 注册。配置通过 `pi.appendEntry()` 持久化，在 `session_start` 时自动重载。

## Goals / Non-Goals

**Goals:**
- 实现零代码添加非官方 Provider 的交互式命令
- 自动发现模型列表（OpenAI-compatible `/v1/models`）
- 跨 session 持久化与自动重载
- 单文件 Extension，无额外 npm 依赖

**Non-Goals:**
- 支持非 OpenAI-compatible API 的自定义流式实现
- 支持 OAuth / SSO 认证
- 支持手动编辑模型参数（cost、contextWindow 等）
- 提供删除 Provider 的命令（用户可通过取消持久化或 `/reload` 清除）

## Decisions

| 决策项 | 选择 | 理由 |
|---|---|---|
| Extension 组织形式 | 单文件 `.pi/extensions/add-provider.ts` | 无额外 npm 依赖，无需 package.json 和 node_modules |
| 模型发现策略 | 自动拉取 `/v1/models`（C 方案） | 覆盖绝大多数 OpenAI-compatible 部署，减少用户手动输入 |
| 发现失败回退 | 提示用户输入单个 model ID | 保证即使 endpoint 不可用也能完成注册 |
| API 类型 | 固定 `openai-completions` | 覆盖绝大多数场景；如未来需要其他 API，可扩展为命令参数 |
| 持久化机制 | `pi.appendEntry()` + `session_start` 重载 | Pi 原生支持，无需直接操作文件系统 |
| 重载去重 | 跳过已存在的 provider name | 避免 `session_start` 时与当前 session 的注册冲突 |
| Dedup 标记 | 使用 `globalThis.__pi_ext_add_provider_loaded` | 防止 global + local 双路径加载时的重复注册；配合 `session_shutdown` 清除 |

## Risks / Migration

| 风险 | 影响 | 缓解措施 |
|---|---|---|
| `/v1/models` 端点非标准 | 部分 Provider 不暴露此端点 | 提供手动输入 model ID 的回退路径 |
| 模型默认参数不准确 | cost、contextWindow 可能与实际不符 | 使用 0 cost 和保守默认值，用户后续可通过手写 Extension 精调 |
| 持久化数据格式变更 | 未来 Extension 升级可能不兼容旧格式 | 在 `appendEntry` 中嵌入版本字段（`v: 1`），便于未来迁移 |
| Global + local 双加载 | 若 Extension 同时存在于 `~/.pi/agent/extensions/` 和 `.pi/extensions/`，会重复注册 | 使用 `globalThis` dedup 标记 + `session_shutdown` 清除 |
