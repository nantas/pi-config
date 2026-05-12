# Tasks

## 1. Spec 确认与实现准备

- [x] 1.1 确认 spec delta 范围：仅修改 `dollar-skill-invoke` capability 的两个行为点（first-only expansion + output format alignment）
  - 覆盖 spec delta: `dollar-skill-invoke` all MODIFIED Requirements
- [x] 1.2 确认 autocomplete (`dollar-skill-autocomplete`) 和 slash-filter (`slash-skill-filter`) 不受影响，无需修改

## 2. 核心实现任务

### 2.1 First-only expansion（修改输入变换逻辑）

- [x] 2.1.1 移除 `DOLLAR_SKILL_REGEX` 中的 `/g` 标志，使其仅匹配第一个 `$skill-name` token
  - 覆盖 spec delta: `Dollar Skill Token Expansion` → Scenario: First-only expansion
  - 实现路径: `.pi/extensions/dollar-skill-invoke.ts` 中 `DOLLAR_SKILL_REGEX` 定义，将 `/g` 移除
  - 验证方式: 提交 `$skill-a and $skill-b` 时，仅第一个展开，第二个保持原样

- [x] 2.1.2 移除多 skill 合并循环和 consolidation 逻辑（`expanded.map(...).join(...)` + 逗号合并的 `skillNames`）
  - 覆盖 spec delta: REMOVED Requirements → Multi-skill consolidated block format
  - 实现路径: 删除 `handleInputTransform` 中的 `consolidatedContent` 变量、逗号拼接逻辑、`---` 分隔符
  - 验证方式: 代码中不再引用多 skill 合并逻辑，`ExpandedSkill[]` 数组最多含一项

### 2.2 Output format alignment（对齐 `/skill:name` 输出格式）

- [x] 2.2.1 修改 `<skill>` 块生成代码：使用 `skill.filePath` 作为 `location` 属性值，不再使用 `"."`
  - 覆盖 spec delta: `Skill Content Format` → Scenario: Single skill block format
  - 实现路径: `finalText` 构造中的 `location="."` 改为 `location="${skill.filePath}"`
  - 验证方式: 展开后 `<skill location="..."` 显示实际文件路径

- [x] 2.2.2 添加 `References are relative to <baseDir>.` 行，其中 `baseDir = path.dirname(filePath)`
  - 覆盖 spec delta: `Skill Content Format` → Scenario: Single skill block format
  - 实现路径: 在 `<skill>` 块内 body 前插入 `References are relative to ${baseDir}.\n\n`
  - 验证方式: 展开后的 `<skill>` 块包含 `References are relative to ...` 行

- [x] 2.2.3 移除 `[skill:name]` 和 `Location: <path>` 内部标记行
  - 覆盖 spec delta: `Skill Content Format` → Scenario: Single skill block format
  - 实现路径: 从 `<skill>` 块生成代码中删除 `[skill:${s.name}]` 和 `Location: ${s.filePath}` 拼接
  - 验证方式: 展开后的 `<skill>` 块不包含 `[skill:` 或 `Location:` 行

### 2.3 清理与整理

- [x] 2.3.1 移除 `ExpandedSkill` 接口的多 skill 相关字段和 `consolidatedContent` 相关中间变量
  - 实现路径: 确认 `ExpandedSkill` 接口仍被使用（单 skill 场景），但 `consolidatedContent`、逗号拼接等不再需要
  - 验证方式: 代码中无未使用的变量/接口字段

## 3. 收敛与验证准备

- [x] 3.1 功能验证：提交包含单个 `$skill-name` 的文本，确认展开格式与 `/skill:name` 完全一致
  - 覆盖 spec delta: `Dollar Skill Token Expansion` → Scenario: Single skill expansion
  - 验证方式: `pi -e .pi/extensions/dollar-skill-invoke.ts` 测试；肉眼对比两种方式的 `<skill>` 块输出

- [x] 3.2 First-only 验证：提交 `$skill-a and $skill-b`，确认只展开第一个，第二个原样保留
  - 覆盖 spec delta: `Dollar Skill Token Expansion` → Scenario: First-only expansion
  - 验证方式: 输出中 `$skill-b` 保持为纯文本

- [x] 3.3 向后兼容验证：`$` 自动补全、`/` skill 过滤、`\$` 转义 均不受影响
  - 覆盖 spec delta: Unchanged Requirements
  - 验证方式: 自动补全仍然工作、`/` 补全无 `skill:` 条目、`\$name` 不展开

- [x] 3.4 热重载验证：`/reload` 后行为一致
  - 验证方式: `/reload` 后重复 3.1-3.3 测试

- [x] 3.5 整理验证证据到 verification.md
