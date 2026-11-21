# Runtime Role Extension for Delegation and Guards

把静态写在提示里的 `hc` / `subagent()` 委派指导改由运行时按角色注入，并把其中的硬边界做成结构性护栏。委派规则不再是无条件注入所有进程的散文，而是「谁在跑就给谁它用得上的那段」，越界动作由扩展拦截而不靠模型自述。

## 背景

2026-11-21 之前的委派治理完全靠静态提示，三处结构性问题：

- `.pi/agent/AGENTS.md` 里 17 行委派总则无条件注入全部五类运行角色（Lead、hc worker、hc peer、pi-subagents 子进程、非 hc 独立会话）。禁止再派生的子进程和独立会话要白付这部分上下文，而真正的硬边界只写了「≥2 个文件改动」，Lead 在多文件**只读**核查时照样绕过委派，连续大量 `read` / `grep`。
- `.pi/agent/AGENTS.d/hc-delegation.md`（174 行）与 `AGENTS.d/subagent-usage.md`（195 行）把 `SPACE_ID`、`TAB_ID`、`herdr-app ls` 反查、`tab.rename`、`first_message.sent` 校验这类易错流程交给模型按需读取再手写 bash 胶水，摩擦成本高于模型直接动手，委派服从率因此下降。
- `.pi/herdr-templates/grunt.md` 与 `workhorse.md` 有 67 行完全重复的正文，经 `hc run` 粘贴进首条用户消息：受上下文压缩影响，且加大首消息投递体积。

## 决策

1. **静态委派规则从 `AGENTS.md` 移出**（3,467 → 1,794 字节，提交 `ae9b37a`），由 `.pi/extensions/hc-delegation.ts` 在 `before_agent_start` 按角色注入 `event.systemPromptOptions.sections`（`delegation` / `hc_worker_role` / `hc_peer_role`）与 `toolSnippets.subagent`，**原地修改后返回 `undefined`**：返回 `{ systemPrompt }` 会强制整段替换，破坏 `@johnnywu/pi-subagents` 的 `systemPrompt: replace` 组合并使 KV prompt 缓存失效。
2. **工具集按角色收敛并在每回合重放**：`hc_worker` / `hc_report` 以 `defaultActive: false` 注册，`before_agent_start` 里用 `setActiveTools` 重新收敛，`/reload` 或注册表刷新都无法把 `subagent` 还回 worker。同一扩展在本仓库内经项目级与全局级各加载一次，用 `globalThis` 标记去重并在 `session_shutdown` 清理。
3. **易错生命周期收进工具**：herdr 的 space/tab 标签、重名占用判断、首条消息投递校验由 `hc_worker`（`spawn` / `send` / `read` / `status` / `interrupt` / `close`）完成，`hc_report`（`done` / `blocked` / `peer` / `list_peers`）承担回报，模型不再手写 `hc` bash 胶水；`bash` + `hc run <已知模板>` 被重定向到 `hc_worker`。
4. **异步推送式委派，不提供阻塞 `wait`**：`hc_worker` 没有 `wait` action——`spawn` 校验 `first_message.sent` 后 Lead 告知人类并结束本回合，worker 用 `hc_report` 把结果推回父终端。Lead 在 `bash` 里跑 `hc wait` 属阻塞轮询，收到非阻塞 `[hc-delegation]` 提醒而不是被拦截；要看进度用 `status` / `read`。
5. **投递失败用 protocol 而非重试**：`hc send` 命中交互对话框返回 `kind=blocked`（exit 9），`--if` 不匹配返回 `kind=status_mismatch`（exit 10）。worker 不重试轰炸、不加 `--force`，改动完整报告入 `report_file` + 终端可见后静默等待；Lead 关掉对话框后先轻量 `status` 复核，只戳 `idle` / `done` 的 worker，不打扰 `working`。`hc_report` 因此增加可选 `report_file`：四段报告（Goal / Changes / Verification / Blockers）落文件，推送只带一行摘要 + 路径。
6. **缓存状态先验活**：复用 `appendEntry` 恢复的 `herdr.tab` 前先用 `herdr-app ls` 校验该 `tabId` 仍存在，失效则重新解析；`close` 前预检残留进程与 worktree，不在 worker 仍在写文件时移掉终端。
7. **硬边界进 `tool_call` / `tool_result`**：一个回合内第二个不同的 `edit` / `write` 文件被拦截（所有路径无豁免，包括 OpenSpec 工件、spec、plan、ADR，且不因本回合已委派而解锁），每第 3 次直接 `read` / `grep` / `find` 提醒一次，Lead 直接跑 test/build/lint 套件时追加非阻塞验证分工提醒（配套验证诚实纪律：当前回合真跑、不删/不跳/不弱化检查、既有基线失败一行注明），worker/peer/subagent 内任何 `hc run` 被反递归拦截；`/hc-guard`、`/hc-role` 是显式逃生门。
8. **模板只留 frontmatter**：`.pi/herdr-templates/{grunt,workhorse,peer}.md` 仅保留 `description` + `command`，正文为空，worker 行为由运行时 section 承担，不再进入首条用户消息。
9. **检索旁路单独收口**：`.pi/extensions/bash-search-guard.ts` 拦截 `bash` 中的 `grep` / `egrep` / `fgrep` / `rg` / `find` 搜索，与 `pi-fff` 的 `PI_FFF_MODE=override`（接管内置 `grep` / `find`）闭合为单一路径。

## 与 ADR-0003 / ADR-0004 的关系

本 ADR **收窄**而非推翻前两条决策的适用范围：

- **ADR 0003（prompt-based mode enforcement）**仍成立：Plan 模式这类「模型行为风格」约束继续用 prompt 表达，不建工具白名单。但它假设约束对象是任意进程里的同一个模型风格问题；委派不同——角色是**进程级确定事实**（`PI_SUBAGENT_DEPTH`、`HC_TERMINAL_ID` + `hc get --json`），因此可以、也应该用公开 Extension API 做工具集裁剪与硬拦截。prompt 负责「谁该做什么」的分工叙事，扩展负责「越界就停」。这也补齐了 0003 的盲点：只写散文的边界（≥2 文件）在被模型绕过时没有成本。
- **ADR 0004（prompt-over-extension for orchestration）**的结论仍成立：仍然**零耦合**于 `@johnnywu/pi-subagents` 的私有 JS 内部实现，不 fork、不打补丁，只用文档化的 `subagent({ agent, task, cwd?, session? })` 工具、agent frontmatter（`systemPrompt: replace`、`maxDepth: 0`）与环境变量 `PI_SUBAGENT_DEPTH`。差别在于「prompt」的定义从**仓库里的静态 Markdown** 收窄为**运行时按角色计算出的 section**，而原先要靠 prompt 描述的 herdr 生命周期改由工具承担——这恰好是 0004 用来论证 prompt 优越性的那条理由（脆弱接口耦合）在 `hc` CLI 侧的对照应用：CLI 是公开契约，包内部 JavaScript 不是。

## 影响

- 新增全局扩展 `.pi/extensions/hc-delegation.ts`（约 1,700 行，零外部依赖，单测 `tests/hc-delegation.test.ts`）与 `.pi/extensions/bash-search-guard.ts`（单测 `tests/bash-search-guard.test.ts`），两者进入 `global.extensions`。
- `.pi/agent/AGENTS.md` 精简为仓库无关的基础约束；`AGENTS.d/hc-delegation.md`、`AGENTS.d/subagent-usage.md` 删除。
- `.pi/herdr-templates/{grunt,workhorse,peer}.md` 精简为纯 frontmatter。
- 取舍一：多一个全局扩展的维护面，且它是委派指导的唯一来源——扩展失效则 Lead 只剩 `standalone` 降级提示。
- 取舍二：护栏会挡住「Lead 顺手改第二个文件」的合法场景，代价由 `/hc-guard off` 与 `/hc-role allow-subagents` 两把显式开关承担，默认从严。
- 取舍三：同一扩展在项目级与全局级双载，依赖 `globalThis` 去重；这是会话生命周期契约（见 `docs/reference/pi-extension-session-shutdown-dedup.md`），不是可选优化。
- 取舍四：去掉阻塞 `wait` 后，Lead 不再能在自己回合里同步拿结果——换来的是回合不被空转占用；代价是 Lead 必须靠 worker 推送与 `status` 复核，漏看一次推送就多一个回合。

## 参考

- 行为规范真源：`openspec/specs/hc-delegation-extension/spec.md`
- 委派治理变更：`openspec/changes/archive/2026-11-21-hc-delegation-extension/`
- 运行时检索接管：`openspec/specs/pi-fff-env-config/spec.md`（`PI_FFF_MODE=override`）
