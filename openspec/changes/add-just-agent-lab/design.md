# Design

## Context

specs/just-agent-lab/spec.md 已确认 9 个 requirement（工具契约、受限 agent、编排 skill、trace/bundle、bootstrap、recipe 集、行为边界、测试与清理、清单治理）。本设计说明实现路径；输入为 spec delta，不重述 proposal。

前置事实：`just` 未安装（`command != found`）；Pi 官方发现路径为 `.agents/skills/**/SKILL.md` 与 pi-subagents 的 `.agents/*.md`；catalog 不支持 agents，故仅 extension 进 catalog。Pi 扩展/技能 API 真源：`repo://pi-mono` 的 `docs/extensions.md`、`docs/skills.md`，agent 契约参考 `docs/reference/pi-subagents-extend-agent.md`。

## Goals / Non-Goals

**Goals:**

- 单文件 extension `.pi/extensions/just-agent-lab.ts` 同时承担：`just` 工具定义、recipe 批准策略、Run Trace 记录、Bundle 目录管理。
- 项目专属 `.agents/just-worker.md` + `.agents/skills/just-agent-lab/SKILL.md`（不进 catalog）。
- 根 `justfile` 六个 recipe + `scripts/bootstrap-just.sh`（钉扎官方资产与 SHA256）。
- `tests/just-agent-lab.test.mjs` 焦点测试；删除过时 `tests/subagent-dispatch-core.test.mjs`。
- catalog/README/getting-started 治理更新。

**Non-Goals:**

- 运行时硬写保护 / justfile hash gate（用户明确否决；见 spec「治理边界为行为观察而非强制」）。
- 跨项目分发 agent/skill、全局安装 Just、全局 Pi sync、性能基准、package-source 扫描 recipe。

## Decisions

### D1：工具与 trace 合一于单文件 extension

一个 extension 同时注册 `just` 工具与 `tool_call` 事件监听。理由：Run Trace 覆盖 just-worker 的**全部**工具调用（非仅 Just），只有挂在工具调用事件上才能全量留痕；拆成两个文件只会共享同一份状态（bundle 路径、run-id）而无收益。

- **run-id / bundle**：extension 在首次观察到 `PI_SUBAGENT_NAME=just-worker` 的工具调用时惰性创建 `.scratch/just-agent-runs/<UTC时间戳-id>/`，本次 subagent 生命周期内固定复用。`propose` 的候选源码写入该目录。
- **trace 记录**：JSONL 追加写（`trace.jsonl`），每条含工具名、截断参数摘要（剔除 env/secrets/完整输出）、路径、状态、时长；不复制文件内容。
- **截断**：复用 Pi 标准工具输出截断工具（`repo://pi-mono` docs/extensions.md 中导出的 truncation helper），不自写。

### D2：`just` 工具以内部 JSON dump 实现默认拒绝

- 每次调用内部执行 `just --dump --dump-format json` 解析 recipe 元数据；仅 `[metadata("agent:approved")]` 进入可运行集。不做缓存（MVP 调用量极小，避免陈旧批准）。
- 执行固定 `pi.exec(BOOTSTRAP_BIN, [...argv], { cwd: repoRoot })`，二进制路径硬编码 `.scratch/bin/just`，不存在时返回指引（提示父 Agent 跑 bootstrap，子 Agent 不得安装）。
- flag 黑名单在参数边界拒绝：任何动作参数命中 `-c`/`--command`/`--yes`/`-e`/shell 类 flag 模式即整次拒绝（argv 数组元素级 + 拼接检测），spec 场景「不暴露原生 flag 逃逸面」以纯函数实现，测试直接覆盖。

### D3：justfile 六 recipe 的实现边界

- 全部 recipe 用 `[metadata("agent:approved")]` 标注；参数用位置参数并在 recipe 脚本内 `{{quote(...)}}`。
- `check-extension <path>`：recipe 脚本内守卫——解析后必须以仓库 `.pi/extensions/` 前缀且以 `.ts` 结尾，否则退出并报允许范围（满足 spec 场景「check-extension 路径约束」）；底层用 node 临时加载检查。
- `test`：`node --test tests/just-agent-lab.test.mjs`；`validate-openspec`：`openspec validate --strict --no-interaction` 类等价非交互调用；`verify` = 两者聚合。
- 不新增任何其他 recipe；`status`/`diff` 直接转发 git 只读子命令。

### D4：bootstrap 脚本钉扎 + 双段校验

- `scripts/bootstrap-just.sh` 顶部钉 `JUST_VERSION` 与 `JUST_SHA256_ARM64`；实现时从官方 release（https://github.com/casey/just/releases）取 arm64 tar.gz 资产与其 checksum 实测核对后填入，不沿用研究时的 1.58.0 假设。
- 流程：平台守卫（非 `darwin/arm64` 即明确失败并打印手动安装指引）→ `curl -fLo <tmp>` 下载 → `shasum -a 256` 比对 → 解压 `install` 至 `.scratch/bin/just` → `chmod +x`。全程无 `curl | bash`。
- 本 change 实现期间手动运行一次；此后 preflight 责任在父 Agent（Skill 第一步），子 Agent 永不安装。

### D5：just-worker agent 与 Skill 的 prompt 编排

- `.agents/just-worker.md`：按 `docs/reference/pi-subagents-extend-agent.md` frontmatter（model `zhipuai-coding-plan/glm-5.2`、tools 白名单、inherit project context），正文写死契约：从 `just: list` 开始、能力缺口→`propose`、固定六字段 Markdown 收尾、禁止修改正式控制面（行为边界声明，注明违反将被判 compliance failed）。
- `.agents/skills/just-agent-lab/SKILL.md`：description 声明「仅 `$just-agent-lab` 显式调用」；steps 主轴 = preflight → fork 委派（精确点名 `just-worker` + `session:fork`）→ 失败即停 → 读 bundle/report → 双轴评估 + 根因归类 → ≤1 个 Root-Cause Change Set → 等待用户批准。任何 step 不得提供父 Agent 回退执行路径。

### D6：测试策略

- `tests/just-agent-lab.test.mjs`（node:test）：直接 import extension 导出的纯策略函数——批准判定（默认拒绝）、flag 黑名单拒绝、`check-extension` 路径守卫、propose 写入边界（tmpdir 模拟 bundle）。trace/JSONL 写入用 tmpdir 断言。不启动真实 subagent、不依赖真实 `just` 二进制（策略层与执行层分离，`pi.exec` 调用点保持薄壳）。
- 删除 `tests/subagent-dispatch-core.test.mjs`（已获用户批准）。

### D7：治理收尾

- `.pi/capabilities.yaml` → `catalog.extensions` 追加 `just-agent-lab`（`pi-extension-dev` skill Phase F 约束）；agent/skill 不登记。
- README/getting-started 按 readme-governance 更新能力描述；closeout 遵循 `docs/pi-change-closeout-governance.md`，记录「全局 sync 未运行（project-only）」。

## Risks / Migration

- **行为边界=无强制**：受限 Agent 自改控制面可实际发生。按 spec 这是可观察失败而非缺陷；Run Trace 覆盖 `edit`/`write` 调用即构成判罚证据。文档措辞禁用「安全隔离」。
- **Just dump JSON 格式随版本变化**：钉扎版本缓解；若 dump 结构变化，工具返回明确错误而非静默全拒绝。
- **`PI_SUBAGENT_NAME` 检测**：已实测确认（2026-02-26，pi-subagents `subagent-executor.ts`）：subagent 以**独立子进程** spawn pi CLI，env 带 `PI_SUBAGENT_NAME/PI_SUBAGENT_DEPTH` 等。因此父进程收不到子进程的 `tool_execution_*` 事件；trace 由 extension 在**子进程内**经 `tool_execution_start/end` 事件记录（子进程默认加载项目 extension）。`pi.exec(command, args[], {cwd,timeout,signal})` 返回 `{stdout,stderr,code,killed}`（argv 数组，无 shell）。截断用 `@earendil-works/pi-coding-agent` 导出的 `truncateHead/truncateTail/truncateLine`。`--tools` allowlist 过滤含 extension 工具的 registry，`just` 可被子进程启用。
- **首次探索性运行由用户在 verification 供真实任务**：运行结果不构成基准；一轮 Root-Cause Change Set 须人工批准后才实施。
- **遗留事项**：本地某模型配置存在明文凭据（已建议用户轮换，不在本 change 处理）；未跟踪 `node_modules/` 不触碰。
- **Migration**：纯新增能力，无既有调用方迁移；唯一删除项为已失败的过时测试。

## 待确认项

- [x] bootstrap 钉扎的 `JUST_VERSION`/`JUST_SHA256_ARM64`：待 1.3 实测（见下）。
- [x] `PI_SUBAGENT_NAME` 传递行为：已确认，见 Risks 更新。
