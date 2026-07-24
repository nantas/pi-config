# Notion Skill 文档补丁：`--replace` 子页面陷阱 + `ntn-edit` 优先级

> **状态**：待外部处理
> **来源 session**：NA2 第一次 TapTap 封闭测试数据分析（2026-07-23）
> **影响 skill**：全局 `~/.pi/agent/skills/notion/SKILL.md`（所有 session/项目共享）
> **改动规模**：2 处文字补丁，不新增脚本，不膨胀文档

---

## 一、问题背景

### 触发场景

NA2 封闭测试数据报告输出到 Notion 页面 `3a663e9b-7ea6-807f-9803-c92722ab4f1a`。该页面下挂了一个子页面「TapTap Demo 首次内测 CrashSight 相关」。报告迭代时需要全量更新页面内容。

### 实际行为

| 动作 | 结果 |
|------|------|
| `ntn-write --replace`（页面有子页面） | ❌ Notion API 拒绝：`400 validation_error: This operation would delete 1 child page(s) or database(s): page: "TapTap Demo 首次内测 CrashSight..."` |
| `ntn-edit --ops`（块级查找替换，分 3 次精准替换） | ✅ 成功，子页面完好保留 |
| `ntn-write --append`（追加，不删块） | ✅ 成功，子页面完好保留 |

**关键发现**：SKILL.md 现状文档把"大内容替换"引向 `ntn-write --replace`，但这个命令在有子页面时会失败。真正安全的大替换方案是 `ntn-edit`（块级查找替换，不删任何块），文档反而没强调它的优先级。

---

## 二、SKILL.md 现状缺陷（2 处）

### 缺陷 1：`ntn-edit` 段末尾把大替换推向会失败的 `--replace`

**现状**（SKILL.md `ntn-edit` section 最后一行）：

```
Uses `update_content` — the recommended Notion API edit mode. For large content swaps, use `ntn-write --replace`.
```

**问题**：推荐"大内容替换用 `--replace`"，但没提 `--replace` 会因子页面失败。当目标页面挂了子页面/子数据库时（这是常见场景——报告页常挂 CrashSight/子报告），这条指引会把 agent 引向死路。

### 缺陷 2：`ntn-write --replace` 完全没标陷阱

**现状**（SKILL.md `ntn-write` section）：

```
ntn-write <page_id_or_url> --replace "## Replaced\n\nAll new content."
```

下方只有 `--set` 的说明，`--replace` 行为零说明。

**问题**：`--replace` 会删除整棵块树（含子页面/子数据库），Notion API 出于安全拒绝。文档对这条只字未提，也没给 fallback 方案。

---

## 三、建议补丁（精确 oldText / newText）

> 两处改动都对应 SKILL.md 自己声明的维护流程（"Extending This Skill → 识别 friction → 更新 SKILL.md"），属于该 skill 设计预期的维护，不引入新概念。

### 补丁 A：`ntn-edit` 段末尾一行

**oldText**（精确匹配）：
```
Uses `update_content` — the recommended Notion API edit mode. For large content swaps, use `ntn-write --replace`.
```

**newText**：
```
Uses `update_content` — the recommended Notion API edit mode; preserves child pages/databases (deletes no blocks). **Preferred over `--replace` when the target page has child pages/databases.** For large multi-section swaps, write a JSON ops file and use `--ops` (one `{"old","new"}` per changed section).
```

### 补丁 B：`ntn-write` 段，`--replace` 行后追加陷阱说明

**oldText**（精确匹配，定位锚点）：
```
ntn-write <page_id_or_url> --replace "## Replaced\n\nAll new content."
```

**newText**（在原行后追加陷阱段）：
```
ntn-write <page_id_or_url> --replace "## Replaced\n\nAll new content."

⚠️ `--replace` deletes the entire block tree. If the page has **child pages or child databases**, the Notion API rejects with `400 validation_error: "This operation would delete N child page(s) or database(s)"`. Fallback: use `ntn-edit --ops` for block-level search-and-replace (preserves children), or `ntn-write --append` to add without deleting.
```

---

## 四、验证步骤（外部仓库处理后）

1. **应用补丁后读 SKILL.md**，确认两处 newText 已就位、无格式错乱。
2. **找一个挂了子页面的测试 Notion 页**（或直接用本次的 `3a663e9b-7ea6-807f-9803-c92722ab4f1a`，它挂了 CrashSight 子页面）。
3. **回归测试**：
   - `ntn-write --replace "测试内容"` → 应继续 400 报错（这是 API 行为，不变）
   - `ntn-edit --ops` 块级替换 → 应成功（验证 fallback 有效）
   - `ntn-write --append` → 应成功
4. **新 session 验证**：起一个新 Pi session，给一个挂子页面的 Notion URL 让它"全量更新页面内容"，观察 agent 是否优先选 `ntn-edit` 而不是 `--replace`。

---

## 五、可选增强（非本次必做）

如果未来想根治"大替换遇子页面"问题，可考虑：

- **ntn-write 新增 `--safe-replace` flag**：内部实现 = 读旧内容 → 逐块 `ntn-edit` 替换 → 保留子页面。把"块级安全替换"封装成一个命令，agent 不用手写 ops JSON。但这是新功能开发，本次只做文档补丁，不动脚本。

---

## 六、本次实战参考（证据留存）

### 成功的块级替换流程（NA2 报告 v1.2 更新）

```bash
# 1. 先读页面，确认要替换的精确文本（含 Notion HTML 化的表格）
ntn-read "3a663e9b..." | python -c "import sys,json; md=json.load(sys.stdin)['markdown']; ..."

# 2. 写 ops JSON（每个改动一条 {"old","new"}）
cat > /tmp/ntn_edit_X.json <<'EOF'
[{"old": "精确旧文本...", "new": "新文本..."}]
EOF

# 3. 执行
ntn-edit "3a663e9b..." --ops /tmp/ntn_edit_X.json
# → {"id": "...", "truncated": false, "changes": 1}

# 4. 追加新章节用 append（不删块）
ntn-write "3a663e9b..." --append "新章节内容..."
```

### 失败的 --replace（反面教材）

```bash
ntn-write "3a663e9b..." --replace "$(cat report.md)"
# → 400 Bad Request validation_error:
#   This operation would delete 1 child page(s) or database(s):
#   - page: "TapTap Demo 首次内测 CrashSight 相关"
```

### 关键经验

- `ntn-read` 返回的 markdown 里，**表格可能被 Notion 渲染成 HTML `<table>`**，做 `--old` 匹配时要按实际返回的格式写，不能假设是 markdown 管道符表格。
- `ntn-edit --ops` 的 `changes` 字段 = 实际命中的替换数，如果返回 `changes: 0` 说明 oldText 没匹配上（常见于格式偏差），需要重新读页面核对。

---

## 七、上下文链接

- **来源 session**：2026-07-23 NA2 封闭测试数据分析（PostHog + Notion 工作流）
- **SKILL.md 源文件**：`/Users/nantasmac/.pi/agent/skills/notion/SKILL.md`
- **测试用 Notion 页面**：`3a663e9b-7ea6-807f-9803-c92722ab4f1a`（挂了 CrashSight 子页面，可用于回归）
- **配套复盘**：NA2 报告同目录《过程问题汇报与经验总结.md》第 3.2 节也提到了 Notion URL slug 解析问题（`ntn-resolve` 无法从 `app.notion.com/p/veewo/slug-ID` 提取 ID，需手动取 UUID 段）——这是另一个独立的小 friction，本 handoff 未涵盖，可另行处理。
