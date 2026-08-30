# Proposal

## 问题定义

fusion-harness fork v0.2.4 将 TUI 启动时 `kind: "boot"` banner 消息的 `content` 清为空字符串，以修复装饰性文本泄漏进 LLM 上下文的问题。但 pi 的 `convertToLlm` 对 custom message 的字符串 `content` **无条件**转换——空字符串也会变成 `role: "user"` 消息的 `[{"type":"text","text":""}]` 空文本块。实测（本地记录代理抓包 + 会话回放）证明：当请求同时携带 tool_calls / tool 结果序列时，Zhipu OpenAI 兼容端点（`zhipuai-coding-plan`，glm-5.3-flash 走 openai-completions）的参数校验会拒绝这种空文本块，返回 `400 {"code":"1210","message":"API 调用参数有误，请检查文档。"}`。

触发面：任何 TUI 会话（启动即注入 boot banner）+ openai-completions 协议模型 + 任意工具调用后的回合。纯文本回合不触发（校验路径不同），因此问题呈间歇性。图片本身、模型配置、tools 列表均已通过对照实验排除。

## 范围边界

- **修**：fork 仓库 `extensions/fusion-harness/fusion-harness.ts` 的 `panel()` 辅助函数——`content` 为空字符串时发送空数组 `[]` 代替空字符串。pi 四个协议序列化器（openai-completions / openai-responses / anthropic-messages / google-generative-ai）对空数组 content 均有 `length === 0 → skip` 守卫，整条消息不再进入请求体；context-leak 修复语义不变，boot banner 渲染零损失（渲染器只读 `details`）。
- **修订规范**：`openspec/specs/fusion-harness-integration/spec.md` 的 "Boot Banner Context Hygiene" requirement——空字符串 SHALL 改为空数组 SHALL。
- **不修**：pi 本体 `convertToLlm` 对空文本块的跳过逻辑（根治层，属 pi-mono 上游，另行提 issue，不在本 change 范围）；已存在 session 文件中历史空串 content 的存量清洗（fix 生效后新 boot 消息不再产生空串；存量 session 由用户自行 /new 或后续处理）。
- **开发过程**：遵守 `pkg-fork-dev` 工作流（Phase C0/D0/E 门禁、全局 dedup、dev/prod 模式切换、manifest/backlog 回写），由 tasks.md 逐项固化。

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `fusion-harness-integration`: 修订 boot banner 上下文卫生要求——空 `content` 的承载形式从空字符串改为空数组，使该消息在所有协议序列化下都被整条跳过，消除 OpenAI 兼容后端（Zhipu 1210）对空文本块的参数校验失败。

## Capabilities 待确认项

- [x] 能力清单已与用户确认（修改对象即诊断会话中用户确认的修复方案，无新增能力域）

## Impact

- **行为影响**：LLM 请求体中不再出现空文本块 user 消息（原本也无语义内容，模型可见信息量零变化）；boot banner TUI 渲染不变；其余 panel（opinion/fusion 答案等）有真实文本内容，不受影响。
- **多模态影响**：无。图片块存在 toolResult/user 消息中，由 `model.input.includes("image")` 门控的独立序列化分支处理，与 boot banner 消息无交集；对照实验（去空消息 + 完整读图序列）全部成功。
- **受影响文件**：fork 仓库 `extensions/fusion-harness/fusion-harness.ts`（panel()，约 1 行核心改动）；pi-config 内 `openspec/specs/fusion-harness-integration/spec.md`、`forks/manifest.yaml`、`openspec/pkg-backlog.md`。
- **回滚**：单 commit revert。

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页 / 项目页 / 回写目标：
  - 标准页：`openspec/specs/fusion-harness-integration/spec.md`
  - 项目页：`forks/manifest.yaml`、`openspec/pkg-backlog.md`
  - 回写目标：`repo://fusion-harness`（git push）、manifest、backlog（详见 binding.md）
