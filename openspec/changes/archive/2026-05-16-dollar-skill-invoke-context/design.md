# Design

## Context

Pi 的输入处理管线（`repo://pi-mono/packages/coding-agent/src/core/agent-session.ts` lines 980-1120）：

```
user input → extension command check → input event → _expandSkillCommand → expandPromptTemplate
→ build user message → before_agent_start event → agent.prompt(messages)
  → context event (via transformContext) → convertToLlm → LLM call
```

当前 `dollar-skill-invoke` 在 `input` 事件阶段做文本替换（移除 `$skill` + 前置 `<skill>`）。本次变更将 skill 展开后移到 `context` 事件，利用 `context` 可以修改完整 `AgentMessage[]` 数组的能力实现消息级追加。

关键 Pi 内部机制：
- `context` 事件在 `emitContext()` 中触发（`runner.ts` lines 855-882），接收 `structuredClone` 的消息数组，扩展可返回修改后的数组
- `CustomMessage`（`messages.ts` lines 46-53，`role: "custom"`）在 `convertToLlm()`（`messages.ts` lines 136-142）中被转为 `role: "user"`，无论 `display` 是否为 false
- `BeforeAgentStartEventResult` 的 `message` 字段是单值，不支持多消息注入，因此必须用 `context` 事件而非 `before_agent_start`

## Goals / Non-Goals

**Goals:**
- `$skill-name` 展开从 `input` 文本替换切换为 `context` 消息追加
- 原始 prompt 保留 `$skill-name` 标记不变
- 支持任意数量 `$skill-name`（恢复多 skill 展开）
- 每个 skill 作为独立 `CustomMessage`（`customType: "skill"`, `display: false`）注入
- `$` autocomplete（Tab 补全）保持不变
- `/` skill filter 保持不变
- `\$` 转义支持保持不变

**Non-Goals:**
- 不修改 `input` 事件的 autocomplete 注册（`session_start` 中）
- 不修改 Pi 核心源码
- 不实现 skill 间显式编排（依赖图、执行顺序）

## Decisions

### D1: 从 `input` 事件切换到 `context` 事件

| Before | After |
|--------|-------|
| `pi.on("input", ...)` 返回 `{ action: "transform", text }` | `pi.on("context", ...)` 返回 `{ messages: modifiedArray }` |
| 文本级替换（移除 token + 前置 block） | 消息级追加（保留 token + 后置 message） |

**理由**：`context` 事件可修改整个 `AgentMessage[]`，支持注入多条消息，且 `CustomMessage` 会被自然转为 `role: "user"`。`before_agent_start` 的 `message` 字段是单值，无法实现多 skill 独立消息注入。

### D2: 去重机制——检查后续消息

在 `context` handler 中，从 `event.messages` 尾部向前找最后一条 `role === "user"` 的消息（索引 i），然后检查 `messages[i+1]`：
- 如果存在且 `role === "custom" && customType === "skill"` → 已注入，跳过
- 否则 → 执行解析和注入

**理由**：所有 skill 消息是一次性原子注入的，只需检查紧邻的下一条消息即可判断。无需额外的 Set/Counter 状态。自然处理多 turn（每个新 user message 触发）和 tool 续写（user message 后已有 skill 消息，跳过）。

**备选方案**：用模块级 Set 或 turn counter 跟踪。否决——增加状态管理复杂度，且 `structuredClone` 使消息引用不相等。

### D3: 注入位置——user message 之后

Skill 消息插入在最后一条 user message 之后、其他 pending 消息之前。在 `context` 中构建新数组时：

```
原数组: [..., assistant, user, pending_next_turn..., before_agent_start_msg...]
新数组: [..., assistant, user, skill_msg_1, skill_msg_2, pending_next_turn..., before_agent_start_msg...]
```

**理由**：skill 内容作为 user 角色的消息紧跟在用户意图之后，LLM 按序阅读时能自然关联。

### D4: `display: false`

Skill `CustomMessage` 的 `display` 设为 `false`，内容不显示在 UI 中但发送给 LLM。

**理由**：skill 内容已经存在于 `<available_skills>` 系统提示中，在 UI 中重复展示会干扰对话阅读。`convertToLlm()` 不检查 `display` 字段（`messages.ts` line 138-142），内容仍会发送给 LLM。

### D5: `input` 事件处理——移除 transform

`handleInputTransform` 函数及其 `pi.on("input", ...)` 注册将被移除（或改为无条件返回 `{ action: "continue" }`）。

**理由**：skill 展开完全由 `context` 事件负责，`input` 事件无需再做任何转换。`session_start` 中的 autocomplete 注册保持不变。

### D6: 扩展自 dedup——保持 session-scoped 标记

现有 session-scoped dedup 机制（`__pi_ext_dollar_skill_invoke_loaded_session_<N>` + `SESSION_COUNTER` in `session_shutdown`）保持不变。

**理由**：该机制防止扩展被双重加载（project + global），与 skill 展开逻辑无关。移除 `input` handler 不影响此机制。

## Risks / Migration

- **Risk**: `context` 事件每次 LLM 调用都触发（包括 tool 调用后续写），若去重逻辑失效会导致重复注入。**Mitigation**: D2 的去重机制通过消息结构检查天然防护，且 unit test 覆盖同一 turn 多次 `context` 调用场景。
- **Risk**: 原始 prompt 中保留 `$skill-name` 标记，LLM 可能不理解 `$` 前缀语法。**Mitigation**: `$` 前缀在 system prompt 的 `<available_skills>` 中已有上下文。LLM 关联 `$skill-name` 与后续注入的 `<skill>` 块是可行的语义推断。
- **Risk**: `context` handler 中 `readFileSync` 同步读取文件可能轻微影响首轮 LLM 调用延迟。**Mitigation**: `SKILL.md` 文件通常很小（<10KB），同步读取 <1ms，影响可忽略。
- **Risk**: 如果同一 skill 同时通过 `$skill-name` 和 `/skill:name` 引用，skill 内容会重复出现。**Mitigation**: 这是两个独立机制，用户可以自行避免。`context` 注入的 `CustomMessage` 与 `_expandSkillCommand` 产生的 `<skill>` 块格式一致，LLM 可识别为重复内容。
- **Migration**: 无需数据迁移。行为变更：单 skill 场景下用户 prompt 不再被修改（`$skill` token 保留），skill 内容从「前置」变为「后置」。对 LLM 而言信息量更大。
