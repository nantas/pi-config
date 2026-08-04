# Notion Skill 能力补丁：多 datasource 读写 + page 创建封装缺口

> **状态**：已归档（2026-08-04 · `openspec/changes/archive/2026-08-04-notion-skill-ntn-create/`；全局 sync 已执行）
> **来源 session**：NeonSpark 教学关 hint 重编排 + 多语言文案批量维护（2026-08-04）
> **影响 skill**：全局 `~/.pi/agent/skills/notion/SKILL.md` 及 `scripts/`（所有 session/项目共享）
> **改动规模**：1 个新脚本候选（`ntn-create`）+ SKILL.md 2 处文档补丁

---

## 一、问题背景

### 触发场景

NeonSpark 教学关重编排任务中，需要批量在两个不同的 Notion datasource 里维护多语言文案：

| datasource | 用途 | 字段结构 | 操作 |
|-----------|------|---------|------|
| 霓虹多语言库（`1e9ac5e8-...`） | 前端 I2 Localization term 文案 | `Key`(title) / `Type`(select) / `Chinese (Simplified)`(rich_text) / `English`(rich_text) / `使用`(checkbox) | 新增 4 条 + 更新 2 条 |
| 霓虹2对话库（`19863e9b-...`） | 前端 DialogueGraph 对话文本 | `Name`(title) / `对话中文`(rich_text) / `对话英文`(rich_text) | 更新 1 条 |

两个 datasource **字段结构完全不同**，且都**不走**项目级 na2-notion-cms 的后端 i18n_texts 库（那套字段是 `Key/Domain/zh-CN/en-US/Status`，且走云函数发布）。前端这两个库是**人工导入 I2Languages.asset**，认证走 PROD keychain。

### 实际行为与摩擦

| 动作 | 结果 | 摩擦点 |
|------|------|--------|
| `ntn-resolve --url` | ✅ 正确解析出 datasource id + title | 无 |
| `ntn-schema <ds_id>` | ✅ 正确返回字段名与类型 | 无 |
| `ntn-query <ds_id> --filter` | ✅ 正确查询 + 扁平化返回 | 无 |
| **创建新 page（新 term）** | ⚠️ **必须手写 `ntn api -X POST v1/pages` + 完整 properties JSON** | wrapper 无 `ntn-create` 封装 |
| **更新 page property** | ⚠️ 手写 `ntn api -X PATCH v1/pages/<id>` | `ntn-write --set` 理论可用但需查 schema 翻译，手写 JSON 更快 |

**关键摩擦**：创建新 term 是高频操作，但 notion skill 的 wrapper 没有封装。SKILL.md 的 "Extending This Skill" 节已经把 `ntn-create` 列为候选扩展，但尚未实现。本次创建 5 条新 term 全靠手写 `ntn api` 的 properties JSON，每条都要查 schema 确认字段名 + 拼 rich_text 嵌套结构，token 消耗高且易错。

---

## 二、SKILL.md 现状缺陷（2 处）

### 缺陷 1：无 page 创建封装，Extending 节列了候选但未实现

**现状**（SKILL.md "Extending This Skill" 节）：

```
Common extension candidates:
- **ntn-create**: Create new pages in a data_source (row creation)
```

**问题**：把最高频的"创建 datasource 行"操作留作"候选扩展"，agent 每次都要手写 `ntn api -X POST v1/pages` 的完整 properties JSON。多 datasource 场景下（不同字段结构），手写 JSON 极易因字段名/类型不匹配失败。

### 缺陷 2：无"多 datasource 字段差异"指引

**现状**：SKILL.md 的 Workflow Guide 只演示单一 datasource 的读写循环（resolve → schema → query → edit）。没有提示：同一个项目里可能存在多个字段结构完全不同的 datasource（如本例的多语言库 vs 对话库），agent 需要对每个 datasource **分别 `ntn-schema`** 确认字段，不能假设字段结构。

---

## 三、建议改动

### 改动 1：新增 `ntn-create` 脚本（`scripts/ntn-create`）

**职责**：在指定 datasource 创建新 page（行），支持 `--set '<json>'` 传 properties（复用 `ntn-write --set` 的 schema 翻译逻辑）。

**建议接口**：

```
ntn-create <data_source_id_or_url> --set '{"Key": "tut_xxx", "Type": "UI", "Chinese (Simplified)": "...", "English": "...", "使用": true}'
ntn-create <ds_id> --set '@props.json'          # 从文件读 JSON
```

**实现要点**：
- `--set` 的 plain value → Notion API format 翻译逻辑应与 `ntn-write --set` 共享（抽到 `ntn_resolve.py` 或 common 模块）
- title / rich_text / select / checkbox / multi_select 等常见类型至少覆盖
- 输出：`{id, url, properties}`（与 `ntn-write` 一致风格）

**对应 SKILL.md 文档**：在 Scripts 节新增 `ntn-create` 条目；在 Extending 节把 `ntn-create` 从候选列表移除（已实现）。

### 改动 2：Workflow Guide 补"多 datasource 字段差异"提醒

在 Workflow Guide 的 "Querying a database from URL" 段后，或新增一小节，加入提示：

> **多 datasource 提醒**：同一项目可能存在多个字段结构完全不同的 datasource（如多语言文案库 vs 对话库 vs 邮件库）。**每个 datasource 必须先 `ntn-schema` 确认字段名与类型**，不能假设字段结构跨 datasource 一致。filter 的 property 名、`--set` 的 key 都必须按目标 datasource 的实际 schema 填写。

---

## 四、本次 session 验证过的命令模式（供 skill 文档示例参考）

### 创建 page（ntn api 原生，待 ntn-create 封装）

```bash
ntn api -X POST v1/pages -d '{
  "parent": {"data_source_id": "1e9ac5e8-3606-4e67-b7e7-3338d7101bb1"},
  "properties": {
    "Key": {"title": [{"text": {"content": "tut_collapse_expand"}}]},
    "Type": {"select": {"name": "UI"}},
    "Chinese (Simplified)": {"rich_text": [{"text": {"content": "点击这里展开"}}]},
    "English": {"rich_text": [{"text": {"content": "Tap here to expand"}}]},
    "使用": {"checkbox": true}
  }
}'
```

### 更新 page property（ntn api 原生）

```bash
ntn api -X PATCH "v1/pages/<page_id>" -d '{
  "properties": {
    "Chinese (Simplified)": {"rich_text": [{"text": {"content": "新文案"}}]},
    "English": {"rich_text": [{"text": {"content": "New text"}}]}
  }
}'
```

### 查询 + 定位 page id（用于后续 PATCH）

```bash
ntn-query <ds_id> --filter '{"property":"Key","title":{"equals":"tut_utility_autofire"}}'
# 结果 results[].id 即 page id
```

---

## 五、交叉上下文（非本 handoff 职责，仅记录）

- 本次操作的前端多语言库 + 对话库的**字段结构、I2 导入流程、LocalizedString 缓存陷阱**已记录在 NeonSpark 项目级 AiDoc：`AiDoc/技术架构/I2多语言基础设施/Localize组件生命周期与Term解析.md`（陷阱 7）。
- 项目级 na2-notion-cms skill 目前只覆盖后端 i18n_texts 库（云函数发布链路），**不覆盖**前端这两个库。本次操作直接用全局 notion skill + `ntn api` 原生调用完成。
- 本 handoff 只管全局 notion skill 的能力补丁；项目级工作流是否扩展由 NeonSpark 仓自行决定。

---

## 六、优先级

中。`ntn-create` 封装能显著降低多语言文案维护类任务的 token 消耗与出错率，且 SKILL.md 已自承是候选扩展。不阻塞当前 NeonSpark 任务（本次已用 `ntn api` 原生调用完成）。
