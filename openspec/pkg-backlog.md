# Pi Packages Backlog

This file records packages that have been researched but not added to the global Pi configuration.
Entries are ordered newest first.

Each entry tracks the resource name/version, research date, resource types,
the decision, decision reason, source metadata, and follow-up notes.

---

### 2026-05-06 — npm:@eko24ive/pi-ask

- **Version:** 0.8.1
- **Research Date:** 2026-05-06
- **Resource Types:** extension (ask_user) + skill (ask-user)
- **Decision:** global
- **Source Type:** npm-package
- **Source Repo:** https://github.com/eko24ive/pi-ask
- **Install Method:** pi-install
- **Has Dependencies:** false (0 runtime, 4 peers)
- **Reason:** 替代 pi-ask-tool-extension；功能更丰富（/answer 回放、@文件引用、审阅/澄清流、Elaborate、可持久化配置、bundled skill profile），14 stars / 1,730 月下载
- **Notes:** 工具名 ask_user（与旧 ask 不冲突），已替换 pi-ask-tool-extension（已移除）

## How to Add an Entry

When recording a resource to the backlog (via the `pkg-research` skill), append a new entry
at the top of this file using the following format:

```markdown
### <research-date> — <resource-name>

- **Version:** <version or "latest">
- **Research Date:** <YYYY-MM-DD>
- **Resource Types:** <extensions / skills / prompts / themes / mixed>
- **Decision:** <global / catalog / backlog / discarded>
- **Source Type:** <npm-package | git-package | raw-extension>
- **Source Repo:** <URL>
- **Install Method:** <pi-install | raw-copy>
- **Has Dependencies:** <true | false>
- **Reason:** <decision rationale>
- **Notes:** <follow-up items or observations>
```

> **向后兼容：** 新字段（Source Type、Source Repo、Install Method、Has Dependencies）为可选字段。已有条目保持不变，无需迁移。

---

## Entries

<!-- New entries go here, inserted at the top above this comment -->

### 2026-05-04 — git:github.com/lucasmeijer/pi-terminal-signals

- **Version:** 0.1.0
- **Research Date:** 2026-05-04
- **Resource Types:** extensions (terminal OSC signals)
- **Decision:** global
- **Source Type:** git-package
- **Source Repo:** https://github.com/lucasmeijer/pi-terminal-signals
- **Install Method:** pi-install
- **Has Dependencies:** false (peer deps only: pi-coding-agent)
- **Reason:** 零依赖、零风险的轻量级扩展，通过标准 OSC escape sequence 向终端报告 agent 生命周期（agent_start / agent_end / session_shutdown / session_switch）。支持 Ghostty/WezTerm/iTerm2/Kitty/WT/VS Code terminal，不支持的终端静默忽略。提升多终端协作体验。
- **Notes:** 监听 4 个事件，发送 OSC 9;4 (进度指示) 和 OSC 133 (语义提示/完成通知)。MIT 许可证，作者 Lucas Meijer。

### 2026-05-03 — git:github.com/jwu/pi-powerline

- **Version:** 0.1.0
- **Research Date:** 2026-05-03
- **Resource Types:** extensions (custom editor, breadcrumb, footer, header)
- **Decision:** global
- **Source Type:** git-package
- **Source Repo:** https://github.com/jwu/pi-powerline
- **Install Method:** pi-install
- **Has Dependencies:** false (peer deps only: pi-coding-agent, pi-ai, pi-tui)
- **Reason:** 轻量级 powerline 风格 UI 套件，替换 npm:pi-powerline-footer。仅 7 个文件 ~18KB，提供简洁 footer（tokens/context/cost/git/thinking）、渐变 header、breadcrumb widget、带 ❯ 前缀的 editor。无 bash mode / fixed editor / shortcuts 等重型功能，渲染更轻量、启动更快。
- **Notes:** 安装时需移除 package.json 中的 `prepare: husky` 脚本（husky 为 devDependency，Pi 的 `--omit=dev` 安装会失败）。配置通过顶层键 `breadcrumb`/`footer`/`header` 控制，支持 `/powerline` 命令动态切换。Nerd Font 自动检测。

### 2026-05-02 — session-replay (raw extension)

- **Version:** latest
- **Research Date:** 2026-05-02
- **Resource Types:** extensions (session timeline viewer via /replay command)
- **Decision:** backlog
- **Source Type:** raw-extension
- **Source Repo:** https://github.com/disler/pi-vs-claude-code
- **Install Method:** raw-copy
- **Has Dependencies:** false
- **Reason:** 对每个节点无法预览完整信息，意义不大。仅记录留档，后续不安装。
- **Notes:** 单文件扩展 (session-replay.ts)，注册 `/replay` 命令展示可滚动 session 时间线。

### 2026-05-02 — tool-counter-widget (raw extension)

- **Version:** latest
- **Research Date:** 2026-05-02
- **Resource Types:** extensions (live tool-call counter widget)
- **Decision:** global
- **Source Type:** raw-extension
- **Source Repo:** https://github.com/disler/pi-vs-claude-code
- **Install Method:** raw-copy
- **Has Dependencies:** false
- **Reason:** 实时工具调用计数 widget，每个工具独立颜色，干净无依赖，适合全局使用。
- **Notes:** 单文件扩展 (tool-counter-widget.ts)，通过 `tool_execution_end` 事件实时累积，已安装到 `.pi/extensions/`。

### 2026-04-30 — npm:pi-powerline-footer

- **Version:** 0.4.20
- **Research Date:** 2026-04-30
- **Resource Types:** extensions (powerline-style status bar, welcome overlay, bash mode, working vibes)
- **Decision:** global
- **Decision:** replaced
- **Reason:** 2026-05-03 被 jwu/pi-powerline 替代。原包功能丰富但代码量过大（340KB），包含 bash mode / fixed editor / working vibes 等大量非必需功能，且 `setEditorComponent()` 与其他扩展存在覆盖冲突。
- **Notes:** 仓库 github.com/nicobailon/pi-powerline-footer。安全审查通过：所有 spawn 调用均为 git/shell 合法行为，无网络外发。配置可通过 theme.json 自定义颜色和图标。已从 global 移除，不再同步。

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

- **Version:** 0.2.4 (已替换 → @eko24ive/pi-ask 0.8.1)
- **Research Date:** 2026-04-29
- **Resource Types:** extensions (registers `ask` tool)
- **Decision:** global (2026-05-06: 已替换移除)
- **Reason:** 结构化交互式提问工具，支持单选/多选/tab 多问题流/内联笔记编辑；安全性极佳（0 运行时依赖，仅依赖 Pi 核心包）
- **Notes:** 仓库 github.com/devkade/pi-ask-tool，已被 @eko24ive/pi-ask 替代，2026-05-06 执行 pi remove 移除
