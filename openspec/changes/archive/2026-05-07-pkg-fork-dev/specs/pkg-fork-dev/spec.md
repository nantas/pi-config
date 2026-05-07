# Specification Delta

## Capability 对齐（已确认）

- Capability: `pkg-fork-dev`
- 来源: `proposal.md`
- 变更类型: new
- 用户确认摘要: 6 阶段闭环（A-F），覆盖首次 fork、修改已有 fork、同步上游三种入口场景；clone 路径通过 repo-registry 管理不硬编码；修改后通过 `pi install -l file:` 本地测试；OpenSpec 可选集成。

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: Skill file structure
The skill file SHALL be located at `.pi/skills/pkg-fork-dev/SKILL.md` and SHALL follow the existing pi-config skill conventions:
- YAML frontmatter with `name: pkg-fork-dev`, `description` (trigger conditions + scope boundaries), and `use when / do NOT use for` guidance.
- Phased workflow overview table listing phase letter, name, and exit criteria.
- Self-contained phase sections with concrete bash commands, decision trees, and user-facing prompts.

#### Scenario: Agent discovers skill for fork tasks
- **WHEN** a user requests to fork a Pi package, modify a forked package, or sync upstream changes
- **THEN** the agent SHALL load `pkg-fork-dev/SKILL.md` and follow its phased workflow

---

### Requirement: Phase A — Fork & Setup
The skill SHALL define Phase A covering the initial fork and development environment setup with these steps:

A1. Source identification: detect upstream type (npm/git), extract repo URL, version, and original source string from `settings.json` and `package.json`.
A2. GitHub fork guidance: instruct user to fork (or use `gh repo fork` if available).
A3. Clone path confirmation: use `ask_user` to confirm local dev clone path, then `git clone` and `git remote add upstream`.
A4. Repo-registry registration: register `repo://<name>` with the confirmed path.
A5. Manifest registration: write canonical entry to `forks/manifest.yaml`.
A6. Settings update: change package source in `.pi/settings.json` from original (npm:/git:) to `git:github.com/<user>/<repo>`.
A7. Capabilities update: if the package appears in `catalog.packages` or `global.settings.packages`, update its `source` field.
A8. Reinstall: `pi install -l git:github.com/<user>/<repo>`.
A9. Baseline verification: start pi, confirm package loads without errors.

#### Scenario: Forking an npm package for the first time
- **WHEN** a package installed via `npm:` in settings.json needs to be forked
- **THEN** the agent SHALL detect `upstream_type: npm`, extract the GitHub repo from `package.json.repository`, guide the user through fork + clone, register in manifest, replace `npm:` with `git:` in settings.json, update capabilities.yaml if needed, and reinstall

#### Scenario: Forking an existing git package
- **WHEN** a package already installed via `git:github.com/<upstream-user>/<repo>` needs to be forked
- **THEN** the agent SHALL detect `upstream_type: git`, guide the user to fork, clone to confirmed path, register in manifest, replace `git:` with the new fork's `git:` URL, and reinstall

#### Scenario: Clone path differs across machines
- **WHEN** installing `pkg-fork-dev` on a different machine where the dev clone path differs
- **THEN** `repo-registry get --repo-id <name>` SHALL return the current machine's path; if unregistered or stale, the agent SHALL ask the user for the new path and `repo-registry set`

---

### Requirement: Phase B — Modification Planning
The skill SHALL define Phase B covering modification planning:

B1. Codebase understanding: read fork codebase structure via `repo://<name>`, identify package type (extension/skill/theme/mixed) and key files.
B2. Modification target identification: determine what to change, which files are affected, and impact scope.
B3. Design decisions: propose approach, API surface changes, and compatibility considerations.
B4. OpenSpec option: for significant modifications, optionally create an OpenSpec change (`openspec new change "<name>"`) under `openspec/changes/`.
B5. User confirmation: present the plan and wait for explicit approval before proceeding.

#### Scenario: Planning a bug fix for a forked package
- **WHEN** a bug is identified in a forked package
- **THEN** the agent SHALL read the affected source files via `repo://<name>`, locate root cause, propose minimal fix with affected file list, and request user confirmation

#### Scenario: Planning a major feature addition
- **WHEN** a significant feature is proposed for a forked package
- **THEN** the agent SHALL suggest optional OpenSpec change creation with separate proposal/specs/design artifacts before implementation

---

### Requirement: Phase C — Implementation
The skill SHALL define Phase C covering implementation in the dev clone:

C1. Code changes: make modifications in the dev clone's working tree.
C2. Existing tests: run fork repo's existing test suite to verify no regressions.
C3. Documentation update: update CHANGELOG / README if the fork repo has them.
C4. User review: present the diff for review before proceeding to testing.

#### Scenario: Making code changes in a fork
- **WHEN** the modification plan is confirmed
- **THEN** the agent SHALL make changes in the dev clone at the path registered in `repo-registry` under `<name>`, run existing tests, and present the diff

---

### Requirement: Phase D — Local Testing
The skill SHALL define Phase D covering local testing in pi-config:

D1. Temporarily update `.pi/settings.json`: change the package's source from `git:github.com/<user>/<repo>` to `file:<dev-clone-path>`.
D2. Local install: `pi install -l file:<dev-clone-path>` to install from the modified local clone.
D3. Functional test: start pi, verify the package loads, and test the modified functionality.
D4. Iteration: if issues found, fix in dev clone (Phase C), re-run D2-D3 until tests pass.
D5. Test complete: all modified behaviors verified.

#### Scenario: Testing a modified extension in pi
- **WHEN** changes are ready for testing
- **THEN** the agent SHALL update settings.json to `file:<path>`, run `pi install -l file:<path>`, start pi to verify the extension loads and functions, and iterate if needed

#### Scenario: Testing fails and needs iteration
- **WHEN** a test reveals a bug in the modification
- **THEN** the agent SHALL fix in the dev clone, re-run `pi install -l file:<path>`, and retest until passing

---

### Requirement: Phase E — Commit & Ship
The skill SHALL define Phase E covering commit and deployment:

E1. Commit: `git commit` with conventional commit message in the dev clone.
E2. Tag: `git tag` with version bump following semver.
E3. Push: `git push origin main --tags`.
E4. Restore source: update `.pi/settings.json` from `file:<path>` back to `git:github.com/<user>/<repo>`.
E5. Remote reinstall: `pi install -l git:github.com/<user>/<repo>` to pull from remote.
E6. Manifest update: update `forks/manifest.yaml` with `changes_summary` and `last_upstream_sync`.
E7. Backlog record: record modification in `openspec/pkg-backlog.md`.

#### Scenario: Shipping a completed modification
- **WHEN** all tests pass and user confirms
- **THEN** the agent SHALL commit, tag, push, restore settings.json to git: URL, reinstall from remote, update manifest and backlog

---

### Requirement: Phase F — Maintenance
The skill SHALL define Phase F covering upstream synchronization:

F1. Fetch upstream: `git fetch upstream` in the dev clone.
F2. Diff check: `git log upstream/main..HEAD` to inspect divergence.
F3. Merge decision: present user with options (merge/rebase/cherry-pick/skip).
F4. Execute merge: perform the chosen strategy, resolve conflicts if any.
F5. Manifest update: update `last_upstream_sync` in `forks/manifest.yaml`.
F6. Regression check: if upstream changes introduce regressions, route to Phase B for new modifications.

#### Scenario: Checking upstream for new changes
- **WHEN** user wants to sync a fork with upstream
- **THEN** the agent SHALL fetch upstream, show diff, let user choose merge strategy, execute, and update manifest

#### Scenario: Upstream merge causes conflicts
- **WHEN** upstream changes conflict with fork modifications
- **THEN** the agent SHALL resolve conflicts interactively with user guidance, then proceed to Phase D testing if needed
