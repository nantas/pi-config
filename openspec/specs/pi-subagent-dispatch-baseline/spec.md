# Specification Delta

## Capability 对齐（已确认）

- Capability: `pi-subagent-dispatch-baseline`
- 来源: `proposal.md` / 已确认 capabilities
- 变更类型: `modified`
- 用户确认摘要: dispatch extension 将被移除，所有 dispatch 工具/命令/接口契约不再适用

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## REMOVED Requirements

### Requirement: The Repository Must Expose A Local Dispatch Tool
**Reason**: The dispatch extension is removed. The native `subagent` tool (provided by pi-subagents runtime) replaces the repository-owned dispatch tool, with a `/subagent` prompt providing orchestration guidance.
**Migration**: Use `subagent({ agent: "...", task: "..." })` directly. See `subagent-prompt-guide` spec for the new orchestration approach and `.pi/prompts/subagent.md` for quick-reference patterns.

### Requirement: The Repository Must Expose A Dispatch Command Wrapper
**Reason**: The `/dispatch` command wrapper was part of the dispatch extension. The `/subagent` prompt serves as the new convenience entry point.
**Migration**: Use `/subagent` prompt (`.pi/prompts/subagent.md`) for natural-language orchestration guidance. The pi-subagents bundled skill also provides comprehensive usage patterns.

### Requirement: Dispatch Command Must Accept Natural-Language Requests
**Reason**: The `/dispatch` command is removed. The `/subagent` prompt reinterprets this requirement by guiding the LLM to translate natural-language requests into structured `subagent()` calls.
**Migration**: The LLM reads `.pi/prompts/subagent.md` to learn how to decompose natural-language delegation requests into subagent tool invocations.

### Requirement: Dispatch Must Use A Unified Task Array Contract
**Reason**: The dispatch-specific `tasks[]` contract is removed. The native `subagent` tool accepts its own parameter shapes (`agent`+`task` for single, `tasks[]` for parallel, `chain[]` for sequential).
**Migration**: Use native subagent parameter shapes. Single task: `{ agent, task }`. Parallel: `{ tasks: [...] }`. Chain: `{ chain: [...] }`.

### Requirement: Dispatch Must Keep The User Entry Surface Minimal In V1
**Reason**: The dispatch extension is removed. The pi-subagents native tool provides direct access to all subagent features, which is more explicit but requires understanding the subagent parameter interface.
**Migration**: The `.pi/prompts/subagent.md` prompt provides the concise entry surface. For advanced usage, refer to the pi-subagents skill.

### Requirement: Dispatch Must Support Task-Level Project Context Selection
**Reason**: The `projectContext: default | inherit | strip` task-level control was unique to dispatch. pi-subagents does not support this at the task level.
**Migration**: Use agent-level `inheritProjectContext` (boolean) in `.pi/agents/*.md` frontmatter to control per-agent context inheritance. For context-free agents, set `inheritProjectContext: false`. This is a coarser-grained control than dispatch's per-task selection.

### Requirement: Sync Must Be The Only Formal V1 Completion Mode
**Reason**: This constraint was specific to dispatch's v1 implementation. pi-subagents natively supports both sync and async execution modes.
**Migration**: Async mode is now fully supported. Use `async: true` in subagent calls for background execution. See pi-subagents skill for resume, control events, and status management.

### Requirement: Dispatch Results Must Use A Stable Normalized Shape
**Reason**: The normalized `results[]` return shape with `runId`, `taskId`, `status`, `summary`, `finalOutput` etc. was dispatch-specific. The native `subagent` tool returns results in its own shape.
**Migration**: Consume subagent tool results directly. The return shape is defined by the pi-subagents runtime and follows the standard Pi tool result contract.

### Requirement: Sync Dispatch Must Return Directly Consumable Child Output
**Reason**: Same as above — the normalized child output contract was specific to dispatch. The native subagent tool returns child outputs as part of its result.
**Migration**: Subagent results are directly consumable. Chain steps use `{previous}` template variable to pass outputs between steps. Individual outputs can use `output` parameter and `outputMode`.

### Requirement: Sync Run IDs Must Not Be Misrepresented As Status Handles
**Reason**: The sync run ID constraint was dispatch-specific. The native subagent tool has consistent run ID handling for both sync and async modes.
**Migration**: Use `subagent({ action: "status", id: "..." })` for status inspection of both sync and async runs. The pi-subagents runtime handles run identity consistently.

### Requirement: Dispatch Must Use A Replaceable Backend Substrate
**Reason**: The abstraction layer for hiding the execution substrate behind dispatch was intentional when dispatch was the repository-owned entry point. With dispatch removed, the substrate is directly exposed.
**Migration**: The native `subagent` tool is the execution substrate. No abstraction layer is needed between the LLM and the subagent tool. The `/subagent` prompt provides usage guidance without hiding the substrate.

### Requirement: Dispatch Must Bridge To Real Pi-Subagents Execution
**Reason**: The bridge is no longer needed because there is no dispatch layer to bridge through. The LLM calls `subagent()` directly.
**Migration**: Direct `subagent()` invocation replaces the bridge. No intermediate dispatch layer exists.

### Requirement: Dispatch Must Support Skill-Sensitive Task Planning
**Reason**: The task-level skill encoding was a dispatch extension feature. pi-subagents handles skill injection through agent definitions and the `skills` parameter at the agent/task level.
**Migration**: Use agent-level `skills` field in `.pi/agents/*.md` frontmatter, or per-task `skills` parameter in `subagent()` calls. The pi-subagents skill provides patterns for skill-sensitive delegation.
