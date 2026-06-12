# Proposal

## 问题定义

Agent 在执行 Obsidian vault 的批量文本→wikilink 替换时，需要判断替换目标是否在 Markdown 表格行内，以决定 `|` 分隔符是否转义为 `\|`。这个判断在脚本中极易出错，且修复脚本本身可能引入二次 bug（如双重转义）。

现有防御链（L0 AGENTS.md 声明 + L2 pre-commit hook）已覆盖声明和拦截，但缺失 L1——生成时就正确的工具。4 次 agent 测试表明：agent 在短 session 中能正确处理，但在长 session 或 subagent 委派场景中可靠性下降。

## 范围边界

**纳入**：
- 一个 Pi extension tool：`wikilink_batch_replace`
- 接收文件路径 + 正则模式 + 映射表，全文批量替换裸文本为 wikilink
- 自动检测表格行并转义 `|`
- 跳过已有 `[[]]` 内部的匹配
- 直接修改文件，返回统计信息

**不纳入**：
- 文件发现 / 目录扫描（agent 自行处理）
- 已有 wikilink 的路径或 display 修改（sed 够用）
- 单条 wikilink 生成（手动操作不频繁出错）
- 多文件同时处理（agent 按需多次调用）

## Capabilities

### New Capabilities
- `wikilink-batch-replace`: Pi extension tool，批量将裸文本引用替换为 Obsidian wikilink，自动处理表格行 `|` 转义

### Modified Capabilities
（无修改的既有能力）

## Capabilities 待确认项

- [x] 能力清单已与用户确认（grill session 中逐项讨论确认）

## Impact

- 新增文件：`.pi/extensions/wikilink-batch-replace.ts`（单文件 extension，无外部依赖）
- 更新文件：`.pi/capabilities.yaml`（新增 global extension 条目）
- 更新文件：`CONTEXT.md`（OpenSpec 索引新增条目）
- 不修改现有扩展或设置

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页 / 项目页 / 回写目标：
  - 无外部标准页
  - 项目页：`CONTEXT.md`
  - 回写目标：`CONTEXT.md`（archive 阶段）
