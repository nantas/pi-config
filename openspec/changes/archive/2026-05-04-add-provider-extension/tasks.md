# Tasks

## 1. Spec 覆盖与实现准备

- [x] 1.1 确认每个 capability spec 的实现范围与边界
  - `add-provider-command`: 注册 `/add-provider` 命令，交互式收集 name/baseUrl/apiKey
  - `provider-model-discovery`: 自动拉取 `/v1/models` 并映射为 `ProviderModelConfig`
  - `provider-persistence`: 使用 `pi.appendEntry()` 持久化 + `session_start` 重载
- [x] 1.2 确认依赖前置条件
  - `repo://pi-mono/packages/coding-agent/docs/extensions.md` 可访问
  - `repo://pi-mono/packages/coding-agent/docs/custom-provider.md` 可访问
  - `pi.registerProvider()` 和 `pi.appendEntry()` API 在目标 Pi 版本可用

## 2. 核心实现任务

- [x] 2.1 创建 Extension 入口文件 `.pi/extensions/add-provider.ts`
  - 标准：单文件模式，无额外 npm 依赖
  - 验证：`pi -e .pi/extensions/add-provider.ts` 无启动错误
- [x] 2.2 实现 `globalThis` dedup 标记 + `session_shutdown` 清除
  - 标准：参考 `docs/reference/pi-extension-session-shutdown-dedup.md`
  - 验证：连续 `/reload` 不产生重复注册
- [x] 2.3 实现 `session_start` 重载逻辑
  - 标准：读取 `pi.appendEntry()` 中 `type: "add-provider"` 的条目
  - 对每个条目调用 `pi.registerProvider(name, config)`，跳过已存在的 name
  - 验证：重启 Pi 后自定义 Provider 自动可用
- [x] 2.4 实现 `/add-provider` 命令 handler
  - 标准：
    - 使用 `ctx.ui.prompt()` 分步收集 provider name、base URL、API key
    - name 非空校验，base URL 默认建议 `http://localhost:1234/v1`
    - 用户取消时优雅退出
  - 验证：在 Pi 交互模式下执行 `/add-provider`，能走完 prompt 流程
- [x] 2.5 实现模型自动发现
  - 标准：
    - 向 `{baseUrl}/models` 发送 GET 请求，带/不带 `Authorization: Bearer` header
    - 解析 `data[].id`，映射为默认 `ProviderModelConfig`
    - 成功时展示 "Found N models" 摘要
  - 验证：使用本地 Ollama/LM Studio 测试，确认模型列表被正确拉取
- [x] 2.6 实现发现失败回退
  - 标准：
    - `/models` 失败或返回空列表时，提示用户并请求单个 model ID
    - 使用默认参数注册该 model
  - 验证：断开网络或指向无效 URL，确认回退流程可用
- [x] 2.7 实现持久化写入
  - 标准：注册成功后调用 `pi.appendEntry({ type: "add-provider", v: 1, config: { name, baseUrl, apiKey, models } })`
  - 验证：注册后检查 entry 是否被持久化
- [x] 2.8 实现注册后的即时生效
  - 标准：命令执行完毕后，用户可立即通过 `/model` 切换到新 Provider 的模型
  - 验证：注册后执行 `/model` 查看模型列表是否包含新模型

## 3. 收敛与验证准备

- [x] 3.1 整理 verification 检查点
  - `/add-provider` 命令可用性
  - Prompt 流程完整性
  - 模型自动发现成功/失败路径
  - 持久化与重载闭环
  - Dedup 与 session_shutdown 清理
- [x] 3.2 标记 writeback 摘要内容
  - Extension 功能摘要
  - 新增文件路径
  - 验证结果

## 4. 验证与回写收敛

- [x] 4.1 基于真实实现结果生成 `verification.md`
- [x] 4.2 基于 `verification.md` 生成 `writeback.md`
- [x] 4.3 执行 writeback 到 `repo://orbitos/20_项目/Pi_Config/项目进度总览.md`，记录可审计证据
