# pkg-raw-extension-research

## Purpose

Support research of raw Pi extensions sourced from external git repositories that are provided as TypeScript files (not npm/git packages). The workflow detects the extension source type, branches into a test-first workflow using `pi -e` ephemeral loading, checks for npm dependencies, and produces a structured research summary for decision-making.

## Requirements

### Requirement: Phase 2 Must Detect Source Type And Branch Accordingly
The system SHALL detect whether the source is a package type (has `package.json` at root) or a raw extension collection (has `extensions/*.ts` files but no `package.json` at root) before deciding the Phase 2 install/task workflow.

#### Scenario: package source detected
- **WHEN** the cloned source has a `package.json` at its root
- **THEN** the system proceeds with the original `pi install -l` workflow for Phase 2

#### Scenario: raw extension source detected
- **WHEN** the cloned source has an `extensions/` directory with `.ts` files and no `package.json` at root
- **THEN** the system switches to the raw extension branch for Phase 2

#### Scenario: neither package nor raw extension
- **WHEN** the source has neither `package.json` nor `extensions/` with `.ts` files
- **THEN** the system reports unrecognized source type and asks the user how to proceed

### Requirement: Phase 2 Raw Extension Branch Must List Discovered Extensions
The system SHALL list all discovered extension files from the `extensions/` directory in the cloned source, including file name, path, and a brief description from the reference documentation if available.

#### Scenario: extensions listed after clone
- **WHEN** raw extension source is detected
- **THEN** the system presents a structured list of extensions with name, path, and inferred purpose

### Requirement: Phase 2 Raw Extension Branch Must Check For Npm Dependencies
The system SHALL check each extension directory for a `package.json` file (at `extensions/<name>/package.json`) to determine if the extension has npm dependencies. If present, run `npm install` in that extension directory before providing test commands.

#### Scenario: extension has package.json
- **WHEN** `extensions/<name>/package.json` exists
- **THEN** the system executes `cd /tmp/<clone>/extensions/<name> && npm install` and reports dependencies installed

#### Scenario: extension has no package.json
- **WHEN** `extensions/<name>/package.json` does not exist
- **THEN** the system reports "no external dependencies" and proceeds

### Requirement: Phase 2 Raw Extension Branch Must Output Ephemeral Test Commands
The system SHALL output runnable `pi -e` commands using the temporary clone path for each extension, allowing the user to test functionality before any installation decision.

#### Scenario: test commands provided for single-file extensions
- **WHEN** the extension is a single `.ts` file
- **THEN** the test command is `pi -e /tmp/<clone>/extensions/<name>.ts`

#### Scenario: test commands provided for subdirectory extensions
- **WHEN** the extension has a subdirectory with `package.json`
- **THEN** the test command is `pi -e /tmp/<clone>/extensions/<name>/index.ts`

### Requirement: Phase 2 Raw Extension Branch Must Wait For User Test Feedback
The system SHALL explicitly ask the user to test each extension using the provided commands and confirm the functionality is satisfactory before proceeding to Phase 3.

#### Scenario: user confirms extension works
- **WHEN** the user reports testing was successful
- **THEN** the system proceeds to Phase 3 with the research results

#### Scenario: user reports extension failure
- **WHEN** the user reports the extension failed to load or function correctly
- **THEN** the system records the failure details and asks the user: retry with fixes, skip this extension, or abort the entire research

### Requirement: Phase 2 Must Not Modify .pi/ Directory For Raw Extensions
The system SHALL NOT copy, install, or modify any files under `.pi/` during Phase 2 when handling raw extensions. All testing is done via ephemeral `pi -e` from the temporary clone.

#### Scenario: no files written to .pi/
- **WHEN** executing raw extension Phase 2 workflow
- **THEN** no files are written to `.pi/extensions/`, `.pi/settings.json`, or any other `.pi/` path
- **AND** all testing uses the temporary clone path
