# Pi Packages Backlog

This file records packages that have been researched but not added to the global Pi configuration.
Entries are ordered newest first.

Each entry tracks the package source, version, research date, resource types provided,
the decision reason, and any follow-up notes.

---

## How to Add an Entry

When recording a package to the backlog (via the `pkg-research` skill), append a new entry
at the top of this file using the following format:

```markdown
### <research-date> — <package-source>

- **Version:** <pinned-version or "latest">
- **Research Date:** <YYYY-MM-DD>
- **Resource Types:** <extensions / skills / prompts / themes / mixed>
- **Decision:** <backlog / discarded>
- **Reason:** <why not added to global>
- **Notes:** <follow-up items or observations>
```

---

## Entries

<!-- New entries go here, inserted at the top above this comment -->

### 2026-04-30 — npm:pi-powerline-footer

- **Version:** 0.4.20
- **Research Date:** 2026-04-30
- **Resource Types:** extensions (powerline-style status bar, welcome overlay, bash mode, working vibes)
- **Decision:** global
- **Reason:** 功能丰富的 statusline 替代方案，0 运行时依赖，支持多种预设/可定制主题/分隔符/Custom Items 与其他扩展联动。提供 rounded box 顶部边框渲染、git 集成、bash mode、working vibes 等增强体验。
- **Notes:** 仓库 github.com/nicobailon/pi-powerline-footer。安全审查通过：所有 spawn 调用均为 git/shell 合法行为，无网络外发。配置可通过 theme.json 自定义颜色和图标。

### 2026-04-30 — npm:lsp-pi

- **Version:** 1.0.4
- **Research Date:** 2026-04-30
- **Resource Types:** extensions (LSP Tool + Hook auto-diagnostics)
- **Decision:** global
- **Reason:** LSP 集成扩展，agent 可主动调用 definition/references/hover/symbols/diagnostics 等 9 种语义操作替代文本搜索，显著提升编码和代码分析效率。Hook 提供自动诊断反馈。支持 TS/JS/Vue/Svelte/Dart/Python/Go/Kotlin/Swift/Rust。
- **Notes:** 前置条件：需安装对应语言的 LSP 服务（如 typescript-language-server）。安全审查通过：所有 spawn/fetch 均为合法 LSP 行为。

### 2026-04-30 — npm:@tmustier/pi-tab-status

- **Version:** 0.1.3
- **Research Date:** 2026-04-30
- **Resource Types:** extensions (tab status indicator)
- **Decision:** global
- **Reason:** 多个 terminal tab 同时运行 pi 时，tab 标题显示 agent 执行状态（:new / :running... / :✅ / :🚧 / :🛑），方便区分各 tab 进度
- **Notes:** 源仓库 github.com/tmustier/pi-extensions/tree/main/tab-status。纯 TypeScript 135 行，0 依赖，安全审查通过。状态图标硬编码，暂不支持配置。

### 2026-04-30 — extension-dedup-standard

- **Type:** Standardization + Bugfix
- **Development Date:** 2026-04-30
- **Deliverables:**
  - `.pi/extensions/dollar-skill-invoke.ts` — 新增 `globalThis` 自去重标记
  - `.pi/skills/pi-extension-dev/SKILL.md` — Phase D 新增 Dedup Requirement 标准
- **Capability:** `extension-dedup-standard` — 标准化 extension 自去重要求
- **Spec Coverage:** 2/2 requirements implemented
- **Verification:** ✅ 见 `openspec/changes/extension-dedup-standard/verification.md`

### 2026-04-30 — planner-toggle-dedup

- **Type:** Bugfix
- **Development Date:** 2026-04-30
- **Deliverables:**
  - `.pi/extensions/planner-toggle.ts` — 新增 `globalThis` 自去重标记
  - `scripts/sync-pi-agent.sh` — 撤回排除逻辑恢复正常全局同步
- **Capability:** `extension-self-dedup` — 扩展运行时自去重，消除从全局和项目本地同时加载时的冲突警告
- **Spec Coverage:** 4/4 scenarios covered
- **Verification:** ✅ 见 `openspec/changes/planner-toggle-dedup/verification.md`

### 2026-04-30 — global-agent-md-tool-guide

- **Type:** Workflow & Configuration
- **Development Date:** 2026-04-30
- **Resource Types:** configuration
- **Status:** Implemented & Verified
- **Deliverables:**
  - `.pi/agent/AGENTS.md` — 工具调用指导
  - `scripts/sync-pi-agent.sh` — 新增 AGENTS.md 同步
  - `AGENTS.md` — 新增全局指导工作流章节
- **Capability:** `global-agent-md-sync` — 项目内管理 `.pi/agent/AGENTS.md`，通过同步脚本部署到 `~/.pi/agent/AGENTS.md`
- **Spec Coverage:** 4/4 requirements implemented
- **Verification:** ✅ 见 `openspec/changes/global-agent-md-tool-guide/verification.md`
- **Notes:** 同步需用户确认后执行 `scripts/sync-pi-agent.sh`。

### 2026-04-30 — planner-toggle (extension)

- **Type:** Extension (directly developed, not a package import)
- **Development Date:** 2026-04-30
- **Resource Types:** extension
- **Status:** Implemented & Verified
- **Deliverable:** `.pi/extensions/planner-toggle.ts`
- **Capability:** `planner-toggle` — 一键切换只读规划模式（Ctrl+Alt+P / `/planner`），自动切换模型为 `deepseek/deepseek-v4-pro`，限制工具集为只读，bash命令白名单过滤，退出时恢复原模型。支持状态栏指示、toast通知、session持久化。
- **Spec Coverage:** 10/10 requirements implemented
- **Verification:** ✅ 见 `openspec/changes/planner-toggle/verification.md`
- **Notes:** 单文件扩展，无npm依赖。部署需通过 `scripts/sync-pi-agent.sh` 同步到 `~/.pi/agent/extensions/`。

### 2026-04-29 — npm:pi-ask-tool-extension

- **Version:** 0.2.4
- **Research Date:** 2026-04-29
- **Resource Types:** extensions (registers `ask` tool)
- **Decision:** global
- **Reason:** 结构化交互式提问工具，支持单选/多选/tab 多问题流/内联笔记编辑；安全性极佳（0 运行时依赖，仅依赖 Pi 核心包）
- **Notes:** 仓库 github.com/devkade/pi-ask-tool，已添加到 global ~/.pi/agent/settings.json，通过 sync-pi-agent.sh 同步
