# Writeback — obsidian-tools

## 目标

- `writeback_target`: `repo://orbitos/20_项目/Pi_Config/项目进度总览.md`
  → 物理路径: `/Users/nantas-agent/projects/obsidian-mind/20_项目/Pi_Config/项目进度总览.md`
- `writeback_owner`: pi-config change owner
- `writeback_timing`: verification 完成后

## 字段映射

| 回写字段 | 值 |
|---------|-----|
| 功能/变更 | obsidian-tools — obsidian_search / obsidian_cli tools + obsidian-search skill |
| 状态 | 实现完成，待归档 |
| 新增文件 | 7 个（3 extension .ts + package.json + 5 module .ts + 1 skill .md） |
| 交付物摘要 | 注册两个 tool（obsidian_search + obsidian_cli），配套 vault 自动解析（显式/cwd/报错）、cli-runner（spawn + 超时 + fallback）、完整检索管线（召回→排序→扩展→降级→打包），以及 obsidian-search skill |
| 关联链路 | `openspec/changes/obsidian-tools/` — binding / proposal / specs / design / tasks / verification / writeback |
| 前置依赖 | 无（纯新增，无现有文件修改） |

## 前置条件

- [x] verification.md 已生成（覆盖 spec-to-implementation task-to-evidence）
- [x] 所有 38/40 个实现 task 已完成
- [x] 新增 7 个文件全部在正确位置
- [x] Pi extension API 格式正确（已按 `@mariozechner/pi-coding-agent` 规范调整）

## 回写内容

将以下摘要写入 `repo://orbitos/20_项目/Pi_Config/项目进度总览.md` 的 obsidian-tools 条目：

```markdown
### obsidian-tools (obsidian_search + obsidian_cli)

**状态**: ✅ 实现完成（38/40 tasks），待归档
**交付**: `pi-config` repo 内新增 obsidian-tools extension（7 文件）
  - `obsidian_search` — 智能 vault 检索 tool，含并行召回/排序/扩展/降级/输出打包
  - `obsidian_cli` — 命令透传 tool，含输入校验/危险命令门禁/超时控制
  - `obsidian-search` skill — 触发条件/query 优化/模式选择/结果消费/路由协作指导
  - `vault-resolver` — 三级 vault 解析（显式→cwd→报错）+ known vaults preload
  - `cli-runner` — spawn 封装（ENOENT fallback/SIGTERM 超时/AbortSignal）
**文件**: `.pi/extensions/obsidian-tools/`（6 文件）+ `.pi/skills/obsidian-search/SKILL.md`
**替代关系**: 替代 `repo://orbitos/.agents/skills/obsidian-cli/`（旧 skill 需停用）
**关联**: `openspec/changes/obsidian-tools/`
```

## 回写签名

- 执行人: pi-agent (pi-config session)
- 时间: 2026-05-01
- 审计链接: `openspec/changes/obsidian-tools/verification.md`
