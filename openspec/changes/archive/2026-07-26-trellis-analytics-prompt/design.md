# Design

## Context

trellis-analytics extension（已在 neonspark 仓库部署）通过 hook Pi 的 tool_call/tool_result 事件捕获 agent 行为数据并写入 `.trellis/.analytics/` JSONL。该扩展提供了原始观测能力，但缺乏结构化的数据解读指导。

本 change 为之补充一个 `.pi/prompts/trellis-analytics.md` prompt 文件，在 agent 层面提供三方面能力：数据解码、指标计算、Trellis 工作流对照分析。该 prompt 不修改 extension 代码，不添加新工具，仅作为 agent 的行为指导。

## Goals / Non-Goals

**Goals:**

- 提供 JSONL 9 种事件类型的 schema 解码与 Trellis 语义映射
- 定义 6 项标准指标的计算公式（消费率、Phase 覆盖率、延迟分布、Invoke 响应率、Skill 结构、异常 Session）
- 定义时序对照法的 session 交叉验证流程
- 定义与 Trellis 工作流规范（trellis-start、workflow.md、rule-phase-gate-map.md）的对照分析方法
- 产出结构化优化建议："数据事实 → 对照规范 → 偏差 → 建议"

**Non-Goals:**

- 不修改 trellis-analytics.ts extension 的代码
- 不实现主动告警或数据可视化
- 不修改 Trellis 框架的任何组件
- 不提供 Pi tool 或用户命令（仅 prompt 文件）
- 不涉及跨 session 的数据聚合或趋势分析
- 不涉及 pi-config 仓库的全局同步

## Decisions

### D1: Prompt-as-Guide Architecture

本 prompt 不是可执行脚本或 tool，而是 agent 加载后可自行阅读理解的分析框架。通过 frontmatter `description` 和 `argument-hint` 暴露调用点，agent 在收到 analytics 分析请求时按需加载。

```
用户请求: "帮我分析这个 analytics 数据"
    │
    ▼
agent 识别到 .trellis/.analytics/ 路径
    │
    ▼
agent 加载 .pi/prompts/trellis-analytics.md
    │
    ▼
agent 按照 prompt 结构逐步执行分析
    │
    ▼
输出: 结构化分析报告
```

### D2: Three-Phase Analysis Workflow

prompt 定义三个分析阶段，agent 依次执行：

```
Phase 1: 数据加载与事件解码
  → 读取 JSONL → 按事件类型分类 → 解码 schema → 重建时间线

Phase 2: 指标计算
  → 消费率 / Phase 覆盖率 / 延迟 / Invoke 响应率 / Skill 结构 / 异常 Session
  → 按定义的阈值给出解释

Phase 3: Trellis 工作流对照与改善建议
  → 读取 trellis-start / workflow.md / rule-phase-gate-map.md
  → 对照 analytics 数据识别偏差
  → 输出 "事实 → 规范 → 偏差 → 建议" 结构化报告
```

### D3: Session Cross-Validation by Timeline Alignment

参考 specs/analytics-data-interpretation 中的时序对照法需求，prompt 定义三步交叉验证流程：

1. 从 analytics 中提取 key 事件的 timestamp 和 turn
2. 打开对应的 session JSONL 文件（路径来自 `session_start.data.sessionFile`）
3. 按 turn 轴对齐验证：
   - `context_injection_begin` → 在 session 中定位对应的 bash tool_call
   - `skill_load` → 在 session 中定位对应的 read SKILL.md tool_call
   - `reference_followed` → 在 session 中定位对应的 read 调用

验证完成后标注覆盖率（匹配事件数 / 总事件数）。

### D4: Interpretation Thresholds for Metrics

6 项指标各有 3 级阈值带，确保跨 task 的比较一致性：

| 指标 | 健康 | 需关注 | 异常 |
|------|------|--------|------|
| 消费率 | > 30% | 10-30% | < 10% |
| Phase 覆盖率 | 4/4 | 3/4 | ≤ 2/4 |
| 消费延迟 | < 10 回合 | 10-20 回合 | > 20 回合或无消费 |
| Invoke 响应率 | > 80% | 50-80% | < 50% |
| Trellis Skill 占比 | > 60% | 30-60% | < 30% |
| Session 异常 | — | — | 事件 < 3 或 shutdown < 60s |

### D5: Trellis Workflow Integration Points

prompt 引用以下 Trellis 工作流文件作为对照基线，这些文件在 neonspark 仓库中已存在：

| Trellis 文件 | 在 prompt 中的用途 |
|-------------|-------------------|
| `trellis-start/SKILL.md` Step 8-10 | Phase 序列对照（implement/check/finish 的预期顺序） |
| `workflow.md` Task Lifecycle | 全生命周期阶段映射 |
| `rule-phase-gate-map.md` | 门禁规则与 phase 的绑定关系 |
| `profiles/context-profiles.yaml` | Profile 选型与 context volume 的关联分析（可选） |

## Risks / Migration

### 风险

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| Trellis 工作流文件路径/结构变化 | prompt 中的引用失效 | prompt 使用相对路径引用，并在前置规则中要求 agent 验证文件存在性 |
| trellis-analytics extension 事件 schema 变化 | 指标计算口径偏差 | 指标定义使用事件语义而非固定 schema 字段；schema 变化需同步更新 prompt |
| agent 不遵循 prompt 的分析步骤 | 分析质量不一致 | prompt 使用 SHALL/MUST 规范语言，agent 执行时按需参考 |
| 用户提供不完整的 JSONL | 分析结果偏差 | 前置规则要求 agent 检查数据完整性（event 数量、session 边界）并标注缺失 |

### 迁移

- v1 是全新 prompt，无既有数据需要迁移
- 后续版本如需添加新事件类型，在 prompt 的 event-schema-decode 节追加，保持向后兼容
- 如需调整阈值，直接修改 design.md 的阈值表，再更新 prompt
