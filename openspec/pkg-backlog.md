# Pi Packages Backlog

This file records packages that have been researched but not added to the global Pi configuration.
Entries are ordered newest first.

### 2026-06-29 — git:github.com/DietrichGebert/ponytail

- **Version:** 4.8.4
- **Research Date:** 2026-06-29
- **Resource Types:** extension (ponytail 命令/mode 注入) + skills (ponytail, ponytail-review, ponytail-audit, ponytail-debt, ponytail-gain, ponytail-help)
- **Decision:** global
- **Source Type:** git-package
- **Source Repo:** https://github.com/DietrichGebert/ponytail
- **Install Method:** pi-install
- **Has Dependencies:** false（零运行时依赖、零 peer 依赖）
- **Reason:** 反过度工程行为约束 skill。机制是纯 system prompt 注入——通过 before_agent_start 事件把"老练工程师阶梯规则"（YAGNI→复用→stdlib→原生平台特性→已装依赖→一行→最小可行）拼接到 systemPrompt。官方提供扎实 agentic benchmark（为回应 issue #126 批评而重建）：12 任务 Haiku 4.5 n=4，LOC -54%/tokens -22%/cost -20%/time -27%/安全 100%；大胜在原生特性替代（date picker 404→23 行）。理念与现有 AGENTS.md 简洁纪律高度契合，与 caveman（terse-prose）定位互补
- **Notes:**
  1. **机制**：注册 `/ponytail [lite|full|ultra|off|status|default]` 命令 + 状态栏（🌿/⚡/🔥），full 为默认模式，每次 agent 启动注入规则；session_start 从 entries 恢复上次模式（持久化）
  2. **安全护栏**：永不简化信任边界验证/防数据丢失错误处理/安全/可访问性；永不偷懒于理解问题（先读代码追踪流程再选档）；非平凡逻辑必须留一个 assert 自检或小测试
  3. **潜在冲突**：full 全局注入持续消耗 token；测试风格反对 frameworks/fixtures（与 TDD skill 哲学不同，需 agent 自行权衡）；全局生效影响所有 session 默认行为
  4. **证据**：benchmarks/results/2026-06-18-agentic.md 是主证据，方法学扎实（headless Claude Code 公平基线、git diff 计量、对抗性安全测试），可复现（npx promptfoo eval -c benchmarks/promptfooconfig.yaml）；作者公开修复过自己数据的 contamination bug
  5. **卸载**：`pi uninstall ponytail`，额外清理需 `node scripts/uninstall.js`（清 mode flag + ~/.config/ponytail/config.json + statusLine）

### 2026-06-10 — npm:pi-snap-edit

- **Version:** 4.0.0
- **Research Date:** 2026-06-10
- **Resource Types:** extension (quick_edit, target_edit)
- **Decision:** global
- **Source Type:** npm-package
- **Source Repo:** https://pi.dev/packages/pi-snap-edit
- **Install Method:** pi-install
- **Has Dependencies:** true (1 runtime: @sinclair/typebox, 2 peer: @earendil-works/pi-coding-agent, @earendil-works/pi-tui)
- **Reason:** 解决内置 edit 工具在大段编辑、批量多位置编辑、特殊字符编辑场景下参数冗余、调用次数多的问题。基准测试显示：平均调用次数从 1.3 降至 1.0，参数大小平均减少 ~22%，大段删除场景参数节省 ~5x
- **Notes:** session_start 时替换内置 edit 和 substitute_edit 为 quick_edit + target_edit；提供 read hook 为输出添加行号；注意与其他依赖 edit 工具名的扩展/agent 的兼容性

### 2026-05-21 — git:github.com/rwese/pi-question

- **Version:** 2.3.0
- **Research Date:** 2026-05-21
- **Resource Types:** extension (question)
- **Decision:** global
- **Source Type:** git-package
- **Source Repo:** https://github.com/rwese/pi-question
- **Install Method:** pi-install
- **Has Dependencies:** true (1 runtime: @mariozechner/pi-tui)
- **Reason:** 替代 @eko24ive/pi-ask（已降级 backlog）；参数结构更简洁（questions[] 数组），有提交前审查、运行时启用/禁用、非交互模式自动降级，解决了 pi-ask "生成问题前额外模型交互、参数复杂易出错"的问题
- **Notes:** 工具名 question，支持单选/多选/多问题序列/自定义输入/推荐选项/附加备注，提供 pi-question:disabled|enabled 命令和 pi-question-disabled flag

Each entry tracks the resource name/version, research date, resource types,
the decision, decision reason, source metadata, and follow-up notes.

---

### 2026-05-06 — npm:@eko24ive/pi-ask

- **Version:** 0.8.1
- **Research Date:** 2026-05-06
- **Resource Types:** extension (ask_user) + skill (ask-user)
- **Decision:** backlog（原 global，2026-05-21 降级）
- **Source Type:** npm-package
- **Source Repo:** https://github.com/eko24ive/pi-ask
- **Install Method:** pi-install
- **Has Dependencies:** false (0 runtime, 4 peers)
- **Reason:** 替代 pi-ask-tool-extension；功能更丰富（/answer 回放、@文件引用、审阅/澄清流、Elaborate、可持久化配置、bundled skill profile），14 stars / 1,730 月下载
- **Notes:** 工具名 ask_user（与旧 ask 不冲突），已替换 pi-ask-tool-extension（已移除）。2026-05-21 降级为 backlog：生成问题前还需要额外的模型和交互的额外时间，参数复杂容易出错

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

### 2026-05-07 — git:github.com/nantas/pi-mcp-adapter

- **Version:** 2.5.1
- **Research Date:** 2026-05-07
- **Resource Types:** extension (MCP adapter)
- **Decision:** forked
- **Source Type:** git-package
- **Source Repo:** https://github.com/nantas/pi-mcp-adapter
- **Install Method:** pi-install
- **Has Dependencies:** true
- **Reason:** Forked from npm:pi-mcp-adapter@2.5.1 for potential customization. Source switched from npm to git fork.
- **Notes:** Fork of https://github.com/nicobailon/pi-mcp-adapter. Registered in `forks/manifest.yaml` and `repo-registry` as `pi-fork-pi-mcp-adapter`. Local clone at `/Users/nantasmac/projects/forks/pi-mcp-adapter`.

### 2026-05-07 — git:github.com/nantas/pi-tool-display

- **Version:** latest
- **Research Date:** 2026-05-07
- **Resource Types:** extension (tool display)
- **Decision:** forked
- **Source Type:** git-package
- **Source Repo:** https://github.com/nantas/pi-tool-display
- **Install Method:** pi-install
- **Has Dependencies:** true
- **Reason:** Forked from git:github.com/MasuRii/pi-tool-display for potential customization. Source switched to personal fork.
- **Notes:** Fork of https://github.com/MasuRii/pi-tool-display. Registered in `forks/manifest.yaml` and `repo-registry` as `pi-fork-pi-tool-display`. Local clone at `/Users/nantasmac/projects/forks/pi-tool-display`.
- **Fork Fix (2026-05-07):** `direct-tool-label-recognition` — Fixed `isMcpToolCandidate()` to check label field, enabling MCP Direct Tools to be recognized and respect `mcpOutputMode` settings. Also fixed `formatMcpCallLine()` for `MCP:` colon format. Commit: `bd352d4` on `nantas/pi-tool-display` main.
- **MCP Tool Rendering Fix (2026-05-07):** MCP tool output collapsing via `registerMcpToolOverrides()` was broken at two levels in the Pi runtime:
  1. `getAllTools()` didn't return `label` and `execute` fields → `isMcpToolCandidate()` couldn't identify Direct Tools, and `execute` was inaccessible
  2. `getAllRegisteredTools()` used first-write-wins → pi-tool-display's re-registration at `session_start` was silently discarded
  
  **Resolution**: Submitted PR `fix/mcp-tool-rendering-override` to `pi-mono/packages/coding-agent` with three changes:
  - `types.ts`: `ToolInfo` Pick includes `"label"` and `"execute"`
  - `agent-session.ts`: `getAllTools()` returns `label` and `execute`
  - `runner.ts`: `getAllRegisteredTools()` uses last-write-wins
  
  No fork-level changes needed. The previous fork-based globalThis bridge approach was reverted because it couldn't bypass the `getAllRegisteredTools()` gate.

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
- **Decision:** backlog（原 global，2026-05-21 降级）
- **Reason:** LSP 集成扩展，agent 可主动调用 definition/references/hover/symbols/diagnostics 等 9 种语义操作替代文本搜索，显著提升编码和代码分析效率。Hook 提供自动诊断反馈。支持 TS/JS/Vue/Svelte/Dart/Python/Go/Kotlin/Swift/Rust。
- **Notes:** 前置条件：需安装对应语言的 LSP 服务（如 typescript-language-server）。安全审查通过：所有 spawn/fetch 均为合法 LSP 行为。2026-05-21 降级为 backlog：agent 不会自动发现和使用这个工具

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

### 2026-05-06 — pi-interactive-subagents

- **Version:** latest (main branch)
- **Research Date:** 2026-05-06
- **Resource Types:** extensions, agents
- **Decision:** backlog
- **Source Type:** git-package
- **Source Repo:** https://github.com/HazAT/pi-interactive-subagents
- **Install Method:** pi-install
- **Has Dependencies:** false (peer deps only: pi-coding-agent, pi-tui, typebox)
- **Reason:** 不可用 — 两个阻断性问题未解决
- **Notes:**
  1. **依赖终端多路复用器**：必须运行在 cmux/tmux/zellij/WezTerm 中，无法在普通终端直接使用
  2. **Agent 设置不支持重载**：不读取 `settings.json` 的 `subagents.agentOverrides`，bundled agent frontmatter 硬编码 `anthropic/claude-*` 模型，导致使用自定义供应商时报 "no api key found for anthropic"
  3. 功能丰富（异步非阻塞、实时 widget、中断/恢复、caller_ping），与内置 dispatch 互补，若上游修复上述问题可重新评估

## @johnnywu/pi-webfetch — 2025-05-21

- **Source**: `git:github.com/jwu/pi-webfetch`
- **Version**: 1.1.0
- **License**: MIT
- **Decision**: A1 (Global)
- **Summary**: Pi extension providing `webfetch` tool. Routes GitHub URLs through `gh` CLI, other URLs through Scrapling (3-tier: fetcher → dynamic → stealthy) with optional Defuddle HTML→Markdown conversion and LLM quality judge.
- **Resources**: 1 extension (`webfetch` tool)
- **Dependencies**: `defuddle ^0.18.1` (runtime), 4 Pi core peer deps
- **Security**: CLEAN — all spawn/fetch calls are functional, no injection risks
- **External requirements**: `scrapling` (Python CLI), `gh` (GitHub CLI, authenticated)
- **Capabilities sync**: Added to `global.settings.packages` in capabilities.yaml

### 2026-07-23 — pi-xai

- **Version:** 0.17.0
- **Research Date:** 2026-07-23
- **Resource Types:** extension
- **Decision:** global
- **Source Type:** npm-package
- **Source Repo:** https://github.com/luxus/pi-xai
- **Install Method:** pi-install
- **Has Dependencies:** true (typebox runtime; pi-ai/pi-coding-agent >=0.80 peer, satisfied)
- **Reason:** 在 pi 内使用 grok 模型生图。包提供 /imagine + image_gen 工具，完全契合需求。安全审查 CLEAN（仅官方 xAI/Grok 域名 + localhost OAuth 回调，无命令执行/动态执行/混淆），运行时闭包零漏洞，无冲突。
- **Notes:**
  - 命令：/imagine, /imagine-video, /goal, /plan, /xai-usage, /xai-suggest, /xai-vision:status, /login grok-build
  - 工具：image_gen, image_edit, image_to_video, web_fetch, xai_x_search
  - 使用前需 /login grok-build (OAuth 推荐) 或设 XAI_API_KEY (公共 API 可选)
  - 可选 env：XAI_PROMPT_SUGGESTIONS=0 禁用提示建议；XAI_PROMPT_SUGGESTIONS_MODEL 覆盖建议模型 (均未声明到 global.env，因核心功能无需)
  - .pi/npm 共享工作区 13 个 transitive 漏洞来自其他历史包 (pi-mcp-adapter/pi-subagents/@modelcontextprotocol/sdk)，与 pi-xai 无关
  - Requires Pi >= 0.80 (当前 0.81.1 OK)

### 2026-07-23 — pi-xai (fork)

- **Version:** 0.17.0 (forked from luxus/pi-xai@324b56c)
- **Fork Date:** 2026-07-23
- **Fork URL:** https://github.com/nantas/pi-xai
- **Upstream:** https://github.com/luxus/pi-xai
- **Decision:** fork (active)
- **Reason:** 上游 registerShortcut("tab") 无条件覆盖 pi 内置 tui.input.tab (restrictOverride:false → 扩展赢得 dispatch)，导致所有场景下 '/' '$' 命令的 tab 补全失效。handler 在消费事件后 return，无 fallback。
- **Changes:** xai-prompt-suggest.ts 移除 registerShortcut("tab") 块（8 行）+ 根因注释；CHANGELOG 加 [Unreleased] 条目。Ghost 文本仍显示，仅失去 Tab-to-accept 交互。
- **Source switch:** npm:pi-xai → git:github.com/nantas/pi-xai (capabilities.yaml global.settings.packages + 项目 settings.json + 全局 ~/.pi/agent/settings.json)
- **Commit:** 485c75c fix(prompt-suggest): remove unconditional tab shortcut override
- **Upstream sync:** 待上游修复后可考虑回归 npm 源（pending issue/PR to luxus/pi-xai）

### 2026-07-23 — pi-codex-image-gen

- **Version:** 0.1.12
- **Research Date:** 2026-07-23
- **Resource Types:** extension + skill
- **Decision:** global
- **Source Type:** npm-package
- **Source Repo:** https://pi.dev/packages/pi-codex-image-gen (npm:pi-codex-image-gen)
- **Install Method:** pi-install
- **Has Dependencies:** false (0 runtime; pi-ai/pi-coding-agent/typebox peer, all Pi core)
- **Reason:** 在 pi 内使用 gpt-image-2 模型生图/编辑。包提供 codex_generate_image 工具 + imagegen skill，完全契合需求。安全审查 CLEAN（仅 chatgpt.com 官方 Codex 后端 + 作者 mocito.dev 安装计数遥测，可关闭），0 运行时依赖不引入漏洞，无冲突。
- **Notes:**
  - 工具：codex_generate_image (gpt-image-2 生图/编辑，支持最多 5 张引用图)
  - 认证：复用 Pi openai-codex 登录 (ChatGPT Plus/Pro)，无需 OPENAI_API_KEY
  - 使用前需 /login 选 "ChatGPT Plus/Pro (Codex)" 完成 OAuth
  - 配置：~/.pi/agent/extensions/codex-image-gen.json (save/model/saveDir)；env PI_CODEX_IMAGE_SAVE_MODE/PI_CODEX_IMAGE_SAVE_DIR/PI_OFFLINE/PI_TELEMETRY
  - 遥测：作者 mocito.dev 安装计数 (仅 tool+version)，PI_OFFLINE=1 / PI_TELEMETRY=0 / settings.enableInstallTelemetry:false 可关
  - fallback CLI: skills/imagegen/scripts/image_gen.py (需 OPENAI_API_KEY，衍生自 OpenAI Codex，Apache-2.0)
  - .pi/npm 共享工作区 7 个漏洞为存量 (ponytail/pi-xai 等)，与本包无关
  - Capabilities sync: Added to global.settings.packages in capabilities.yaml
