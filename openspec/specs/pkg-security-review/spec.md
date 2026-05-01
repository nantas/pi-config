# pkg-security-review

## Purpose

Perform security review of third-party Pi packages before installation by cloning source to a temporary directory, scanning for suspicious code patterns, and requiring explicit user approval before proceeding.

## Requirements

### Requirement: Pre-Install Security Clone
The system SHALL clone or fetch package source code to a temporary directory for security review before executing any `pi install` command.

#### Scenario: npm package security clone
- **WHEN** user provides an npm package source (e.g., `npm:@scope/pkg`)
- **THEN** the system SHALL use `npm pack <source> --dry-run` or equivalent to locate the package, then clone/fetch the source into a temporary directory without installing

#### Scenario: git package security clone
- **WHEN** user provides a git package source (e.g., `git:github.com/user/repo`)
- **THEN** the system SHALL shallow-clone the repository into a temporary directory without executing any install scripts or pi package loading

#### Scenario: non-cloneable source handling
- **WHEN** the package source cannot be cloned or fetched for review
- **THEN** the system SHALL report the failure reason and request user confirmation before proceeding to blind install

### Requirement: Suspicious Code Detection
The system SHALL scan the cloned source for security risk indicators and present findings to the user.

#### Scenario: network request detection
- **WHEN** source files contain `fetch`, `axios`, `request`, `node:https`, or similar HTTP client usage targeting non-standard domains
- **THEN** the system SHALL flag these as potential network exfiltration risks with file paths and line references

#### Scenario: command execution detection
- **WHEN** source files contain `exec`, `execSync`, `spawn`, `execFile`, or `child_process` usage
- **THEN** the system SHALL flag these as potential command execution risks with file paths and line references

#### Scenario: dynamic code detection
- **WHEN** source files contain `eval`, `new Function`, `vm.runInNewContext`, `vm.Script`, or similar dynamic code execution
- **THEN** the system SHALL flag these as dynamic code execution risks with file paths and line references

#### Scenario: obfuscated code detection
- **WHEN** source files contain large base64-encoded blocks, excessively minified code, or hex-encoded strings without clear functional purpose
- **THEN** the system SHALL flag these as obfuscation indicators

#### Scenario: dependency chain review
- **WHEN** the package has `dependencies` in `package.json`
- **THEN** the system SHALL list all direct dependencies and flag any with unusual names, known malicious packages, or excessive dependency depth

### Requirement: Security Review Summary
The system SHALL produce a structured security review summary and require explicit user approval before proceeding to installation.

#### Scenario: clean security review
- **WHEN** no suspicious indicators are found
- **THEN** the system SHALL report a clean review result and prompt user to confirm continuation to installation

#### Scenario: flagged security review
- **WHEN** suspicious indicators are found
- **THEN** the system SHALL present a categorized summary of all findings (risk type, file path, line reference) and require explicit user confirmation to either continue or abort

#### Scenario: user aborts after review
- **WHEN** user decides to abort after seeing security review findings
- **THEN** the system SHALL clean up the temporary clone directory and record the package in backlog with reason "security review rejected"

### Requirement: Security Review Clone Retention Through Phase 3
The system SHALL retain the temporary clone directory created in Phase 1 through the completion of Phase 3, instead of cleaning it up immediately after the security review. This enables the clone to be reused for Phase 2 raw extension testing and Phase 3 decision execution.

#### Scenario: clone retained after Phase 1
- **WHEN** Phase 1 security review completes and user approves proceeding
- **THEN** the temporary clone directory is NOT cleaned up
- **AND** the clone path is recorded for Phase 2 reuse

### Requirement: Security Review Clone Retention Notification
The system SHALL inform the user during the security review summary that the clone will be retained for Phase 2 testing.

#### Scenario: user told about clone retention
- **WHEN** Phase 1 security review summary is presented
- **THEN** the summary includes a note: "克隆保留用于 Phase 2 测试，在 Phase 3 决策完成后清理"

#### Scenario: clone available for Phase 2
- **WHEN** Phase 2 raw extension branch begins
- **THEN** the system reuses the existing clone at `/tmp/<rand>/` for `pi -e` testing and npm dependency resolution

#### Scenario: clone cleaned up after Phase 3
- **WHEN** Phase 3 decision is executed (any of A/B/C)
- **THEN** the temporary clone directory is unconditionally removed
