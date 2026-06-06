# Tasks

## 1. Spec 覆盖与实现准备

- [x] 1.1 确认 `specs/obsidian-cli-tool/spec.md` 覆盖范围：MODIFIED × 3（Tool Registration, Command Execution, Vault Resolution → REMOVED）+ 保留 × 3（Input Validation, Dangerous Command Blocking, Timeout and Cancellation）
- [x] 1.2 确认依赖：无外部依赖，变更限定在 `.pi/extensions/obsidian-tools/` 内

## 2. 核心实现任务

### 2.1 新建 `cli-exec.ts`

- [x] 2.1.1 创建 `.pi/extensions/obsidian-tools/cli-exec.ts`，实现 `runCli(args: string[], timeoutMs: number, signal?: AbortSignal)` 函数
  - spawn `obsidian-cli` + args
  - 超时控制：setTimeout → SIGTERM
  - AbortSignal 支持：on abort → SIGTERM
  - 返回 `{ ok, stdout, stderr, code }`
- 验证：TypeScript 编译无错误

### 2.2 新建 `raw-tool.ts`

- [x] 2.2.1 创建 `.pi/extensions/obsidian-tools/raw-tool.ts`，定义 tool schema（覆盖 spec "Tool Registration"）
  - 参数：command (required), vault (required), params, flags, allowDangerous, timeoutMs
  - promptSnippet + promptGuidelines
- [x] 2.2.2 实现 execute 函数（覆盖 spec "Input Validation" + "Dangerous Command Blocking" + "Command Execution"）
  - 校验 command / param keys / flags 正则 `/^[a-z0-9:_-]+$/i`
  - 校验 vault 必填
  - 危险命令拦截（eval, dev:cdp, dev:debug, restart）
  - 构造参数数组并调用 `runCli()`
  - 格式化返回结果
- 验证：TypeScript 编译无错误

### 2.3 更新 `index.ts`

- [x] 2.3.1 在 `index.ts` 中 import `raw-tool.ts` 的 toolDefinition
- [x] 2.3.2 调用 `pi.registerTool(rawToolDefinition)` 注册第二个 tool
- 验证：TypeScript 编译无错误；`obsidian_cli` 出现在 available tools 列表中

### 2.4 更新 `package.json`

- [x] 2.4.1 更新 `package.json` description：移除过时的 "and obsidian_cli (command passthrough)" 描述（当前实际只注册了 search）
  - 预期改为：`"Obsidian tools extension: obsidian_search (intelligent retrieval) and obsidian_cli (Obsidian CLI passthrough)"`
- 验证：description 与实际注册的两个 tool 一致

## 3. 收敛与验证准备

- [x] 3.1 验证清单：
  - 在 vault 内启动 Pi → 确认无 Obsidian CLI 进程在启动时被 spawn（覆盖 spec "Tool Registration" Scenario 1）
  - 调用 `obsidian_cli({ command: "tags", vault: "my-wiki" })` → 确认返回 tag 列表（覆盖 spec "Command Execution" Scenario 1）
  - 调用 `obsidian_cli({ command: "read", params: { file: "test" } })`（不传 vault）→ 确认返回 required 错误（覆盖 spec "Tool Registration" Scenario 3）
  - 调用 `obsidian_cli({ command: "eval", vault: "my-wiki" })` → 确认返回危险命令拦截（覆盖 spec "Dangerous Command Blocking" Scenario 1）
  - 调用 `obsidian_cli({ command: "tags", vault: "nonexistent" })` → 确认返回非零退出码错误（覆盖 spec "Command Execution" Scenario 2）
- [x] 3.2 如有 `capabilities.yaml` 检查需确认扩展条目无需变更

## 4. 验证与回写收敛

- [x] 4.1 基于实现结果生成 `verification.md`（覆盖 spec 逐条验证）
- [x] 4.2 基于验证结论生成 `writeback.md`（本次为轻量回写：确认全局同步后无新增异常）
- [x] 4.3 执行确认：运行 `scripts/sync-pi-agent.sh` 同步到 `~/.pi/agent/`
