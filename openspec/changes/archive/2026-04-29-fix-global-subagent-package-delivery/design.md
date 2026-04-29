# Design

## Context

当前 `subagent-dispatch` 作为仓库受管源码存在于 `.pi/extensions/subagent-dispatch/`，并通过 `scripts/sync-pi-agent.sh` 复制到 `~/.pi/agent/extensions/subagent-dispatch/`。该扩展内部又通过 `../../npm/node_modules/pi-subagents/*.ts` 访问 `pi-subagents`，把全局运行时正确性错误地绑定到 `~/.pi/agent/npm/node_modules` 的镜像目录。Pi 的原生 package 模型并不要求 user package 安装到这个位置；参考 `docs/plans/pi-customization-reference.md` 与 `repo://pi-mono`，全局可复用扩展更稳定的路径是通过 `settings.json -> packages` 暴露 package 资源。

因此这次设计不再把“全局 raw extension 副本 + 镜像 node_modules”视为标准交付物，而是将 `subagent-dispatch` 改造成一个由当前 repo 承载、可被全局 settings 通过绝对 local path 引用的 Pi package。与此同时，`.pi/agents/*.md` 仍保持现有受管同步路径，因为 Pi package 资源模型不原生暴露 agents。

## Goals / Non-Goals

**Goals:**

- 让 `subagent-dispatch` 在任意仓库启动 Pi 时都能稳定加载，不再依赖 `~/.pi/agent/npm/node_modules/pi-subagents`
- 保留仓库自有 `dispatch` tool、`/dispatch` 命令以及 `.pi/agents/*.md` agent contract 真源
- 让仓库 `.pi/settings.json` 保持可移植，同时让全局 `~/.pi/agent/settings.json` 能注入当前 repo 的绝对 local package 路径
- 让受管 sync 流程在写入 global settings 前，先确保 local package 的 runtime 依赖已安装

**Non-Goals:**

- 不实现 git 远程 Pi package 分发
- 不修改 `pi-subagents` 上游包源码
- 不把 `.mcp.json`、shared skills、themes、prompts 一并迁移到 package 模型
- 不改变 closeout 阶段“是否同步全局 Pi runtime 需要用户确认”的治理规则

## Decisions

1. 将 `subagent-dispatch` 从 `.pi/extensions/subagent-dispatch/` 迁移到独立 package 目录，推荐为 `.pi/packages/subagent-dispatch/`。该目录包含：
   - `index.ts`
   - `core.js`
   - `package.json`
   - package 自身的依赖安装根
   Package `package.json` 通过 `pi.extensions` 暴露唯一运行时入口，并把 `pi-subagents` 声明为 package runtime dependency。

2. 仓库 `.pi/settings.json` 改为声明 package source，而不是继续显式加载 `.pi/extensions/subagent-dispatch`：
   - 保留 `pi-mcp-adapter`
   - 删除 `extensions: [".pi/extensions/subagent-dispatch"]`
   - 删除把 `pi-subagents` 作为 Pi settings package 直接暴露的模式
   - 增加相对 local package source，指向 `./packages/subagent-dispatch`
   这样 repo 内运行可以继续依赖 project settings 自动解析 local package。

3. `scripts/sync-pi-agent.sh` 不再把仓库 settings 文件原样复制为 `~/.pi/agent/settings.json`。它需要对 settings 执行“从仓库真源到运行时变体”的单向渲染：
   - 读取 repo `.pi/settings.json`
   - 将 `./packages/subagent-dispatch` 转换为当前 repo 的绝对路径
   - 保留其他受管字段
   - 输出到 `~/.pi/agent/settings.json`
   目录型资源如 `agents/`、`prompts/`、`themes/` 继续保持复制语义。

4. `scripts/sync-pi-agent.sh` 或其调用链需要在写 global settings 前确保 `.pi/packages/subagent-dispatch` 已执行依赖安装。local path package 是 in-place 使用，Pi 不会替它自动执行 `npm install`，因此这个准备步骤必须由受管 workflow 显式承担。

5. `.pi/agents/*.md` 继续作为 user-level 运行时定义同步到 `~/.pi/agent/agents/`。这样 package-backed `subagent-dispatch` 即使在别的仓库里启动，也仍能消费来自 `pi-config` 的全局 agent 定义；若目标仓另有本地 `.pi/agents/`，则继续遵守既有 project-over-user 语义。

6. verification 与测试口径改为围绕 package-backed 行为验证：
   - `pi --offline -p "ping"` 在 `pi-config` 与其他仓库都不再因 import 失败而崩溃
   - `pi list` / settings 证据能说明 local package source 已生效
   - 不再把 `~/.pi/agent/npm/node_modules/pi-subagents/...` 作为必须存在的运行时证据

## Risks / Migration

- 最大迁移风险是旧的 `~/.pi/agent/extensions/subagent-dispatch/` 仍被 auto-discovery 读取，导致新旧模型并存。缓解方式：实现阶段应明确移除或停用该全局 raw extension 副本，并以 settings package source 作为唯一全局入口。
- 另一个风险是 global settings 渲染逻辑若只在 sync 时生效，用户直接修改 `~/.pi/agent/settings.json` 可能偏离仓库真源。该风险与现有 Phase 1 单向部署模型一致，本次不新增回流机制。
- 如果 package 目录迁移后仓库内引用路径未同步更新，现有测试和文档会暂时失效。实现阶段需要同步更新测试入口、文档证据路径与 verification 模板。
- closeout 时仍需按仓库治理要求评估 `.pi/settings.json` 是否需要变更，并在 verification 后明确询问是否同步到全局 Pi runtime。
