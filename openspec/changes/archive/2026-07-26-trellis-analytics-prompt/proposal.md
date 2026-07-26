# Proposal

## 问题定义

trellis-analytics extension（已部署在 neonspark 仓库）能够通过 hook Pi 的 tool_call/tool_result 事件捕获 agent 在工作流执行中的行为数据（skill 加载、phase context 注入、引用消费、invoke 响应等），并流式写入 `.trellis/.analytics/` JSONL 文件。但存在以下问题：

1. **数据解读无结构化指导**：JSONL 中的 9 种事件类型（session_start/skill_load/context_injection_parsed/invoke_resolved/reference_followed 等）各自的 schema、在 Trellis 工作流中的语义、跨事件关联的方式——缺乏统一的解读框架。每次分析 session 都从头摸索。

2. **指标计算不一致**：消费率、phase 覆盖率、延迟分布等关键指标没有标准定义，不同的 agent session 可能用不同口径计算，导致跨 task 不可比。

3. **改善方向与 Trellis 工作流脱节**：analytics 数据本身只记录"发生了什么"，但要定位"为什么"、确定"改什么"——需要与 Trellis 工作流规范（trellis-start 的 8 步序列、rule-phase-gate-map 的门禁规则、profile 选型与 phase JSONL 的内容结构）做对照分析。当前缺少这一桥接机制。

4. **Session 交叉验证方法缺失**：analytics 数据的正确性依赖 event hook 的可靠性，但没有标准化的 session 文件交叉验证流程来确认数据打点有无偏差。

## 范围边界

### Included
- 在 neonspark 仓库创建 `.pi/prompts/trellis-analytics.md` prompt 文件
- 定义 JSONL 9 种事件类型的 schema 解码与 Trellis 语义映射
- 定义 6 项关键指标的标准计算公式（消费率、Phase 覆盖率、延迟分布、Invoke 响应率、Skill 结构、异常 Session 检测）
- 定义时序对照法的 session 交叉验证流程
- 定义工作流改善分析的 5 个维度（Phase 跳检、上下文规模、Invoke 有效性、Skill 偏移、Session 生命周期）
- 引用 Trellis 工作流上下文文件（trellis-start/SKILL.md、workflow.md、rule-phase-gate-map.md）作为对照基线
- 输出格式模板："数据事实 → 对照规范 → 偏差 → 建议"

### Excluded
- 不修改 trellis-analytics.ts extension 的代码
- 不实现主动告警或数据可视化
- 不修改 Trellis 框架的任何组件
- 不涉及跨 session 的数据聚合或趋势分析（scope 限定在单 task 分析）
- 不提供 tool 或用户命令（纯 prompt 文件，由 agent 按需加载）
- 不涉及 pi-config 仓库的全局同步（prompt 文件仅部署到 neonspark）

## Capabilities

### New Capabilities
- `analytics-data-interpretation`: 结构化解码 trellis-analytics JSONL 的 9 种事件类型，建立事件 schema 与 Trellis 工作流阶段的语义映射
- `workflow-efficiency-analysis`: 从遥测数据中计算 6 项标准指标（消费率、Phase 覆盖率等），提供可量化的工作流效率评估基线
- `trellis-workflow-correlation`: 将 analytics 指标与 Trellis 工作流规范（trellis-start Step 序列、profile/phase 设计、gate 规则）做对照分析，定位偏差并产出优化建议

### Modified Capabilities
- 无（新增 prompt 文件，不修改既有能力）

## Capabilities 待确认项

- [x] 能力清单已与用户确认：上述三项已在设计方案讨论中达成一致

## Impact

### 新增文件
- `repo://neonspark/.pi/prompts/trellis-analytics.md` — Agent prompt 文件，部署到 neonspark

### 修改文件
- 无

### 无影响
- 不修改 trellis-analytics.ts extension
- 不修改 Trellis 框架的 SKILL.md、脚本、profile 注册表
- 不修改 pi 的 settings.json 或其他配置
- 不添加 npm 依赖

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页 / 项目页 / 回写目标：
  - 标准页：`repo://pi-config/openspec/changes/trellis-analytics-prompt` (specs, design, tasks)
  - 项目页：`repo://neonspark/.pi/prompts/trellis-analytics.md`
  - 回写目标：`repo://neonspark/.pi/prompts/trellis-analytics.md`
  - 关联工作流 SSOT：`repo://neonspark/.agents/skills/trellis/trellis-start/SKILL.md`、`repo://neonspark/.trellis/workflow.md`、`repo://neonspark/.trellis/spec/guides/rule-phase-gate-map.md`
