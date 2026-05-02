# Plan Mode Implementation Comparison: Codex vs pi-config

> Technical reference comparing Codex plan mode architecture with pi-config's `planner-toggle.ts` (prompt-based redesign), documenting evidence-anchored analysis for migration decisions.

## Codex Plan Mode Architecture

### Source Code References

Codex plan mode is defined across three key files:

| File | Role |
|------|------|
| `codex-rs/core/templates/collaboration_mode/plan.md` | Plan mode system prompt template (~180 lines) |
| `codex-rs/core/src/models_manager/collaboration_mode_presets.rs` | Mode preset config (model, reasoning, instructions) |
| `codex-rs/core/src/tools/handlers/plan.rs` | `update_plan` tool handler (only programmatic guard) |
| `codex-rs/core/src/tools/handlers/request_user_input.rs` | `request_user_input` mode-restricted tool |

### How Write Prevention Works

Codex **does not use a tool whitelist** to enforce read-only behavior. Instead:

1. **`developer_instructions` injection**: Plan mode instructions are loaded from `codex-rs/core/templates/collaboration_mode/plan.md` via `include_str!` and set as `CollaborationModeMask.developer_instructions` (`collaboration_mode_presets.rs:37`). These instructions are injected into the model's system prompt (OpenAI API `developer_instructions` field), where they receive maximum attention from the LLM.

2. **All tools remain available**: There is no mode-based tool filtering in Codex. The LLM receives the same tool set regardless of mode. Restraint is achieved entirely through prompt instruction.

3. **The `update_plan` tool is the only programmatic guard**: If the model tries to call `update_plan` while in Plan mode, the handler returns an error (`plan.rs:137-139`):
   ```rust
   if turn_context.collaboration_mode.mode == ModeKind::Plan {
       return Err(FunctionCallError::RespondToModel(
           "update_plan is a TODO/checklist tool and is not allowed in Plan mode".to_string(),
       ));
   }
   ```

### Three-Phase Workflow

The `plan.md` template defines three explicit phases (`plan.md:14-89`):

- **Phase 1 — Ground in the environment**: Explore before asking. Eliminate unknowns through discovery.
- **Phase 2 — Intent chat**: Clarify what the user actually wants. Keep asking until goal, success criteria, scope, and constraints are unambiguous.
- **Phase 3 — Implementation chat**: Lock down approach, interfaces, data flow, edge cases, and acceptance criteria.

### Mode-Specific Tool Restriction

Codex uses `request_user_input` as a mode-restricted tool:

- `ModeKind::Plan.allows_request_user_input()` → `true` (`request_user_input.rs:13-16`)
- Other modes (Default, Execute, PairProgramming) return `false`

This is a **single tool guard**, not a whitelist. The tool is *available* in Plan mode for asking questions, unavailable elsewhere.

### Reasoning Effort

Plan mode configures `ReasoningEffort::Medium` (`collaboration_mode_presets.rs:38`), encouraging deeper reasoning during planning.

### `<proposed_plan>` Block Streaming

The plan output is wrapped in `<proposed_plan>` tags (`plan.md:100-115`) so the client can render it specially. This is a streaming parser feature — pi has no equivalent infrastructure.

---

## Pi Official `plan-mode` Extension (Reference)

### Source Code References

| File | Role |
|------|------|
| `packages/coding-agent/examples/extensions/plan-mode/index.ts` | Extension entry point, event handlers |
| `packages/coding-agent/examples/extensions/plan-mode/utils.ts` | Bash allowlist, todo extraction utilities |
| `packages/coding-agent/examples/extensions/plan-mode/README.md` | Usage documentation |

### Architecture

The official pi `plan-mode` extension uses a **whitelist-based** approach:

1. **Tool restriction via `pi.setActiveTools()`**: Defines `PLAN_MODE_TOOLS` = `["read", "bash", "grep", "find", "ls", "questionnaire"]` and `NORMAL_MODE_TOOLS` = `["read", "bash", "edit", "write"]` (`index.ts:21-22`). On toggle, calls `pi.setActiveTools()` to switch.

2. **Bash command allowlist via `isSafeCommand()`**: Uses `DESTRUCTIVE_PATTERNS` (32 patterns) and `SAFE_PATTERNS` (40+ patterns) in `utils.ts` to filter bash commands. Destructive patterns matched against the command string; safe patterns must match AND not be destructive.

3. **Custom message injection via `message.customType`**: Plan mode context is injected as a custom assistant message (`index.ts:162-188`), not through the system prompt.

4. **Plan tracking**: Extracts numbered steps from `Plan:` headers, tracks progress via `[DONE:n]` markers.

5. **Execution mode**: After planning, user can choose "Execute the plan" which restores full tool access.

---

## Comparison Table

| Dimension | Codex | Pi Official `plan-mode` | pi-config `planner-toggle` (New) |
|-----------|-------|------------------------|----------------------------------|
| **Write prevention** | Prompt instructions only (`developer_instructions`) | Tool whitelist + bash allowlist + `tool_call` blocking | Prompt instructions only (`systemPrompt`) |
| **Tool restriction** | None — all tools available | `setActiveTools()` switches to read-only set | None — all tools available |
| **Bash restriction** | None — prompt-based | Regex allowlist (32 destructive + 40 safe patterns) | None — prompt-based |
| **Instruction injection** | `developer_instructions` (OpenAI system prompt) | `message.customType` (custom assistant message) | `event.systemPrompt` (pi system prompt field) |
| **Workflow structure** | 3-phase (Ground → Intent → Implementation) | No built-in workflow | 3-phase (Ground → Intent → Implement) |
| **Plan output format** | `<proposed_plan>` block (client-streamed) | Plain `Plan:` header with numbered steps | Codex-style format guidance in prompt |
| **Tool extensibility** | Automatic — no whitelist to update | Fragile — each new tool must be whitelisted | Automatic — behavioral boundaries only |
| **Programmatic guards** | `update_plan` blocked in Plan mode only | All write/edit + destructive bash blocked | None |
| **Mode-model association** | Optional (preset `model: None`) | Switches to `deepseek/deepseek-v4-pro` | Switches to `deepseek/deepseek-v4-pro` |
| **Reasoning effort** | `ReasoningEffort::Medium` | Not configured | Not configured |
| **Question-asking tool** | `request_user_input` (Plan mode only) | None (uses `questionnaire` tool) | None |

---

## Migration Implications for pi-config

### 1. Bash Allowlist Maintenance Burden

The old `planner-toggle.ts` contained 32 destructive patterns and 23 safe patterns (`DESTRUCTIVE_PATTERNS`, `SAFE_PATTERNS`). These patterns:

- Cannot anticipate new destructive patterns (e.g., new package managers, new CLI tools)
- Require manual updates when a new tool like `opa` or `pulumi` is added
- Create false positives/negatives: `sed -n` (safe) vs `sed -i` (destructive) require complex regex exceptions
- Are inherently regex-match-based, not semantic — `rm` in a filename triggers the block

The prompt-based approach eliminates all of this: the LLM understands semantics, not regex.

### 2. Tool Whitelist Fragility

`PLANNER_TOOLS = ["read", "bash", "grep", "find", "ls"]`, `PLAN_MODE_TOOLS = ["read", "bash", "grep", "find", "ls", "questionnaire"]`.

Every time a new tool is added to pi (e.g., `obsidian_search`, `lsp`, `dispatch`), these lists must be updated. If forgotten, the new tool is unavailable in plan mode. The prompt-based approach handles any tool automatically through behavioral boundaries ("reading files ✅" / "editing files ❌").

### 3. Trust Tradeoffs

| Approach | Failure Mode | Risk Level |
|----------|-------------|------------|
| Whitelist (old) | Tool not available in plan mode → user blocked | Medium (false negatives) |
| Whitelist (old) | Undetected write via complex bash | Medium (false positives in regex) |
| Prompt-based (new) | LLM ignores prompt and mutates files | Low (system prompt is high-authority) |
| Prompt-based (new) | Indirect mutation via custom tool | Low (same risk model as Codex) |

The prompt-based approach accepts the same trust model as Codex: the LLM is a capable instruction-follower, and system-level instructions have the highest authority. The benefit (no whitelist maintenance) outweighs the small risk of non-compliance.

### 4. What pi-config Gains

- **Zero maintenance** for new tools: any pi extension adding a tool automatically works in plan mode
- **Behavioral boundaries**: "mutating actions" covers write, edit, bash mutations, and future tool types
- **Cleaner codebase**: ~120 lines of regex/whitelist code removed
- **Alignment with Codex best practices**: the industry pattern for agentic plan modes is moving toward prompt-based constraints
