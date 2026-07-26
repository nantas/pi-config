# Specification Delta

## Capability 对齐（已确认）

- Capability: `fusion-harness-integration`
- 来源: `proposal.md`（Modified Capabilities，单一条目）
- 变更类型: `modified`
- 用户确认摘要: 用户指定"方向 B"修复 boot banner 上下文泄漏 —— 保留 banner 消息机制但清空会被注入上下文的 content 字段，renderer 不读 content 故零显示损失

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: Boot Banner Context Hygiene
The fusion-harness extension SHALL NOT inject non-semantic decorative text into the LLM conversation context. Specifically, the `kind: "boot"` banner message emitted on TUI session startup (`session_start` with `reason === "startup"` and `ctx.mode === "tui"`) SHALL carry an empty string as its message `content`, because the boot banner's renderer does not read `content` and pi's `convertToLlm` unconditionally converts any non-empty `CustomMessage.content` into a `role: "user"` message sent to the model.

Rationale: pi's `CustomMessage` `display` field only governs TUI rendering — it does NOT gate context injection. The boot banner exists purely as visual decoration (big centered title, subtitle, role-colored mark), all of which the renderer hardcodes. A non-empty `content` therefore pollutes the context of every TUI session with an isolated `[user]: FUSION HARNESS` line, which can trigger instruction-following models to autonomously attempt two-model comparison behavior even when no fusion slash command was issued.

#### Scenario: Boot banner content is empty
- **WHEN** the extension emits the `kind: "boot"` banner message on TUI session startup
- **THEN** the message's `content` field SHALL be the empty string `""`
- **AND** the message SHALL still carry `customType`, `display: true`, and its `details` (`{ kind: "boot", ok: true }`) so the renderer still fires
- **AND** pi's `convertToLlm` SHALL produce no visible user-role text from this message (empty string content)

#### Scenario: Boot banner visual rendering is unchanged
- **WHEN** the TUI renders a `kind: "boot"` message whose `content` is empty
- **THEN** the rendered banner SHALL be visually identical to before the change — the centered fullwidth-glyph title, "Combine Your Compute" subtitle, and `● + ●` role-colored mark SHALL all still appear
- **AND** no regression SHALL occur because the renderer never read `content`

#### Scenario: Other panels keep their semantic content
- **WHEN** any non-boot panel (`prompt`, `banner`, `duo`, `opinion`, `fused`, `gate`, `validation`, `triage`, `error`, `system-prompt`) is emitted
- **THEN** its `content` SHALL remain whatever semantic text that panel's contract requires (e.g. the echoed `/fusion <input>` prompt, the fused markdown body)
- **AND** only the `boot` panel SHALL have its content emptied — no other panel is altered by this change

#### Scenario: Headless and non-startup sessions are unaffected
- **WHEN** the session mode is not `tui` OR the session_start reason is not `startup` (e.g. `/new`, resume, fork, extension reload)
- **THEN** no boot banner message SHALL be emitted at all (unchanged from prior behavior)
- **AND** the content-hygiene fix SHALL have no observable effect on those paths
