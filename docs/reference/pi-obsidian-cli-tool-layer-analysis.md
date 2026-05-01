# Obsidian CLI: Tool Layer vs Pure Skill 分析

> 撰写时间：2026-05-01
> 用途：`@haispeed/pi-obsidian` 包调研结论 + 自定义 obsidian tool 层设计前的基础上下文
> 来源调研：pkg-research 技能对 `npm:@haispeed/pi-obsidian@0.1.1` 的完整审查
> 对照文档：[obsidian-mind Obsidian_CLI.md](../../reference-to-external.md) 和 [obsidian-mind obsidian-cli skill](../../reference-to-external.md)（详见参考章节）

---

## 1. 调研对象概要

| 属性 | 内容 |
|------|------|
| 包名 | `@haispeed/pi-obsidian@0.1.1` |
| 类型 | Pi extension + skill |
| 大小 | 17.0 KB unpacked |
| 运行时依赖 | **none** |
| 许可 | MIT |
| 维护者 | haispeed |

### 包内资源

| 资源 | 路径 | 说明 |
|------|------|------|
| Extension | `extensions/obsidian-cli.ts` | 注册 `obsidian_cli` tool |
| Skill | `skills/obsidian-cli/SKILL.md` | 使用指导 |
| Skill | `skills/obsidian-markdown/SKILL.md` | Obsidian Markdown 语法参考 |
| Reference | `skills/obsidian-markdown/references/PROPERTIES.md` | 属性语法 |
| Reference | `skills/obsidian-markdown/references/EMBEDS.md` | 嵌入语法 |
| Reference | `skills/obsidian-markdown/references/CALLOUTS.md` | Callout 语法 |

---

## 2. 安全审查结论

**Overall: CLEAN**

| 检测项 | 结果 | 备注 |
|--------|------|------|
| 网络请求 | 0 发现 | 无 fetch/axios/request |
| 命令执行 | 1 发现（预期） | `spawn("obsidian", args)` 是预期集成方式 |
| 动态代码 | 0 发现 | 无 eval/new Function/vm |
| 混淆 | 0 发现 | 无 base64/hex/minified |
| 依赖 | 无运行时依赖 | 仅 peerDeps: `@mariozechner/pi-coding-agent`, `@sinclair/typebox` |

关键安全设计：
- `isValidToken()` regex `/^[a-z0-9:_-]+$/i` 净化所有输入参数
- `DANGEROUS_COMMANDS` 集合（eval, dev:cdp, dev:debug, restart）需 `allowDangerous=true` 才放行
- 30s 超时 + AbortSignal 取消支持
- 自动 fallback 路径：先 `obsidian` (PATH) → `/Applications/Obsidian.app/Contents/MacOS/obsidian`

---

## 3. 核心架构分析

### 3.1 社区包 tool 层的执行链路

```
LLM 决策调用
→ TypeBox schema 参数校验（Pi SDK 层）
→ isValidToken() 输入净化
→ spawn("obsidian", args) 或 fallback 路径
→ 返回 { content: [{ type: "text", text: stdout }], details: { ok, code, args } }
```

### 3.2 检索接口与返回数据结构

社区包提供的 `obsidian_cli` tool 是一个**通用透传层**，不封装任何检索逻辑：

```typescript
// 调用示例
obsidian_cli({
  command: "search",
  params: { query: "OrbitOS", limit: "10" },
  flags: ["format=json"]
})
// → 直接 spawn: obsidian search query=OrbitOS limit=10 format=json
// → 返回原始 stdout/stderr 文本
```

**返回数据结构（两种模式）：**

| 模式 | 参数 | 返回内容 |
|------|------|---------|
| 默认 | `raw: false` | `$ obsidian {args}\n{stdout}\n[stderr]\n{stderr}` 文本 |
| Raw | `raw: true` | 仅 stdout（或 stderr if empty） |

**无结构化解析** — 不解析 CLI JSON 输出，不提取字段，不做重排序，不做截断。Agent 需自行解析 stdout。

### 3.3 对 Obsidian CLI 的依赖

社区包**完全依赖** Obsidian 官方 CLI：

- 调用 `spawn("obsidian", args)` 执行系统二进制
- 硬编码备用路径 `/Applications/Obsidian.app/Contents/MacOS/obsidian`
- **没有**调用 Obsidian 内部 API、REST API、或直接读 vault 文件系统
- 使用前提（与官方文档一致）：
  1. Obsidian 1.12.0+ 且启用 CLI（设置 → 通用 → 启用命令行界面）
  2. Catalyst Insider 许可（$25 一次性）
  3. Obsidian 应用运行中

---

## 4. Tool 层 vs 纯 Skill 的优势矩阵

### 4.1 社区包 tool 相对纯 bash 的增量

社区包 `obsidian_cli` tool 比纯 bash `obsidian search query="..."` 多了：

| 能力 | 纯 bash | 社区 tool |
|------|---------|-----------|
| 参数类型强制 | ❌ 模型构造 shell 字符串，易出错 | ✅ TypeBox schema 在 Pi SDK 层校验 |
| 输入白名单 | ❌ | ✅ isValidToken() regex |
| 危险命令门禁 | ❌ | ✅ allowDangerous 护栏 |
| 超时 + 取消 | ❌ | ✅ 30s 超时 + AbortSignal |
| 错误标准化 | ❌ stdout/stderr 混在一起 | ✅ { ok, code, args, stderr } |
| 自动 fallback | ❌ 需 skill 指导 | ✅ 内建 path fallback |
| 可被其他 ext 观测 | ❌ 不可见 | ✅ tool_call 事件触发 |

### 4.2 纯 Skill + Bash 的根本性局限

| 局限 | 后果 |
|------|------|
| **无法并行** | `search` + `tags:counts` 必须串行两次 bash 调用 |
| **无法提前截断输出** | CLI 返回的 20 条结果（~4K-8K 字符）全量注入上下文后模型再解读，浪费 token |
| **无状态** | 每次检索重新 preflight，模型需自行决策是否已验证 CLI |
| **排序/评分依赖模型判断** | path_prior、策略档位等靠模型阅读 skill 文本后手动执行，同一查询不同轮次结果可能不一致 |
| **无法被观测** | 其他 extension 无法 hook 事件 |
| **多步流程依赖多次往返** | Recall → 判断 → Expand → 判断 → Pack，每步一次 LLM round-trip（3-6 次） |

---

## 5. 自定义 Tool 层的设计规划（未来建设基线）

### 5.1 建议架构

```
obsidian_retrieve tool（主要对外接口）
├── 内部调用 obsidian_cli（纯透传，或直接 spawn）
├── 内部管线（无 LLM 参与）：
│   ├── preflight（缓存结果）
│   ├── rewrite（嵌入自动改写规则）
│   ├── recall（并行命令执行）
│   ├── score & rank（程序化排序先验 path_prior=v2）
│   └── pack（拼装 Context Pack，截断 TopK）
└── 外部依赖：
    ├── strategy_tiers 配置
    ├── command_recipes 配置
    └── fallback 配置
```

### 5.2 效率提升量化预估

| 改进项 | 当前纯 skill | 自定义 tool 后 | 节省 |
|--------|-------------|---------------|------|
| Round-trip 次数 | 3-6 次 LLM 往返 | 1 次 tool call + 内部并行 | ~60-80% |
| Token 注入量 | 全量 ~4K-8K | 截断 Top3 ~1.2K-3K | ~60-70% |
| 单次检索耗时 | ~6-15s（含 LLM 推理） | ~2-5s（内部串行） | ~50-70% |

### 5.3 准确率提升（确定性逻辑替代模型判断）

| 能力 | 纯 skill（模型解读） | 自定义 tool（程序化） |
|------|---------------------|---------------------|
| path_prior=v2 | 模型读 skill 文本后手动排序 | 确定性排序函数 |
| 自动改写 | 额外 bash 调用 rewrite script | tool 内内部步骤 |
| 策略档位 | 模型解释 strategy_tiers 并执行 | switch 编码，保证执行一致性 |
| 预算升级 | 模型检测 gap 后决策是否升级 | 内部自动检测 gap < 0.15 触发升级 |
| 错误处理 | 模型解读错误文本 | 标准化 error 结构 |

### 5.4 功能扩展（纯 skill 做不到的）

| 功能 | 描述 | 依赖的 API |
|------|------|-----------|
| 并行命令 | Promise.all([search, tags, properties]) 合并召回 | ExtensionAPI.internal |
| Session 级缓存 | session_start 预检 CLI 可用性，闭包变量保持 | `pi.on("session_start")` |
| 跨调用状态 | 上一次检索结果缓存，支持 refine 迭代 | 闭包变量 |
| 持久化偏好 | 查询历史/偏好路径跨 session 保持 | `pi.appendEntry()` |
| 可观测性 | 被 audit/logging extension 拦截 | `tool_call` 事件 |
| 用户通知 | 实时反馈搜索状态 | `ctx.ui.notify()` |
| Stream 输出 | 先返回 Top1 再补充完整结果 | stream API |

---

## 6. 与 obsidian-mind 仓库现有技能的对比

### 6.1 社区包 skill vs obsidian-mind obsidian-cli skill

| 维度 | 社区包 skill | obsidian-mind skill |
|------|-------------|---------------------|
| 策略档位 | ❌ 无 | ✅ precision / balanced / speed / fix |
| Recall 编排 | ❌ 仅命令参考 | ✅ 预编排 search/tags/properties + 格式规则 |
| Expand 编排 | ❌ 无 | ✅ search:context → backlinks → links → read |
| Context Pack | ❌ 无标准化输出 | ✅ v1: path/score/reason/snippet/metadata |
| 排序先验 | ❌ 无 | ✅ path_prior=v2 |
| 预算管理 | ❌ 无 | ✅ budget=1/2/3 + 动态升级 |
| 触发判定 | ❌ 无 | ✅ term_out_of_context / history_lookup |
| 预检机制 | ❌ 无 | ✅ preflight 探测 CLI 可用 |
| 降级链路 | ❌ 无 | ✅ CLI → rg 本地检索 |
| 自动改写 | ❌ 无 | ✅ auto_rewrite 规则版 |
| Benchmark 验证 | ❌ 无 | ✅ 50+ 条查询 + 24 条 prompt 验证 |
| 路由协作 | ❌ 无 | ✅ handoff packet → routing-governance |

### 6.2 互补关系

社区包的 `obsidian_cli` tool 和 obsidian-mind skill **不是竞争关系，而是可组合的**：

- obsidian-mind skill 提供完整的**策略层 + 编排层 + 降级层**
- 社区包 tool 提供 Pi 生态内的**标准化 CLI 绑定入口**
- 自定义 tool 可以**融合两者**：用社区包/自建 tool 的执行能力，承载 obsidian-mind 的策略智能

---

## 7. 关键设计决策记录（待确认）

下列决策应在 Extension 开发前或过程中逐项和用户确认：

- [ ] Tool 命名：`obsidian_retrieve` / `obsidian_search` / 其他
- [ ] 管线深度：纯 recall / recall+expand / 全流水线（含 rewrite + rank + pack）
- [ ] 策略档位：直接复用 obsidian-mind 的 strategy_tiers 还是简化
- [ ] 并行范围：仅 search + tags，还是扩展到 properties + tasks
- [ ] 输出格式：Context Pack v1 保持兼容，还是有增强字段
- [ ] 缓存粒度：仅 preflight，还是含检索结果
- [ ] 降级策略：复用 fallback_and_fix 还是内建
- [ ] 社区包引用：基于社区包二次开发，还是从零自建 tool 层

---

## 8. 参考文档

| 文档 | 路径 |
|------|------|
| obsidian-mind 研究文档 | `obsidian-mind/30_研究/知识库/Obsidian_CLI.md` |
| obsidian-mind obsidian-cli skill | `obsidian-mind/.agents/skills/obsidian-cli/SKILL.md` |
| obsidian-mind 策略档位 | `obsidian-mind/.agents/skills/obsidian-cli/references/strategy_tiers.md` |
| obsidian-mind 命令编排 | `obsidian-mind/.agents/skills/obsidian-cli/references/commands_recall_expand.md` |
| obsidian-mind 降级策略 | `obsidian-mind/.agents/skills/obsidian-cli/references/fallback_and_fix.md` |
| 社区包源码 | `npm:@haispeed/pi-obsidian` -> `extensions/obsidian-cli.ts` |
| Obsidian CLI 官方文档 | `https://help.obsidian.md/cli` |
| Pi Extension API 文档 | `repo://pi-mono/packages/coding-agent/docs/extensions.md` |
| pi-extension-dev 技能 | `.pi/skills/pi-extension-dev/SKILL.md` |
