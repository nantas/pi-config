# Proposal

## 问题定义

当前 `dollar-skill-invoke` 扩展完全依赖 `context` 事件将 `$skill-name` 注入为临时的 `CustomMessage`（`customType: "skill"`），与 Pi 原生 `/skill:name` 命令在运行时行为上存在明显差异，同时在 Pi 1.6.0 环境下存在多处实现缺口：

1. **首个 `$skill` 与原生 `/skill:` 不等效**：`context` 注入的 skill 既不持久化进 session（后续轮次丢失、tool 续写需重复读盘），也无法触发 Pi TUI 原生的可折叠 `SkillInvocationMessageComponent` 卡片；单 skill 场景下还会因修改 `context` 触发 system 消息重放。
2. **回退索引覆盖不全且缺按需扫描**：当 `pi.getCommands()` 为空或因 stale runtime 抛错时，未按规范实现按需文件系统扫描；文件系统索引仅扫描 4 个固定目录，遗漏 Pi packages（git/npm）提供的 skills；frontmatter 名称解析依赖首行正则 `/^---\nname:/m`，无法处理键序变化、引号或 CRLF。
3. **同消息重复 `$skill` 未去重**：同一条用户输入中多次提及同名 `$skill` 会注入多份重复的 `<skill>` 块。
4. **未接入 Pi 1.6.0 自动补全触发字符**：`AutocompleteProvider` 未声明 `triggerCharacters: ["$"]`，输入 `$` 仍必须按 Tab 才会触发候选菜单。

## 范围边界

**In scope:**
- 通过 `input` 事件将首个未转义的已知 `$skill-name` 重写为 Pi 原生 `/skill:<name>` 命令，使首个 skill 的展开格式、TUI 折叠卡片、Session 持久化与多轮保留与 `/skill:` 完全等效：
  - 当整条输入仅包含单个唯一已知 skill 且该 `$skill-name` 位于句首并后接空白或结尾时，移除句首 `$skill-name` token（如 `$notion 读页面` → `/skill:notion 读页面`，`$notion` → `/skill:notion`）。
  - 当首个 `$skill-name` 位于句中，或消息包含多个不同已知 skill 时，保留完整原始文本作为 `/skill:<name>` 参数（如 `帮我用 $notion 查` → `/skill:notion 帮我用 $notion 查`，`$notion 和 $ponytail` → `/skill:notion $notion 和 $ponytail`）。
  - 对以 `/` 开头的输入和 `source === "extension"` 的输入跳过 `input` 重写，避免破坏既有 `/skill:`、`/prompt-template` 或 `sendUserMessage` 路径。
- 保留 `context` 事件专门处理同一条用户消息中的第 2..N 个不同已知 `$skill-name`（以及未经过 `input` 重写路径的 `$skill-name`）：
  - 使用 Pi 导出的 `parseSkillBlock()` 识别已经由原生 `/skill:` 展开的首个 skill，只扫描 `userMessage` 部分（不扫描 `<skill>...</skill>` 正文，避免误触发 skill 文档内提及的 `$skill`），跳过已展开 skill，并对剩余 skill 按名去重后逐条以 `CustomMessage`（`customType: "skill"`, `display: false`）注入。
- 强化技能发现与回退链路：
  - `pi.getCommands()` 成功返回非空结果时缓存为最近一次有效快照，供 stale runtime 时优先回退。
  - 当 `pi.getCommands()` 为空或抛错且 `_fileSystemSkillIndex === null` 时触发按需文件系统扫描。
  - 文件系统扫描同时覆盖 4 个标准目录以及项目/全局 `settings.json` 中声明的 Pi packages（git、npm、本地路径）的 skill 目录。
  - 使用 `@earendil-works/pi-coding-agent` 导出的 `parseFrontmatter()` / `stripFrontmatter()` 解析 frontmatter 与正文。
- 为 `AutocompleteProvider` 组合声明 `triggerCharacters`（保留 `current.triggerCharacters` 并追加 `"$"`），支持 Pi 1.6.0 输入 `$` 自动弹出补全菜单并继续兼容 Tab 触发。

**Out of scope:**
- 不修改 Pi 核心源码。
- 不将第 2..N 个 skill 改为 `before_agent_start` 合并注入。
- 不改变 `/` 补全隐藏 `skill:` 条目的既有行为。

## Capabilities

### New Capabilities

（无新增 capability）

### Modified Capabilities
- `dollar-skill-invoke`: 将首个 `$skill-name` 改为通过 `input` 事件原生重写为 `/skill:<name>`（句首单 skill 移除句首 token），`context` 事件仅负责去重注入第 2..N 个及未重写路径的 `$skill-name`，并补齐按需扫描、包 skill 回退索引、YAML frontmatter 解析与 `$` 自动触发补全。

## Capabilities 待确认项

- [x] 能力清单已与用户确认

## Impact

- **代码变更**：修改 `.pi/extensions/dollar-skill-invoke.ts`（并配套自动化测试脚本验证）。
- **单 skill 行为**：首个 `$skill` 与 `/skill:` 完全等效，具备原生折叠卡片、Session 持久化、跨轮保留与零 `context` 重放开销。
- **多 skill 行为**：第 1 个原生展开持久化，第 2..N 个经 `context` 事件去重后按独立 `CustomMessage` 注入；不会因 `SKILL.md` 正文内的 `$xxx` 误触发嵌套注入。
- **全局同步**：验证通过并经用户确认后，通过 `scripts/sync-pi-agent.sh` 同步至 `~/.pi/agent/extensions/dollar-skill-invoke.ts`。

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页 / 项目页 / 回写目标：`openspec/specs/dollar-skill-invoke/spec.md`
