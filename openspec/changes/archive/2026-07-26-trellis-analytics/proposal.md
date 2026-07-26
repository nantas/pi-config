# Proposal

## 问题定义

在 neonspark 仓库的 Trellis 框架执行流程中，agent 的行为常常偏离预期的工作流设计，但缺乏系统化的观测手段来定位偏差。具体问题包括：

1. **工作流执行不可见**：agent 执行 trellis-start / trellis-brainstorm / close-task 时，各步骤是否按 SKILL.md 的顺序执行、是否跳过了关键步骤，完全靠人工在 session 中观察
2. **上下文注入效果不可追踪**：`trellis-load-phase-context` 将 phase JSONL 中的文件内联为一段文本输出给 agent，但无法判断 agent 是否阅读了其中引用的 skill 和文件，也无法判断 invoke 指令是否被响应
3. **非 trellis skill 的影响不可见**：phase context 注入的 invoke skill（如 gitnexus-debugging、gitnexus-refactoring）和用户 prompt 引入的其他 skill 可能引起工作流偏移，但现有机制没有任何记录
4. **分析依赖事后复盘**：缺乏结构化的遥测数据，调试工作流行为只能翻 session 日志，效率低且难以量化

## 范围边界

### Included
- 在 neonspark 仓库安装一个 Pi catalog extension（`trellis-analytics.ts`），通过 hook `tool_call` 和 `tool_result` 事件被动观测 agent 行为
- 追踪所有 skill 的加载（不限于 trellis 命名空间），记录 skill 名称、路径、时间戳
- 捕获 `trellis-load-phase-context` 命令的输出，解析内联文件列表、mode 分类、invoke 指令
- 追踪 agent 是否读取了 phase context 内联文本中引用的 skill 和文件
- 流式写入 `.trellis/.analytics/` JSONL 文件，支持跨 Pi session 续写同一 task
- 注册 `trellis_analytics` Pi tool 用于查询分析数据

### Excluded
- 不进行主动偏移告警或阻断 agent 行为（被动记录模式）
- 不追踪代码符号引用（如类名 `ShellBootstrapper` 被引用但未读取）
- 不实时解析 `tool_result` 的完整输出内容（只提取结构化头部信息，避免膨胀）
- 不修改 Trellis 框架本身的任何组件
- 不提供 `/trellis-analytics` 用户命令（v1 仅提供 tool，后续可按需增加）
- 不涉及跨仓库的全局部署（只作为 neonspark 的 catalog extension）

## Capabilities

### New Capabilities
- `workflow-observability`: 全量 skill 加载追踪，记录 agent 在 session 中加载的所有 skill（含 trellis/gitnexus/openspec/ 等），按 namespace 分类
- `context-consumption-tracking`: 捕获 `trellis-load-phase-context` 输出，解析内联文件列表、mode 分类和 invoke 指令；追踪 agent 是否读取了引用的 skill 和文件
- `streaming-persistence`: 实时流式写入 `.trellis/.analytics/` JSONL 文件，支持跨 Pi session 续写同一 task 的遥测记录
- `analysis-tool`: 注册 `trellis_analytics` Pi tool 用于查询 session 和 task 粒度的遥测数据

### Modified Capabilities
- 无（新增扩展，不修改既有能力）

## Capabilities 待确认项

- [x] 能力清单已与用户确认：上述四项已在设计方案讨论中达成一致

## Impact

### 新增文件
- `repo://neonspark/.pi/extensions/trellis-analytics.ts` — 扩展主文件（单文件，无额外 npm 依赖）
- `repo://neonspark/.trellis/.analytics/tasks/<task-slug>/events.jsonl` — 按 task 的遥测事件文件（运行时自动创建）
- `repo://neonspark/.trellis/.analytics/orphans/<session-id>.jsonl` — 无活跃 task 时的遥测事件文件（运行时自动创建）

### 修改文件
- `.pi/capabilities.yaml`（pi-config 仓库）— 在 `catalog.extensions` 中添加 trellis-analytics 条目

### 无影响
- 不修改 Trellis 框架的 SKILL.md、脚本、profile 注册表
- 不修改 pi 的 settings.json 或其他配置
- 不添加 npm 依赖

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页 / 项目页 / 回写目标：
  - 标准页：`.pi/skills/pi-extension-dev/SKILL.md`
  - 项目页：`repo://neonspark/.pi/extensions/trellis-analytics.ts`
  - 回写目标：`repo://neonspark/.trellis/.analytics/`
  - 关联工作流 SSOT：`repo://neonspark/.agents/skills/trellis/*/SKILL.md`
