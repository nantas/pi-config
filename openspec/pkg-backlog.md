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
