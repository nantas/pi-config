# Proposal

## 问题定义

LLM Agent 在日常开发中积累了大量的历史 Pi session，其中包含丰富的决策上下文、故障根因分析和代码变更记录。但当前 Pi 缺乏在 Agent 层面检索历史 session 的能力，Agent 无法通过工具调用查询之前会话中的相关信息，导致：

- 面对类似问题时需要重复调查
- 无法引用之前 session 中的分析结论
- 跨 session 的上下文碎片化

## 范围边界

**在范围内：**

- 实现基于 FTS5 的 per-entry 全文索引引擎，支持 JSONL session 文件的增量索引
- 注册三个 LLM 可调用的工具：`session-search`、`session-expand`、`session-read`
- 支持 HTML 导出文件的解析与索引（仅搜索，不支持 resume）
- 索引存储路径：`~/.pi/session-browse/index.db`
- Pi session 文件扫描范围：`~/.pi/agent/sessions/`（JSONL）+ `.pi/sessions/`（HTML export）

**不在范围内：**

- 不实现 UI 叠加层（Ctrl+Shift+F 搜索界面）—— 由后续 Change 2 覆盖
- 不实现 Session Resume 功能 —— 由后续 Change 2 覆盖
- 不实现 OpenRouter/API key 摘要功能
- 不索引 thinking blocks（含 ANSI codes，信噪比低）
- 不支持 HTML export 的 resume（无 JSONL 可恢复）
- 不 fork pi-session-search —— 仅作为参考实现，全部代码自主编写

## Capabilities

### New Capabilities

- `session-index-engine`: Per-entry FTS5 全文索引引擎，支持 JSONL session 文件的增量索引、文件发现、索引重建、项目名解析
- `session-retrieval-tools`: 三个 LLM 可调用工具：session-search（关键词搜索）、session-expand（turn 上下文展开）、session-read（原始内容读取）
- `html-export-support`: HTML 导出文件的 base64 解码、JSON 解析，以及将其 entries 融合到索引引擎的完整路径

### Modified Capabilities

无

## Impact

- **新增文件**: `.pi/extensions/session-browse/index.ts`、`indexer.ts`、`expander.ts`、`html-parser.ts`、`types.ts`、`package.json`
- **依赖新增**: `better-sqlite3`（原生模块，需子目录模式）
- **配置变更**: 无（extension 自动发现，无需 `.pi/settings.json` 修改）
- **磁盘存储**: `~/.pi/session-browse/index.db` 索引数据库，预估 ~30MB/100 sessions
- **无侵入**: 不修改 Pi 核心机制，不监听任何 Pi 内部事件，不覆写 UI 组件

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页 / 项目页 / 回写目标：
  - `spec_standard_ref`: `repo://orbitos/99_系统/Harness/OrbitOS_Spec_Standard/OrbitOS_Spec_Standard_v0.3.md`
  - `project_page_ref`: `openspec/` (pi-config OpenSpec workspace)
  - `writeback_targets`: `.pi/capabilities.yaml` → 注册到 `global.extensions`
