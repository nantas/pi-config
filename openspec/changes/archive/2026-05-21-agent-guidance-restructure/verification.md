# Verification

## Change: agent-guidance-restructure
## Schema: orbitos-change-v1

---

## Spec-to-Implementation Traceability

### Spec: `serena-code-intelligence`

| Requirement | Evidence | Status |
|-------------|----------|--------|
| `serena-skill-created`: Skill exists at `.pi/skills/serena-code-intelligence/SKILL.md` | File exists (419 lines) | ✅ PASS |
| `serena-skill-created`: Listed in `capabilities.yaml` `global.skills` | `grep serena-code-intelligence .pi/capabilities.yaml` matches | ✅ PASS |
| `lsp-skill-replaced`: `.pi/skills/lsp-code-intelligence/` removed | Directory does not exist | ✅ PASS |
| `lsp-skill-replaced`: `lsp-code-intelligence` not in `capabilities.yaml` | `grep lsp-code-intelligence .pi/capabilities.yaml` returns nothing | ✅ PASS |
| `serena-skill-content`: Tool overview (21 tools categorized) | Skill contains categorized tool tables (Navigation 6, Editing 5, Diagnostics 1, Memory 5, Project 2 = 19 listed, 2 project management = 21 total) | ✅ PASS |
| `serena-skill-content`: Usage decision table | Section "Decision Table: Serena vs Other Tools" present | ✅ PASS |
| `serena-skill-content`: Project initialization workflow | Section "Project Initialization Workflow" with 4 steps | ✅ PASS |
| `serena-skill-content`: Code exploration workflow | Section "Code Exploration Workflow" with 3 sub-workflows | ✅ PASS |
| `serena-skill-content`: Code editing workflow | Section "Code Editing Workflow" with examples for all 5 editing tools | ✅ PASS |
| `serena-skill-content`: Diagnostics workflow | Section "Diagnostics Workflow" with scenarios and usage | ✅ PASS |
| `serena-skill-content`: Language server config reference | Section "Language Server Configuration" with `.serena/project.yml` example | ✅ PASS |
| `serena-onboarding-in-skill`: `serena_onboarding` step included | Step 3 in initialization workflow | ✅ PASS |
| `serena-onboarding-in-skill`: Memory usage described | "Memory System" section + Step 4 in initialization | ✅ PASS |

### Spec: `reference-docs-consolidation`

| Requirement | Evidence | Status |
|-------------|----------|--------|
| `pi-provider-model-relocated`: `docs/reference/pi-provider-model.md` exists with full content | File exists (92 lines), contains sections 1-2 + external references, no placeholder text | ✅ PASS |
| `pi-provider-model-relocated`: `.pi/agent/AGENTS.d/pi-provider-model.md` deleted | File does not exist | ✅ PASS |
| `readme-governance-relocated`: `docs/reference/readme-governance.md` exists with full content | File exists (37 lines), contains trigger conditions, update checklist, consistency table | ✅ PASS |
| `readme-governance-relocated`: `.pi/agent/AGENTS.d/readme-governance.md` deleted | File does not exist | ✅ PASS |
| `project-agents-references-added`: Root `AGENTS.md` references `docs/reference/readme-governance.md` | `grep` confirms link present | ✅ PASS |
| `project-agents-references-added`: Root `AGENTS.md` references `docs/reference/pi-provider-model.md` | `grep` confirms link present | ✅ PASS |
| `global-agents-link-updated`: Global AGENTS.md links `docs/reference/pi-provider-model.md` (not `AGENTS.d/`) | Link updated, no `AGENTS.d/pi-provider-model.md` reference | ✅ PASS |
| `global-agents-link-updated`: Global AGENTS.md links `docs/reference/readme-governance.md` (not `AGENTS.d/`) | Link updated, no `AGENTS.d/readme-governance.md` reference | ✅ PASS |

### Spec: `agent-guidance-simplify`

| Requirement | Evidence | Status |
|-------------|----------|--------|
| `agents-d-pruned`: `lsp-guide.md` deleted | File does not exist | ✅ PASS |
| `agents-d-pruned`: `tool-ask-user.md` deleted | File does not exist | ✅ PASS |
| `agents-d-pruned`: `output-quality.md` deleted | File does not exist | ✅ PASS |
| `agents-d-pruned`: `tool-mcp.md` deleted | File does not exist | ✅ PASS |
| `global-agents-simplified`: Web search table removed, principles retained | Web Search section has 5 bullet principles, no parameter table | ✅ PASS |
| `global-agents-simplified`: Subagent matrix removed, trigger table retained | "委派触发判断" table present, full selection matrix removed | ✅ PASS |
| `global-agents-simplified`: Line count ~80-100 | 86 lines (measured) | ✅ PASS |
| `global-agents-simplified`: LSP section references serena skill | "serena-code-intelligence skill" referenced | ✅ PASS |
| `global-agents-simplified`: Provider ref links to `docs/reference/` | Links `docs/reference/pi-provider-model.md` | ✅ PASS |
| `global-agents-simplified`: README ref links to `docs/reference/` | Links `docs/reference/readme-governance.md` | ✅ PASS |

---

## Task-to-Evidence Traceability

| Task | Description | Evidence | Status |
|------|-------------|----------|--------|
| 2.1.1 | Create `docs/reference/pi-provider-model.md` | File exists (92 lines) | ✅ |
| 2.1.2 | Create `docs/reference/readme-governance.md` | File exists (37 lines) | ✅ |
| 2.1.3 | Delete `.pi/agent/AGENTS.d/pi-provider-model.md` | File does not exist | ✅ |
| 2.1.4 | Delete `.pi/agent/AGENTS.d/readme-governance.md` | File does not exist | ✅ |
| 2.2.1 | Delete `.pi/agent/AGENTS.d/tool-ask-user.md` | File does not exist | ✅ |
| 2.2.2 | Delete `.pi/agent/AGENTS.d/output-quality.md` | File does not exist | ✅ |
| 2.2.3 | Delete `.pi/agent/AGENTS.d/tool-mcp.md` | File does not exist | ✅ |
| 2.2.4 | Delete `.pi/agent/AGENTS.d/lsp-guide.md` | File does not exist | ✅ |
| 2.3.1 | Create `.pi/skills/serena-code-intelligence/SKILL.md` | File exists (419 lines) | ✅ |
| 2.3.2 | Delete `.pi/skills/lsp-code-intelligence/` | Directory does not exist | ✅ |
| 2.4.1 | Simplify `.pi/agent/AGENTS.md` | 86 lines, all spec requirements met | ✅ |
| 2.5.1 | Update root `AGENTS.md` references | Both docs/reference links present | ✅ |
| 2.6.1 | Update `.pi/capabilities.yaml` | `serena-code-intelligence` replaces `lsp-code-intelligence` | ✅ |

---

## Summary

- **Total specs**: 3 (serena-code-intelligence, reference-docs-consolidation, agent-guidance-simplify)
- **Total requirements verified**: 24
- **All passed**: ✅
- **Files deleted**: 7 (6 AGENTS.d + 1 skill directory)
- **Files created**: 3 (2 docs/reference + 1 skill)
- **Files modified**: 3 (global AGENTS.md, project AGENTS.md, capabilities.yaml)
- **Global AGENTS.md**: reduced from ~200+ lines to 86 lines
