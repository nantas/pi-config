# Design

## Context

pi-config 仓库目前已有完整的 README、AGENTS.md、capabilities.yaml 和 pi-provider-model.md 等文档，但缺乏一个面向初学者的系统性入门指引。本次 change 通过创建独立的 `docs/getting-started.md` 文档，并在 README 和 AGENTS.md 中增加引用，解决初学者上手门槛问题。

## Goals / Non-Goals

**Goals:**
- 创建独立的 `docs/getting-started.md`，提供六步入门工作流
- 在 `README.md` 最开头增加「新手上路」引用章节
- 在 `.pi/agent/AGENTS.md` 中增加初学者配置情景的引用
- 确保文档内容与现有 `capabilities.yaml` 和 `pi-provider-model.md` 保持一致

**Non-Goals:**
- 不修改任何扩展、skill、agent 的实现代码
- 不修改 `capabilities.yaml` 的能力清单内容
- 不修改 `.pi/settings.json` 的默认配置
- 不创建新的自动化脚本或工具
- 不涉及 Pi 核心功能的变更

## Decisions

| # | 决策 | 理由 |
|---|------|------|
| 1 | `docs/getting-started.md` 作为独立文档，而非直接嵌入 README | 保持 README 作为能力索引的简洁性，入门文档内容较长，独立文件更便于维护和引用 |
| 2 | 自定义供应商示例使用企业代理 / API 网关场景，而非 Ollama | Ollama 属于本地部署特例，企业代理/API 网关更具通用性，覆盖更多初学者场景 |
| 3 | `install-from-pi-config` 明确标注为"在其他仓库执行" | 避免初学者误以为在本仓库内执行该命令，消除认知混淆 |
| 4 | OpenSpec 工作流入口指向 `.pi/prompts/` 安装的 prompt 命令（如 `/opsx-new`） | 与当前 Pi 实际使用方式一致，`.agents/skills/` 是 skill 定义目录，不是运行时入口 |
| 5 | AGENTS.md 的引用放在「Pi 供应商与模型配置」节内扩展，而非新建独立节 | 该节已覆盖模型配置相关情景，扩展引用更自然，不增加 agent 上下文负担 |

## Risks / Migration

| 风险 | 缓解措施 |
|------|----------|
| `capabilities.yaml` 内容变化后 `docs/getting-started.md` 中的能力清单过时 | 在文档中添加注释说明"以 `.pi/capabilities.yaml` 为准"；在 README 维护工作流中增加检查项 |
| AGENTS.md 同步到全局后，旧版本 Pi 可能不支持某些链接格式 | 使用相对路径引用，确保兼容性；避免使用需要特定运行时支持的链接语法 |
| 初学者文档过于冗长，反而增加认知负担 | 保持六步结构清晰简洁，每步聚焦单一行动，详细配置参数通过外部链接引用 |
