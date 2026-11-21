# Design

## Context

基于规范真源 `specs/dollar-skill-invoke/spec.md`，本设计改造 `.pi/extensions/dollar-skill-invoke.ts`：
- Pi 1.6.0 的输入管线顺序为：`input` 事件 → `_expandSkillCommand`（处理 `/skill:<name>`）→ `expandPromptTemplate` → 持久化 `user` 消息（TUI 通过 `parseSkillBlock()` 渲染折叠卡片）→ `agent.prompt` → `context` 事件 → `convertToLlm`。
- Pi 1.6.0 从 `@earendil-works/pi-coding-agent` 导出了 `parseSkillBlock`、`parseFrontmatter` 和 `stripFrontmatter`，可直接复用以保持与核心解析逻辑 100% 一致。
- Pi 1.6.0 的 `Editor` 读取 `AutocompleteProvider.triggerCharacters` 并在默认 `["@", "#"]` 之外追加自动弹出触发字符。

## Goals / Non-Goals

**Goals:**
- 首个已知 `$skill-name` 在 `input` 事件中重写为 `/skill:<name>`，获得与原生 `/skill:` 完全等效的展开、Session 持久化、TUI 折叠卡片与 Prompt Cache 行为。
- 第 2..N 个不同已知 `$skill-name`（及绕过 `input` 的路径）在 `context` 事件中按首次出现顺序去重注入为独立 `CustomMessage`，且不扫描 `<skill>...</skill>` 正文。
- 强化回退链路：`pi.getCommands()` 快照缓存 + 按需文件系统扫描 + 覆盖 `settings.json` 中的 Pi packages（git/npm/local）+ `parseFrontmatter` YAML 解析。
- `AutocompleteProvider` 组合暴露 `triggerCharacters` 含 `"$"`。

**Non-Goals:**
- 不修改 Pi 核心源码或引入外部第三方依赖。
- 不改变 `/` 补全隐藏 `skill:` 的行为。
- 不把第 2..N 个 skill 改为 `before_agent_start` 合并注入。

## Decisions

### 1. `input` 事件重写策略（`handleInputRewrite`）
- 在扩展顶层单次注册 `pi.on("input", ...)`，与 `context` 同样避免跨 session 累积。
- 提前跳过条件：
  1. `event.source === "extension"`（`sendUserMessage` 默认 `expandPromptTemplates: false`，改写会导致字面 `/skill:` 暴露给模型）。
  2. `event.text.trimStart().startsWith("/")`（保留 `/skill:`、`/prompt-template`、斜杠命令原有管线）。
  3. `!event.text.includes("$")`。
- 扫描所有未转义的 `$skill-name`（使用 `DOLLAR_SKILL_REGEX` 全局匹配），按已知技能集合过滤并记录去重后的唯一已知技能列表 `uniqueMatchedSkills` 及首个匹配项 `firstMatch`。
- 若 `uniqueMatchedSkills.length === 0`，返回 `{ action: "continue" }`。
- 重写格式判定：
  - 当 `uniqueMatchedSkills.length === 1`，且 `event.text` 以 `^\s*\$<name>(?=$|\s)` 开头（匹配首个 token 位于句首且后接空白或结尾）时：
    - 去除句首 `$<name>` 及其紧邻空白，得到 `remaining = event.text.slice(leadingMatch[0].length).trimStart()`。
    - 返回 `{ action: "transform", text: remaining ? \`/skill:${firstName} ${remaining}\` : \`/skill:${firstName}\` }`。
  - 其他所有情况（句中出现、句首紧跟标点、或含多个不同已知 skill）：
    - 返回 `{ action: "transform", text: \`/skill:${firstName} ${event.text}\` }`（始终使用 ASCII 空格分隔命令名与参数，适配 `_expandSkillCommand` 的 `text.indexOf(" ")`）。

### 2. `context` 事件二次技能注入（`handleContextInjection`）
- 找到最后一条 `role === "user"` 消息，保留既有 5 条窗口的 `custom(skill)` 去重扫描。
- 提取 `userText` 后调用 `parseSkillBlock(userText)`：
  - 若命中已展开的 `<skill>` 块：记录 `alreadyExpanded = new Set([skillBlock.name])`，仅对 `scanText = skillBlock.userMessage ?? ""` 扫描 `$skill-name`（杜绝 `<skill>` 正文内 `$xxx` 引发级联误注入）。
  - 若未命中：记录 `alreadyExpanded = new Set()`，`scanText = userText`。
- 遍历 `scanText` 中未转义的 `$skill-name`：
  - 若 `alreadyExpanded.has(skillName)`，跳过（实现同消息去重与首个已展开 skill 去重）。
  - 解析到对应 `SkillInfo` 并成功读取 `SKILL.md` 后，将 `skillName` 加入 `alreadyExpanded`，使用 Pi 导出的 `stripFrontmatter()` 生成 `<skill>` 块并追加 `CustomMessage`。
- 若 `skillMessages.length === 0`，返回 `undefined`（单 skill 场景零改写、零 cache 扰动）。

### 3. 技能发现与三层回退索引
- 模块级状态：
  - `_lastCwd: string | null`（`session_start` 更新）
  - `_lastKnownCommandSkills: SkillInfo[]`（`pi.getCommands()` 非空时更新）
  - `_fileSystemSkillIndex: SkillInfo[] | null`（`session_start` 构建，或在需要且仍为 `null` 时按需构建）
- `getSkills(pi)`:
  1. 尝试调用 `pi.getCommands()` 过滤 `source === "skill"`；若非空，更新 `_lastKnownCommandSkills` 并返回。
  2. 若返回空或抛错：优先返回 `_lastKnownCommandSkills`（若非空）；否则若 `_fileSystemSkillIndex === null`，按需执行 `buildFileSystemSkillIndex(_lastCwd ?? process.cwd())` 并缓存；返回 `_fileSystemSkillIndex ?? []`。
- `buildFileSystemSkillIndex(cwd)`:
  - 扫描 4 个标准目录：`{cwd}/.agents/skills`、`{cwd}/.pi/skills`、`{home}/.agents/skills`、`{home}/.pi/agent/skills`。
  - 读取 `{cwd}/.pi/settings.json` 与 `{home}/.pi/agent/settings.json` 中的 `packages` 数组，将每个 package 源解析为本地根目录：
    - `git:<host>/<owner>/<repo>[@ref]` → `{baseDir}/git/<host>/<owner>/<repo>`
    - `npm:<pkg>[@ver]` → `{baseDir}/npm/node_modules/<pkg>`（正确处理 `@scope/name@ver`）
    - `file:<path>` 或本地相对/绝对路径 → 解析后的目录
  - 对每个存在的 package 根目录读取 `package.json`：若 `pi.skills` 为字符串数组则扫描其中非 `!` 排斥的目录，否则若 `<root>/skills` 存在则扫描之。
  - `scanSkillDir` 使用 Pi 导出的 `parseFrontmatter()` 提取 `frontmatter.name`（若为非空字符串则采用，否则回退父目录名），并按 `filePath` 去重。

### 4. Autocomplete `triggerCharacters` 组合
- `createAutocompleteProvider` 返回对象增加：
  ```ts
  triggerCharacters: Array.from(new Set([...(current.triggerCharacters ?? []), "$"])),
  ```
- 既保留上游 provider（或其他扩展）的触发字符，也让 Pi 1.6.0 Editor 在输入 `$` 时自动弹出补全，且仍支持 Tab 触发。

## Risks / Migration

- **风险 1：`input` 事件触发时 `pi.getCommands()` 为空或仅命中 filesystem 索引中的 skill，但 `resourceLoader` 尚未包含该 skill**
  - 影响：若重写为 `/skill:name` 而 `_expandSkillCommand` 查不到该 skill，会原样保留 `/skill:name ...` 文本。
  - 缓解：`input` 重写与 Pi 同步运行于同一 session，`resourceLoader.reload()` 在 session 可接收输入前已完成；且 `buildFileSystemSkillIndex` 仅扫描 Pi 标准与已配置 package 路径，与 `DefaultResourceLoader` 保持一致。
- **风险 2：已有用户习惯单 skill 下气泡显示 `$notion 帮我做`**
  - 已与用户确认采用移除句首 token（选项 1），与原生 `/skill:notion 帮我做` 完全一致；句中引用与多 skill 仍保留完整原文。
- **迁移**：无需修改 `.pi/settings.json` 或 `.pi/capabilities.yaml`（`dollar-skill-invoke` 已在 `global.extensions` 中）；代码验证完成后需经用户确认执行 `scripts/sync-pi-agent.sh` 同步至全局运行时。
