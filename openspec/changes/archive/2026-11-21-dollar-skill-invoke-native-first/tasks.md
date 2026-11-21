# Tasks

## 1. Spec 覆盖与实现准备

- [x] 1.1 核对 `specs/dollar-skill-invoke/spec.md` 与 Pi 1.6.0 运行时导出 API（`parseSkillBlock`、`parseFrontmatter`、`stripFrontmatter`、`AutocompleteProvider.triggerCharacters`、`input` / `context` 事件签名）
- [x] 1.2 确认 `.pi/settings.json` 与 `.pi/capabilities.yaml` 变更评估（`dollar-skill-invoke` 已注册于 `global.extensions`，无新增外部依赖）

## 2. 核心实现任务

- [x] 2.1 在 `.pi/extensions/dollar-skill-invoke.ts` 实现三层技能发现与强化文件系统索引：缓存 `_lastKnownCommandSkills`、实现按需文件系统扫描、扩展 `buildFileSystemSkillIndex` 覆盖 `settings.json` 中的 Pi packages（git/npm/local），并使用 `parseFrontmatter()` 提取 `name`
- [x] 2.2 在 `.pi/extensions/dollar-skill-invoke.ts` 实现 `handleInputRewrite` 并在扩展顶层单次注册 `pi.on("input", ...)`：句首单 skill 移除句首 token 重写为 `/skill:<name>`，句中或多 skill 保留原文作为 `/skill:<name>` 参数；跳过 `/` 开头与 `source === "extension"`
- [x] 2.3 更新 `.pi/extensions/dollar-skill-invoke.ts` 中的 `handleContextInjection`：使用 `parseSkillBlock()` 仅扫描 `userMessage`、跳过已展开的首个 skill、对剩余 `$skill-name` 按名去重后使用 `stripFrontmatter()` 注入独立 `CustomMessage`，无额外 skill 时返回 `undefined`
- [x] 2.4 更新 `createAutocompleteProvider` 组合声明 `triggerCharacters`（合并 `current.triggerCharacters` 与 `"$"`），支持 Pi 1.6.0 自动触发补全

## 3. 收敛与验证准备

- [x] 3.1 在 Pi 1.6.0 真实运行时上执行端到端验证（覆盖 `input` 重写、`_expandSkillCommand` 原生展开、`parseSkillBlock`、`context` 二次注入、同消息去重、`<skill>` 正文不级联触发、stale runtime 回退与包 skill 发现、on-demand 扫描、frontmatter 键序/CRLF 解析、`triggerCharacters` 与 `/` 过滤）
- [x] 3.2 评估仓库 `.pi/settings.json` 变更状态并按 `docs/pi-change-closeout-governance.md` 准备收尾记录

## 4. 验证与回写收敛

- [x] 4.1 基于真实实现与测试输出生成 `verification.md`（含仓库配置与全局同步状态记录）
- [x] 4.2 基于 `verification.md` 结论生成 `writeback.md`
- [x] 4.3 完成用户确认后的全局同步（`scripts/sync-pi-agent.sh`）并执行主 spec 同步与归档
