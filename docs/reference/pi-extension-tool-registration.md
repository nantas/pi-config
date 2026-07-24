# Pi Extension Tool Registration Pitfall Reference

> 记录 `pi.registerTool()` 字段名误用(inputSchema/handler vs parameters/execute)的根因、隐蔽机制、诊断方法与预防 checklist。
> 创建日期：2026-07-24
> 触发案例：`wikilink-batch-replace` 扩展（change `2026-06-12-wikilink-batch-replace`，commit `00a0ca1`），切到 grok-4.5 时暴露

## 1. 问题背景

`wikilink-batch-replace` 扩展走完了完整的 `pi-extension-dev` 六阶段流程（含 Phase E 验证）并归档，在默认 provider（deepseek）下一直正常工作。切换到 grok-4.5（xAI Responses API）后，**所有消息**统一返回：

```
Error: OpenAI API error (422): 422 "Failed to deserialize the JSON body
into the target type: missing field `parameters`"
```

切回 deepseek/gpt 不报错。这是典型的"规范误用被严格 provider 暴露"案例。

## 2. 根因：registerTool 必需字段误用

Pi 的 `registerTool` 配置对象有固定字段名。出错扩展误用了 MCP/OpenAI 的 convention：

| 用途 | ❌ 误用（MCP/OpenAI convention） | ✅ Pi 正确字段 |
|------|:---:|:---:|
| 参数 JSON Schema | `inputSchema` | `parameters` |
| 执行器 | `handler` | `execute` |

出错代码：

```typescript
pi.registerTool({
  name: "wikilink_batch_replace",
  description: "...",
  inputSchema: Type.Object({ ... }),   // ❌ 字段名错，运行时 tool.parameters 为 undefined
  handler: handleBatchReplace,         // ❌ 字段名错，执行器不会被调用
});
```

正确写法（见 `docs/plans/pi-customization-reference.md` L139-145）：

```typescript
pi.registerTool({
  name: "wikilink_batch_replace",
  description: "...",
  parameters: Type.Object({            // ✅
    file: Type.String({ description: "..." }),
    // ...
  }),
  async execute(toolCallId, params, signal, onUpdate, ctx) {   // ✅
    const result = await handleBatchReplace(params);
    return { content: [{ type: "text", text: result }] };
  },
});
```

## 3. 为什么隐蔽——两层掩盖

这个错误能潜伏到切 grok 才爆发，是因为有两层独立掩盖：

### 3.1 TypeScript 运行时不拦截

`registerTool` 接受的是结构化对象。传入一个 TS 类型不认识的字段（`inputSchema`），**编译期不会报错**（除非开启了严格的 excess property check 且签名是字面量对象）。结果：`tool.parameters` 运行时为 `undefined`，但进程不崩溃、注册"成功"。

### 3.2 宽松 provider 不校验缺失字段

Pi 的 `convertResponsesTools`（`@earendil-works/pi-ai`）序列化 tool 时直接透传：

```js
parameters: tool.parameters,   // undefined → JSON 序列化时该字段被省略
```

不同 provider 对缺失 `parameters` 字段的容忍度不同：

| Provider | 行为 |
|----------|------|
| deepseek / OpenAI completions | 宽松，缺字段不拦截，请求正常 |
| OpenAI Responses | 宽松，默认按 `{}` 处理 |
| **xAI / grok（Responses API）** | **serde 严格反序列化，`parameters` 必填 → 422** |

所以同一份错误代码，在 deepseek/gpt 下"能用"（其实工具真被调用时也会失败，但请求发得出去），只有切到 grok 才在请求阶段就崩。

## 4. 为什么现有验证流程拦不住

`pi-extension-dev` Phase E 的验证是 `pi -e .pi/extensions/<name>.ts` + `/reload`，只检查：

- 无启动错误
- 注册成功
- 基本功能跑通

这三项对字段名误用全部失效：注册"成功"（TS 不拦）、启动无错、只要测试时没真触发该 tool 的 LLM 调用、或触发了但走默认 provider，就不会暴露。**流程盲区：缺一个"严格 provider 实跑 tool 调用"的环节。**

## 5. 诊断方法

### 5.1 诊断方向：provider 严格度差异

遇到 `Failed to deserialize ... missing field <X>` 类 422 时，第一反应应是：**某个扩展注册的 tool/message 组件缺了运行时字段，被严格 provider（grok/xAI）暴露，宽松 provider 掩盖。** 这个方向比"怀疑 provider 配置"更可能命中根因——provider 配置错误通常所有 provider 都报错，而"只有严格端报错"几乎一定是 extension 字段问题。

### 5.2 定位元凶：dist 写文件日志法

`console.error` 在 TUI 下被渲染层吞掉、也不进 session JSONL。TUI 看不到 stderr 时，给序列化层打一个**写文件**的临时补丁，触发即落盘：

```js
// @earendil-works/pi-ai/dist/api/openai-responses-shared.js
// convertResponsesTools 内，把 parameters 行改为：
import { appendFileSync } from "node:fs";
// ...
parameters: (tool.parameters === undefined
  ? (appendFileSync('/tmp/pi-tool-debug.log', tool.name + '\n'), {})
  : tool.parameters),
```

重启 pi 发一条消息，`cat /tmp/pi-tool-debug.log` 即得元凶 tool 名。诊断完成后**必须回滚**（dist 会被 pi 升级覆盖，且 `?? {}` 兜底只是临时止血，根因要改扩展源码）。

> ⚠️ 这是 patch 第三方 npm 包 dist 的临时手段，仅用于诊断。根治永远是修扩展源码的字段名。

## 6. 预防 Checklist

开发 tool 类扩展时，提交前逐项确认：

- [ ] `registerTool` 用 `parameters`（不是 `inputSchema`），值为 `Type.Object({...})`
- [ ] `registerTool` 用 `execute`（不是 `handler`），签名为 `(toolCallId, params, signal, onUpdate, ctx) => Promise<{content: [...]} | string>`
- [ ] `execute` 返回值是 `{ content: [{ type: "text", text: "..." }] }` 或纯字符串
- [ ] 用**非默认 provider** 实跑一次该 tool 的 LLM 调用（优先 grok/xAI 等严格端），确认无 422
- [ ] 对照 `docs/plans/pi-customization-reference.md` L139-145 的标准模板

## 7. 关联文档

- [pi-customization-reference.md](../plans/pi-customization-reference.md) §3 — Extension 系统，含正确 `registerTool` 模板
- [pi-extension-dev SKILL.md](../../.pi/skills/pi-extension-dev/SKILL.md) — 扩展开发六阶段流程
- [pi-tool-api-dependency.md](./pi-tool-api-dependency.md) — Tool API 边界与 `ToolDefinition`/`ToolInfo` 字段
- 同系列踩坑参考：[pi-extension-editor-conflict.md](./pi-extension-editor-conflict.md)、[pi-extension-session-shutdown-dedup.md](./pi-extension-session-shutdown-dedup.md)
