# Design

## Context

fusion-harness 的 boot banner（`fusion-harness.ts` 行 1765-1768）在 TUI session 启动时调用 `panel({ kind: "boot", ok: true }, "FUSION HARNESS")`。`panel()` 把第二个参数作为 `pi.sendMessage` 的 `content` 字段：

```ts
const panel = (details: FhDetails, content: string) => {
    pi.sendMessage<FhDetails>({
        customType: CUSTOM_TYPE,
        content: truncateBytes(content, ANSWER_MAX_BYTES),
        display: true,
        details,
    });
};
```

pi 本体的 `convertToLlm`（`messages.ts`）对 `CustomMessage` 无条件产出 `{ role: "user", content: [{ text: m.content }] }` —— `display` 字段只控 TUI 渲染，不阻断注入。boot banner 的 renderer（`case "boot"`，行 1458-1488）完全不读 `content`，标题/副标题/图标全在 renderer 内硬编码。因此 `"FUSION HARNESS"` 这串文本对显示零贡献、对上下文是纯噪音。

输入：`specs/fusion-harness-integration/spec.md`（Boot Banner Context Hygiene 要求）。

## Goals / Non-Goals

**Goals:**

- 让 boot banner 消息的 `content` 为空字符串，彻底停止向 LLM 上下文注入装饰文本
- 保持 banner 视觉渲染完全不变（renderer 本就不读 content）
- 保持 `panel()` 与其他所有 panel 的契约不变（只有 boot 清空 content）

**Non-Goals:**

- 不改 pi 本体的 `CustomMessage` / `convertToLlm` 语义（方向 C，超范围）
- 不改其他 panel 的 content 注入
- 不改 `pi.sendMessage` 的签名或 `panel()` 的签名
- 不动全局能力表 / settings.json / 同步脚本

## Decisions

**D1：单行最小改动 —— 清空 boot 调用的 content 实参。**

改 `fusion-harness.ts:1767`：
```ts
// 前
panel({ kind: "boot", ok: true }, "FUSION HARNESS");
// 后
panel({ kind: "boot", ok: true }, "");
```

`panel()` 内部 `truncateBytes("", …)` 返回空串，`pi.sendMessage` 收到 `content: ""`，`convertToLlm` 产出空 text 的 user message（对模型不可见）。renderer 仍由 `details.kind === "boot"` 触发，硬编码标题照常渲染。

为什么不改 `panel()` 签名或加新参数：`panel()` 是所有 panel 共用的工厂，只为 boot 改契约会污染其它 8 种 panel。实参层面清空是最小、最局部、零副作用的一刀。

**D2：不引入 content 来源抽象。**

不重构 `panel()` 让 caller 声明"这是装饰性 content"。当前唯一违规的就是 boot，YAGNI；未来若再出现装饰性 panel，再统一处理。

**D3：不动 `display` 字段。**

`display: true` 是 TUI 渲染开关，与上下文注入无关。保持不变确保 banner 仍正常显示。

## Risks / Migration

- **风险（低）**：某下游（如 session transcript 回放、archive 工具）依赖 boot 消息的 `content` 作为"这是 fusion session"的标记。**缓解**：boot 的 `customType` 与 `details.kind === "boot"` 仍是可靠标记；`content` 从来不是契约的一部分（renderer 不读）。grep fork clone 确认无其它代码读 boot 消息的 content。
- **风险（极低）**：清空 content 后 `convertToLlm` 仍产出一条空 user message，极个别模型可能对空 user turn 反应异常。**缓解**：空 user message 在 pi 的其它路径（如空 bash execution）已存在且无报障；若真出现可后续在 convertToLlm 过滤空 content，但属 pi 本体改动，本 change 不做。
- **迁移**：无 —— 源码修复随下次 `pi install` / 包刷新生效；用户无需任何配置变更。manifest `changes_summary` 记录即可。
