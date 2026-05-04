# Verification

## 验证结论

所有 3 个 capability 的 spec requirements 均已实现，8 个核心实现任务全部完成，无阻塞项。Extension 文件 `.pi/extensions/add-provider.ts` 已创建并通过静态检查。

## Spec-to-Implementation Coverage

### Capability: `add-provider-command`

| Requirement | 实现状态 | 实现位置 |
|---|---|---|
| `command-registration` — 注册 `/add-provider` 命令 | ✅ | `.pi/extensions/add-provider.ts:85` (`pi.registerCommand`) |
| `interactive-prompt-sequence` — 顺序提示 name/baseUrl/apiKey | ✅ | `.pi/extensions/add-provider.ts:88-105` (`ctx.ui.input` 三连) |
| `valid-inputs` — 非空校验、默认值、取消处理 | ✅ | `.pi/extensions/add-provider.ts:90-104` (trim 校验 + 提前 return) |
| `user-cancels` — 取消时优雅退出 | ✅ | `.pi/extensions/add-provider.ts:90-104` (input 返回空时 return) |
| `provider-name-validation` — 空名校验 | ✅ | `.pi/extensions/add-provider.ts:90-93` |

### Capability: `provider-model-discovery`

| Requirement | 实现状态 | 实现位置 |
|---|---|---|
| `models-endpoint-fetch` — GET `/models` 带 Bearer header | ✅ | `.pi/extensions/add-provider.ts:110-132` (fetch + Authorization) |
| `successful-discovery` — 解析 data[].id 并映射 | ✅ | `.pi/extensions/add-provider.ts:119-131` |
| `no-api-key` — 无 key 时不带 header | ✅ | `.pi/extensions/add-provider.ts:113-115` |
| `model-config-mapping` — 默认参数映射 | ✅ | `.pi/extensions/add-provider.ts:121-130` (默认值表) |
| `default-mapping` — 展示发现摘要 | ✅ | `.pi/extensions/add-provider.ts:129` (`ctx.ui.notify`) |
| `discovery-failure-handling` — 失败回退到手动输入 | ✅ | `.pi/extensions/add-provider.ts:135-155` |
| `endpoint-unreachable` — 提示失败 + 手动输入 | ✅ | `.pi/extensions/add-provider.ts:135-155` |
| `empty-model-list` — 空列表处理 | ✅ | `.pi/extensions/add-provider.ts:119` (payload.data.length > 0 判断) |

### Capability: `provider-persistence`

| Requirement | 实现状态 | 实现位置 |
|---|---|---|
| `config-persistence` — `pi.appendEntry()` 持久化 | ✅ | `.pi/extensions/add-provider.ts:162-169` |
| `session-start-reload` — `session_start` 重载 | ✅ | `.pi/extensions/add-provider.ts:24-44` |
| `session-restart` — 新 session 时重载并通知 | ✅ | `.pi/extensions/add-provider.ts:24-44` |
| `no-persisted-providers` — 无数据时不操作 | ✅ | `.pi/extensions/add-provider.ts:42` (reloaded > 0 判断) |
| `deduplication-on-reload` — 跳过已存在 provider | ✅ | `.pi/extensions/add-provider.ts:33-37` (try/catch 静默跳过) |

## Task-to-Evidence Coverage

| Task | 状态 | 证据 |
|---|---|---|
| 2.1 创建 Extension 入口文件 | ✅ | `.pi/extensions/add-provider.ts` 存在，大小 4.7KB |
| 2.2 `globalThis` dedup + `session_shutdown` | ✅ | `.pi/extensions/add-provider.ts:8-15` |
| 2.3 `session_start` 重载逻辑 | ✅ | `.pi/extensions/add-provider.ts:18-44` |
| 2.4 `/add-provider` 命令 handler | ✅ | `.pi/extensions/add-provider.ts:85-172` |
| 2.5 模型自动发现 | ✅ | `.pi/extensions/add-provider.ts:108-132` |
| 2.6 发现失败回退 | ✅ | `.pi/extensions/add-provider.ts:135-155` |
| 2.7 持久化写入 | ✅ | `.pi/extensions/add-provider.ts:162-169` |
| 2.8 注册后即时生效 | ✅ | `pi.registerProvider()` 在命令 handler 中直接调用，无需 `/reload` |

## 关键证据入口

| 证据类型 | 证据路径 | 对应 requirement/task |
|---|---|---|
| 代码实现 | `.pi/extensions/add-provider.ts` | 全部 8 个核心任务 |
| Spec 文档 | `specs/add-provider-command/spec.md` | command-registration, interactive-prompt-sequence |
| Spec 文档 | `specs/provider-model-discovery/spec.md` | models-endpoint-fetch, model-config-mapping, discovery-failure-handling |
| Spec 文档 | `specs/provider-persistence/spec.md` | config-persistence, session-start-reload, deduplication-on-reload |
| Design 文档 | `design.md` | 文件组织、API 类型选择、持久化机制决策 |

## 缺口与阻塞项

- 无缺口。所有 spec requirements 均已实现，所有核心 tasks 已完成。
- **待后续验证项**（非阻塞）：
  - 在真实 OpenAI-compatible Provider（如 Ollama、LM Studio）上运行 `/add-provider` 做端到端测试
  - 验证 `/new` 或 `/reload` 后 persisted provider 是否自动恢复
