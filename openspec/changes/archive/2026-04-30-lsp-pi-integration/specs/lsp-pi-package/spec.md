# lsp-pi-package — LSP 集成扩展安装与全局配置

## 概要

调研、安全审查、安装并全局同步 `npm:lsp-pi` 包，为 pi-coding-agent 提供 LSP 协议集成能力。

## 验收标准

1. 完成安全审查（Phase 1）：源码克隆审查，无恶意模式，用户确认通过
2. 安装 TypeScript 语言服务前置依赖
3. 项目级安装 lsp-pi 并通过单元测试（69+18=87 用例全部通过）
4. 集成测试验证 TypeScript 诊断对本仓库有效
5. 写入 `openspec/pkg-backlog.md` 持久记录
6. 通过 `scripts/sync-pi-agent.sh` 同步到全局 `~/.pi/agent/settings.json`

## 非目标

- 不修改已有扩展代码
- 不涉及 LSP 内置配置调优

## 同步约束

- 全局同步需用户确认后通过 `scripts/sync-pi-agent.sh` 执行
