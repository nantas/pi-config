# Design

## Context

`dollar-skill-invoke` extension 通过 `context` 事件拦截 LLM 调用前的消息数组，解析 `$skill-name` token 并注入 `<skill>` block。当前实现完全依赖 `pi.getCommands()` 获取 skill 列表——这是唯一的 skill 数据源。

`pi.getCommands()` 从 `ResourceLoader.getSkills()` 获取 skill 信息，其加载时机与 extension `context` handler 首次触发之间没有显式同步保证。在正常情况下（Pi 冷启动后首次 session），`ResourceLoader.reload()` 在 `AgentSession` 构造前被 `await`，skill 列表在首次 `context` 事件前已就绪。但在以下场景中可能出现不一致：

- 热重载（`/reload`）后 extension 重新注册但 ResourceLoader 还在刷新
- 多 session 切换时 extension 绑定先于 skill 重新加载
- jiti 缓存导致 extension 运行旧版本代码

由于 `handleContextInjection` 在 `allSkills.find()` 找不到 skill 时只是 `continue`（静默跳过），用户得不到任何反馈，agent 也不知 skill 内容已被省略。

## Goals / Non-Goals

**Goals:**
- 消除 skill 注入对 `pi.getCommands()` 时序的单点依赖
- 增加独立文件系统 skill 索引作为防御层
- 改进 dedup 逻辑，覆盖 `before_agent_start` 等 extension 注入消息导致位置偏移的场景

**Non-Goals:**
- 修改 `pi.getCommands()` 或 `ResourceLoader` 的加载时序
- 改变 skill 内容格式或 `<skill>` block 模板
- 增加用户可见的行为变更（正常路径下行为完全不变）

## Decisions

### 1. 独立文件系统索引而非修改 Pi 核心

**选择**: 在 extension 内部自建 skill 索引，扫描文件系统
**替代方案**: 修改 Pi 核心确保 `getCommands()` 始终在 `context` 前就绪

理由：修改 Pi 核心需要 PR 到上游，周期长且影响面大。extension 层自建索引是局部防御，无侵入性，可独立部署和回退。

### 2. 三层回退（getCommands → 缓存索引 → 即时扫描）

**选择**: 
- L1: `pi.getCommands()`（主路径，保持现有行为）
- L2: `_fileSystemSkillIndex`（`session_start` 时预建，O(1) 查找）
- L3: `buildFileSystemSkillIndex(cwd)`（即时扫描，兜底）

**替代方案**: 完全放弃 `getCommands()`，只用文件系统索引

理由：`getCommands()` 包含 package 安装的 skills（可能不在标准目录中），文件系统索引无法覆盖这些。保持 `getCommands()` 为主路径确保兼容性。

### 3. `session_start` 预建索引

在 `session_start` 时扫描 4 个目录构建完整的 `_fileSystemSkillIndex`。扫描逻辑复刻 Pi 的 `collectSkillEntries` 行为——递归查找 `SKILL.md`，遇到即停止该分支递归，从 YAML frontmatter 提取 `name` 字段。

### 4. Dedup 窗口从 1 扩大到 5

原有 dedup 只看 `messages[lastUserIdx + 1]`。如果 `before_agent_start` 或其他 extension 在用户消息后插入了一个或多个消息，skill 消息可能不在 `+1` 位置。

新逻辑扫描 `[lastUserIdx + 1, lastUserIdx + 5)` 范围，遇到 `role === "assistant"` 或 `role === "toolResult"` 时停止（这些标记着 agent 响应已开始，skill 消息不会在其后）。

## Risks / Migration

**风险**: 文件系统索引可能与 `getCommands()` 结果不一致（名称冲突、路径差异）
**缓解**: 文件系统索引仅作为 fallback 使用；如果 `getCommands()` 非空，文件系统索引不被查询。skill 名称从 YAML frontmatter 提取确保一致性。

**风险**: 大项目（数千文件）的目录扫描开销
**缓解**: 扫描仅限于已知的 `.agents/skills/` 和 `.pi/skills/` 目录（通常 < 100 个 SKILL.md 文件）；且仅在 `session_start` 执行一次。

**迁移**: 无需迁移。现有功能完全不受影响。新 extension 代码向后兼容。
