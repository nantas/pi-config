# Design

## Context

Session 替换时 pi 的 `loadExtensions` 通过 jiti (`moduleCache: false`) 重新执行 extension 模块，但 extension 使用 `globalThis` 标志位做自去重（防止 project-local + global 双重加载），该标志位跨 session 持久存在，导致 factory function 在二次加载时提前 return。

## Goals / Non-Goals

**Goals:**
- 建立 extension 层面的修复方案：在 `session_shutdown` 事件中清除 `globalThis` 去重标志位
- 更新 `pi-extension-dev` skill 规范，强制要求 dedup 模式必须配合 `session_shutdown` 清理
- 创建参考文档记录该模式的技术细节
- 修复当前受影响的 extension（dollar-skill-invoke、planner-toggle）

**Non-Goals:**
- 不修改 pi-mono 核心源码
- 不修改 jiti 加载机制
- 不修改 `DefaultResourceLoader.reload()` 逻辑
- 不引入新的 ExtensionAPI 方法

## Decisions

### D1: session_shutdown 作为清理入口

选择 `session_shutdown` 事件（而非 `session_before_fork`、`session_before_switch` 等其他事件），因为：
- `session_shutdown` 在所有 session 替换路径（`/new`、`/reload`、`/resume`）中都会触发
- 执行时序在 `teardownCurrent()` 中，早于新 session 的 `loadExtensions`，满足时序要求
- 语义匹配：当前 session 结束，extension 应清理 session 级状态

### D2: 仅在 extension 层面修复

不修改 pi-mono 源码的理由：
- pi core 不假设 extension 如何使用 `globalThis`；在 core 中扫描并清除 `__pi_ext_*_loaded` 模式是脆弱的约定
- extension 作者最了解自己的 dedup key 命名
- `session_shutdown` 是 pi 已经暴露的标准事件，extension 可以利用

### D3: 新增参考文档而非仅修改 skill

将技术原理（时序图、globalThis vs moduleCache false 的关系）放在独立的 `docs/reference/pi-extension-session-shutdown-dedup.md` 中，skill 文件引用该文档。这样避免 skill 文件过于膨胀，且参考文档可被其他上下文（如 troubleshooting）引用。

## Risks / Migration

- **风险**: 如果 extension 的 `session_shutdown` handler 中清除标志位后，同一 load cycle 中 project-local 和 global 路径均加载，会再次双重注册 → **已缓解**: `globalThis` 标志位在 factory 执行后立即重新设置，同一 load cycle 中第二个路径仍会被 dedup 阻止
- **风险**: 第三方 extension 未遵循此规范，session 替换后功能失效 → **非本次 scope**: pi 不会崩溃或报错；extension 作者需要自行适配
- **迁移**: 现有 extension 只需添加 3 行代码（`pi.on("session_shutdown", () => { delete (globalThis as any)[_key]; })`），零依赖变更
