# Design

## Context

pi-coding-agent 默认只支持文本搜索（grep/rg）进行代码导航。`lsp-pi` 包通过 pi 扩展系统注册了一个 `lsp` tool（9 种语义操作）和一个 `lsp.ts` hook（自动诊断），可为 agent 提供 IDE 级别的代码分析能力。需要先解决两个问题：安全审查确保包无恶意代码，以及创建 TypeScript 配置使 LSP 能正确解析项目内的扩展源码。

## Goals / Non-Goals

**Goals:**

- 完成 `npm:lsp-pi` 的全流程安全审查、安装、测试、全局同步
- 创建 `tsconfig.json` 使 LSP 能解析 `.pi/extensions/` 中的 TypeScript 代码
- 将决策记录写入 `openspec/pkg-backlog.md`

**Non-Goals:**

- 不修复已有扩展的类型错误
- 不创建新扩展
- 不修改 pi 运行时配置的其它方面

## Decisions

### 1. 使用 `npm:lsp-pi` 而非从 git 安装

包已发布到 npm registry（v1.0.4），`pi install -l npm:lsp-pi` 即可安装。源码审查通过 git clone 进行，不依赖 npm 的盲装。

### 2. tsconfig 路径引用指向 `.pi/npm/node_modules/@mariozechner/`

pi SDK 类型（`pi-ai`、`pi-coding-agent`、`pi-tui`、`pi-agent-core`）通过 lsp-pi 的 peer 依赖安装到项目本地，使用 `paths` 映射确保 TypeScript 能找到 `.d.ts` 文件。

### 3. 使用 `ignoreDeprecations: "6.0"` 保留 `baseUrl`/`paths`

TypeScript 5.9+ 废弃 `baseUrl`，但 `paths` 仍是最简洁的本地类型引用方案，添加忽略标记避免构建警告。

### 4. `noEmit: true`

pi 运行时通过 `tsx` 直接加载 TypeScript 源码，不需要编译步骤。

## Risks / Migration

- **类型版本不一致风险**: 本地安装的 pi SDK 版本（v0.50.9）可能落后于全局 pi 运行时（v0.70.6），导致扩展代码中使用的新 API 在类型检查中报错。不影响运行时功能，但会在开发时产生误报。
- **`baseUrl` 废弃**: TypeScript 7.0 将移除 `baseUrl`，需要届时迁移到 `rootDirs` 或 `paths` + `declarationMap` 方案。
