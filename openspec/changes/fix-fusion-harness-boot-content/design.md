# Design

## Context

规范真源：`specs/fusion-harness-integration/spec.md`（MODIFIED "Boot Banner Context Hygiene"）。

现状：fork 仓库 `extensions/fusion-harness/fusion-harness.ts:1614` 的 `panel()` 辅助函数把传入的字符串 `content` 经 `truncateBytes()` 后直接作为 custom message 的 `content` 发送。boot banner 调用点（`fusion-harness.ts:1767`）传入 `""`，导致 pi `convertToLlm` 生成 `[{"type":"text","text":""}]` 空文本块 user 消息（pi-ai `chunk-OMWWHBTG.js` 的 `case "custom"` 对字符串 content 无条件转换）。

pi 侧协议序列化器行为（已在 pi-ai 源码逐一确认）：

| 序列化器 | 空数组 content 处理 | 空文本块处理 |
|----------|--------------------|--------------|
| openai-completions | `content.length === 0 → continue`（跳过整条） | 无过滤（发出去 → Zhipu 1210） |
| openai-responses-shared | `content.length === 0` 同款守卫 | 无过滤 |
| anthropic-messages | `filteredBlocks.length === 0 → continue` | `text.trim().length > 0` 过滤 |
| google-generative-ai | 同族守卫 | — |

结论：空数组是唯一在全部协议下都被整条跳过的承载形式；`CustomMessage.content` 类型本身接受 `string | ContentBlock[]`（convertToLlm 对非字符串 content 原样传递）。

## Goals / Non-Goals

**Goals:**

- boot banner（及一切 content 为空的 panel）以 `[]` 形式发送，任何协议序列化后都不出现在请求体中
- 保持 boot banner TUI 渲染不变（渲染器只读 `details.kind` 等，不读 `content`）
- 开发过程遵守 `pkg-fork-dev` 六阶段流程（含 C0/D0/E4a 状态门禁、D1 全局 dedup、E3a push 验证）

**Non-Goals:**

- 不修改 pi 本体 `convertToLlm`（上游 issue 另行处理）
- 不清洗存量 session 文件中的历史空串 content
- 不改动非空 panel 的内容处理路径

## Decisions

1. **改在 `panel()` 而非 boot 调用点**：`panel()` 是所有空 content 消息的唯一汇点（boot banner 目前是唯一调用者，但 stopped/error 等未来可能出现空 content 调用）。在汇点做 `content === "" ? [] : truncateBytes(...)` 一处守卫，覆盖全部现有与未来调用者——优于在单个调用点打补丁。
2. **类型形态**：`pi.sendMessage` 的 content 字段类型为 `string | ContentBlock[]`，直接传 `[]` 类型合法，无需引入新类型或改动 `panel()` 签名（仍接收 `string`，出口处分流）。
3. **判断条件用严格空串**：`content === ""`。`truncateBytes("")` 本就返回 `""`，语义等价于"无内容即无消息体"。不做 `trim()` 判断——含空白的 content 保留原行为（发一个空白文本块），避免扩大改动面。
4. **开发模式切换**：当前 `.pi/settings.json` 中 fusion-harness 为 `git:` 生产源。按 pkg-fork-dev Phase C0 门禁，实现前切换为本地 dev clone 路径（`repo://fusion-harness` → `/Users/nantasmac/projects/forks/fusion-harness`），Phase E4 切回。全局 `~/.pi/agent/settings.json` 的 git 条目按 D1 门禁临时移除并在 E4 恢复，override 记录写入本 change 的 `writeback.md`。
5. **验证方式**：fork 仓库现有测试（`npm test`）+ 本地记录代理复放——重启 pi TUI 产生新 boot banner 后，检查代理捕获的请求体不含空文本块消息；再跑一次 glm-5.3-flash 读图确认 200。代理脚本复用诊断阶段方案（临时搭建，不留存）。

## Risks / Migration

- **风险：`pi.sendMessage` content 数组形态的 TUI 渲染兼容性**——v0.2.4 已证明 boot 渲染器不读 content；数组形态由 convertToLlm 原样传递，序列化路径已确认安全。残余风险仅在其他渲染分支意外读取 content 字段，`/reload` 后肉眼验证 boot banner 正常显示即可覆盖。
- **风险：上游 pi 行为变化**——若未来 pi 的 convertToLlm 对空数组也做映射或对空字符串做跳过，本修复仍然无害（空数组跳过是更保守形态）。
- **迁移**：无数据迁移。存量 session 中的空串 content 在该 session 下次请求时仍可能触发 1210（仅 openai-completions 协议 + 工具序列场景）；用户可对这些 session `/new`。此为已知残留，不在本 change 范围。
- **回滚**：fork 单 commit revert；pi-config 侧 spec/manifest/backlog 记录性更新，随 change 归档流程处理。
