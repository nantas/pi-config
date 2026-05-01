# pkg-install-research

## Purpose

After security review passes, install the package in isolated project scope (`pi install -l`), then analyze its structure, dependencies, functionality, and conflicts.

## Requirements

### Requirement: Phase 2 Entry Point — Source Type Detection
The system SHALL detect the source type at the beginning of Phase 2 and branch between the package install workflow and the raw extension research workflow.

#### Scenario: package source detected
- **WHEN** the cloned source has a `package.json` at its root
- **THEN** the system proceeds with the original package install workflow: `pi install -l`, structure analysis, dependency analysis, smoke test, conflict check, research summary

#### Scenario: raw extension source detected
- **WHEN** the cloned source has an `extensions/` directory with `.ts` files and no `package.json` at root
- **THEN** the system switches to the raw extension workflow (Phase 2 Raw Extension Branch)

#### Scenario: neither package nor raw extension
- **WHEN** the source has neither `package.json` nor `extensions/` with `.ts` files
- **THEN** the system reports unrecognized source type and asks the user how to proceed

### Requirement: Project-Level Isolated Install
The system SHALL install the package into the project scope using `pi install -l <source>`, isolating it from the global Pi runtime. The system SHALL note that `pi install -l` automatically modifies `.pi/settings.json` by appending the package to the `packages` array; the Decision phase (Phase 3) handles retention or rollback of this modification.

#### Scenario: npm package project install
- **WHEN** the source is an npm package (e.g., `npm:@scope/pkg@version`)
- **THEN** the system SHALL execute `pi install -l <source>` which installs under `.pi/npm/`

#### Scenario: git package project install
- **WHEN** the source is a git package (e.g., `git:github.com/user/repo`)
- **THEN** the system SHALL execute `pi install -l <source>` which clones under `.pi/git/`

#### Scenario: install failure handling
- **WHEN** `pi install -l` fails with an error
- **THEN** the system SHALL report the error to the user and request decision: retry, skip to backlog, or abort

### Requirement: Package Structure Analysis
The system SHALL analyze the installed package to identify its resource types, structure, and configuration.

#### Scenario: resource type identification
- **WHEN** the package is successfully installed
- **THEN** the system SHALL identify which resource types the package provides: extensions, skills, prompts, and/or themes

#### Scenario: manifest-based structure
- **WHEN** the package has a `pi` manifest in `package.json`
- **THEN** the system SHALL parse and report the declared resource paths

#### Scenario: convention-based structure
- **WHEN** the package lacks a `pi` manifest but has convention directories
- **THEN** the system SHALL auto-discover and report resources from `extensions/`, `skills/`, `prompts/`, `themes/` directories

### Requirement: Dependency Analysis
The system SHALL analyze the package's dependency declarations.

#### Scenario: runtime dependency listing
- **WHEN** `package.json` contains `dependencies`
- **THEN** the system SHALL list all runtime dependencies with their declared version ranges

#### Scenario: peer dependency check
- **WHEN** `package.json` contains `peerDependencies`
- **THEN** the system SHALL list all peer dependencies and verify they are satisfied by pi's bundled core packages

#### Scenario: bundled dependency detection
- **WHEN** `package.json` contains `bundledDependencies`
- **THEN** the system SHALL flag bundled dependencies for special attention (bundled packages may contain duplicate or nested pi resources)

### Requirement: Functional Smoke Test
The system SHALL perform a lightweight functional test to verify the package loads without errors.

#### Scenario: extension load test
- **WHEN** the package provides extensions
- **THEN** the system SHALL reference the pi-agent startup logs or equivalent mechanism to verify extensions register without errors

#### Scenario: skill registration test
- **WHEN** the package provides skills
- **THEN** the system SHALL verify skill files are structurally valid (contain proper YAML frontmatter or markdown structure)

#### Scenario: load error reporting
- **WHEN** any resource fails to load
- **THEN** the system SHALL report the specific error messages and affected files

### Requirement: Settings Modification Awareness
The system SHALL acknowledge that `pi install -l` modifies `.pi/settings.json` `packages` array, and SHALL defer retention/rollback decisions to the Decision phase.

#### Scenario: settings.json modification noted
- **WHEN** `pi install -l` completes successfully
- **THEN** the system SHALL note that `.pi/settings.json` has been updated with the package entry
- **AND** the system SHALL NOT treat this as a permanent decision; rollback is handled in Phase 3

### Requirement: Conflict Check
The system SHALL check the new package for conflicts with already-installed packages in `.pi/settings.json`.

#### Scenario: skill name collision
- **WHEN** the new package provides skills with names that overlap with existing skills
- **THEN** the system SHALL report the conflicting skill names and their sources

#### Scenario: extension path collision
- **WHEN** the new package provides extension files with paths that overlap with existing extensions
- **THEN** the system SHALL report the conflicting paths and their sources

#### Scenario: no conflicts found
- **WHEN** no resource name or path overlaps are detected
- **THEN** the system SHALL report that no conflicts were found

### Requirement: Research Summary Output
The system SHALL produce a structured research summary with all findings.

#### Scenario: complete research summary (package source)
- **WHEN** all research phases are complete for a package source
- **THEN** the system SHALL present a summary containing: package identity (source/version), resource inventory, dependency list, functional test results, conflict analysis, and overall assessment

#### Scenario: complete research summary (raw extension)
- **WHEN** all research phases are complete for a raw extension source
- **THEN** the system SHALL present a summary containing: source repo, extension list with names and file paths, dependency status (has npm deps or not), test command(s), and user test feedback

### Requirement: Raw Extension — List Discovered Extensions
The system SHALL list all discovered extension files from the `extensions/` directory in the cloned source, including file name, path, and a brief description from the reference documentation if available.

#### Scenario: extensions listed after clone
- **WHEN** raw extension source is detected
- **THEN** the system presents a structured list of extensions with name, path, and inferred purpose

### Requirement: Raw Extension — Check For Npm Dependencies
The system SHALL check each extension directory for a `package.json` file (at `extensions/<name>/package.json`) to determine if the extension has npm dependencies. If present, run `npm install` in that extension directory before providing test commands.

#### Scenario: extension has package.json
- **WHEN** `extensions/<name>/package.json` exists
- **THEN** the system executes `cd /tmp/<clone>/extensions/<name> && npm install` and reports dependencies installed

#### Scenario: extension has no package.json
- **WHEN** `extensions/<name>/package.json` does not exist
- **THEN** the system reports "no external dependencies" and proceeds

### Requirement: Raw Extension — Output Ephemeral Test Commands
The system SHALL output runnable `pi -e` commands using the temporary clone path for each extension, allowing the user to test functionality before any installation decision.

#### Scenario: test commands for single-file extensions
- **WHEN** the extension is a single `.ts` file
- **THEN** the test command is `pi -e /tmp/<clone>/extensions/<name>.ts`

#### Scenario: test commands for subdirectory extensions
- **WHEN** the extension has a subdirectory with `package.json`
- **THEN** the test command is `pi -e /tmp/<clone>/extensions/<name>/index.ts`

### Requirement: Raw Extension — Wait For User Test Feedback
The system SHALL explicitly ask the user to test each extension using the provided commands and confirm the functionality is satisfactory before proceeding to Phase 3.

#### Scenario: user confirms extension works
- **WHEN** the user reports testing was successful
- **THEN** the system proceeds to Phase 3 with the research results

#### Scenario: user reports extension failure
- **WHEN** the user reports the extension failed to load or function correctly
- **THEN** the system records the failure details and asks the user: retry with fixes, skip this extension, or abort the entire research

### Requirement: Raw Extension — No .pi/ Modification During Phase 2
The system SHALL NOT copy, install, or modify any files under `.pi/` during Phase 2 when handling raw extensions. All testing is done via ephemeral `pi -e` from the temporary clone.

#### Scenario: no files written to .pi/
- **WHEN** executing raw extension Phase 2 workflow
- **THEN** no files are written to `.pi/extensions/`, `.pi/settings.json`, or any other `.pi/` path
- **AND** all testing uses the temporary clone path
