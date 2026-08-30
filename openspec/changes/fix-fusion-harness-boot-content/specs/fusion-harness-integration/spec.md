# Specification Delta

## Capability 对齐（已确认）

- Capability: `fusion-harness-integration`
- 来源: `proposal.md` / 已确认 capabilities
- 变更类型: `modified`
- 用户确认摘要: 确认仅修改 `fusion-harness-integration`，无新增能力域；修订 Boot Banner Context Hygiene requirement（空 content 承载形式从空字符串改为空数组）

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## MODIFIED Requirements

### Requirement: Boot Banner Context Hygiene
The fusion-harness extension SHALL NOT inject non-semantic decorative text into the LLM conversation context, and SHALL NOT emit message content shapes that any pi protocol serializer forwards as an empty text block. Specifically, the `kind: "boot"` banner message emitted on TUI session startup (`session_start` with `reason === "startup"` and `ctx.mode === "tui"`) SHALL carry an **empty array** (`[]`) as its message `content`, because pi's `convertToLlm` unconditionally converts any string `CustomMessage.content` — including the empty string — into a `role: "user"` message with a single empty text block, which OpenAI-compatible backends (e.g., Zhipu's coding endpoint, error 1210) reject when the request also carries tool-call/tool-result sequences; every pi protocol serializer (openai-completions, openai-responses, anthropic-messages, google-generative-ai) skips messages whose content array is empty, so an empty array guarantees the banner never enters the request body on any protocol.

Rationale: the v0.2.4 approach (empty string) stopped the context leak for human-readable text but still produced a `role: "user"` message containing `[{"type":"text","text":""}]`. Zhipu's parameter validation rejects that empty text block whenever the request contains tool_calls/tool-result history (empirically reproduced via local recording proxy + session replay: requests with the empty-string boot message and a tool sequence fail with 1210; identical requests without it succeed). The boot banner's renderer reads only `details`, so content shape changes have zero display impact. The context-hygiene intent of the original requirement is preserved and strengthened: the banner is now invisible to every protocol serializer, not just textually empty.

#### Scenario: Boot banner content is an empty array
- **WHEN** the extension emits the `kind: "boot"` banner message on TUI session startup
- **THEN** the message's `content` field SHALL be the empty array `[]`, not the empty string `""`

#### Scenario: Empty banner message is skipped by all protocol serializers
- **WHEN** pi serializes a conversation containing the boot banner message into an API request for any supported protocol (openai-completions, openai-responses, anthropic-messages, google-generative-ai)
- **THEN** the serialized request body SHALL NOT contain any message with an empty text block originating from the boot banner (the message is dropped entirely)

#### Scenario: Tool-sequence requests on OpenAI-compatible backends succeed
- **WHEN** a TUI session that received the boot banner continues with a tool call (e.g., reading an image via the `read` tool) and the follow-up request is sent to an OpenAI-compatible backend (e.g., `zhipuai-coding-plan/glm-5.3-flash`)
- **THEN** the request SHALL be accepted without a `1210` parameter-validation error, and multimodal image content in tool results SHALL be unaffected

#### Scenario: Non-boot panels keep real text content
- **WHEN** the extension emits any other panel (opinion, fusion, duo, gate, validation, triage, error)
- **THEN** that message's `content` SHALL remain its actual text payload (truncated per existing limits) — the empty-array treatment applies only to messages whose content would otherwise be empty
