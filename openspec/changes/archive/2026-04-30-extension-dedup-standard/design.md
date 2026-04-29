# Design

## Context

`dollar-skill-invoke.ts` 和 `planner-toggle.ts`（已修复）都存在被从全局和项目本地同时加载的问题。需要：
1. 修复 dollar-skill-invoke.ts
2. 将自去重模式写入 `pi-extension-dev` 技能，成为标准要求，避免后续扩展重蹈覆辙

## Goals / Non-Goals

**Goals:**
- 为 `dollar-skill-invoke.ts` 添加 `globalThis` 去重标记（复用已验证的模式）
- 更新 `pi-extension-dev` SKILL.md Phase D（Implementation Guidance），新增自去重要求

**Non-Goals:**
- 修复 `planner-toggle.ts`（已修复）
- 创建通用去重工具函数（模式足够简单，inline 即可）
- 修改同步脚本

## Decisions

### D1: 去重机制 — 复用 globalThis 模式

**理由:** 与 `planner-toggle.ts` 完全相同的模式，已验证可工作。使用以 `__pi_ext_` 为前缀的唯一键名。

### D2: 技能更新位置

**理由:** 在 `pi-extension-dev` SKILL.md 的 Phase D（Implementation Guidance）Step 1 之后，添加一条 Dedup Requirement 步骤，明确指出所有部署到全局的扩展必须包含自去重标记。

## Risks / Migration

| 风险 | 影响 | 缓解 |
|------|------|------|
| 新扩展遗漏去重要求 | 启动时出现冲突行为 | 在技能中明确列出此要求 |
| 旧扩展未处理 | 已有问题不被修复 | 仅在技能中标注，不强制回溯 |
