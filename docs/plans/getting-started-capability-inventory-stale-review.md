# `docs/getting-started.md` 更新建议 — 融合审查报告

> FUSION agent 出品，基于 ARCHITECT (deepseek-v4-pro) + BUILDER (glm-5.2) 两份独立审查归并。

---

## 总览

**结论：Step 3（能力清单）基本全部过时，8 个统计行中 7 个数量错误，另有 1 处坏链、2 个幽灵条目、2 个分类错置、3 项关键缺失内容。按优先级分级为 P0/P1/P2。**

---

## P0 — 必须立即修复

### 1. Agent 数量：文档 0 → 实际 8

`getting-started.md` Step 3 全局同步表中 Agent 行写为 **0**（「使用 Pi 内置 agent」），但 `.pi/capabilities.yaml` `global.agents` 列出 **8 个**自定义 agent [ARCHITECT][BUILDER]：

| # | agent 文件名 |
|---|-------------|
| 1 | `unity-worker.md` |
| 2 | `scout.md` |
| 3 | `worker.md` |
| 4 | `context-builder.md` |
| 5 | `oracle.md` |
| 6 | `planner.md` |
| 7 | `researcher.md` |
| 8 | `reviewer.md` |

这 8 个 agent 会在 `sync-pi-agent.sh` 执行时同步到 `~/.pi/agent/agents/`，覆盖 Pi 内置同名 agent 定义。文档说 0 会严重误导用户对自己环境行为的预期 [BUILDER]。

### 2. 外部包数量：文档 5 → 实际 12

文档列出 5 个包，实际 `global.settings.packages` 有 **12 个** [ARCHITECT][BUILDER]：

| 文档所列 (5) | 实际 (12，capabilities.yaml) |
|---|---|
| ~~pi-ask~~ → 已替换为 `pi-question` | `git:github.com/rwese/pi-question` |
| pi-tab-status | `npm:@tmustier/pi-tab-status` |
| pi-powerline | `git:github.com/jwu/pi-powerline` |
| pi-terminal-signals | `git:github.com/lucasmeijer/pi-terminal-signals` |
| pi-tool-display | `git:github.com/nantas/pi-tool-display` |
| *(缺失)* | `npm:@johnnywu/pi-subagents` |
| *(缺失)* | `npm:pi-mcp-adapter` |
| *(缺失)* | `git:github.com/jwu/pi-webfetch` |
| *(缺失)* | `npm:@ff-labs/pi-fff` |
| *(缺失)* | `git:github.com/DietrichGebert/ponytail` |
| *(缺失)* | `git:github.com/nantas/pi-xai` |
| *(缺失)* | `npm:pi-codex-image-gen` |

### 3. 幽灵条目（文档有、清单/磁盘均无）

两个条目出现在文档 Step 3 中，但既不存于 `capabilities.yaml` 也不存于磁盘 [BUILDER]：

| 幽灵条目 | 文档位置 | 实际情况 |
|---------|---------|---------|
| `subagent` prompt | Prompts 列表末尾（12 项中的第 11 项） | `global.prompts` 仅 10 个（全部为 `opsx-*`），`.pi/prompts/` 无 `subagent.md` |
| `lsp-pi` 包 | Catalog 表最后一行 | `catalog.packages` 为空数组 `[]`，仅在 `install-from-pi-config/SKILL.md:75,86,268` 作为示例文本残留 |

### 4. 坏链

`getting-started.md:77`：

```
(.pi/agent/AGENTS.d/pi-provider-model.md)
```

该路径 **不存在**。正确路径为 `docs/reference/pi-provider-model.md` [BUILDER]。已验证：

- ✗ `.pi/agent/AGENTS.d/pi-provider-model.md` — 不存在
- ✓ `docs/reference/pi-provider-model.md` — 存在

---

## P1 — 应尽快修复

### 5. 全局扩展：文档 6 → 实际 7

文档列出 6 个全局扩展（含 `add-provider`），但 `global.extensions` 实际为 **7 个**，且 `add-provider` 不在全局范围内 [ARCHITECT][BUILDER]：

| 文档列出的 6 个 | 实际 global.extensions (7) |
|---|---|
| dollar-skill-invoke | ✓ |
| planner-toggle | ✓ |
| output-scroll-viewer | ✓ |
| tool-counter-widget | ✓ |
| init-command | ✓ |
| ~~add-provider~~ → **catalog** | ✗（属 `catalog.extensions`） |
| *(缺失)* | `browse-session-tree` |
| *(缺失)* | `session-browse` |

### 6. 全局技能：文档 1 → 实际 2

文档仅列 `install-from-pi-config`，实际 `global.skills` 为 2：多了 `notion` [ARCHITECT][BUILDER]。

### 7. Prompts：文档 11 → 实际 10

文档列 11 个（含 `subagent`），实际 `global.prompts` 为 **10 个**（全部 `opsx-*`），无 `subagent` [ARCHITECT][BUILDER]。

### 8. Catalog 技能：文档 3 → 实际 4

文档列 `obsidian-search`、`pi-extension-dev`、`pkg-research`，缺 `pkg-fork-dev` [ARCHITECT][BUILDER]。

### 9. Catalog 扩展：文档 1 → 实际 4

文档仅列 `obsidian-tools`，实际 `catalog.extensions` 有 4 个 [ARCHITECT][BUILDER]：

| 新增 | 说明 |
|-----|------|
| `add-provider` | 自定义模型供应商（从全局误归类移回 catalog） |
| `trellis-analytics` | Trellis 工作流可观测性遥测 |
| `wikilink-batch-replace` | 批量替换为 Obsidian wikilinks |

### 10. Catalog 包：文档 2 → 实际 0

文档列 `pi-mcp-adapter` 和 `lsp-pi`，实际 `catalog.packages` 为**空数组**。其中 `pi-mcp-adapter` 的正确归属是 `global.settings.packages`（全局包），`lsp-pi` 是幽灵条目 [ARCHITECT][BUILDER]。

---

## P2 — 建议补充

### 11. 分类错置

两处分类错误，需在重写 Step 3 时一并纠正 [BUILDER]：

| 条目 | 文档分类 | 实际分类 | 证据 |
|-----|---------|---------|------|
| `add-provider` 扩展 | 全局（Step 3 全局表） | Catalog | `capabilities.yaml:111`（`catalog.extensions`） |
| `pi-mcp-adapter` 包 | Catalog（Step 3 catalog 表） | 全局 | `capabilities.yaml:59`（`global.settings.packages`） |

### 12. 缺失 `defaultProvider` / `defaultModel` 实际值

Step 4 提示用户检查 `defaultProvider` / `defaultModel`，但未告知当前实际值。`capabilities.yaml` 中已设定 [ARCHITECT]：

```yaml
defaultProvider: deepseek
defaultModel: deepseek-v4-flash
```

建议在 Step 4 中补充说明：「当前仓库预设为 `deepseek/deepseek-v4-flash`」。

### 13. 缺失环境变量维度

`capabilities.yaml` 中存在 `global.env` 区块，声明了 `pi-fff` 包需要的 3 个环境变量，文档完全未提及 [ARCHITECT][BUILDER]：

| 变量 | 值 | 说明 |
|-----|---|------|
| `FFF_FRECENCY_DB` | `$HOME/.cache/pi/fff_frecency` | LMDB frecency 数据库 |
| `FFF_HISTORY_DB` | `$HOME/.cache/pi/fff_history` | LMDB 历史数据库 |
| `PI_FFF_MODE` | `tools-only` | **关键**：禁用 `FffEditor`（@-mention 自动补全），避免与 `pi-powerline` 的 `setEditorComponent` 冲突 |

`PI_FFF_MODE=tools-only` 与 `pi-powerline` 的冲突规避关系是强耦合设计，而 `pi-powerline` 正是 Step 4 建议用户可能删减的包——文档需要把这两个点说清楚 [BUILDER]。

### 14. 后续工作流表缺少 `pkg-fork-dev`

文档末尾「后续扩展：可用工作流」表缺少 `pkg-fork-dev` 技能入口 [ARCHITECT]。建议新增一行：

| 场景 | 工作流 | 使用位置 |
|------|--------|----------|
| **Fork 并修改已有的第三方 Pi 包** | `pkg-fork-dev` | 本仓库 |

---

## 汇总：Step 3 两表全部字段对照

### 全局同步表（修正版）

| 类型 | 文档值 | 实际值 | 变动 |
|------|--------|--------|------|
| 扩展 | 6（含 add-provider） | **7** | +browse-session-tree, +session-browse; add-provider → catalog |
| Agent | 0 | **8** | unity-worker, scout, worker, context-builder, oracle, planner, researcher, reviewer |
| 技能 | 1 | **2** | +notion |
| Prompts | 11（含 subagent） | **10** | -subagent（幽灵条目） |
| 外部包 | 5（含 pi-ask） | **12** | pi-ask→pi-question; +7 个新包 |

### Catalog 表（修正版）

| 类型 | 文档值 | 实际值 | 变动 |
|------|--------|--------|------|
| 技能 | 3 | **4** | +pkg-fork-dev |
| 扩展 | 1（obsidian-tools） | **4** | +add-provider, +trellis-analytics, +wikilink-batch-replace |
| 包 | 2（pi-mcp-adapter, lsp-pi） | **0** | pi-mcp-adapter→全局; lsp-pi=幽灵条目 |

---

## Consensus & Divergence

### 共识（两位模型完全一致）

两个模型在所有核心数据点上的发现完全一致：

- 全局扩展 6→7、Agent 0→8、技能 1→2、Prompts 11→10、外部包 5→12
- Catalog 技能 3→4、扩展 1→4、包 2→0
- `subagent` 是幽灵条目（capabilities.yaml 无此 prompt）
- `pi-mcp-adapter` 和 `add-provider` 分类错置
- Step 3 表格需要整体重写

### 差异点

| 主题 | ARCHITECT (deepseek-v4-pro) | BUILDER (glm-5.2) | Fusion 判定 |
|------|---------------------------|-------------------|------------|
| 坏链 `.pi/agent/AGENTS.d/pi-provider-model.md` | 未提及 | **发现并验证**：`getting-started.md:77`，正确路径 `docs/reference/pi-provider-model.md` | 采纳 BUILDER（已验证：旧路径不存在，新路径存在） |
| `lsp-pi` 幽灵条目 | 仅标注 catalog.packages=0 | **追根溯源**：指出仅在 `install-from-pi-config/SKILL.md` 作示例残留 | 采纳 BUILDER（更完整的溯源） |
| PI_FFF_MODE 与 pi-powerline 的关系 | 仅列举缺失 env 提示 | **深入分析**：PI_FFF_MODE=tools-only 专门规避 pi-powerline 的 setEditorComponent 冲突，且 pi-powerline 正好是 Step 4 建议删减的包——文档需把两个点说清 | 采纳 BUILDER（揭示了耦合设计意图） |
| 优先级分级 | 未分级 | **P0/P1/P2 三分级** | 采纳 BUILDER（分级使修复计划可执行） |
| Step 3 重写稿 | 未提供 | **提供可直接落地的两表重写稿** | 采纳 BUILDER（降低人工修改成本） |

### 丢弃内容

- **无**。两份审查内容互补且无矛盾，ARCHITECT 提供的表格化汇总和缺失 `defaultProvider`/`defaultModel` 提示与 BUILDER 的深度溯源和分级结构形成良好互补。
