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
系统 SHALL 提供 `ntn-write <page_id_or_url>` 命令，支持 `--set`、`--append`、`--replace` 三种操作。

#### Scenario: 更新属性
- **WHEN** 使用 `--set '{"prop": "value"}'`
- **THEN** 根据 data_source schema 自动翻译值为 Notion API 格式，调用 `PATCH v1/pages/{id}`

#### Scenario: 追加 markdown 内容
- **WHEN** 使用 `--append <markdown>`
- **THEN** 调用 `insert_content` 命令追加到页面末尾

#### Scenario: 替换全部内容
- **WHEN** 使用 `--replace <markdown>`
- **THEN** 调用 `replace_content` 命令替换整个页面

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
