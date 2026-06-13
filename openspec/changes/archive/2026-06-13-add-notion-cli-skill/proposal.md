# Proposal

## 问题定义

Agent 直接使用 Notion API 访问 workspace 时出错率极高，核心原因：

1. **概念混乱**：`database` ≠ `data_source`，Notion 的 database 是容器，data_source 才是实际表，但 UI 中用户看到的是同一个东西
2. **URL 解析困难**：用户提供的浏览器 URL（如 `/p/veewo/{id}?v={view_id}`）中，ID 可能是 page、database 或 data_source，agent 不知道该调哪个端点
3. **响应结构嵌套极深**：rich_text → annotations → text → content，agent 构造/解析 JSON 频繁出错
4. **filter/sort 语法复杂**：构造正确的 Notion filter JSON 需要精确匹配 property type，极易出错
5. **认证问题**：`ntn` CLI 0.4.0 的 `ntn api` 强制要求 `NOTION_API_TOKEN` 环境变量（integration token，权限受限），覆盖了 `ntn login` 的 OAuth 全 workspace 权限

## 范围边界

### 包含

- 升级 `ntn` CLI 到 0.16.0（OAuth token 自动生效）
- 清除 `~/.zshenv` 中的 `NOTION_API_TOKEN*` 环境变量
- 创建 `notion-cli` 全局 skill，包含 6 个 Python 辅助脚本：
  - `ntn-resolve`：URL/关键词 → 结构化 JSON
  - `ntn-read`：页面 → markdown
  - `ntn-schema`：data_source → 属性结构
  - `ntn-query`：data_source → 扁平化行数据
  - `ntn-edit`：搜索替换编辑（markdown）
  - `ntn-write`：属性更新 / 内容追加 / 全文替换
- 注册到 `.pi/capabilities.yaml` 的 `global.skills`
- 通过 `scripts/sync-pi-agent.sh` 同步到 `~/.pi/agent/skills/`

### 不包含

- 不修改 `ntn` CLI 本身
- 不创建 `ntn-create`（在 data_source 中新增行）— 留作扩展
- 不实现 filter DSL 翻译 — agent 使用原始 Notion filter JSON
- 不处理 linked database view 的权限问题 — 脚本报错，用户自行解决

## Capabilities

### New Capabilities
- `notion-cli`: 全局 skill，通过 6 个薄包装脚本封装 `ntn api`，提供 URL 自动解析、认证管理、响应扁平化，使 agent 能高效读写 Notion 页面和数据库

### Modified Capabilities
- `global-skills-manifest`: `.pi/capabilities.yaml` 的 `global.skills` 新增 `notion-cli` 条目

## Capabilities 待确认项

- [x] 能力清单已与用户确认

## Impact

- `ntn` CLI 从 0.4.0 升级到 0.16.0 — 所有使用 `ntn api` 的 session 受益
- `~/.zshenv` 移除 3 个 `NOTION_API_TOKEN*` — 依赖这些变量的脚本需改用 keychain OAuth
- Agent session 中编辑 Notion 长文档的效率显著提升（markdown search-and-replace 替代 block API）
- 新 skill 通过 sync 脚本全局可用，所有 workspace 可见

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页 / 项目页 / 回写目标：无外部标准页；项目页为 `.pi/capabilities.yaml`；回写目标为 `CONTEXT.md` 索引
