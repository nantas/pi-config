# Verification

## 验证结论

- **验证结果**：PASS（所有 Spec 要求与核心实现任务均在 Pi 1.6.0 真实运行时端到端验证通过）
- **验证目标**：`.pi/extensions/dollar-skill-invoke.ts`（基于 Pi 1.6.0 `@earendil-works/pi-coding-agent` 与 `@earendil-works/pi-tui` 真实加载与执行）
- **仓库配置评估**：`repo-settings-unchanged`（扩展自动从 `.pi/extensions/` 发现，且 `dollar-skill-invoke` 已声明于 `.pi/capabilities.yaml` 的 `global.extensions`，`.pi/settings.json` 无需变更）
- **全局同步状态**：`global-sync-confirmed-and-run`（已于 2026-11-21 经用户确认执行 `./scripts/sync-pi-agent.sh`，`diff -q .pi/extensions/dollar-skill-invoke.ts ~/.pi/agent/extensions/dollar-skill-invoke.ts` 确认完全一致）

## Spec-to-Implementation Coverage

| Requirement (`specs/dollar-skill-invoke/spec.md`) | 实现位置 | 验证结果 |
| --- | --- | --- |
| `First Dollar Skill Native Rewrite via Input Event` | `.pi/extensions/dollar-skill-invoke.ts` (`handleInputRewrite`, top-level `pi.on("input")`) | PASS — 句首单 skill（含参数/无参数/换行）移除句首 token 与原生 `/skill:` 输出一字不差；句中与多 skill 保留原文；`/` 开头、`source === "extension"`、未知与 `\$` 转义均跳过 |
| `Dollar Autocomplete Auto-Trigger Characters` | `.pi/extensions/dollar-skill-invoke.ts` (`createAutocompleteProvider.triggerCharacters`) | PASS — 实测组合后 `triggerCharacters` 为 `["@", "#", "$"]`，Pi 1.6.0 真实 `Editor` 实例已注册 `$` 并匹配 `$` 与 `帮我用 $noti` |
| `Dollar Skill Token Expansion` | `.pi/extensions/dollar-skill-invoke.ts` (`handleInputRewrite` + `handleContextInjection`) | PASS — 单 skill 走原生展开零重复；多 skill 首原生次 `context`；同名重复 skill 去重；`<skill>` 正文内 `$ponytail` 不级联误触发 |
| `Context Event Message Injection` | `.pi/extensions/dollar-skill-invoke.ts` (`handleContextInjection`) | PASS — 单 skill 原生展开后 `context` 返回 `undefined`；多 skill 第 2..N 个按序插入 `CustomMessage`；`/skill:`、`/prompt-template` 与 `source === "extension"` 绕过 `input` 后仍由 `context` 兜底注入 |
| `Skill Discovery with Stale Runtime Defense` | `.pi/extensions/dollar-skill-invoke.ts` (`getSkills`, `ensureFileSystemSkillIndex`, `findSkill`) | PASS — 缓存 `_lastKnownCommandSkills`；`session_start` 未执行且 `pi.getCommands()` 抛错时触发按需扫描并命中本地与包 skill |
| `Filesystem Skill Index Build on Session Start` | `.pi/extensions/dollar-skill-invoke.ts` (`buildFileSystemSkillIndex`, `scanPackagesFromSettings`, `addSkillFile`) | PASS — 覆盖 4 个标准目录 + `settings.json` 中的 git/npm/local packages（实测命中 `ponytail` 与 `imagegen`）；`parseFrontmatter()` 准确解析 CRLF、带引号、`description` 在 `name` 之前的 YAML |

## Task-to-Evidence Coverage

| Task (`tasks.md`) | 证据摘要 | 状态 |
| --- | --- | --- |
| 1.1 / 1.2 | 核对 Pi 1.6.0 `dist/index.d.ts`、`agent-session.js`、`editor.js` 与 `.pi/capabilities.yaml` | Done |
| 2.1 | 实现三层回退发现、按需扫描、`scanPackagesFromSettings` 与 `parseFrontmatter`；Fresh-process 实测 PASS 4 & PASS 5 | Done |
| 2.2 | 实现 `handleInputRewrite` 与顶层 `pi.on("input")`；Pi 1.6.0 管线实测 PASS 3a–3i | Done |
| 2.3 | 更新 `handleContextInjection` 接入 `parseSkillBlock()` 与 `alreadyExpanded` 去重；实测 PASS 3a–3h | Done |
| 2.4 | `createAutocompleteProvider` 暴露组合 `triggerCharacters`；实测 PASS 2 & PASS 6 | Done |
| 3.1 / 3.2 | 3 组真实 Pi 1.6.0 运行时验证脚本全绿（PASS 1–6）；完成 `.pi/settings.json` 评估（`repo-settings-unchanged`） | Done |
| 4.1 | 本验证文档已生成 | Done |
| 4.2 / 4.3 | 已完成全局同步、生成 `writeback.md` 并执行 OpenSpec 主 spec 同步与归档 | Done |

## 关键证据入口

| 证据类型 | 证据路径/链接 | 对应 requirement/task |
| --- | --- | --- |
| 扩展源码 | `.pi/extensions/dollar-skill-invoke.ts` | 全部 Requirements / Task 2.1–2.4 |
| Delta Spec | `openspec/changes/dollar-skill-invoke-native-first/specs/dollar-skill-invoke/spec.md` | 行为规范真源 |
| Pi 1.6.0 加载与管线实测 | `extLoader.loadExtensions` + `DefaultResourceLoader` + `createAgentSession` + `emitInput`/`_expandSkillCommand`/`emitContext`（PASS 1–3i） | Task 2.2, 2.3, 3.1 |
| Fresh-process 回退实测 | 独立 Node 进程跳过 `session_start` + 模拟 `getCommands()` 抛错 + CRLF/乱序 frontmatter + git/npm 包发现（PASS 4–5） | Task 2.1, 3.1 |
| Pi 1.6.0 Editor 实测 | `piTui.Editor.setAutocompleteProvider(wrapped)` 校验 `autocompleteTriggerCharacters` 包含 `"$"`（PASS 6） | Task 2.4, 3.1 |

## 缺口与阻塞项

- 无实现、测试或同步阻塞项。
