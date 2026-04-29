# Design

## Context

This change adds a structured workflow for researching, testing, and managing third-party Pi packages within the pi-config repository. The workflow is triggered by a skill that guides the LLM agent through four phases: security review, install & research, user decision (add-to-global / backlog / discard), and global sync.

The implementation artifacts are:
- A new skill file: `.pi/skills/pkg-research/SKILL.md`
- A new backlog file: `openspec/pkg-backlog.md`
- Updated workflow rules in `AGENTS.md`

All pi package management primitives (`pi install -l`, `pi remove`, `pi list`) already exist in pi-mono. The workflow relies on these commands and adds governance, safety review, and decision tracking.

## Goals / Non-Goals

**Goals:**
- Provide a skill that guides the LLM through the full package research lifecycle
- Enforce security review before any package installation
- Isolate research installs to project scope (`.pi/npm/`, `.pi/git/`)
- Provide a three-option decision framework driven entirely by user input
- Persist backlog decisions in a structured Markdown file
- Integrate global sync through the existing `scripts/sync-pi-agent.sh`

**Non-Goals:**
- Build an extension (this is a skill, not a Pi extension with code)
- Automate package updates (use native `pi update`)
- Create a web-based gallery browser
- Implement AST-level code analysis (use grep/rg pattern matching for security review)

## Decisions

### D1: Skill vs Extension

**Decision:** Implement as a skill (`SKILL.md`), not as a Pi extension.

**Rationale:** The workflow is a process guide for the LLM agent, not a runtime feature that needs event hooks or tools. Skills are document-driven and invoke standard tools (bash, read, write, edit). An extension would add complexity (event registration, TypeBox schemas) without benefit.

### D2: Skill Naming and Trigger

**Decision:** Name the skill `pkg-research`. The description will include trigger conditions ("Use when: user wants to research/test a Pi package, provides a package URL or name to evaluate") so the LLM auto-selects it from natural language.

**Rationale:** User specified "不需要特定参数格式，llm agent 自行解析通过用户 prompt 定位要安装的包". The skill description handles this through natural trigger wording.

### D3: Security Review Approach

**Decision:** Use `grep`/`rg` pattern matching against cloned source, not AST parsing.

**Rationale:** The review targets well-known risk patterns (fetch, exec, eval, etc.) that are easily detectable via regex. AST analysis adds dependency and complexity overhead without proportional benefit. The review is a gate, not an audit — it flags indicators for human decision.

### D4: Temporary Clone Location

**Decision:** Use `mktemp -d` for temporary security review clones, cleaned up unconditionally.

**Rationale:** Isolates review artifacts from the workspace, prevents accidental commits, and enforces ephemeral-review discipline.

### D5: Backlog File Location

**Decision:** Place `pkg-backlog.md` under `openspec/` directory.

**Rationale:** Openspec is the governance root for pi-config. Backlog entries are governance artifacts (decisions with rationale) that complement OpenSpec changes. The file is separate from `AGENTS.md` to avoid polluting workflow rules with data.

### D6: AGENTS.md Integration

**Decision:** Add a new `## Package Management` section to `AGENTS.md` that references the skill and defines the sync/decision rules.

**Rationale:** AGENTS.md is the working rules source of truth. Adding a package management section ensures workflow rules are discoverable even without the skill loaded. The skill provides detailed phase-by-phase guidance; AGENTS.md provides concise rules.

### D7: Sync Scope

**Decision:** Only trigger `scripts/sync-pi-agent.sh` when user confirms global sync after adding a package to `.pi/settings.json`. Do not automatically sync.

**Rationale:** The sync operation affects `~/.pi/agent/` which impacts all repositories. Per `pi-global-runtime-sync-confirmation` spec, sync must be explicitly confirmed.

### D8: Settings.json Rollback for Non-Global Decisions

**Decision:** When user chooses Option B (backlog) or Option C (discard), roll back the `.pi/settings.json` modification made by `pi install -l` during Phase 2.

**Rationale:** `pi install -l` automatically modifies `.pi/settings.json` by appending the package to the `packages` array. This is a side-effect of the research phase, not a committed decision. Only Option A (global config) should retain this change; all other outcomes must revert it to keep `.pi/settings.json` as a faithful reflection of the user's intentional configuration.

### D9: Backlog for All Approved Packages

**Decision:** Write a backlog entry for both Option A (global) and Option B (backlog-only), not just for backlog-only packages. Only Option C (discard) is exempt from mandatory backlog recording.

**Rationale:** `.pi/settings.json` represents the current active configuration and is mutable — packages may be temporarily added/removed as users experiment with different configurations. The backlog serves as a durable, authoritative index of all packages the user has evaluated and approved. Writing backlog entries for Option A ensures approved packages are never lost even if later removed from settings.json.

## Risks / Migration

### R1: npm View vs npm Pack

`npm view` may not always provide sufficient source for security review if a package has no public repository. Mitigation: use `npm pack <source> --dry-run` in these cases, or flag the install as "unreviewable source" and escalate to user.

### R2: grep Pattern False Positives

Regex patterns for suspicious code may flag legitimate use cases (e.g., an extension that legitimately makes API calls). Mitigation: the review is presented to the user with file paths and context, not an automated reject. Human judgment retains final say.

### R3: Skill Not Triggered Automatically

The skill's trigger description must be specific enough to fire when relevant but not so narrow that it misses variably-worded user requests. Mitigation: include broad trigger phrases in the description and test with diverse prompts during verification.

### R4: No Existing Backlog Migration

There is no existing backlog data to migrate. This is a greenfield addition.
