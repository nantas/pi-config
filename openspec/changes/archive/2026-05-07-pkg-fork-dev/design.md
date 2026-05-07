# Design

## Context

pi-config 已有两个 package 管理相关 skill：`pkg-research`（安全审查 + 引入决策）和 `pi-extension-dev`（自有扩展完整开发）。当需要对已配置的第三方 package 进行功能定制或 bug 修复时，缺少 fork 开发闭环。本次新增 `pkg-fork-dev` skill + `forks/manifest.yaml` 注册表填补这一空白。

## Goals / Non-Goals

**Goals:**

1. 提供 `pkg-fork-dev` skill，覆盖 6 阶段 fork 开发闭环（A: Setup → B: Planning → C: Implementation → D: Testing → E: Ship → F: Maintenance）
2. 提供 `forks/manifest.yaml` 作为 fork 注册表，记录 canonical 元数据
3. 通过 `repo-registry` 管理机器特定的 clone 路径，避免硬编码
4. 支持三种入口场景：首次 fork、修改已有 fork、同步上游
5. 与现有 `pkg-research`、`pi-extension-dev`、`capabilities.yaml`、`settings.json` 无缝衔接

**Non-Goals:**

- 不创建独立的 fork CI/CD 流水线
- 不提供自动化的 fork 发现或批量管理命令
- 不修改 Pi 核心的 package 安装机制
- 不强制所有 fork 必须使用 OpenSpec change

## Decisions

### D1: Skill file structure — follow existing conventions
**Decision:** `pkg-fork-dev/SKILL.md` 采用与 `pkg-research`、`pi-extension-dev` 相同的结构：YAML frontmatter + 阶段概览表 + 分阶段详述章节。每个阶段包含具体的 bash 命令和用户交互指导。

**Rationale:** 与仓库现有 skill 保持一致，降低学习和维护成本。

### D2: Manifest schema — minimal canonical fields
**Decision:** `forks/manifest.yaml` 只记录 7 个 canonical 字段：`name`, `fork_url`, `upstream_url`, `upstream_source`, `status`, `last_upstream_sync`, `changes_summary`。不记录机器特定路径。

**Rationale:** 用户确认的字段范围。机器特定路径通过 `repo-registry` 的 `repo://<name>` 管理，不同机器各自 `set` 路径，manifest 跨机器安全共享。

### D3: Clone path management — repo-registry
**Decision:** 每个 fork 在 `repo-registry` 中注册为 `repo://<name>`，指向本地 dev clone 的绝对路径。首次 clone 时 `ask_user` 确认路径，换机器时检测路径不存在并重新询问。

**Rationale:** `repo-registry` 是 pi-config 生态已有的路径抽象机制（`repo://` 映射），复用避免造轮子。每台机器独立维护路径映射，避免跨环境冲突。

### D4: Local testing — pi install -l file:
**Decision:** 测试修改时，临时将 `settings.json` 中的包来源从 `git:github.com/<user>/<repo>` 改为 `file:<dev-clone-path>`，执行 `pi install -l file:<path>` 从本地安装。测试通过后恢复为 `git:` URL 并推送。

**Rationale:** 用户确认的测试方式。`pi install -l file:` 是最干净的本地安装方式，可逆、不污染 git 历史。比直接操作 `.pi/git/` 下的 clone 更规范。

### D5: OpenSpec integration — optional
**Decision:** 重大修改建议创建 OpenSpec change（`openspec/changes/<name>/`），小改动可跳过。skill 的 Phase B 提供可选指引但不强制。

**Rationale:** 用户确认可选集成。fork 的修改本质上是外部仓库的变更，强制 OpenSpec 会过度约束简单 bugfix 场景。

### D6: Manifest read/write — skill as primary writer
**Decision:** `pkg-fork-dev` skill 是 `forks/manifest.yaml` 的主要写入者。`pkg-research` 在引入新 fork 时也可写入。手动编辑允许但不推荐。

**Rationale:** 通过 skill 确保 schema 一致性，避免手工编辑导致格式错误。

### D7: Capabilities scope — catalog only
**Decision:** `pkg-fork-dev` 注册在 `capabilities.yaml` 的 `catalog.skills`，不加入 `global.skills`。只有 pi-config 仓库需要 fork 管理能力。

**Rationale:** 用户确认 catalog 作用域。其他项目通常不需要管理 pi-config 的 fork 包。

## Risks / Migration

| Risk | Mitigation |
|------|-----------|
| `pi install -l file:` 对复杂包（多文件、有依赖）的支持可能有限 | Pilot 测试 pi-mcp-adapter（40+ 文件）验证 file: install 行为 |
| `repo-registry` 路径映射在换机器后需手动更新 | skill 中明确检测路径不存在时重新询问用户的逻辑 |
| `capabilities.yaml` 中同一个包在 `catalog.packages` 和 `global.settings.packages` 都有条目，需双更新 | skill 中明确两个条目都需更新 |
| Pilot 案例中 `pi-mcp-adapter` 从 npm 切 git 后，`.pi/npm/package.json` 可能残留旧依赖 | Phase A 中添加 `npm uninstall` 清理步骤 |
