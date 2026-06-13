# Design

## Context

Notion workspace（Veewo Games）中维护了大量游戏设计文档和数据库（道具库、任务库、成就表等，共 20+ 个 data_source）。Agent 需要频繁读写这些内容，但直接调用 Notion API 的出错率极高。`ntn` CLI 已安装且通过 OAuth 认证（`ntn login`），版本已从 0.4.0 升级到 0.16.0。

## Goals / Non-Goals

**Goals:**
- 将 `ntn api` 的薄包装脚本封装为全局 skill，降低 agent 调用 Notion API 的出错率
- URL 自动解析：用户给浏览器链接，脚本自动识别 page/database/data_source 类型
- 响应扁平化：将 Notion 的深度嵌套 JSON 属性值转为 plain values
- 认证透明：脚本自动使用 keychain OAuth，agent 无需关心 token
- 长文档编辑走 markdown search-and-replace，不走 block API

**Non-Goals:**
- 不实现 filter DSL 翻译——agent 使用原始 Notion filter JSON
- 不创建行级 CRUD（`ntn-create`）——留作扩展
- 不处理 linked database view 的权限问题
- 不缓存 schema——每次调用实时查询

## Decisions

### D1: 实现语言选择 Python

**选项**: bash + jq / Python / Node.js
**决策**: Python 3
**理由**: URL 解析需要正则+多次 API 串行调用+错误分支处理，bash 写这种逻辑脆弱且难以维护。Python 标准库足够（subprocess, json, re, os），无需额外依赖。macOS 自带 Python 3。

### D2: 共享库模式

**决策**: 所有脚本共享 `ntn_resolve.py` 模块，通过 `sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))` 导入。
**理由**: `ntn_api()`、`extract_id_from_url()`、`resolve_id()` 三个函数被所有脚本复用，避免重复。

### D3: 认证策略——剥离环境变量

**决策**: 每个 `ntn_api()` 调用在子进程中移除 `NOTION_API_TOKEN`，强制使用 keychain OAuth。
**理由**: 旧版 ntn 0.4.0 要求设置 `NOTION_API_TOKEN`（integration token，权限受限），0.16.0 已支持 keychain OAuth（全 workspace 读写权限）。环境变量优先级高于 keychain，必须剥离。已从 `~/.zshenv` 移除相关环境变量。

### D4: 页面编辑走 markdown 端点

**决策**: `ntn-edit` 和 `ntn-write` 使用 `v1/pages/{id}/markdown` 的 `update_content`/`insert_content`/`replace_content` 命令。
**理由**: block API 的写入极其繁琐（需要构造嵌套 block 对象），而 markdown 端点支持 search-and-replace，agent 只需提供 `old_str`/`new_str` 对。对于长文档（15000+ chars），一次 markdown GET 就能拿到全部内容。

### D5: 查询结果扁平化

**决策**: `ntn-query` 将所有属性值扁平化为 plain values（string, number, list of strings 等），relation 类型只输出 `[id1, id2]`。
**理由**: 原始 Notion 响应的嵌套结构（rich_text → annotations → text → content）对 agent 极不友好。扁平化后 agent 直接用 `row["Title"]` 获取文本值。relation 不展开关联 page 标题——按需用 `ntn-read` 查询。

### D6: 错误处理——透传原始 JSON

**决策**: 脚本不翻译/美化 API 错误，直接输出 `{"error": "raw message"}` 到 stderr。
**理由**: 翻译错误信息会增加维护成本，且原始错误通常足够诊断（如 `object_not_found`、`validation_error`）。

### D7: 搜索默认 10 条

**决策**: `ntn-resolve --search` 默认返回 10 条结果。
**理由**: workspace 有 20+ 个 data_source，搜索"道具库"返回太多结果反而增加 agent 选择负担。定向检索应通过 `ntn-schema` + `ntn-query` 进行。

## Risks / Migration

1. **OAuth token 过期**: `ntn login` 的 token 可能有有效期。若 agent 报 401 错误，用户需重新 `ntn login`。脚本不处理自动刷新。
2. **ntn CLI 版本依赖**: `ntn api` 的 markdown 端点和 OAuth 支持依赖于 ≥ 0.16.0 版本。若版本回退会导致功能失效。
3. **`~/.zshenv` 环境变量清除影响**: 移除了 `NOTION_API_TOKEN`、`NOTION_API_TOKEN_DATABASE_PRD`、`NOTION_API_TOKEN_DATABASE_DEV`。如有其他脚本依赖这些变量，需要迁移到 keychain OAuth。
4. **`ntn-write --set` 的 schema 依赖**: 属性值翻译需要先查询 data_source schema。如果 schema 查询失败，会回退到 rich_text 格式。
