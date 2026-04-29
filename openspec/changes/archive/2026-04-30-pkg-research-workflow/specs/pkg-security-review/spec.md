# Specification Delta

## Capability 对齐（已确认）

- Capability: `pkg-security-review`
- 来源: `proposal.md` / 用户确认
- 变更类型: new
- 用户确认摘要: 用户明确安全审查在安装前（Phase 1）执行，检查可疑代码（网络请求、命令执行、文件越界写入、动态代码执行、混淆代码），审查不通过则中止流程

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

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

### Requirement: Temporary Artifact Cleanup
The system SHALL clean up temporary clone directories after review, regardless of outcome.

#### Scenario: cleanup after review completion
- **WHEN** security review is complete (whether user proceeds or aborts)
- **THEN** the system SHALL remove the temporary clone directory
