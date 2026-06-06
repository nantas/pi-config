# Proposal

## 问题定义

obsidian-tools 扩展的 `obsidian_search` 工具在当前实现中存在两个核心搜索质量与性能问题：

### P1: Intl.Segmenter 无法正确分割游戏设计复合词

`Intl.Segmenter('zh', {granularity: 'word'})` 对游戏设计领域常见的 2 字复合词几乎全部误拆为单字：

| 输入 | Intl.Segmenter 产出 | 期望产出 |
|------|--------------------|---------|
| `牌组构筑` | `["牌","组","构","筑"]` | `["牌组","构筑"]` |
| `引擎构筑` | `["引擎","构","筑"]` | `["引擎","构筑"]` |
| `卡牌机制` | `["卡","牌","机制"]` | `["卡牌","机制"]` |

单字 token 在 OR 搜索下产生大量噪声匹配，增加排序负担并降低结果质量。

### P2: rg 子进程非最优

- 每次搜索启动子进程，有 fork/exec 开销
- rg 无预索引，每次搜索扫描文件系统
- 依赖外部工具（需 `brew install ripgrep`）
- 不可利用 SIMD 加速的多模式匹配

### 验证结论

在 my-wiki vault（5565 文件）上完成的对比测试确认：
- **jieba 分词质量**：默认模式对所有测试用例产出正确结果，每次分割 ~0.02ms（首次字典加载 ~240ms）
- **FFF 搜索性能**：`multiGrep()` 耗时 **6-45ms/query**（vs rg 的 ~1-3s），SIMD Aho-Corasick 多模式匹配与 rg 的正则 OR 完全语义等价
- **持久化 Python worker 协议**：通过 stdin/stdout JSON 行协议已验证工作正常

详见 `repo://my-wiki/docs/design/obsidian-search-backend-upgrade.md`。

## 范围边界

**In scope**：
- `obsidian_search` 的 tokenization 后端从 `Intl.Segmenter` → jieba（通过持久化 Python 子进程）
- `obsidian_search` 的搜索后端从 `spawnSync("rg", args)` → `FileFinder.multiGrep()`（`@ff-labs/fff-node`）
- `obsidian-tools/package.json` 添加 `@ff-labs/fff-node` 依赖
- `search-config.yaml` 的 `tokenization.method` 默认值更新
- 新增 `tokenizer-worker.py`（jieba 持久化 worker）
- `runtime` 配置新增 FFF 相关选项
- `session_start` / `session_shutdown` 事件处理：FFF 预索引初始化和 Python worker 生命周期
- 保留回退机制：jieba → Intl.Segmenter、FFF → rg

**Out of scope**：
- 排序模型算法（`rankResults()` 不变）
- snippet 生成逻辑不变
- 工具参数接口不变
- 非搜索功能（`obsidian_cli` 其他命令不受影响）
- `vault-resolver.ts` 不变

## Capabilities

### New Capabilities

- 无（本 change 不引入全新外部能力 ID，仅修改已有 capability）

### Modified Capabilities

- `obsidian-search-tool`: 搜索后端从 rg 替换为 FFF `FileFinder.multiGrep()`；中文分词从 `Intl.Segmenter` 替换为 jieba Python worker；保留回退机制
- `obsidian-search-config`: `tokenization.method` 默认值从 `intl_segmenter` 改为 `jieba`；`runtime` 配置增加 `fff_timeout_ms`、`fff_page_size` 等 FFF 相关参数
- `obsidian-tools-extension`: 在 `session_start` 中添加 FFF 预索引扫描和 Python jieba worker 的惰性初始化；在 `session_shutdown` 中添加两者的清理逻辑

## Capabilities 待确认项

- [x] 能力清单基于现有扩展结构拆分，未引入全新外部能力 ID
- [x] `obsidian-search-tool` 对应现有 search-tool.ts 的完整后端替换
- [x] `obsidian-search-config` 的 tokenization.method 默认值修改已在设计文档中明确

## Impact

- `.pi/extensions/obsidian-tools/` 下 `search-tool.ts` 大幅修改（分词 + 搜索后端替换）
- `index.ts` 新增 `session_start` 事件处理（FFF 预索引 + Python worker 启动）
- `package.json` 新增 `@ff-labs/fff-node` 依赖
- 新增 `tokenizer-worker.py` 文件（jieba 持久化 worker）
- `search-config.ts` 中 `tokenization.method` 解析默认值更新，`RuntimeConfig` 增加 FFF 字段
- 回退机制（jieba→Intl.Segmenter、FFF→rg）确保环境不满足时的可用性
- 对外工具接口完全向后兼容

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页 / 项目页 / 回写目标：
  - `repo://my-wiki/docs/design/obsidian-search-backend-upgrade.md` — 上游设计文档
  - `.pi/capabilities.yaml` — 能力清单（按需更新）
