# Design

## Context

`install-from-pi-config` skill 是一个纯文档型 skill（SKILL.md），通过伪代码和文字描述指导 agent 如何从 pi-config catalog 安装能力到目标仓库。Phase 4 的扩展安装逻辑硬编码了目录结构假设，导致单文件扩展（`.ts`）无法安装。

修改目标：`.pi/skills/install-from-pi-config/SKILL.md`

## Goals / Non-Goals

**Goals:**
- Phase 4 扩展安装逻辑支持自动检测源是文件还是目录
- Phase 5（或新增 Phase 5b）支持扫描单文件扩展的 `import` 并安装缺失 npm 包
- Phase 6 验证逻辑支持单文件扩展的验证路径
- 保持向后兼容，目录扩展安装行为不变

**Non-Goals:**
- 不修改 catalog schema（不加 `is_single_file` 字段）
- 不修改 skill 安装逻辑（skill 目前全部是目录，不需要改）
- 不修改 Phase 4b settings-entry 安装逻辑
- 不实现通用依赖树解析（仅处理扩展文件中可直接检测的顶层 `import` 语句）

## Decisions

| 决策 | 选项 | 结论 | 理由 |
|------|------|------|------|
| 检测方式 | catalog 加字段 vs 安装时检测 | 安装时检测 | 用户明确选择方案 A；无需维护额外字段，减少遗忘 |
| 检测逻辑 | 先检查文件再检查目录 | 先检查文件 | 单文件检测更快（stat 单文件 vs stat 目录），且文件扩展更常见 |
| 修改范围 | 仅 Phase 4 + Phase 6 | Phase 4 + Phase 5 + Phase 6 | 依赖安装需要新阶段或扩展现有 Phase 5 |
| 依赖检测方法 | AST 解析 vs grep vs 手动清单 | `grep` 扫描 import | 单文件扩展 import 行可直接用 `grep -oP` 提取包名，无需 AST |
| 依赖安装位置 | 全局 `~/.pi/agent/npm/` vs 项目 `.pi/npm/` | 项目 `.pi/npm/` | 项目级安装避免污染全局，且不会与其他项目冲突 |
| 依赖安装方式 | 一次 `npm install pkg1 pkg2` vs 逐一安装 | 一次安装所有检测到的包 | `npm install` 支持批量，减少 shell 调用次数 |
| 阶段归属 | 扩展现有 Phase 5 vs 新增 Phase 5b | 扩展现有 Phase 5 | Phase 5 已负责 npm 操作，追加单文件场景更简洁 |

## Risks / Migration

- **风险极低**: 仅修改 SKILL.md 文档，不涉及运行时代码
- **潜在误检**: `grep` 可能匹配注释中的 import（如实测 `trellis-analytics.ts` 无注释 import），`import type` 不会触发运行时 require 但安装无害
- **无迁移**: catalog 和已有安装流程不受影响
