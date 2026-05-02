# capability-manifest-governance Specification

## Purpose
TBD - created by archiving change prompts-manifest-governance. Update Purpose after archive.
## Requirements
### Requirement: manifest-covers-prompt-resources
The Capability Manifest Governance section in `AGENTS.md` SHALL include "Prompts" — `.md` files under `.pi/prompts/` — as a resource type that MUST be accompanied by a corresponding update to `.pi/capabilities.yaml`.

#### Scenario: add-prompt-requires-manifest-update
- **WHEN** a user adds, removes, or renames a prompt template in `.pi/prompts/`
- **THEN** the `global.prompts` section in `capabilities.yaml` MUST be updated accordingly

#### Scenario: manifest-governance-table-includes-prompts
- **WHEN** a user reads the Capability Manifest Governance section in `AGENTS.md`
- **THEN** the Workflow Guidance table SHALL include a row for "Add/remove a prompt", mapping to `Append to / Remove from global.prompts`

### Requirement: manifest-governance-precedence-rule
The Capability Manifest Governance section in `AGENTS.md` SHALL include a Precedence Rule subsection declaring that global (`~/.pi/agent/`) takes precedence over project (`.pi/`) for prompts and skills, and project modifications are silently ignored when a global copy exists.

#### Scenario: precedence-rule-documented
- **WHEN** a user reads the governance section
- **THEN** the Precedence Rule subsection SHALL state:
  - For **Prompts**: global version is loaded; project version is silently shadowed
  - For **Skills**: global version is loaded; pi-core emits collision diagnostics
  - Users SHOULD edit source files in the pi-config repository and run `scripts/sync-pi-agent.sh` to propagate changes

