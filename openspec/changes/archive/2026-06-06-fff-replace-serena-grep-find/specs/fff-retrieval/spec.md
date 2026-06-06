# Specification Delta

## Capability 对齐（已确认）

- Capability: `fff-retrieval`
- 来源: `proposal.md` / 已确认 capabilities
- 变更类型: new
- 用户确认摘要: 用 fff（ffgrep + fffind）完全替代 serena MCP + 内置 grep/find 作为全局默认检索工具，接受效率换准确性

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: fff-default-retrieval
当 ffgrep 和 ffffind 工具可用时，agent MUST 将它们作为代码检索和文件定位的默认工具，替代内置 `grep`、`find` 和任何 LSP 语义检索工具。

#### Scenario: agent 需要在代码中搜索特定模式
- **WHEN** agent 需要搜索代码内容（函数定义、变量使用、字符串匹配等）
- **THEN** MUST 使用 `ffgrep` 而非内置 `grep` 或 serena 的 `search_for_pattern`

#### Scenario: agent 需要定位文件或路径
- **WHEN** agent 需要根据名称、路径模式或概念查找文件
- **THEN** MUST 使用 `fffind` 而非内置 `find` 或 `ls`

### Requirement: ffgrep-usage-guidelines
Agent 使用 ffgrep 时 MUST 遵循以下原则：

#### Scenario: 构造搜索 query
- **WHEN** agent 构造 ffgrep 搜索 query
- **THEN** MUST 使用 1-2 个核心关键词，不使用自然语言长句
- **THEN** 应优先使用 bare identifier 作为 pattern（最精确）
- **THEN** MUST 使用 `path` 参数限定目录范围（如已知目标在 `src/` 下）

#### Scenario: 控制搜索范围
- **WHEN** 搜索目标扩展名明确
- **THEN** MUST 使用 `path` 参数指定路径约束（目录前缀、裸文件名、或 glob）
- **THEN** SHOULD 使用 `exclude` 参数排除噪声（如 `test/`、`*.min.js`）

#### Scenario: 处理搜索结果
- **WHEN** ffgrep 返回匹配结果
- **THEN** 对 top match 使用 `read` 工具读取完整内容，而非继续多次 grep 缩小范围

### Requirement: fffind-usage-guidelines
Agent 使用 fffind 时 MUST 遵循以下原则：

#### Scenario: 文件定位查询
- **WHEN** agent 需要定位文件
- **THEN** MUST 使用 1-2 个关键词的模糊查询
- **THEN** MUST 使用 `path` 参数限定范围（目录前缀、裸文件名、或 glob）
- **THEN** SHOULD 使用 `exclude` 排除噪声目录

#### Scenario: 已知精确文件名
- **WHEN** agent 已知目标文件的完整名称
- **THEN** MUST 使用 `path` 参数的 glob 模式精确定位（如 `path: '**/profile.h'`）

### Requirement: fff-editing-workflow
fff 发现目标后的代码编辑 MUST 使用 `edit` tool 或 `bash sed`，不依赖任何 LSP 语义编辑工具。

#### Scenario: 找到目标后执行修改
- **WHEN** agent 通过 fff 定位到需要修改的代码
- **THEN** MUST 使用 `edit` tool 做小范围精确替换（遵循 edit tool 的 200 字符限制和 4 条 edit 上限）
- **THEN** 对大范围替换 MUST 使用 `bash` + `sed`

#### Scenario: 跨文件重命名
- **WHEN** agent 需要重命名一个在多个文件中使用的符号
- **THEN** MUST 使用 `bash` + `sed`/`perl` 逐文件替换
- **THEN** 替换后 MUST 用 `ffgrep` 验证所有引用已更新

### Requirement: fff-decision-table
Agent 面对检索任务时 MUST 按以下决策表选择工具：

#### Scenario: 选择正确的检索工具
- **WHEN** agent 需要执行检索任务
- **THEN** 按以下优先级选择：
  - 搜索代码内容 → `ffgrep`
  - 定位文件/路径 → `fffind`
  - 列出目录结构 → `ls`（仅在需要了解未知目录布局时）
  - 读取已知文件 → `read`（不通过检索工具）
  - 搜索注释/字符串/文档 → `ffgrep`
  - 搜索非代码文件（配置、markdown 等） → `ffgrep` + 适当 path 约束

### Requirement: fff-anti-patterns
Agent 使用 fff 时 MUST 避免以下反模式：

#### Scenario: 避免全量扫描
- **WHEN** agent 执行搜索
- **THEN** MUST NOT 在不确定范围时使用不带 path 约束的 `ffgrep`/`fffind`
- **THEN** MUST NOT 使用过于宽泛的 glob（如 `*.ts` 全量扫描后再过滤）

#### Scenario: 避免 grep 链式缩小
- **WHEN** 第一次搜索返回结果
- **THEN** SHOULD 直接 `read` top match 而非继续 grep 缩小范围
- **THEN** MUST NOT 超过 2 次 ffgrep 调用仍未读取文件内容
