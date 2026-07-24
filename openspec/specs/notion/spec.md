# Specification Delta

## Capability 对齐（已确认）

- Capability: `notion`
- 来源: `proposal.md` / 已确认 capabilities
- 变更类型: new
- 用户确认摘要: grill 讨论中逐项确认——脚本清单、接口设计、扁平化策略、错误处理、filter 格式、URL 解析策略

## 规范真源声明

- 本文件是该 capability 在本次 change 中的行为规范真源
- design / tasks / verification 必须引用本文件
- 项目页面回写不得替代本文件

## ADDED Requirements

### Requirement: ntn-auth-management
系统 SHALL 在所有脚本中自动剥离 `NOTION_API_TOKEN` 环境变量，确保 `ntn api` 使用 keychain OAuth token（`ntn login` 生成），从而获得完整 workspace 读写权限。

#### Scenario: 环境变量存在时自动降级
- **WHEN** `NOTION_API_TOKEN` 环境变量已设置
- **THEN** 脚本调用 `ntn api` 时在子进程环境中移除该变量，使用 keychain OAuth

#### Scenario: 环境变量不存在时
- **WHEN** `NOTION_API_TOKEN` 环境变量未设置
- **THEN** 脚本正常调用 `ntn api`，keychain OAuth 自动生效

### Requirement: ntn-resolve-url
系统 SHALL 提供 `ntn-resolve --url <notion_url>` 命令，从 Notion 浏览器 URL 中提取 ID 并自动识别对象类型。

#### Scenario: 解析 page URL
- **WHEN** 输入 `https://app.notion.com/p/{workspace}/{id}` 格式的 URL
- **THEN** 返回 `[{type: "page", id, title, url}]`

#### Scenario: 解析 database URL（带 view）
- **WHEN** 输入 `https://app.notion.com/p/{workspace}/{id}?v={view_id}` 格式的 URL
- **THEN** 返回 `[{type: "database", id, title, url, data_sources: [{id, name}], view_id}]`

#### Scenario: 解析 data_source ID
- **WHEN** 输入 raw ID 且 pages/databases 端点均 404
- **THEN** 回退尝试 `v1/data_sources/{id}`，命中则返回 `{type: "data_source", ...}`

#### Scenario: 所有类型均 404
- **THEN** 输出 JSON error 到 stderr 并 exit 1

### Requirement: ntn-resolve-search
系统 SHALL 提供 `ntn-resolve --search <keyword> [--type page|data_source]` 命令搜索 Notion workspace。

#### Scenario: 关键词搜索
- **WHEN** 使用 `--search` 参数
- **THEN** 调用 `v1/search`，返回最多 10 条匹配结果，包含 type、id、title

#### Scenario: 按类型过滤
- **WHEN** 使用 `--type data_source`
- **THEN** 搜索结果只包含 data_source 类型对象

### Requirement: ntn-read-markdown
系统 SHALL 提供 `ntn-read <page_id_or_url>` 命令，返回页面的完整 markdown 内容。

#### Scenario: 读取完整页面
- **WHEN** 输入 page ID 或 URL
- **THEN** 返回 `{id, title, markdown, truncated, unknown_block_ids}`，使用 `v1/pages/{id}/markdown` 端点

#### Scenario: URL 自动解析
- **WHEN** 输入为 URL 而非 ID
- **THEN** 先提取 ID，验证为 page 类型，再获取 markdown

### Requirement: ntn-schema-summary
系统 SHALL 提供 `ntn-schema <data_source_id_or_url> [--all]` 命令，展示 data_source 的属性结构。

#### Scenario: 摘要模式（默认）
- **WHEN** 不带 `--all`
- **THEN** 返回每个属性的 `{type, options?}` — select/multi_select/status 类型包含选项名列表

#### Scenario: 完整模式
- **WHEN** 带 `--all`
- **THEN** 返回完整 schema，包含 id、description 等字段

#### Scenario: database ID 输入
- **WHEN** 输入为 database ID
- **THEN** 自动获取第一个 data_source 的 schema

### Requirement: ntn-query-flatten
系统 SHALL 提供 `ntn-query <data_source_id_or_url> [--filter <json>] [--sorts <json>] [--limit N] [--all]` 命令查询 data_source 行。

#### Scenario: 扁平化属性值
- **WHEN** 查询返回结果
- **THEN** 每个属性值扁平化为 plain value：title/rich_text → string，select → name，multi_select → [name]，number → int/float，date → {start, end}，relation → [id]，people → [{id, name}]

#### Scenario: 带 filter 查询
- **WHEN** 使用 `--filter` 参数
- **THEN** 传入原始 Notion API filter JSON（agent 需先 `ntn-schema` 获取属性类型后构造）

#### Scenario: 自动分页
- **WHEN** 使用 `--all` 参数
- **THEN** 自动循环分页直到获取全部结果

### Requirement: ntn-edit-search-replace
系统 SHALL 提供 `ntn-edit <page_id_or_url> --old <text> --new <text> [--replace-all]` 和 `--ops <json_file>` 命令进行搜索替换编辑。

#### Scenario: 单次搜索替换
- **WHEN** 使用 `--old` 和 `--new` 参数
- **THEN** 使用 `update_content` API 命令，返回 `{id, truncated, changes}`

#### Scenario: 批量操作
- **WHEN** 使用 `--ops <json_file>`
- **THEN** 读取 JSON 文件 `[{old, new, replace_all?}]`，合并为单次 API 调用（最多 100 条）

#### Scenario: 精确匹配要求
- **WHEN** `old_str` 未在页面中找到
- **THEN** API 返回 validation_error，脚本输出原始错误 JSON 到 stderr

### Requirement: ntn-write-props-and-content
系统 SHALL 提供 `ntn-write <page_id_or_url>` 命令，支持 `--set`、`--append`、`--replace`、`--safe-replace` 四种互斥内容/属性操作（同一调用只执行其中一种）。

#### Scenario: 更新属性
- **WHEN** 使用 `--set '{"prop": "value"}'`
- **THEN** 根据 data_source schema 自动翻译值为 Notion API 格式，调用 `PATCH v1/pages/{id}`

#### Scenario: 追加 markdown 内容
- **WHEN** 使用 `--append <markdown>`
- **THEN** 调用 `insert_content` 命令追加到页面末尾

#### Scenario: 替换全部内容（危险路径保留）
- **WHEN** 使用 `--replace <markdown>`
- **THEN** 调用 `replace_content` 命令替换整个页面块树；若页面含 child page(s) 或 child database(s)，Notion API 返回 400 validation_error，脚本按既有 `error-json-output` 透传错误

#### Scenario: 子页面安全的内容替换
- **WHEN** 使用 `--safe-replace <markdown>`
- **THEN** 先读取页面当前 markdown，用 stdlib `difflib` 行级 diff 生成 `content_updates`（每个 hunk 尽量带前缀锚点行以保证 first-match 唯一性），再通过 `update_content` 应用；不调用 `replace_content`，不删除块，子页面/子数据库保留

#### Scenario: safe-replace 空页降级
- **WHEN** `--safe-replace` 且当前页面 markdown 为空（仅空白）
- **THEN** 不走 diff，退化为 `insert_content`（append）写入新内容，返回 action 为 append 或等价摘要

#### Scenario: safe-replace 内容相同
- **WHEN** `--safe-replace` 且新旧 markdown 行级完全一致
- **THEN** 不调用写 API，返回 `{id, action: "safe-replace", changes: 0}`（或等价字段）

#### Scenario: safe-replace diff 过大
- **WHEN** `--safe-replace` 生成的 content_updates 条数超过 100（与 `ntn-edit` ops 上限一致）
- **THEN** 不调用写 API，向 stderr 输出 JSON error（含 `error: "diff_too_large"` 或等价），并包含可操作的降级建议（例如分段 `--safe-replace` / `ntn-edit --ops` / 无子页面时 `--replace`）

#### Scenario: 未提供操作 flag
- **WHEN** 未提供 `--set` / `--append` / `--replace` / `--safe-replace`
- **THEN** 向 stderr 输出 JSON error，提示需提供上述之一


### Requirement: skill-docs-replace-guidance
系统 SHALL 在 `.pi/skills/notion/SKILL.md` 中明确引导 agent 优先使用子页面安全路径，并标注 `--replace` 陷阱。

#### Scenario: ntn-edit 段不再误导向 --replace
- **WHEN** agent 阅读 SKILL.md 的 ntn-edit 段
- **THEN** 文档说明 `update_content` 保留子页面/数据库；大段多节替换优先 `--ops` 或 `ntn-write --safe-replace`，不得再把「大内容替换」唯一指向 `ntn-write --replace`

#### Scenario: ntn-write 段标注 --replace 陷阱并展示 --safe-replace
- **WHEN** agent 阅读 SKILL.md 的 ntn-write 段
- **THEN** 文档展示 `--safe-replace` 用法，并警告 `--replace` 在存在 child pages/databases 时会被 API 拒绝，同时给出 fallback（`--safe-replace` / `ntn-edit --ops` / `--append`）

#### Scenario: Workflow Guide 长页编辑路径
- **WHEN** agent 按 SKILL.md Workflow Guide 中「Editing a long page」操作
- **THEN** 文档明确：页面有子页面/子数据库时 NEVER 使用 `--replace`，应使用 `ntn-write --safe-replace`

### Requirement: ntn-write-safe-replace-implementation-constraints
系统 SHALL 在实现 `--safe-replace` 时遵守以下约束：仅使用 Python 标准库（含 `difflib`）；不新增第三方依赖；不修改 `phone_number` 等无关属性映射逻辑；不删除或改名既有 `--replace` flag。

#### Scenario: 零新依赖
- **WHEN** 检查 `ntn-write` 的 import
- **THEN** 仅见标准库与既有 `ntn_resolve` 共享模块

#### Scenario: 无关逻辑不改动
- **WHEN** 对比本 change 前后 `build_property_value` / `--set` / `--append` 路径
- **THEN** 行为与输出保持兼容（除 usage 文案可列出新 flag）

### Requirement: error-json-output
所有脚本 SHALL 将错误以 JSON 格式输出到 stderr：`{"error": "message"}`，不翻译、不美化原始 API 错误信息。

#### Scenario: API 返回错误
- **WHEN** `ntn api` 返回非零退出码
- **THEN** 提取 stderr 或 stdout 的错误信息，包装为 JSON 输出到 stderr

### Requirement: shared-library
所有脚本 SHALL 共享 `ntn_resolve.py` 模块，包含 `ntn_api()`、`extract_id_from_url()`、`resolve_id()` 三个公共函数，通过 `sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))` 引用。

### Requirement: skill-manifest-registration
skill SHALL 注册在 `.pi/capabilities.yaml` 的 `global.skills` 列表中，通过 `scripts/sync-pi-agent.sh` 同步到 `~/.pi/agent/skills/notion/`。

## MODIFIED Requirements

### Requirement: global-skills-manifest
`.pi/capabilities.yaml` 的 `global.skills` 列表 SHALL 包含 `notion` 条目。

#### Scenario: 同步后全局可用
- **WHEN** 运行 `scripts/sync-pi-agent.sh`
- **THEN** `~/.pi/agent/skills/notion/` 目录存在，包含 SKILL.md 和 scripts/ 子目录
