# Specification Delta

## Capability 对齐（已确认）

- Capability: `global-agent-guidance`
- 来源: `proposal.md` / 已确认 capabilities
- 变更类型: modified
- 用户确认摘要: 确认 global-agent-guidance 管 `.pi/agent/AGENTS.md` 编辑工具指导从 snap-edit 回退到原生 edit，并固化防回归约束

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## MODIFIED Requirements

### Requirement: tool-call-guidelines-sections
AGENTS.md 的 Tool Call Guidelines MUST 包含 `### Edit Tool` 子 section（原生 edit，oldText/newText 模型），MUST NOT 包含任何引用 `quick_edit`、`target_edit`、`pi-snap-edit` 或「行号定位编辑」「精确文本定位编辑」模型的指导。Tool Call Guidelines 的子 section 顺序 SHALL 为：Edit Tool → Bash Tool → Error Recovery → Web Search。Edit Tool 子 section MUST 包含调用前三项自检作为硬约束。

#### Scenario: agent 读取 AGENTS.md 工具指导
- **WHEN** agent 读取 AGENTS.md 的 Tool Call Guidelines 区域
- **THEN** 看到原生 `### Edit Tool` 子 section，内容为 oldText/newText 模型
- **THEN** 不应看到任何 `quick_edit` / `target_edit` / `pi-snap-edit` 或行号定位编辑的引用

#### Scenario: edit 调用前自检
- **WHEN** agent 准备调用原生 `edit` 工具
- **THEN** AGENTS.md 强制三项自检：`path` 是顶层字段、每条 `oldText`/`newText` ≤ 200 字符、单次 ≤ 4 条 edits
- **THEN** 超过任一阈值时改用 `bash` + `sed` / `awk`

### Requirement: fff-edit-workflow-mapping
AGENTS.md 的 `### 编辑工作流（发现 → 修改）` section MUST 将检索后的编辑场景映射到原生工具：小范围精确替换（≤200 字符）用 `edit` tool，大范围替换/多文件/跨文件重命名用 `bash` + `sed`，批量 checkbox 用 `bash` + `sed -i ''`。该 section MUST NOT 引用 `quick_edit`、`target_edit` 或 `pi-snap-edit`。fff section 的检索指导（ffgrep/fffind 决策表、使用原则、反模式）不受本次变更影响。

#### Scenario: agent 面对编辑任务
- **WHEN** agent 通过 fff 完成检索后需要修改代码
- **THEN** AGENTS.md 编辑工作流表将场景映射到 `edit` tool 或 `bash` + `sed`
- **THEN** 不应出现 `quick_edit` / `target_edit` 作为推荐工具

## REMOVED Requirements

### Requirement: snap-edit-tool-guidance
**Reason**: `pi-snap-edit` 从全局能力移除，session 启动不再替换内置 `edit`，`quick_edit` / `target_edit` 工具不再活跃。其行号模型 + 行首守卫 + 精确文本定位模型放大 LLM 构造错误的影响面，产生整段代码损坏（详见 `docs/plans/snap-edit-tool-issues-report.md`）。
**Migration**: 编辑指导回退到原生 `edit`（oldText/newText 模型），配合「≤200 字符 / ≤4 条 edits / 超过转 bash+sed」硬约束兜住 token 开销回升。
