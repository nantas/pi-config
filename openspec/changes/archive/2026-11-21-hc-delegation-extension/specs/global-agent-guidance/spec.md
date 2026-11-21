# Spec: global-agent-guidance (Delta)

## REMOVED Requirements

### Requirement: Static hc and subagent delegation manuals in AGENTS.md and AGENTS.d
**Reason**: Superseded by role-aware runtime injection and tool guards in `.pi/extensions/hc-delegation.ts`.
**Migration**: Remove `## 角色分工与委派` and the `hc-delegation.md` / `subagent-usage.md` links from `.pi/agent/AGENTS.md`, and delete `.pi/agent/AGENTS.d/hc-delegation.md` and `.pi/agent/AGENTS.d/subagent-usage.md`. Keep `.pi/agent/AGENTS.d/media-and-diagrams.md`.

## ADDED Requirements

### Requirement: Global capability manifest registers hc-delegation
`.pi/capabilities.yaml` MUST include `hc-delegation` in `global.extensions` so global sync deploys `.pi/extensions/hc-delegation.ts` alongside the slimmed `.pi/agent/AGENTS.md` and `.pi/herdr-templates/*.md`.
