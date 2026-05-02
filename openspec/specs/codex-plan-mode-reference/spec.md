# codex-plan-mode-reference

## Purpose

Provide a technical reference document (`docs/reference/plan-mode-comparison.md`) that compares Codex plan mode implementation with pi's plan mode approach, documenting evidence-anchored analysis for migration decisions in pi-config.

## Requirements

### Requirement: Codex Plan Mode Analysis
The document SHALL record the complete implementation analysis of Codex plan mode, covering:

1. How write prevention works (tool whitelist vs. system prompt approach)
2. The `<proposed_plan>` block streaming parser
3. The three-phase workflow instructions
4. The `request_user_input` mode restriction
5. The `update_plan` tool's explicit block (the only programmatic guard)
6. Plan mode reasoning effort separation
7. Agent message deferral/suppression logic

#### Scenario: Evidence anchoring
- **WHEN** a claim about Codex implementation is made
- **THEN** it SHALL be anchored to a specific file path and line range (e.g., `codex-rs/core/src/tools/handlers/plan.rs:137-139`), using evidence from a real-time `cross-repo-research` session

### Requirement: Pi Plan Mode Comparison
The document SHALL compare pi's official `plan-mode` extension (at `examples/extensions/plan-mode/`) with the Codex approach across these dimensions:

1. Write prevention mechanism (whitelist vs. prompt)
2. System prompt injection strategy (custom message vs. `systemPrompt` override)
3. Bash command restriction (regex allowlist vs. none)
4. Workflow structure
5. Tool extensibility implications
6. Failure modes and trust model

#### Scenario: Comparison table or structured list
- **WHEN** presenting the comparison
- **THEN** use a structured format (list or table) with clear headings for each dimension

### Requirement: Migration Implications for pi-config
The document SHALL explain why pi-config's `planner-toggle.ts` benefits from adopting the Codex approach, including:

1. Maintenance burden of bash allowlist regex
2. Tool whitelist fragility with new extension tools
3. Trust tradeoffs (prompt compliance vs. programmatic enforcement)

#### Scenario: Practical recommendation context
- **WHEN** discussing migration implications
- **THEN** reference the actual `planner-toggle.ts` code structure and planned prompt-based redesign
