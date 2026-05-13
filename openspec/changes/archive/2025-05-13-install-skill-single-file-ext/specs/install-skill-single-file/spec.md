# Specification Delta

## Capability 对齐（已确认）

- Capability: `install-skill-single-file`
- 来源: `proposal.md` Modified Capabilities
- 变更类型: modified
- 用户确认摘要: 用户选择方案 A（安装时自动检测），不修改 catalog schema

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## MODIFIED Requirements

### Requirement: extension-source-type-detection
The skill SHALL detect at install time whether an extension source is a single file (`.ts`) or a directory, by checking the existence of `{{source_repo_path}}/.pi/extensions/{{name}}.ts` (file) vs `{{source_repo_path}}/.pi/extensions/{{name}}/` (directory).

#### Scenario: single-file-extension-install
- **WHEN** the catalog entry's `source` matches a `.ts` file at `{{source_repo_path}}/.pi/extensions/{{name}}.ts`
- **THEN** the skill copies that single file to `{{target_repo}}/.pi/extensions/{{name}}.ts` using `cp` (not `cp -R`)

#### Scenario: directory-extension-install
- **WHEN** the source is a directory at `{{source_repo_path}}/.pi/extensions/{{name}}/`
- **THEN** the skill copies the entire directory using `cp -R` as before

#### Scenario: source-not-found
- **WHEN** neither `{{name}}.ts` nor `{{name}}/` exists in the source extensions directory
- **THEN** the skill reports an error: "Extension source not found: {{name}}"

### Requirement: single-file-overwrite-handling
For single-file extension installs, the skill SHALL check if the target file already exists and prompt for overwrite confirmation, consistent with the existing directory-based overwrite behavior.

#### Scenario: target-file-exists
- **WHEN** `{{target_repo}}/.pi/extensions/{{name}}.ts` already exists
- **THEN** the skill prompts "Target file already exists: {{path}}. Overwrite? (yes/no)" before copying

#### Scenario: target-file-does-not-exist
- **WHEN** the target file does not exist
- **THEN** the skill copies directly without prompting

### Requirement: single-file-verification
Phase 6 verification SHALL handle single-file extensions by checking for `{{name}}.ts` in addition to `index.ts`/`index.js` when verifying extension installation.

#### Scenario: verify-single-file-extension
- **WHEN** verifying a single-file extension install
- **THEN** the skill checks `[[ -f ".pi/extensions/{{name}}.ts" ]]` as a valid verification path

## ADDED Requirements

### Requirement: post-install-dep-resolution
After installing a single-file extension (`.ts`), the skill SHALL scan the extension file for npm `import` statements, extract the package specifiers, and install missing packages into the target repository's `.pi/npm/` via `npm install`.

#### Scenario: extension-imports-npm-packages
- **WHEN** a single-file extension contains `import ... from "@scope/pkg"` statements
- **THEN** the skill extracts the package name (`@scope/pkg`) using `grep -oP` and runs `npm install @scope/pkg` in the target's `.pi/npm/` directory

#### Scenario: extension-imports-core-module
- **WHEN** an import is from a Node.js built-in module (e.g., `node:fs`, `node:path`)
- **THEN** the skill skips it without attempting to install

#### Scenario: extension-imports-type-only
- **WHEN** an import is a `type` import (e.g., `import type { Foo } from "bar"`)
- **THEN** the skill skips it — type imports are resolved at compile time and don't require runtime packages. However, installing them is harmless. The skill SHOULD attempt to install to be safe.

#### Scenario: package-already-installed
- **WHEN** the detected package already exists in the target's `.pi/npm/node_modules/`
- **THEN** `npm install` skips redundant installation (npm handles dedup)

#### Scenario: scoped-package-install
- **WHEN** the detected package is a scoped package (e.g., `@earendil-works/pi-ai`)
- **THEN** the skill correctly passes the full scoped name to `npm install`

#### Scenario: batch-install-efficiency
- **WHEN** multiple npm packages are detected from a single extension
- **THEN** the skill runs a single `npm install pkg1 pkg2 pkg3` command (not one per package) to minimize shell calls
