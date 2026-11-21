# Pi-Config 上下文

pi-config 是 Pi coding agent 全局配置的集中管理仓库：`.pi/` 与 `.pi/capabilities.yaml` 是唯一真相源（SSOT），`scripts/sync-pi-agent.sh` 把它单向部署到四个运行时目标，`catalog` tier 供其他仓库按需安装，OpenSpec 承载能力规格与变更生命周期。

阅读顺序：本文（领域总览与术语）→ `docs/adr/`（关键决策与取舍）→ `openspec/specs/`（能力行为真源）→ `docs/agents/`（issue 与文档治理规则）。

## 一、仓库角色与四目标单向同步

**真源**：`.pi/`（`extensions/`、`agents/`、`skills/`、`prompts/`、`herdr-templates/`、`agent/AGENTS.md`、`managed/`）+ `.pi/capabilities.yaml`。清单决定"哪些资源被同步"，目录决定"资源长什么样"；`.pi/` 资源的增删改必须同步改清单，否则产生同步漂移。

**四个部署目标**（全部单向：仓库 → 运行时；全局同步前需用户确认）：

| 目标 | 清单字段 | 语义 |
| --- | --- | --- |
| `~/.pi/agent/` | `global.extensions`、`global.agents`、`global.skills`、`global.prompts`、`global.settings`、`global.files`；另加 `agent_md`、`themes/`、`mcp.json`、`models.json` | 白名单覆盖式部署，仓库移除的条目在目标端一并清理 |
| `~/.agents/skills/` | `global.shared_skills` | 跨 harness 共享层，**只增不删**：声明条目整体替换，不清理未声明内容 |
| `~/.config/herdr-core/templates/` | `global.hc_templates` | hc 终端模板，同样**只增不删** |
| 其他仓库的 `.pi/` | `catalog` | 按需安装（`install-from-pi-config` 读 `~/.pi/agent/catalog/pi-config.yaml`），不进入全局运行时 |

同步语义里最容易踩错的五点：

- **settings.json 是生成的**，不是拷贝：内容由清单 `global.settings` 渲染，目标机上未被清单声明的键原样保留。`.pi/settings.json` 只是本仓库作为项目运行时用的本地配置，不参与全局同步。
- **models.json 只在清单声明 `global.models` 时重写**；当前未声明，因此本机模型配置（Magpie 路由分组）随目标文件保留。
- **`global.external_extensions`（当前 `magpie`）被同步完全忽略**：不复制、不覆盖、不参与 stale 清理，由外部工具管理。
- **`.pi/agent/mcp.json` 源当前不存在**：同步脚本在源缺失时移除 `~/.pi/agent/mcp.json`。MCP 由 Pi 原生支持，项目级配置放各项目自己的 `.pi/mcp.json`。
- **全局覆盖项目**：同名 prompt / skill 同时存在于 `~/.pi/agent/` 与项目 `.pi/` 时，运行时加载全局版本，项目副本被静默遮蔽——改全局资源必须改本仓库 `.pi/` 再同步。

**变更与归档**：能力行为变更走 OpenSpec（`orbitos-change-v1` schema：binding → proposal → specs → design → tasks → verification → writeback），通过 `/opsx-*` 提示模板或 `openspec` CLI 操作，不手写 `openspec/changes/` 下的文件；完成的变更移入 `openspec/changes/archive/`（日期前缀），可选把 delta specs 同步进 `openspec/specs/`。

## 二、系统提示与工具注入分层

Pi 的系统提示由四层拼成，改哪一层决定了受影响的角色范围：

| 层 | 载体 | 内容 | 生效范围 |
| --- | --- | --- | --- |
| 静态全局层 | `.pi/agent/AGENTS.md` → `~/.pi/agent/AGENTS.md` | 仓库无关的基础约束：沟通与默认决策、需求与交付纪律、工程底线、按需加载索引 | 所有 Pi 进程（含 subagent） |
| 静态按需层 | `.pi/agent/AGENTS.d/*.md` → `~/.pi/agent/AGENTS.d/` | 低频长文（当前仅 `media-and-diagrams.md`：图片格式与 mermaid 宽度纪律）。主文件只给链接，agent 命中分支时用 `read` 加载 | 命中才进上下文，零常驻成本 |
| 项目层 | 各仓库自己的 `AGENTS.md` | 该仓库的专属工作流规则 | 只在该仓库 |
| 动态运行时层 | 扩展在 `before_agent_start` 注入 | 角色契约、工具描述、guideline | 按运行时角色裁剪 |

动态层的四条工程约束（`.pi/extensions/hc-delegation.ts`、`.pi/extensions/bash-search-guard.ts` 共用同一套做法）：

1. **原地改 `event.systemPromptOptions`**（`sections`、`toolSnippets`、`promptGuidelines`），然后返回 `undefined`。返回 `{ systemPrompt }` 会触发整段 prompt 替换：破坏 `@johnnywu/pi-subagents` 的 `systemPrompt: replace` 组合，并使 KV prompt 缓存整段失效。
2. **`setActiveTools` 每回合重放**：工具集在每次 `before_agent_start` 重新收敛，`/reload` 或工具注册表刷新都不会把 `subagent` 悄悄还回 worker。
3. **section 命名空间独占**：`delegation`、`hc_worker_role`、`hc_peer_role` 由扩展独占，角色切换时显式删除不属于当前角色的 section，避免上一角色的残留。
4. **`globalThis` 去重 + `session_shutdown` 清理**：在本仓库内，同一扩展会从项目级 `.pi/extensions/` 和全局 `~/.pi/agent/extensions/` 各加载一次，于是用全局标记跳过第二次注册，并在 `session_shutdown` 清标记，使 `/reload`、`/new`、`/resume`、`/fork` 能干净重注册（见 `docs/reference/pi-extension-session-shutdown-dedup.md`）。

## 三、基础约束与委派守卫

### 3.1 检索闭包

- `pi-fff`（`npm:@ff-labs/pi-fff`）以 `PI_FFF_MODE=override` 运行，直接接管内置 `grep` / `find` 工具名：fff 引擎是唯一检索路径，不再注册 `ffgrep` / `fffind` 别名，工具列表里不存在第二个竞争入口。
- `bash-search-guard` 补住旁路：`bash` 里把 `grep` / `egrep` / `fgrep` / `rg` / `find` 当命令或管道头做仓库搜索时硬拦截，并指向 `grep` / `find` 工具；管道下游过滤（`git log | grep fix`）、非递归 `-q` 存在性检查、`find -delete` 这类运维操作放行。它只在该回合 `bash` 与 `grep`/`find` 同时激活时生效，并改写 `toolSnippets.bash`、追加一条 `promptGuidelines`。

### 3.2 角色检测（确定性，五个角色）

`hc-delegation` 在 `session_start` 用三个信号把当前进程解析成唯一角色，不依赖模型自述：

| 角色 | 判定 | 典型来源 |
| --- | --- | --- |
| `subagent` | `PI_SUBAGENT_DEPTH > 0` | `@johnnywu/pi-subagents` 子进程（不调用 `hc get`） |
| `hc_worker` | `hc get "$HC_TERMINAL_ID" --json` 返回非空 `parent`，或 `template` 非空且不是 `peer` | `hc run grunt` / `hc run workhorse` 启动的终端 |
| `hc_peer` | 同一次查询里 `parent` 为空且 `template: "peer"` | peer 模板终端 |
| `hc_lead` | `parent` 与 `template` 均为空 | 人所在的顶层终端 |
| `standalone` | 无 `HC_TERMINAL_ID`，或 `hc get` 失败 | 普通 `pi` |

### 3.3 角色 → 工具 → section 矩阵

| 角色 | 激活 | 停用 | 注入 section |
| --- | --- | --- | --- |
| `hc_lead` | `hc_worker`（不主动新增 `subagent`） | `hc_report` | `<delegation>`：分工、门槛、可用模板与 agent 清单 |
| `hc_worker` | `hc_report` | `hc_worker`、`subagent` | `<hc_worker_role>`：本轮 terminal / parent / template / space 与回报契约 |
| `hc_peer` | `hc_report` | `hc_worker`、`subagent` | `<hc_peer_role>`：发现同空间 agent 与互发消息 |
| `subagent` | 无新增 | `hc_worker`、`hc_report` | 无（0 token 委派开销） |
| `standalone` | 无新增（`subagent` 保持激活） | `hc_worker`、`hc_report` | `<delegation>` 降级版：指向 `subagent()` |

`hc_lead` 默认不新增 `subagent`——用户关掉的不会被动加回来。对外只有两个工具：`hc_worker`（`spawn` / `send` / `read` / `status` / `interrupt` / `close`，**没有 `wait`**）与 `hc_report`（`done` / `blocked` / `peer` / `list_peers`）。herdr 的 space/tab 标签、重名占用检查、首条消息投递校验都在工具内部完成，模型不写胶水。

### 3.4 异步推送式委派

委派是「发起 → 结束本回合 → worker 推回来」的推送模型，不是阻塞轮询：

- `spawn` 返回时校验 `first_message.sent`（hc 的 `first_message` 结构：`sent` 必填，`reason` / `started` / `turn` 可选）。通过后 Lead 告知人类 worker 已开工并**结束本回合**，不阻塞等结果。
- worker 收尾时用 `hc_report` 主动推回父终端，父 session 由收到的消息驱动下一个回合——Lead 不需要、也不该占着回合等。
- Lead 在 `bash` 里跑 `hc wait` 属阻塞轮询，会收到非阻塞 `[hc-delegation]` 提醒（不拦截）；要看进度用 `hc_worker({ action: "status" })` 或 `read`。
- 缓存 `herdr.tab` 复用前先做活性校验：`herdr-app ls` 里查不到该 `tabId`（tab 被关掉或改名）就重新解析，不盲信 `appendEntry` 恢复出来的旧 tabId。
- `close` 前预检该 worker 的残留进程与 worktree，避免在它还在写文件时把终端移掉。

### 3.5 投递失败（`kind=blocked`）与报告文件

`hc send` 在目标被交互对话框挡住时返回 `kind=blocked`（CLI exit 9），`--if <status>` 不匹配时返回 `kind=status_mismatch`（exit 10）。两侧的处理是固定的：

- **worker 侧**：不重试轰炸、不加 `--force`、不把长报告塞进会被挡住的 `send`；把完整报告写进报告文件（`report_file`）并在自己终端里可见，然后静默等待。
- **Lead 侧**：关掉交互对话框后用轻量 `hc_worker({ action: "status" })` 复核，只给 `idle` / `done` 的 worker 发消息，绝不去戳 `working` 状态的 worker。
- **report-file-first**：`hc_report` 支持可选 `report_file`。完整四段报告（`Goal` / `Changes` / `Verification` / `Blockers`）落在报告文件并在终端可见，`hc_report` 只推一行摘要 + `report_file` 路径。

### 3.6 Lead 护栏（仓库无关）

护栏只在角色为 `hc_lead` 且 `guardEnabled` 时生效：

- **写入硬拦截**：一个回合内第二个不同的 `edit` / `write` 目标文件被拦截。所有路径一视同仁——代码、配置、文档、spec、plan、ADR 都没有豁免，且"本回合已经委派过"也不解锁；同一文件再次编辑照常放行。多文件工作属于 `hc_worker`。
- **探查节流**：无委派且无在跑 worker 时，每第 3 次直接 `read` / `grep` / `find` 追加一次提醒（3/6/9…），不阻断。
- **验证分工**：Lead 的 `bash` 直接跑 test / build / lint / check 套件时追加非阻塞 `[hc-delegation]` 提醒——验证由 worker 执行并回报确切命令与观测输出（或日志路径），Lead 只审查证据与 diff。配套的验证诚实纪律写进 `<hc_worker_role>` 与全局 `AGENTS.md`：在当前回合真跑，不删/不跳/不弱化任何检查，既有基线失败用一行注明。
- **裸跑模板重定向**：`bash` + `hc run <已知模板>` 被拦截，必须走 `hc_worker({ action: "spawn" })`，否则绕过标签设置、所有权跟踪与首条消息校验；纯 shell 运行（如 `hc run --bg --rm cargo test`）不受影响。
- **反递归**：`hc_worker` / `hc_peer` / `subagent` 里任何 `hc run` 被拦截（`hc get` / `ls` / `send` / `read` / `wait` / `interrupt` 仍可用）。
- **逃生门**：`/hc-guard [on|off|status]` 开关 Lead 护栏，`/hc-role [status|allow-subagents|reset]` 让 worker/peer 保留 `subagent` 并解除反递归拦截。

### 3.7 hc 模板与 subagent 协作

- `.pi/herdr-templates/{grunt,workhorse,peer}.md` 是**纯 frontmatter 启动清单**：只有 `description` + `command`，正文为空。worker 的行为由运行时注入的 `<hc_worker_role>` 承担，不再随首条用户消息粘贴大段正文，因此不受上下文压缩影响，也不会出现多个模板正文重复。
- `@johnnywu/pi-subagents` 的项目 agent（`.pi/agents/{worker,reviewer,researcher}.md`）统一 `systemPrompt: replace` + `maxDepth: 0`。`replace` 只替换 Pi 默认 prompt、**保留**项目上下文（`AGENTS.md` 等），所以把委派总则从 `AGENTS.md` 移进扩展直接减少了每个 subagent 的常驻提示：`AGENTS.md` 从 3,467 字节降到 1,794 字节（`ae9b37a`）。
- 调度接口是原生 `subagent` 工具：`subagent({ agent, task, cwd?, session? })`，`session` 取 `none` | `fork`。**没有** `/run` 之类的斜杠命令。

## 四、Pi 工作环境能力概览

| 类型 | 数量 | 条目 |
| --- | --- | --- |
| 全局扩展 | 5 | `dollar-skill-invoke`、`tool-counter-widget`、`init-command`、`bash-search-guard`、`hc-delegation` |
| 外部管理扩展 | 1 | `magpie`（`global.external_extensions`，同步忽略） |
| 全局包 | 6 | `@johnnywu/pi-subagents`、`pi-powerline`、`pi-tool-display`、`pi-ask`、`pi-webfetch`、`@ff-labs/pi-fff` |
| 全局 agent | 3 | `worker`、`reviewer`、`researcher` |
| 全局技能 | 4 | `install-from-pi-config`、`notion`、`x-reach`、`worktrunk-isolation` |
| 共享层技能 | 1 | `agent-reach`（→ `~/.agents/skills/`） |
| hc 模板 | 3 | `grunt`、`workhorse`、`peer` |
| 提示模板 | 10 | `opsx-apply`、`opsx-archive`、`opsx-bulk-archive`、`opsx-continue`、`opsx-explore`、`opsx-ff`、`opsx-new`、`opsx-propose`、`opsx-sync`、`opsx-verify` |
| 环境变量 | 1 组 | `global.env.pi-fff`：`FFF_FRECENCY_DB`、`FFF_HISTORY_DB`、`PI_FFF_MODE=override` |
| catalog 技能 | 4 | `obsidian-search`、`pi-extension-dev`、`pkg-research`、`pkg-fork-dev` |
| catalog 扩展 | 2 | `obsidian-tools`、`wikilink-batch-replace` |

仓内存在但不参与全局同步的源：`.pi/extensions/self-compact/`（源码与规格保留，已从全局能力移除）、`.pi/extensions/{obsidian-tools,wikilink-batch-replace}`、`.pi/skills/{obsidian-search,pi-extension-dev,pkg-research,pkg-fork-dev}`（以上为 catalog 源）。

## 五、包管理与辅助能力

**包研究**：第三方包评估流程——安全源码审查 → 隔离安装研究 → 用户决策（全局安装 / backlog 记录 / 丢弃）→ 全局同步；所有决策记录写进 `openspec/pkg-backlog.md`。

**包分叉**：已用包需要修改时走 `pkg-fork-dev`，fork 元数据登记在 `forks/manifest.yaml`（`upstream_source` 保留原来源）。

**辅助能力**：Obsidian 检索与知识导出属 catalog 能力（`obsidian-search` 技能 + `obsidian-tools` 扩展）；会话浏览已从全局能力移除（规格留在 archive）；上下文压缩用 Pi 原生机制（`self-compact` 扩展已移除）；代码检索表面就是 `grep` / `find` 两个工具，引擎由 fff 提供（见 3.1）。

---

## OpenSpec 索引

从用户术语定位实现规格。查看具体内容用 `openspec show <slug>`。

### 变更治理

| 用户术语 | 相关 spec slug |
|----------|---------------|
| 能力清单、清单治理 | `capability-manifest`, `capability-governance`, `capability-manifest-governance` |
| 环境变量声明 | `capabilities-env-schema` |
| 全局同步、同步脚本 | `pi-runtime-bootstrap-sync`, `pkg-global-sync`, `sync-env-check`, `global-agent-md-sync` |
| 全局同步确认 | `pi-global-runtime-sync-confirmation`, `pi-config-closeout-settings-governance` |
| settings 生成 | `pi-fff-env-config`, `pi-fff-global-package` |
| models.json 生成、模型配置治理 | `models-manifest-governance` |
| 全局包移除、node_modules 清理 | `capability-manifest` |
| 变更收尾 | `pi-config-closeout-settings-governance` |

### 扩展与技能

| 用户术语 | 相关 spec slug |
|----------|---------------|
| 扩展开发、新建扩展 | `pi-extension-dev-skill`, `pi-extension-lifecycle-guidance` |
| 扩展自去重 | `extension-dedup-mechanism`, `extension-dedup-standard`, `extension-self-dedup` |
| $ 技能调用、$ 展开 | `dollar-skill-invoke`, `dollar-skill-autocomplete`（后缀变体见 archive） |
| /init 命令 | `init-command` |
| 会话浏览、会话树 | `session-retrieval-tools`（已移除，见 archive） |
| Obsidian 工具 | `obsidian-tools`, `obsidian-tools-extension`, `obsidian-cli-tool`, `obsidian-vault-resolver` |
| Obsidian 搜索 | `obsidian-search-skill`, `obsidian-search-tool`, `obsidian-search-config` |
| Notion CLI、ntn 命令 | `notion` |
| HTML 导出 | `html-export-support` |
| / 技能过滤 | `slash-skill-filter` |
| 添加供应商 | 手动编辑 `~/.pi/agent/models.json`（原 `add-provider` 扩展已移除）；参考 `docs/reference/pi-provider-model.md` |
| Wikilink 批量替换 | `wikilink-batch-replace` |
| 自压缩、交接卡片、Jev 边界门控 | `self-compact`（已从全局同步移除，仓内保留源码与规格） |
| X 检索、Twitter 检索、twscrape | `x-reach-skill` |
| 并行 worktree 隔离、worktrunk | `worktrunk-isolation` |
| bash 检索拦截、grep/rg/find 守卫 | 实现见 `.pi/extensions/bash-search-guard.ts`，暂无独立 spec；行为受 `global-agent-guidance`、`fff-retrieval` 约束 |

### 包管理

| 用户术语 | 相关 spec slug |
|----------|---------------|
| 包安全审查 | `pkg-security-review` |
| 包安装研究 | `pkg-install-research`, `pkg-raw-extension-research` |
| 包决策、三选一 | `pkg-decision-backlog`, `pkg-global-sync` |
| 目录安装、跨仓库安装 | `install-from-pi-config`, `install-from-pi-config-overwrite`, `install-skill-single-file` |
| Fork 管理 | 见 skill `pkg-fork-dev`，registry `forks/manifest.yaml` |
| pi-xai prompt ghost、next-prompt 预填 | `pi-xai-prompt-suggest` |

### Agent 与 Subagent

| 用户术语 | 相关 spec slug |
|----------|---------------|
| Agent 定义、Agent 文件 | `agent-file-definitions`, `pi-subagent-agent-contract` |
| Agent 指导、AGENTS.md | `global-agent-guidance`, `global-agent-definitions`, `agent-guidance-simplify` |
| hc 委派、角色护栏、hc 模板 | `hc-delegation-extension` |
| 系统提示分层、角色注入、工具集重放 | `hc-delegation-extension`（决策与取舍见 `docs/adr/0011-runtime-role-extension-for-delegation-and-guards.md`） |
| Subagent 调度 | `pi-subagent-dispatch-baseline`, `pi-global-subagent-package-delivery`, `subagent-package` |
| Subagent 模型覆盖 | `subagent-model-override`, `subagent-settings` |
| Subagent 提示模板 | `subagent-prompt-guide` |
| 提问引导 | `ask-user-guidance` |

### 提示模板与文档

| 用户术语 | 相关 spec slug |
|----------|---------------|
| 提示模板治理 | `prompts-manifest-governance` |
| README 治理 | `readme-automation-governance`, `readme-documentation` |
| 参考文档 | `reference-docs-consolidation`, `pi-reference-curation-model` |
| 入门文档 | `readme-documentation` |

### 检索与 MCP

| 用户术语 | 相关 spec slug |
|----------|---------------|
| fff 检索、frecency 排序 | `fff-retrieval` |
| MCP 配置、原生 MCP、exposure | `global-mcp-config` |

### 仓库架构

| 用户术语 | 相关 spec slug |
|----------|---------------|
| 仓库蓝图 | `pi-customization-blueprint`, `pi-phase2-delivery-plan` |
| 项目源层 | `pi-project-source-layer` |
