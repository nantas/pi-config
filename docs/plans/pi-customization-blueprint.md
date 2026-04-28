# Pi Customization Blueprint

## Document Role

- Change: `define-pi-customization-blueprint`
- Purpose: provide the stable planning baseline for Pi-related changes in this repository
- Execution SSOT: current repository artifacts under `openspec/changes/define-pi-customization-blueprint/`
- Reference input: `docs/plans/pi-customization-reference.md`
- Governance input/output: `repo://orbitos/20_项目/Pi_Config/Pi_Config.md`, `repo://orbitos/20_项目/Pi_Config/项目进度总览.md`

## 1. Repository Role And Layering

`pi-config` has two roles at the same time:

1. Personal Pi configuration hub: maintain the source workspace for user-specific Pi settings, extensions, agents, themes, and install/sync automation.
2. Reusable extension incubation workspace: host planning, experiments, and later implementation changes for reusable Pi extensions without mixing runtime state into the repository.

### Layer Boundaries

| Layer | Primary path | Role | What belongs here | What does not belong here |
| --- | --- | --- | --- | --- |
| Global runtime | `~/.pi/agent/` | Deployment target | installed extensions, runtime settings, active themes, user-level runtime state | planning artifacts, research notes, change tracking |
| Project-local Pi resources | `.pi/` | Repository source for Pi-specific assets | project extensions, project settings, themes, Pi agent definitions, sync/install inputs | cross-agent shared assets that are not Pi-specific |
| Cross-agent shared resources | `.agents/skills/`, `.mcp.json` | Shared workspace capability layer | reusable skills, MCP server declarations, shared workflow helpers | Pi runtime-only state |
| OpenSpec artifacts | `openspec/` | Planning and execution contract | proposal, specs, design, tasks, verification, writeback | runtime deployment payloads |
| Research inputs | `docs/plans/pi-customization-reference.md` | Structured input corpus | external repository observations, package notes, decision support | final blueprint decisions without spec traceability |

### Source-Of-Truth Rule

- `openspec/changes/.../specs/*/spec.md` defines behavior requirements.
- This blueprint is the stable planning entrypoint for later Pi work.
- Project pages in `repo://orbitos` only carry summary, status, and links.

## 2. Core Capability Map

The repository blueprint organizes future work into five capability domains:

| Capability domain | Why it exists | Primary source surfaces | Expected later change topics |
| --- | --- | --- | --- |
| `subagent` | close the multi-agent orchestration gap vs. current working style | `.pi/extensions/`, `.pi/agents/`, `.agents/skills/` | orchestration model, task routing, session sharing, review loops |
| `MCP` | bridge Pi into external tools and data systems | `.mcp.json`, `.pi/mcp.json`, extension adapters | server registry, lazy connection policy, shared vs Pi-local config split |
| Automation scripts | keep install, bootstrap, and config sync repeatable | repo scripts, setup helpers, deployment docs | first-run bootstrap, runtime sync, machine-to-machine portability |
| Reference curation | turn ecosystem samples into governed planning input | `docs/plans/`, future curation indexes | sample intake, classification, promotion decisions, refresh cadence |
| Extension lifecycle guidance | standardize extension intake and authoring without bypassing OpenSpec | `.pi/extensions/`, `openspec/`, deployment notes | intake checklist, authoring conventions, packaging, rollout expectations |

## 3. Phased Evolution Roadmap

| Phase | Intent | Scope | Exit criteria |
| --- | --- | --- | --- |
| Phase 0: Blueprint baseline | stop relying on scattered research notes | planning blueprint, capability map, curation model, lifecycle guidance | blueprint approved, verification/writeback complete |
| Phase 1: Config hub baseline | define minimal personal Pi workspace structure | `~/.pi/agent/` target model, `.pi/` source layout, shared resource boundaries, bootstrap expectations | repository-to-runtime boundary is explicit and repeatable |
| Phase 2: Minimal usable Pi parity | cover the highest-frequency workflow gaps first | `MCP`, `subagent`, install/config sync, high-value command/session helpers | day-to-day work can move onto Pi without requiring full ecosystem parity |
| Phase 3: Reusable extension outputs | convert validated patterns into reusable extension assets | custom extensions, extracted shared helpers, reusable docs and packaging | at least one capability becomes a reusable extension or stable shared module |

### Transition Principles

- Do not start Phase 2 implementation before Phase 1 clarifies source vs deployment boundaries.
- Do not promote an external sample directly into implementation without a curation decision.
- Do not treat blueprint guidance as a substitute for per-change OpenSpec execution artifacts.

## 4. Extension Lifecycle Guidance

### 4.1 Intake Path For Existing Open-Source Extensions

When adding an existing extension, follow this path:

1. Evaluate fit: confirm the extension solves a Pi-specific gap in the capability map.
2. Check compatibility: validate provider assumptions, runtime hooks, dependencies, and project/global scope.
3. Plan integration: decide whether the source-of-truth lives in `.pi/extensions/`, package metadata, or shared config.
4. Define deployment: specify how the repository-managed source reaches `~/.pi/agent/` and what config touchpoints change.
5. Track execution in OpenSpec: any real adoption work still needs proposal, specs, tasks, verification, and writeback.

### 4.2 Authoring Path For New Custom Extensions

When creating a custom extension, follow this path:

1. Collect knowledge inputs: blueprint decision, curated references, and Pi runtime constraints.
2. Define development expectations: extension boundary, event/tool surface, shared vs Pi-local dependencies, and test/verification approach.
3. Set integration points: target command/tool hooks, config entries, deployment scripts, and documentation updates.
4. Define deployment expectations: repository source location, runtime target under `~/.pi/agent/`, and rollback/update strategy.
5. Execute through OpenSpec: implementation work remains controlled by change artifacts, not by this lifecycle summary alone.

### 4.3 Deployment Surfaces

| Output type | Repository source location | Runtime deployment target | Config touchpoints |
| --- | --- | --- | --- |
| Shared skill/MCP helper | `.agents/skills/`, `.mcp.json` | shared workspace consumption or copied runtime config if needed | `.mcp.json`, shared docs |
| Pi-specific extension | `.pi/extensions/` | `~/.pi/agent/extensions/` | `.pi/settings.json`, runtime settings |
| Pi-specific agent/theme/settings | `.pi/agents/`, `.pi/themes/`, `.pi/settings.json` | `~/.pi/agent/agents/`, `~/.pi/agent/themes/`, runtime settings | Pi settings and bootstrap scripts |
| Automation/bootstrap script | repo script path to be defined by later changes | executed against `~/.pi/agent/` and local repo | script docs, setup entrypoints |

## 5. Reference Curation Model

### 5.1 Stratified Categories

| Category | Purpose | Promotion question |
| --- | --- | --- |
| Pi config repositories | observe full-repo structure, setup flow, and long-lived config organization | should this repository pattern be reused as a layout baseline? |
| Pi extension repositories | observe concrete capability implementations and extension boundaries | should this capability be adopted, adapted, or only studied? |
| Adjacent pattern samples | borrow execution and workflow patterns from nearby ecosystems | is the pattern useful even if it is not Pi-native? |

### 5.2 Promotion Decisions

- `direct reuse`: adopt the sample mostly as-is as a baseline pattern.
- `partial borrowing`: borrow ideas or structure, but keep local design ownership.
- `observe-only`: keep as context; do not treat it as a current blueprint input.

### 5.3 Current Curated Inputs

| Reference | Category | Promotion | Blueprint decision supported |
| --- | --- | --- | --- |
| `HazAT/pi-config` | Pi config repository | `direct reuse` | dual-role config repository and setup-oriented workspace baseline |
| `nicobailon/pi-subagents` | Pi extension repository | `partial borrowing` | `subagent` orchestration and session-sharing direction |
| `pi-mcp-adapter` | Pi extension repository | `direct reuse` | MCP integration should prefer adapter-based bridging over custom MCP reinvention |
| `nicobailon/pi-messenger` | Pi extension repository | `partial borrowing` | task/dependency orchestration patterns for future agent workflow design |
| `samfoy/pi-session-search` | Pi extension repository | `partial borrowing` | session search and history access as a separate capability slice |
| `HazAT/pi-smart-sessions` | Pi extension repository | `observe-only` | naming/UX ideas are useful, but not strong enough to anchor the blueprint |
| `HenryLach/taskplane` | Adjacent pattern sample | `partial borrowing` | checkpoint discipline, persistent task files, and parallel wave execution patterns |

### 5.4 Curation Rules

- Every new reference must be categorized before it can influence the blueprint.
- Every blueprint recommendation that cites a reference must name the promotion decision.
- References support layering, lifecycle guidance, or implementation priority; they do not remain as a free-form inspiration list.

## 6. Spec-To-Document Checklist

| Spec requirement | Satisfied in this document |
| --- | --- |
| Repository role and layering | `1. Repository Role And Layering` |
| Five core capability domains | `2. Core Capability Map` |
| Phased evolution path | `3. Phased Evolution Roadmap` |
| Separate intake vs authoring paths | `4.1` and `4.2` |
| Preserve OpenSpec execution artifacts | `Document Role`, `3. Transition Principles`, `4.1`, `4.2` |
| Define deployment surfaces | `4.3 Deployment Surfaces` |
| Stratified reference categories | `5.1 Stratified Categories` |
| Promotion decisions | `5.2 Promotion Decisions` and `5.3 Current Curated Inputs` |
| References feed blueprint decisions | `5.3 Current Curated Inputs` and `5.4 Curation Rules` |

## 7. Deferred Follow-Up Topics

- Decide the concrete repository layout for scripts and bootstrap entrypoints in a later implementation change.
- Split `subagent`, `MCP`, automation, and session/task topics into separate implementation changes after Phase 1.
- Resolve governance metadata alignment for `spec_host_repo` on the OrbitOS project page before claiming a fully clean governance loop.
