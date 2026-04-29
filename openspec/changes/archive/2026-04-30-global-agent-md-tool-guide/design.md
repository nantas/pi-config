# Design

## Context

本 change 建立一套项目管理的全局 agent 指导机制。Pi 原生支持从 `~/.pi/agent/AGENTS.md` 加载全局 context 指令，但当前项目中：

- 该文件不存在，`~/.pi/agent/` 下也无此文件
- 同步脚本 `scripts/sync-pi-agent.sh` 管理的映射中不包含 AGENTS.md
- 根 `AGENTS.md` 未定义更新全局指导的工作流

实现方案：创建一个项目可管理的 `.pi/agent/AGENTS.md`，通过更新同步脚本来部署到全局，并在根 `AGENTS.md` 中锁定工作流规则。

## Goals / Non-Goals

**Goals:**
- 创建 `.pi/agent/AGENTS.md`，写入工具调用指导（edit/bash 使用规则、错误恢复）
- 更新 `scripts/sync-pi-agent.sh`，使 `./pi/agent/AGENTS.md` 同步到 `~/.pi/agent/AGENTS.md`
- 更新根 `AGENTS.md`，添加"更新全局 agent 指导"工作流规则

**Non-Goals:**
- 管理 `.pi/agent/` 下的其他文件（SYSTEM.md、APPEND_SYSTEM.md 等）
- 通过 extension 动态注入 tool call 指导
- 自动校验或 lint 全局指导内容

## Decisions

### D1: 同步方式 — 在 sync-pi-agent.sh 中增加 AGENTS.md 专用同步步骤

**理由:** 现有 MAPPINGS 数组中的 `file` 类型调用 `render_settings_file()` 对 AGENTS.md 做 JSON 处理，会破坏纯文本文件。因此需要独立的同步逻辑，直接从 `.pi/agent/AGENTS.md` cp 到 `~/.pi/agent/AGENTS.md`，并在源文件不存在时清理目标文件。

### D2: .pi/agent/ 目录结构

**理由:** `.pi/agent/` 作为项目管理的 Pi agent 配置目录，与 Pi 原生的 `~/.pi/agent/` 全局目录结构对应。此目录仅放 AGENTS.md，未来可按需扩展其他文件。

### D3: 同步前用户确认

**理由:** 遵循现有 AGENTS.md 中 `global-runtime-sync-confirmation` 规则，任何对 `~/.pi/agent/` 的变更都需要用户明确确认后才执行同步脚本。

### D4: 工具调用指导的定位

**理由:** 作为 agent 行为约束而非 system prompt 的一部分。放在 AGENTS.md 中作为 context 注入，而非替换或追加 system prompt（SYSTEM.md / APPEND_SYSTEM.md），这样：
- 与项目级 AGENTS.md 格式统一
- 可通过 `--no-context-files` 临时关闭
- 不破坏默认 system prompt

## Risks / Migration

| 风险 | 影响 | 缓解 |
|------|------|------|
| 已有全局 AGENTS.md 被覆盖 | 用户自定义全局指令丢失 | 同步前确认；同步脚本只在源文件存在时写入 |
| .pi/agent/ 目录创建但 gitignore | 文件不被版本管理 | 确保 `.pi/agent/` 下文件被 git track（无 .gitignore 排除） |
| 工具调用规则过时 | agent 遵循过时指导 | 通过 AGENTS.md 工作流规则确保更新走版本管理流程 |
