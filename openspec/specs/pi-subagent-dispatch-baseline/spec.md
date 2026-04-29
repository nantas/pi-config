# Capability: pi-subagent-dispatch-baseline

## Purpose

Define the repository-owned `dispatch` subagent baseline for `pi-config`, including the local orchestration extension, natural-language `/dispatch` entrypoint, and the stable bridge to `pi-subagents`.

## Requirements

### Requirement: The Repository Must Expose A Local Dispatch Tool
The system SHALL provide a project-local orchestration extension that exposes a repository-owned `dispatch` tool rather than asking callers to invoke the raw `pi-subagents` interface directly.

#### Scenario: Contributor reviews the subagent entrypoint
- **WHEN** a contributor inspects how multi-agent delegation is initiated in `pi-config`
- **THEN** the contributor can identify a local `dispatch` tool as the formal repository-level entrypoint

### Requirement: The Repository Must Expose A Dispatch Command Wrapper
The system SHALL provide a project-local `/dispatch` command wrapper that reuses the same repository-owned dispatch behavior for interactive invocation.

#### Scenario: Contributor prefers a slash command
- **WHEN** a contributor looks for a manual entrypoint in Pi
- **THEN** the contributor can find `/dispatch` as a convenience wrapper over the same dispatch flow

### Requirement: Dispatch Command Must Accept Natural-Language Requests
The system SHALL make `/dispatch` a natural-language user entrypoint rather than requiring callers to hand-author the structured `tasks[]` payload.

#### Scenario: Contributor invokes dispatch manually
- **WHEN** a contributor runs `/dispatch <task description>`
- **THEN** the current main agent receives that natural-language request and decides whether to decompose it into one or more delegated tasks via the repository-owned `dispatch` tool

### Requirement: Dispatch Must Use A Unified Task Array Contract
The system SHALL define `dispatch` to accept a unified `tasks[]` contract so that one-task and many-task delegation share the same interface.

#### Scenario: Caller dispatches one task
- **WHEN** a caller submits a `dispatch` request with exactly one task
- **THEN** the request uses the same `tasks[]` input shape as a multi-task request

#### Scenario: Caller dispatches multiple tasks
- **WHEN** a caller submits a `dispatch` request with multiple tasks
- **THEN** the request remains on the same `tasks[]` contract rather than switching to a separate parallel-only interface

### Requirement: Dispatch Must Keep The User Entry Surface Minimal In V1
The system SHALL keep the user-facing v1 dispatch entry surface minimal while allowing the repository-owned tool contract to carry the internal planning fields required to bridge to real `pi-subagents` execution.

#### Scenario: Caller evaluates dispatch parameters
- **WHEN** a caller reviews the natural-language `/dispatch` entrypoint
- **THEN** the caller can see that end users are not required to hand-author runtime knobs or structured task payloads

#### Scenario: Main agent submits a planned dispatch request
- **WHEN** the current main agent has already decomposed a natural-language request into delegated tasks
- **THEN** the repository-owned `dispatch` tool may accept internal planning fields such as `context`, `skills`, `reads`, `model`, and `cwd` in addition to `agent`, `task`, and `projectContext`
- **AND** tool limits, extension limits, and default policy remain controlled by the selected agent file rather than by broad user-authored runtime overrides

### Requirement: Dispatch Must Support Task-Level Project Context Selection
The system SHALL support task-level `projectContext` values of `default`, `inherit`, and `strip` so that each delegated task can independently decide whether to receive current project context.

#### Scenario: Multi-task dispatch mixes context policies
- **WHEN** one task needs current project context and another task should avoid it
- **THEN** the caller can express different `projectContext` selections for each task within the same dispatch request

### Requirement: Sync Must Be The Only Formal V1 Completion Mode
The system SHALL formally support `sync` execution in v1 and SHALL reserve `async` only as a future-facing contract value that is not fully specified by this change.

#### Scenario: V1 implementation scope is reviewed
- **WHEN** a contributor checks which completion modes must be implemented in the first subagent baseline
- **THEN** the contributor sees that `sync` is required while `async` remains an explicitly deferred extension point

### Requirement: Dispatch Results Must Use A Stable Normalized Shape
The system SHALL return normalized results that include a top-level `runId`, a `results[]` collection, per-task `taskId`, `agent`, `status`, `summary`, `finalOutput`, `artifactPaths`, `sessionFile`, `savedOutputPath`, `error`, and an `aggregateSummary`.

#### Scenario: Single-task result is returned
- **WHEN** a single delegated task completes
- **THEN** the response still returns the normalized `results[]` structure with a stable `runId` and `taskId`
- **AND** the task result carries the child output text and any real export paths that were produced

#### Scenario: Multi-task result is returned
- **WHEN** multiple delegated tasks complete
- **THEN** the response returns each task result in the normalized shape plus an aggregate summary for the overall dispatch run
- **AND** callers do not need a second query surface just to read the child outputs from a sync run

### Requirement: Sync Dispatch Must Return Directly Consumable Child Output
The system SHALL make `dispatch` sync results directly consumable by both the main agent and the human operator, rather than returning only task completion states.

#### Scenario: Main agent reviews a sync dispatch result
- **WHEN** a sync dispatch run completes successfully
- **THEN** the tool-visible text output includes each child task's actual result text
- **AND** the output includes any real artifact, saved-output, or session paths that were created
- **AND** the main agent does not need to guess temp file locations or run a second tool just to inspect child output

#### Scenario: Child output is not present in finalOutput
- **WHEN** a child result omits `finalOutput` but a saved output or artifact output exists
- **THEN** dispatch falls back to that persisted output for both summary generation and sync result rendering

### Requirement: Sync Run IDs Must Not Be Misrepresented As Status Handles
The system SHALL not imply that a sync-only dispatch `runId` is compatible with async status lookup unless this change explicitly provides such a handle.

#### Scenario: Contributor inspects a sync dispatch response
- **WHEN** the response includes a top-level `runId`
- **THEN** the contributor can understand that the identifier is the dispatch response identifier
- **AND** the response does not imply that `subagent status` can inspect that sync run unless a dedicated status-compatible handle is also returned

### Requirement: Dispatch Must Use A Replaceable Backend Substrate
The system SHALL hide backend-specific execution details behind the repository-owned dispatch layer and SHALL treat `pi-subagents` as the initial substrate rather than as the long-term interface contract.

#### Scenario: Future orchestration backend is considered
- **WHEN** a later change evaluates replacing or augmenting the execution substrate
- **THEN** the dispatch contract remains stable because backend-specific invocation details are not exposed as the repository API

### Requirement: Dispatch Must Bridge To Real Pi-Subagents Execution
The system SHALL bridge the repository-owned `dispatch` tool to real `pi-subagents` execution semantics rather than using a placeholder transport that merely shells into generic Pi JSON mode.

#### Scenario: Contributor inspects the execution path
- **WHEN** a contributor reviews how `dispatch` actually runs delegated tasks
- **THEN** the contributor can identify a real bridge to `pi-subagents` execution rather than a generic spawn adapter

### Requirement: Dispatch Must Support Skill-Sensitive Task Planning
The system SHALL allow the repository-owned dispatch plan to carry skill-sensitive execution intent without requiring end users to write raw `skill` task overrides.

#### Scenario: Main agent plans a vault-search task
- **WHEN** the main agent identifies that a delegated task must use a repository skill such as `obsidian-cli`
- **THEN** the dispatch plan can encode that requirement through repository-owned agent policy and/or normalized internal task fields
- **AND** successful execution does not depend on the end user hand-authoring a raw `skill: "obsidian-cli"` field
