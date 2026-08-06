# Proposal

## 问题定义

观察到其他仓库（及本仓历史 session）的 agent 在全文查找时仍倾向使用内置 `grep`/`find` 或写 python 脚本调用 grep，没有优先使用 `ffgrep`/`fffind`——尽管全局 `~/.pi/agent/AGENTS.md` 明确规定 fff 为默认检索工具。

根因是**工具注册层的信号冲突**，不是 AGENTS.md 指引缺失：

- `PI_FFF_MODE=tools-only` 让 pi-fff 只**追加** `ffgrep`/`fffind` 工具，**不替换**内置 `grep`/`find`。系统提示词里三个功能重叠工具并存（`bash`、内置 `grep`、`ffgrep`），LLM 在工具描述层判定 grep 是标准入口。
- 内置 `grep` 工具描述朴素且无任何指向 fff 的交叉引导；`bash` 描述甚至点名鼓励 grep。AGENTS.md 的 prose 指令压不过工具 schema 层信号。
- LLM 训练惯性：「搜代码 → grep/rg」是零样本反射，需要强信号才能改写。

当初选 `tools-only` 是因为旧注释声称「避免 pi-fff 的 FffEditor 与 pi-powerline 的 `setEditorComponent` 冲突」。但代码调查证实该冲突在 pi-fff v0.10.1 已消除——pi-fff 已迁移到组合式 `addAutocompleteProvider` API，全源码零 `setEditorComponent` 调用；两者操作正交 API，不存在抢占同一槽位。旧约束是无效历史包袱。

用户已实测 override 模式下 `@` 补全与 pi-powerline 编辑器共存正常。

## 范围边界

**In scope**：
- `PI_FFF_MODE` 取值从 `tools-only` 翻转为 `override`（`.pi/capabilities.yaml` 声明 + `~/.zshenv` export 双处）
- override 行为规范：内置 `grep`/`find` 被 fff 引擎接管（同名注册），从工具 schema 层根除竞争
- 更新 `PI_FFF_MODE` 的描述，记录冲突已消除的技术依据

**Out of scope**：
- pi-fff `AuxFinderPool` 的 frecency db 重复打开 bug（`environment already open in this program`）—— 与 mode 无关的独立缺陷，单独报上游 issue
- AGENTS.md 检索指引 prose 调整 —— 本 change 从 schema 层根治竞争后，prose 衰减问题大幅缓解；如仍需收紧 prose 另开 change
- pi-fff 工具描述增强（给 fff 工具加「grep/find 推荐替代」字样）—— 上游 PR 性质，不在本仓治理范围

**Non-breaking**：
- fff 工具的参数 schema 与行为完全不变（override 仅改工具注册名，execute 实现同一份）
- `FFF_FRECENCY_DB` / `FFF_HISTORY_DB` 配置不变
- 非 override 相关的 capabilities.yaml 字段不变

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `pi-fff-env-config`: 新增 `PI_FFF_MODE` 环境变量规范——取值固定为 `override`，使 fff 引擎接管内置 `grep`/`find`，从工具注册层根除与内置工具的并存竞争；并记录与 pi-powerline `setEditorComponent` 冲突在 pi-fff v0.10+ 已消除的技术依据。

## Capabilities 待确认项

- [x] 能力清单已与用户确认（用户实测 override + powerline 共存通过后授权执行）

## Impact

- **工具列表变化**：新 session 内 `grep`/`find` 直接由 fff 引擎提供，`ffgrep`/`fffind`/`fff-multi-grep` 别名工具不再单独注册。agent 看到的工具数量减少，竞争消除。
- **跨仓库效果**：所有读取全局 `~/.pi/agent/` 配置的 session（即所有仓库）生效，这正是问题报告的场景。
- **回滚成本**：单行 env 值翻转即可回退至 `tools-only` 或降级 `tools-and-ui`（后者保留 fff UI 但不接管内置工具名）。
- **已知残留风险**：override 下内置 grep 名被接管，调用频率上升会放大 pi-fff `AuxFinderPool` 的 frecency db 句柄 bug；不阻塞本次变更，跟踪上游修复。

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页：`openspec/specs/pi-fff-env-config/spec.md`
- 已确认项目页：`.pi/capabilities.yaml`（声明层）+ `~/.zshenv`（runtime export 层）
- 已确认回写目标：两处 `PI_FFF_MODE` 值翻转，change 创建时已同步执行
