# Tasks

## 1. Spec 覆盖与实现准备

- [x] 1.1 确认三个 capability spec 的实现范围与边界（参考 binding.md 中 neonspark 仓库路径）
- [x] 1.2 确认依赖前置条件：neonspark 仓库存在 `.pi/prompts/` 目录（已有 `aidoc-reorg-module.md`）

## 2. 核心实现任务

### 2.1 Prompt 骨架与前置规则

- [x] 2.1.1 创建 `.pi/prompts/trellis-analytics.md` prompt 文件，包含 frontmatter（description、argument-hint）
  - 覆盖 specs/analytics-data-interpretation 的 jsonl-load-and-classify
  - 实现前置规则：参数解析（路径检测、缺失提问）和必须读取的 Trellis 上下文文件列表
- [x] 2.1.2 验证方式：agent 加载 prompt 后确认 frontmatter 正确、前置规则可执行

### 2.2 Event Schema Decode（analytics-data-interpretation）

- [x] 2.2.1 定义 9 种事件类型的 schema 解码表，覆盖 session_start/shutdown、skill_load、context_injection_begin/parsed/references、invoke_resolved、reference_followed
  - 覆盖 specs/analytics-data-interpretation 的 event-schema-decode 全部 7 个 scenario
  - 每条事件类型包含 schema、Trelli 语义、解读要点
- [x] 2.2.2 实现时间线重建指导
  - 覆盖 specs/analytics-data-interpretation 的 timeline-reconstruction
- [x] 2.2.3 验证方式：手动加载已知 JSONL 数据，确认每个事件类型都能按 prompt 指导正确解码

### 2.3 指标计算（workflow-efficiency-analysis）

- [x] 2.3.1 定义消费率计算公式与 3 级阈值（> 30% 健康 / 10-30% 需关注 / < 10% 异常）
  - 覆盖 specs/workflow-efficiency-analysis 的 consumption-rate-calculation
- [x] 2.3.2 定义 Phase 覆盖率计算公式
  - 覆盖 specs/workflow-efficiency-analysis 的 phase-coverage-calculation
- [x] 2.3.3 定义消费延迟分布计算方法
  - 覆盖 specs/workflow-efficiency-analysis 的 latency-distribution-calculation
- [x] 2.3.4 定义 Invoke 响应率计算公式
  - 覆盖 specs/workflow-efficiency-analysis 的 invoke-response-rate-calculation
- [x] 2.3.5 定义 Skill 结构分析方法
  - 覆盖 specs/workflow-efficiency-analysis 的 skill-structure-analysis
- [x] 2.3.6 定义异常 Session 检测标准
  - 覆盖 specs/workflow-efficiency-analysis 的 abnormal-session-detection
- [x] 2.3.7 验证方式：用真实 task analytics 数据（`05-13-demo-version-mode-select-gating`）验证 6 项指标的计算结果与预期一致

### 2.4 Session 交叉验证

- [x] 2.4.1 定义时序对照法的三步交叉验证流程
  - 覆盖 design.md D3（Session Cross-Validation by Timeline Alignment）
  - 从 analytics 提取 key 事件 → 打开 session JSONL → 按 turn 轴对齐
- [x] 2.4.2 验证方式：用 `05-13-demo-version-mode-select-gating` 的 task analytics 和对应 session 文件执行一次完整交叉验证，确认验证通过

### 2.5 Trellis 工作流对照分析（trellis-workflow-correlation）

- [x] 2.5.1 定义 Phase 跳检测（对照 trellis-start Step 8-10 序列）
  - 覆盖 specs/trellis-workflow-correlation 的 phase-skip-detection（含 check/debug 跳过检测）
- [x] 2.5.2 定义上下文规模评估（对照 profile 预期）
  - 覆盖 specs/trellis-workflow-correlation 的 context-volume-assessment
- [x] 2.5.3 定义 Invoke 机制有效性分析
  - 覆盖 specs/trellis-workflow-correlation 的 invoke-mechanism-analysis
- [x] 2.5.4 定义 Skill 偏移检测
  - 覆盖 specs/trellis-workflow-correlation 的 skill-drift-detection
- [x] 2.5.5 定义 Session 边界分析
  - 覆盖 specs/trellis-workflow-correlation 的 session-boundary-analysis
- [x] 2.5.6 定义结构化输出格式模板
  - 覆盖 specs/trellis-workflow-correlation 的 improvement-scoping-output-format（"发现 → 对照 → 偏差 → 建议"）
- [x] 2.5.7 验证方式：用已分析过的 `05-13-demo-version-mode-select-gating` 数据试运行，确认输出格式符合模板

### 2.6 Trellis 工作流文件引用

- [x] 2.6.1 在前置规则中声明必须读取的 Trellis 上下文文件
  - `.trellis/workflow.md` — 任务生命周期
  - `.agents/skills/trellis/trellis-start/SKILL.md` — 8 步工作流定义
  - `.trellis/spec/guides/rule-phase-gate-map.md` — 门禁规则
  - 覆盖设计 D5（Trellis Workflow Integration Points）
- [x] 2.6.2 验证方式：agent 按照前置规则读取上述文件，确认路径有效且内容可用于后续对照分析

## 3. 收敛与验证准备

- [x] 3.1 整理 verification 检查点：
  - prompt 加载后前置规则是否正确触发（路径检测 / 缺失提问）
  - 9 种事件类型的 schema 解码表完整性
  - 6 项指标的计算口径与预期一致
  - Session 交叉验证的时序对照法可执行
  - Trellis 工作流对照分析的 5 个维度覆盖率
  - 输出格式模板的一致性
- [x] 3.2 标记需要进入 writeback 的摘要与状态变更：
  - `.pi/prompts/trellis-analytics.md` 回写到 neonspark 仓库
  - 如 capabilities.yaml 需更新（检查 neonspark 的 `.pi/capabilities.yaml` 是否记录 prompts）

## 4. 验证与回写收敛

- [x] 4.1 基于真实实现结果生成或更新 verification.md（覆盖 spec-to-implementation 与 task-to-evidence）
- [x] 4.2 基于 verification.md 结论生成或更新 writeback.md（目标、字段映射、前置条件）
- [x] 4.3 执行 writeback.md 中定义的回写目标，并记录可审计证据（链接、时间、执行人、结果）
