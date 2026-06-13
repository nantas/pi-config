# Tasks

## 1. 环境准备

- [x] 1.1 升级 `ntn` CLI 从 0.4.0 到 0.16.0 — `npm install -g ntn@latest` — 验证：`ntn --version` 输出 0.16.0
- [x] 1.2 从 `~/.zshenv` 移除 `NOTION_API_TOKEN`、`NOTION_API_TOKEN_DATABASE_PRD`、`NOTION_API_TOKEN_DATABASE_DEV` — 验证：新 shell 中 `echo $NOTION_API_TOKEN` 为空
- [x] 1.3 确认 keychain OAuth 生效 — `env -u NOTION_API_TOKEN ntn api v1/users/me` 返回 workspace 信息且 bot name 为 "Notion CLI"

## 2. 共享库实现

- [x] 2.1 创建 `ntn_resolve.py` — 包含 `ntn_api()`（子进程调用 ntn api + 自动剥离 NOTION_API_TOKEN）、`extract_id_from_url()`（正则解析 URL）、`resolve_id()`（pages→databases→data_sources 串行尝试） — 验证：被其他脚本成功 import

## 3. 核心脚本实现

- [x] 3.1 创建 `ntn-resolve` — `--url`、`--search`、`--type` 参数；输出 JSON array — 验证：`ntn-resolve --url "https://app.notion.com/p/veewo/37c63e9b..."` 返回 `{type: "page", title: "装扮扭蛋机系统"}`
- [x] 3.2 创建 `ntn-read` — 包装 `GET v1/pages/{id}/markdown` — 验证：`ntn-read <page_id>` 返回 `{markdown: "...", truncated: false}`
- [x] 3.3 创建 `ntn-schema` — 包装 `GET v1/data_sources/{id}`，摘要模式裁剪为 `{type, options?}` — 验证：`ntn-schema <ds_id>` 输出属性名+类型+选项列表
- [x] 3.4 创建 `ntn-query` — 包装 `POST v1/data_sources/{id}/query`，扁平化属性值，`--all` 自动分页 — 验证：`ntn-query <ds_id> --limit 3` 返回扁平化行数据
- [x] 3.5 创建 `ntn-edit` — 包装 `PATCH v1/pages/{id}/markdown` 的 `update_content` 命令 — 验证：搜索替换后恢复，确认 content 无损
- [x] 3.6 创建 `ntn-write` — `--set`（属性更新，自动 schema 翻译）、`--append`（markdown 追加）、`--replace`（全文替换） — 验证：更新 Status 属性后恢复

## 4. SKILL.md 编写

- [x] 4.1 编写 `SKILL.md` — 包含脚本清单、参数说明、workflow guide、key concepts、扩展入口 — 验证：新 session 中 agent 能根据 description 正确触发 skill

## 5. 全局注册与同步

- [x] 5.1 将 skill 复制到 `.pi/skills/notion-cli/` — 包含 SKILL.md + scripts/ 子目录
- [x] 5.2 在 `.pi/capabilities.yaml` 的 `global.skills` 追加 `notion-cli`
- [x] 5.3 执行 `scripts/sync-pi-agent.sh` — 验证：`~/.pi/agent/skills/notion-cli/` 存在且包含完整文件
- [x] 5.4 清理 `~/.agents/skills/notion-cli/` 副本（避免重复加载）

## 6. 端到端验证

- [x] 6.1 从同步后的位置 `~/.pi/agent/skills/notion-cli/scripts/` 运行所有 6 个脚本的 smoke test — 验证：ntn-resolve、ntn-read、ntn-schema、ntn-query、ntn-edit、ntn-write 均返回正确 JSON
- [x] 6.2 测试 edit + write 的可逆性 — 验证：编辑后恢复，数据无损
