# Design

## Context

Trellis 框架在 neonspark 仓库中通过 profile → phase JSONL → `trellis-load-phase-context` 的链路向 agent 注入上下文。agent 的行为是否遵循设计意图、是否阅读了注入的上下文、是否加载了 invoke 指令指定的 skill——这些问题目前完全无法观测。

本 extension 的四个 capability（`workflow-observability`、`context-consumption-tracking`、`streaming-persistence`、`analysis-tool`）共同构成一个被动遥测层，通过 hook Pi 的 `tool_call` 和 `tool_result` 事件来记录 agent 行为。

## Goals / Non-Goals

**Goals:**

- 捕获 Pi session 中 agent 加载的所有 skill（全 namespace），记录时间、来源、namespace
- 检测 `trellis-load-phase-context` 的执行，解析其输出中的文件列表、mode 分类、invoke 指令
- 追踪 agent 是否响应了 invoke 指令（是否加载了对应 skill）
- 提取内联内容中引用的 skill 和文件路径，追踪是否被 read
- 实时流式写入 JSONL，支持跨 session 续写同一 task 的记录
- 提供 `trellis_analytics` tool 供 agent 查询遥测数据

**Non-Goals:**

- 不主动告警或阻断（被动记录）
- 不解析代码符号引用（如 `ShellBootstrapper` 等类名）
- 不存储 phase context 内联内容的全文（只存文件列表和 metadata）
- 不修改 Trellis 框架的任何组件
- 不实现文件轮转或大小限制（v1 不处理）
- 不提供用户级 `/trellis-analytics` 命令（仅 tool）

## Decisions

### D1: Event-Based Architecture

Extension 通过订阅 `tool_call` 和 `tool_result` 事件来工作。不 hook `before_agent_start` 或 `context` 事件（这些会捕获 system prompt 注入，但 payload 格式复杂且在 session 早期触发频繁，v1 不做）。

```
tool_call 事件:
  toolName === "read"  → 追踪 skill 加载 + 文件读取
  toolName === "bash"  → 追踪命令执行 + 检测 trellis 命令

tool_result 事件:
  toolName === "bash"  → 匹配对应 tool_call 的 toolCallId，解析命令输出
```

事件间通过 `toolCallId` 关联：`tool_call` 时标记待解析的命令，`tool_result` 时匹配并解析输出。

### D2: Three-Layer Context Consumption Model

参考 `specs/context-consumption-tracking/spec.md`，实现三层消费追踪：

| 层 | 检测目标 | 实现方式 |
|----|----------|----------|
| L1: 内联消费 | `=== filepath ===` 中的文件（agent 自动收到） | 解析 `tool_result` 输出，提取 `=== ... ===` 头部 |
| L2: invoke 响应 | `[trellis-mode:invoke]` 中的 skill 是否被加载 | 解析 mode 分组 → 构建 `invoke_targets` → 与后续 `skill_load` 做差集 |
| L3: 引用追踪 | 内联文本中引用的其他文件/skill 是否被 read | 正则提取 `.md` / `.yaml` / `.json` 路径 + 已知 skill 名称 → 与后续 `read` 对比 |

### D3: ToolCallId-Based Command Matching

`tool_call` 和 `tool_result` 事件通过 `toolCallId` 关联。在 `tool_call` 阶段检测到 `trellis-load-phase-context` 命令时，缓存 `toolCallId → { command, phase }`。在 `tool_result` 阶段匹配到同一 `toolCallId` 时，解析输出。

```typescript
// 伪代码
const pendingCommands = new Map<string, { command: string, phase: string }>();

pi.on("tool_call", (event) => {
  if (isBashCall(event) && event.input.command.includes("trellis-load-phase-context")) {
    const phase = extractPhase(event.input.command);
    pendingCommands.set(event.toolCallId, { command: event.input.command, phase });
  }
});

pi.on("tool_result", (event) => {
  const pending = pendingCommands.get(event.toolCallId);
  if (pending) {
    parseInjectionOutput(event.content, pending.phase);
    pendingCommands.delete(event.toolCallId);
  }
});
```

### D4: Streaming JSONL Persistence

参考 `specs/streaming-persistence/spec.md`：

```
init:
  read .trellis/.current-task → resolve task_slug
  if task_slug:
    dir = ".trellis/.analytics/tasks/{task_slug}/"
    file = dir + "events.jsonl"
    if exists: fd = open(file, "a")
    else:      fs.mkdir(dir, parents), fd = open(file, "w")
  else:
    file = ".trellis/.analytics/orphans/{session_id}.jsonl"
    fd = open(file, "a")

on each event:
  line = JSON.stringify(event) + "\n"
  fd.write(line)
  fd.sync()  // fsync for crash recovery
```

文件描述符在 session_shutdown 时关闭。跨 session 续写时重新打开同一个文件（append 模式）。

### D5: Reference Extraction Strategy

从内联内容中提取引用，使用两种策略：

1. **文件路径正则**：`/\b[\w./-]+\.(md|yaml|json|ts|cs)\b/g`
   - 排除 `=== ... ===` 头部中已经作为 `injected_files` 的文件
   - 排除 URL 协议部分

2. **已知 skill 名称匹配**：在 `.agents/skills/` 和 `.pi/skills/` 中发现过的 skill 名称
   - 构建一个已知 skill 名称列表（按需动态扩展）
   - 匹配内联内容中的 skill 引用（如 `gitnexus-exploring`）

### D6: Analysis Tool

`trellis_analytics` tool 的实现策略：
- 直接读取 `.trellis/.analytics/` 目录下的 JSONL 文件
- 在内存中聚合统计（不建立索引，v1 使用简单扫描）
- 返回格式为纯文本/Markdown summary（不返回 JSON 结构）
- 对大型文件执行 limit 或最近 N 条记录的截断

## Risks / Migration

### 风险

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| event handler 阻塞 agent 响应 | agent 变慢 | 所有 handler 同步执行无 await 的阻塞操作，JSONL 写入使用无缓冲写 |
| JSONL 文件无限增长 | 磁盘占用、tool 查询变慢 | v1 不做限制，tool 查询实现 limit 参数控制返回行数 |
| session_id 稳定性 | 跨 session 无法关联同一 task | 以 task slug 为聚合键，session_id 仅用于区分 session 边界 |
| phase context 输出格式变化 | 解析失败 | 解析使用宽容策略：无法解析的字段返回 `unknown`，不中断流程 |
| init 时 .current-task 被并发修改 | 写到错误 task | 只在 init 时读取一次 .current-task，后续不重新同步 |
| 文件系统错误（权限/磁盘满） | 写入失败 | 捕获所有文件写入异常，以 `console.error` 日志而不崩溃 |

### 迁移

- v1 是全新扩展，无既有数据需要迁移
- 后续版本如需更改 JSONL schema，应通过新字段（additive changes）而非修改既有字段格式
- 如需从 JSONL 迁移到其他存储格式，应提供独立的迁移脚本，不在 extension 代码中处理
