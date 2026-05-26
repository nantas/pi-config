# Binding

## 标准与项目页面绑定

- `spec_standard_ref`: `repo://pi-mono` — Pi extension SDK API (`packages/coding-agent/src/extensions/types.ts`) 和 pi-extension-dev skill 中的扩展开发规范
- `project_page_ref`:
  - `docs/plans/obsidian-search-issue-report.md` — 原始问题报告，包含用户搜索体验记录和初始根因推测
  - `docs/plans/obsidian-search-redesign.md` — 本 change 产出的最终设计文档（变更完成后写入）
  - `docs/reference/readme-governance.md` — README 能力描述更新治理
  - `.pi/capabilities.yaml` — 能力清单
- `additional_context_refs`:
  - `/Users/nantasmac/projects/my-wiki/docs/design/obsidian-search-tool-design.md` — my-wiki 仓库内的搜索工具使用参考（本 change 产出之一，需手动创建）
  - `/Users/nantasmac/projects/my-wiki/search-config.yaml` — vault 级搜索配置（本 change 实现产出）
  - `/Users/nantasmac/projects/my-wiki/schema/page-types.yaml` — my-wiki frontmatter schema（排名权重设计依据）
  - `/Users/nantasmac/projects/my-wiki/docs/specs/frontmatter-requirements.md` — my-wiki frontmatter 规范

## Source of Truth

- 行为规范真源：`specs/obsidian-search-tool/spec.md` — 包含工具接口契约、搜索流程、排名模型、配置 schema 的完整规范
- 项目页面角色：上下文输入 / 治理展示 / 结果回写
- 非真源说明：项目页面（issue-report、design 文档）不得替代 spec delta 作为实现与验证依据。`docs/plans/obsidian-search-issue-report.md` 作为问题发现上下文，不承担规范真源角色

## 回写目标

- `writeback_targets`:
  - `docs/plans/obsidian-search-issue-report.md` — 更新结论章节，标注根因已确认为"上游 Obsidian CLI bug + fallback rg 缺陷"，添加变更引用链接
  - `docs/plans/obsidian-search-redesign.md` — 写入完整 redesign 文档（基于 design.md 和 specs/ 的最终方案摘要）
  - `/Users/nantasmac/projects/my-wiki/docs/design/obsidian-search-tool-design.md` — my-wiki 仓库内搜索工具使用参考文档（配置说明、工具接口、使用指南）
- `writeback_owner`: nantasmac
- `writeback_timing`: 变更完成（all tasks done + verification passed）后统一回写

## 同步约束

- 页面与 spec 不一致时，以 `specs/obsidian-search-tool/spec.md` 为准
- 回写只同步结论、状态、摘要与链接，不复制整份 spec/design/tasks
- my-wiki 仓库的回写目标路径需确认 `docs/design/` 目录结构与现有文件（如 `my-wiki-capabilities.md`）的命名一致性

## 待确认项

- [x] 已确认标准页引用（pi-mono SDK types + pi-extension-dev skill）
- [x] 已确认项目页引用（issue-report + redesign doc）
- [x] 已确认回写目标（issue-report 更新 + redesign-doc 创建 + my-wiki 参考文档）
- [ ] my-wiki 未注册 `repo://my-wiki`，回写时需使用绝对路径 `/Users/nantasmac/projects/my-wiki/`
- [ ] `docs/plans/obsidian-search-redesign.md` 在写入前需与现有 plans 文档命名风格对齐（已有 `obsidian-search-issue-report.md` 使用 `obsidian-search-` 前缀）
