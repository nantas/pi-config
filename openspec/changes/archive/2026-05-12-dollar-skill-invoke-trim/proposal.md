# Proposal

## 问题定义

当前 `$skill-name` 扩展在输入变换阶段会将输入文本中**所有**的 `$skill-name` token 都展开，并合并为一个 `<skill>` 块。这在部分工作流中混合使用多个 skill 时，可能产生意想不到的流程问题—— agent 同时收到多个 skill 的上下文指令，但用户本意可能只是调用其中一个。

与此同时，输出的 `<skill>` 块格式与 Pi 默认的 `/skill:name` 展开格式不一致：
- `location` 属性使用 `"."` 而非实际文件路径
- 内容中包含 `[skill:name]` 和 `Location:` 等内部标记
- 缺少 `References are relative to ...` 行

这种格式差异增加了 agent 行为的不确定性，也使得用户难以预判 `$skill` 注入的内容结构与 `/skill:name` 是否等价。

## 范围边界

- **在范围内**：`$skill-name` 输入变换改为**仅展开第一个匹配的 skill**，后续 `$skill-name` 保持原样
- **在范围内**：输出格式改为**与 `_expandSkillCommand`（即 `/skill:name` 行为）完全一致**
- **在范围内**：保留 `$` 自动补全、`/` skill 过滤、`\$` 转义能力
- **在范围内**：保留 `$skill-name` 在 prompt 任意位置均可触发的能力
- **不在范围内**：修改 `/skill:name` 行为、修改扩展的加载/注册机制、修改 pi-mono 源码

## Capabilities

### Modified Capabilities

- `dollar-skill-invoke`: 修改输入变换行为，仅展开第一个 `$skill-name` token；修改输出 `<skill>` 块格式，与 `/skill:name` 展开格式完全一致

### Unchanged Capabilities

以下 capability 在本变更中不受影响，仍保持当前行为：

- `dollar-skill-autocomplete`: `$` 前缀触发 skill 自动补全，支持模糊匹配和任意位置触发（**保留**）
- `slash-skill-filter`: `/` 前缀自动补全中过滤掉 skill 条目（**保留**）

## Impact

- **修改文件**：`.pi/extensions/dollar-skill-invoke.ts` — 重构 `handleInputTransform` 函数，修改 `<skill>` 块生成逻辑
- **新增文件**：`openspec/changes/dollar-skill-invoke-trim/specs/dollar-skill-invoke/spec.md` — spec delta
- **其他文件**：无（不修改 pi-mono 源码或现有配置文件）
- **依赖**：不变（仅依赖 `@mariozechner/pi-coding-agent` 和 `@mariozechner/pi-tui`）

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页 / 项目页 / 回写目标：
  - 标准页：`repo://orbitos/99_系统/Harness/OrbitOS_Spec_Standard/OrbitOS_Spec_Standard_v0.3.1.md`
  - 项目页：`repo://orbitos/20_项目/Pi_Config/Pi_Config.md`
  - 回写目标：`repo://orbitos/20_项目/Pi_Config/项目进度总览.md`
