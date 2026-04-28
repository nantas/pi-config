# Proposal

## 问题定义

`Pi_Config` 已经明确为围绕 `pi agent` 的个人配置仓与扩展定制项目，但当前仓库缺少一份能够统一承接目标架构、能力分层、外部参考分层、以及后续 extension 演进方法的 OpenSpec change。现状使后续的 `MCP`、`subagent`、自动化脚本、参考仓收集与 extension 工作流容易分散在研究记录中，难以形成一个稳定的实施入口。

本次 change 需要把“整体定制目标规划文档”沉淀为正式工件，使后续所有实现类 change 都能基于统一蓝图推进，而不是继续以零散研究笔记代替规划真源。

## 范围边界

本次 change 只定义 `Pi_Config` 的整体定制蓝图与对应工件，不实现任何 `pi` 扩展能力，不编写安装脚本，不接入外部 extension，也不替代既有 OpenSpec 工件流程。

纳入范围的内容包括：

- 本仓库作为个人配置中枢与可复用 extension 孵化母仓的双重角色
- `~/.pi/agent/`、项目 `.pi/`、`.agents/skills/`、`.mcp.json` 等层次的职责边界
- `subagent`、`MCP`、扩展安装/配置自动化、参考仓收集、extension 产出/引入工作流的目标定义
- 后续专题拆分与实施阶段应遵循的演进顺序与决策原则

不纳入范围的内容包括：

- 任一具体 extension、脚本、theme、agent definition 的实现
- 具体目录结构与文件模板的最终实现细节
- OpenSpec 之外的任务工件治理流程

## Capabilities

### New Capabilities
- `pi-customization-blueprint`: Define the repository-wide blueprint for Pi Config goals, layering, capability domains, reference stratification, and phased evolution.
- `pi-extension-lifecycle-guidance`: Define a lightweight guidance model for evaluating, introducing, authoring, and deploying Pi-related extensions without replacing OpenSpec execution artifacts.
- `pi-reference-curation-model`: Define how Pi config repositories, Pi extensions, and adjacent ecosystem samples are collected, classified, and promoted into planning decisions.

### Modified Capabilities

## Capabilities 待确认项

- [x] 能力清单已与用户确认：用户于 `2026-04-28` 选择“三项能力”，要求把参考仓/参考 extension 的收集与分层单独建模

## Impact

- 为后续 `MCP`、`subagent`、自动化脚本与 extension 相关 change 提供统一的规划入口
- 把研究文档中的高层结论沉淀为可追踪、可验证、可拆分的 OpenSpec 工件
- 降低后续在“本仓库职责边界”“共享与 Pi 专属资源落位”“引入开源 extension 的准入方式”上的重复决策成本

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页 / 项目页 / 回写目标：
  - `repo://orbitos/99_系统/Harness/OrbitOS_Spec_Standard/OrbitOS_Spec_Standard_v0.3.1.md`
  - `repo://orbitos/20_项目/Pi_Config/Pi_Config.md`
  - `repo://orbitos/20_项目/Pi_Config/项目进度总览.md`
