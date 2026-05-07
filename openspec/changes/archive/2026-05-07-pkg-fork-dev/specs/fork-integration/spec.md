# Specification Delta

## Capability 对齐（已确认）

- Capability: `fork-integration`
- 来源: `proposal.md`
- 变更类型: new
- 用户确认摘要: fork 后需更新 settings.json 来源、capabilities.yaml 条目（catalog + global）、pkg-backlog 记录；测试时通过 `file:` 临时切换，发布后恢复 `git:` URL。

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: Settings.json source update
When a package is forked, the source string in `.pi/settings.json` SHALL be updated from the original source to the new fork's git URL.

- npm → git: `"npm:<pkg>[@version]"` SHALL become `"git:github.com/<user>/<repo>"`
- git → git: `"git:github.com/<upstream-user>/<repo>"` SHALL become `"git:github.com/<fork-user>/<repo>"`
- The update SHALL preserve the package's position in the `packages` array.
- The original source string SHALL be recorded in `forks/manifest.yaml` as `upstream_source`.

#### Scenario: Switching an npm package to a git fork
- **WHEN** an npm package (`npm:pi-mcp-adapter@2.5.1`) is forked to `github.com/nantasmac/pi-mcp-adapter`
- **THEN** `.pi/settings.json` packages array SHALL replace `"npm:pi-mcp-adapter@2.5.1"` with `"git:github.com/nantasmac/pi-mcp-adapter"`

#### Scenario: Switching a git package to a new fork
- **WHEN** a git package (`git:github.com/MasuRii/pi-tool-display`) is forked to `github.com/nantasmac/pi-tool-display`
- **THEN** `.pi/settings.json` packages array SHALL replace `"git:github.com/MasuRii/pi-tool-display"` with `"git:github.com/nantasmac/pi-tool-display"`

---

### Requirement: Capabilities.yaml source update
If the forked package appears in `.pi/capabilities.yaml` under `catalog.packages` or `global.settings.packages`, its `source` field SHALL be updated to reflect the new fork source.

- The update SHALL preserve all other fields (`name`, `description`, `type`).
- If the package appears in both `catalog.packages` and `global.settings.packages`, both entries SHALL be updated.
- If the package does NOT appear in capabilities.yaml, no update is required.

#### Scenario: Updating catalog package source
- **WHEN** `pi-mcp-adapter` is in `catalog.packages` with `source: npm:pi-mcp-adapter@2.5.1` and is forked
- **THEN** its `source` SHALL be updated to `git:github.com/nantasmac/pi-mcp-adapter`

#### Scenario: Package not in capabilities.yaml
- **WHEN** a forked package (e.g., `pi-tool-display`) does not appear in capabilities.yaml
- **THEN** no capabilities.yaml update is needed

---

### Requirement: Local testing source switch
During Phase D (Local Testing), the package source in `.pi/settings.json` SHALL be temporarily changed to `file:<dev-clone-path>` to install from the local dev clone. After testing completes in Phase E, the source SHALL be restored to `git:github.com/<user>/<repo>`.

#### Scenario: Switching to local file source for testing
- **WHEN** Phase D testing begins
- **THEN** the package source in settings.json SHALL temporarily change from `git:github.com/nantasmac/pi-mcp-adapter` to `file:/Users/xxx/projects/forks/pi-mcp-adapter`

#### Scenario: Restoring git source after testing
- **WHEN** Phase E Commit & Ship completes
- **THEN** the package source in settings.json SHALL be restored from `file:...` to `git:github.com/nantasmac/pi-mcp-adapter`

---

### Requirement: Backlog recording
Each fork action (initial fork, modification shipped) SHALL be recorded in `openspec/pkg-backlog.md` using the extended schema defined in `pkg-research`. The entry SHALL include fork-specific metadata (fork_url, upstream_url) in the Notes field.

#### Scenario: Recording initial fork in backlog
- **WHEN** Phase A completes and a new fork is registered
- **THEN** a backlog entry SHALL be written with Decision: forked, Source Type: git-package, and fork URLs in Notes

#### Scenario: Recording modification in backlog
- **WHEN** Phase E completes and a modification is shipped
- **THEN** the existing fork's backlog entry SHALL be updated or a new entry added documenting the modification
