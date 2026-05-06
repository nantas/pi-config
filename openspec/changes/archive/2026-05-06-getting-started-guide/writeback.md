# Writeback

## 回写目标

| 目标文件 | 变更类型 | 状态 |
|----------|----------|------|
| `repo://pi-config/docs/getting-started.md` | 新增 | ✅ 已完成 |
| `repo://pi-config/README.md` | 修改 | ✅ 已完成 |
| `repo://pi-config/.pi/agent/AGENTS.md` | 修改 | ✅ 已完成 |

## 回写内容摘要

### docs/getting-started.md（新增）
- 六步入门工作流文档
- 涵盖：配置供应商（login + 自定义代理示例）、enabledModels、能力清单确认、同步范围确认、全局同步命令、环境验证清单
- 自定义供应商示例使用企业代理 / API 网关（非 Ollama）
- install-from-pi-config 明确标注为"在其他仓库执行"
- OpenSpec 工作流入口指向 `.pi/prompts/` 的 prompt 命令

### README.md（修改）
- 在标题和短描述之后、「架构分层概览」之前插入「新手上路」章节
- 包含指向 `docs/getting-started.md` 的链接和六步概述

### .pi/agent/AGENTS.md（修改）
- 在「Pi 供应商与模型配置」节内新增「初学者首次配置」子节
- 引用 `docs/getting-started.md` 作为完整入门工作流指南

## 执行记录

- **执行时间**: 2026-05-06
- **执行方式**: 直接编辑目标文件（仓库内部文件，无需跨仓库回写）
- **执行人**: Agent (pi session)
- **验证状态**: 已通过 verification.md 验证

## 后续行动

- [ ] 提交变更到版本管理
- [ ] 用户确认后执行 `scripts/sync-pi-agent.sh` 将 AGENTS.md 同步到全局运行时
