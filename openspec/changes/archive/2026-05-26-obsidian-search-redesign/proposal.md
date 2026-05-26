# Proposal

## 问题定义

obsidian-tools 扩展的 `obsidian_search` 工具在当前实现中存在以下核心问题：

1. **上游依赖失效**：Obsidian CLI `search` 命令在大于 ~2,700 文件的仓库中存在 race condition，静默返回空（exit code 0）——my-wiki 有 5,195 个 .md 文件，完全触发此 bug。详见 `docs/plans/obsidian-search-issue-report.md`。

2. **Fallback 机制缺陷**：当 CLI search 不可用时，扩展回退到 `rg`（ripgrep），但存在三个严重缺陷：
   - 多关键词查询未分词（`"DBG deck building synergy"` 作为完整字符串字面搜索，永远 0 hits）
   - scope 参数下路径解析错误（丢失目录前缀）
   - relevance 全部硬编码（CLI 结果 0.5，rg 结果 0.3），无区分度

3. **搜索质量差**：snippet 为空或仅有单行、fast/deep 模式差异模糊、`globalThis` dedup guard 违反 Pi 扩展规范。

4. **无 vault 级配置**：排名权重、搜索范围、分词参数全部硬编码在代码中，无法根据仓库特征调整。

**目标**：以 rg 为主要后端重新设计 `obsidian_search` 工具，通过 vault 级配置文件驱动搜索行为，实现配置化的分词、排名和范围管理。

## 范围边界

**In scope**：
- `obsidian_search` 工具的完整重新设计（search-tool.ts）
- vault 根目录 `search-config.yaml` 的 schema 定义、加载与默认值生成
- `obsidian_cli search:init` 命令（创建默认配置文件）
- rg 后端的多关键词分词（空格 + Intl.Segmenter 中文分词）
- 基于匹配位置（frontmatter/heading/正文）和文件属性的排名模型
- Snippet 生成（首段预览 + 最佳匹配上下文）
- 修复 `globalThis` dedup guard
- 扩展注册逻辑更新（preflight 检测 CLI search 不可用时启用 rg 主路径）

**Out of scope**：
- 对 `backlinks`、`links`、`properties` 等其他 CLI 命令的修改（这些功能正常）
- 同义词映射表（由 agent 通过工具描述引导双语言搜索替代）
- 搜索索引预构建或缓存（rg 在线搜索即可满足性能要求）
- 中文分词 jieba 集成（先使用 Intl.Segmenter，保留 jieba 扩展点）

## Capabilities

### New Capabilities

- `obsidian-search-config`: vault 级搜索配置文件 `search-config.yaml` 的 schema 定义、读取与校验，以及通过 `obsidian_cli search:init` 命令自动生成默认配置

### Modified Capabilities

- `obsidian-search-tool`: 以 rg 为后端重新实现 obsidian_search 工具，包括分词、多 scope 并行搜索、匹配位置感知排名、snippet 生成；替换当前基于 CLI search + fallback rg 的实现
- `obsidian-tools-extension`: 修复 index.ts 中的 globalThis dedup guard（改为 session 级生命周期管理）、更新 preflight 逻辑（检测 CLI search 不可用时直接走 rg 主路径）、注册 search:init 命令

## Capabilities 待确认项

- [x] 能力清单基于现有扩展结构拆分，未引入全新扩展能力 ID
- [x] `obsidian-search-tool` 对应现有 search-tool.ts 的完整重写（兼容现有参数接口）
- [x] `obsidian-search-config` 作为全新能力独立管理配置文件（原扩展无此能力）

## Impact

- `.pi/extensions/obsidian-tools/` 下 search-tool.ts 和 index.ts 需要大幅修改（cli-runner.ts 需要新增 rg parsing 函数）
- vault 根目录新增 `search-config.yaml`（对非 Pi 环境的 Obsidian 用户无影响）
- `docs/plans/obsidian-search-issue-report.md` 需要更新结论章节
- `.pi/capabilities.yaml` 需要更新（如果新增/修改能力条目）
- my-wiki 仓库 `docs/design/` 下新增 `obsidian-search-tool-design.md`（搜索工具使用参考）
- 对现有 `obsidian_cli` 工具向后兼容（search:init 是新命令，不影响现有行为）

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页 / 项目页 / 回写目标：见 binding.md
