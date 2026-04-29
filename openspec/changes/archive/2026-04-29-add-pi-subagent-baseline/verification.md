# Verification

## 验证结论

- `pi-subagent-agent-contract` 现在同时覆盖无 skill 与固定 skill 两类 agent policy：项目本地 frontmatter 真源已落到 `.pi/agents/code-writer.md` 与 `.pi/agents/dispatch-planner.md`。
- `pi-subagent-dispatch-baseline` 已从占位 spawn adapter 改成真实 `pi-subagents` bridge：`.pi/extensions/subagent-dispatch/index.ts` 现在直接桥接到已安装 `pi-subagents` 执行器，而不是把 payload 写给泛化的 `pi --mode json`。
- `dispatch` 的用户入口仍保持自然语言 `/dispatch`；仓库内部 tool contract 则扩展为可承载 `context`、`skills`、`reads`、`model`、`cwd` 等计划字段，满足真实 bridge 所需的执行信息。
- task-level `projectContext` 仍支持 `default` / `inherit` / `strip`，并通过 synthetic agent bridge 映射到真实 child execution policy。
- skill-sensitive delegated work 不再依赖原始字符串 `skill` 覆盖：固定 skill 可写入 agent frontmatter，task-level skill 也会先在本地 helper 中规范化为数组。
- dispatch resolver 现在与 `pi-subagents` 正式 scope 语义对齐：builtin / user / project agents 都会进入 dispatch scope，且项目内同名定义覆盖 user-level 与 builtin 定义。
- 仓库侧对 agent frontmatter 加入了 defensive sanitize：`extensions: []` 这类空占位会在桥接层被移除，不再下传为字面量 `[]` 扩展路径。
- `.pi/agents/dispatch-planner.md` 与 `.pi/agents/code-writer.md` 已移除 `extensions: []` 空占位，避免再次触发 runtime 解析 bug。
- `dispatch` tool 与 `/dispatch` 命令现在都会显式暴露当前 dispatch scope 中的可用 agent 列表，并明确要求“只能使用列表内 agent，不要猜测名称”。
- 当调用方仍传入无效 agent 名时，dispatch 错误现在会直接返回可用 agent 列表，而不是只报笼统的 “not found”。
- sync 模式下如果 child result 缺少 `finalOutput`，dispatch 会回退读取 artifact output 内容，因此主 agent 不再只能看到 “Subagent completed.” 这类空摘要。
- sync dispatch 现在不再只返回状态摘要：tool-visible 文本会直接内联每个 child task 的输出正文，并同时暴露 `savedOutputPath`、`artifactPaths.outputPath`、`sessionFile`（如存在）。
- dispatch 的 normalized `details.results[]` 现在保留 `finalOutput`、`artifactPaths`、`sessionFile`、`savedOutputPath` 等 child result 关键信息，而不是只留下轻量 `status` / `summary`。
- 顶层 `runId` 现在只作为 dispatch response 标识使用；sync 结果文本不再暗示该标识可以直接交给 `subagent status` 查询。
- `.pi/settings.json` 本轮已重新评估且无需修改：当前仍保持目录化 extension 入口与 `pi-subagents` package 声明，因此本轮记录为 `repo-settings-reviewed-no-change-required`。
- 由于本轮再次修改了 repository-managed extension 文件，用户已确认并执行新的 managed sync；当前状态记录为 `global-sync-confirmed-and-run`。
- 最近一次已执行的 managed sync 时间为：`2026-04-29T09:15:07Z`。
- 本轮验证命令：
  - `node --test tests/subagent-dispatch-core.test.mjs`
  - `npx esbuild .pi/extensions/subagent-dispatch/index.ts --bundle --platform=node --format=esm --external:@sinclair/typebox --outfile=/tmp/subagent-dispatch.bundle.js`
  - `pi --help`
  - `pi --list-models`

## Spec-to-Implementation Coverage

| Capability spec | Requirement / scenario focus | Implementation evidence |
| --- | --- | --- |
| `pi-subagent-agent-contract` | `.pi/agents/*.md` is the source of truth for local subagent definitions | `.pi/agents/code-writer.md`, `.pi/agents/dispatch-planner.md` |
| `pi-subagent-agent-contract` | formal frontmatter includes `name`, `description`, `systemPromptMode`, `tools`, `extensions`, `cwd`, `inheritProjectContext`, `inheritSkills`, and optional fixed `skills` | `.pi/agents/code-writer.md`, `.pi/agents/dispatch-planner.md` |
| `pi-subagent-agent-contract` | agent policy is not split across settings or runtime overrides | `.pi/agents/code-writer.md`, `.pi/agents/dispatch-planner.md`, `.pi/extensions/subagent-dispatch/index.ts`, `.pi/settings.json` |
| `pi-subagent-agent-contract` | default project-context inheritance remains part of the agent contract | `.pi/agents/code-writer.md`, `.pi/extensions/subagent-dispatch/index.ts` |
| `pi-subagent-agent-contract` | fixed skill injection can be expressed in the agent contract | `.pi/agents/dispatch-planner.md`, `.pi/extensions/subagent-dispatch/core.js`, `.pi/extensions/subagent-dispatch/index.ts` |
| `pi-subagent-agent-contract` | future orchestration layers can continue to consume the same substrate | `.pi/agents/code-writer.md`, `.pi/agents/dispatch-planner.md`, `.pi/extensions/subagent-dispatch/index.ts` |
| `pi-subagent-agent-contract` | project-local agents override user-level agents while user-level agents remain available by default | `.pi/extensions/subagent-dispatch/index.ts`, `/Users/nantasmac/projects/agentic/pi-mono/packages/coding-agent/examples/extensions/subagent/README.md`, `/Users/nantasmac/.pi/agent/agents/code-writer.md` |
| `pi-subagent-agent-contract` | empty `extensions` placeholders must not survive into runtime agent policy | `.pi/agents/code-writer.md`, `.pi/agents/dispatch-planner.md`, `.pi/extensions/subagent-dispatch/core.js`, `.pi/npm/node_modules/pi-subagents/agents.ts` |
| `pi-subagent-dispatch-baseline` | repository-owned local `dispatch` tool is the entrypoint | `.pi/extensions/subagent-dispatch/index.ts` |
| `pi-subagent-dispatch-baseline` | repository-owned `/dispatch` command wrapper is a natural-language entrypoint | `.pi/extensions/subagent-dispatch/index.ts`, `/Users/nantasmac/projects/agentic/pi-mono/packages/coding-agent/docs/extensions.md`, `/Users/nantasmac/projects/agentic/pi-mono/packages/coding-agent/examples/extensions/send-user-message.ts` |
| `pi-subagent-dispatch-baseline` | unified `tasks[]` contract is used for one or many tasks | `.pi/extensions/subagent-dispatch/index.ts`, `.pi/extensions/subagent-dispatch/core.js` |
| `pi-subagent-dispatch-baseline` | manual `/dispatch` use does not require user-authored `tasks[]` payloads | `.pi/extensions/subagent-dispatch/index.ts`, `/Users/nantasmac/projects/agentic/pi-mono/packages/coding-agent/docs/extensions.md` |
| `pi-subagent-dispatch-baseline` | user entry stays natural-language while the internal dispatch plan can carry `context` / `skills` / `reads` / `model` / `cwd` | `.pi/extensions/subagent-dispatch/index.ts`, `.pi/extensions/subagent-dispatch/core.js`, `tests/subagent-dispatch-core.test.mjs` |
| `pi-subagent-dispatch-baseline` | the tool/command surface must expose valid dispatch-scope agents so the parent does not invent agent names | `.pi/extensions/subagent-dispatch/index.ts`, `.pi/extensions/subagent-dispatch/core.js`, `tests/subagent-dispatch-core.test.mjs`, `.pi/npm/node_modules/pi-subagents/index.ts` |
| `pi-subagent-dispatch-baseline` | sync dispatch results must surface useful child output even when `finalOutput` is empty | `.pi/extensions/subagent-dispatch/index.ts`, `.pi/extensions/subagent-dispatch/core.js`, `tests/subagent-dispatch-core.test.mjs`, `.pi/npm/node_modules/pi-subagents/execution.ts` |
| `pi-subagent-dispatch-baseline` | sync dispatch text must directly expose child output and real export paths | `.pi/extensions/subagent-dispatch/index.ts`, `.pi/extensions/subagent-dispatch/core.js`, `tests/subagent-dispatch-core.test.mjs`, `.pi/npm/node_modules/pi-subagents/slash-commands.ts` |
| `pi-subagent-dispatch-baseline` | sync dispatch `runId` must not be presented as a status-compatible async handle | `.pi/extensions/subagent-dispatch/index.ts`, `.pi/extensions/subagent-dispatch/core.js`, `openspec/changes/add-pi-subagent-baseline/specs/pi-subagent-dispatch-baseline/spec.md` |
| `pi-subagent-dispatch-baseline` | task-level `projectContext` supports `default`, `inherit`, `strip` | `.pi/extensions/subagent-dispatch/index.ts` |
| `pi-subagent-dispatch-baseline` | `sync` is formal v1 completion mode and `async` is reserved | `.pi/extensions/subagent-dispatch/index.ts` |
| `pi-subagent-dispatch-baseline` | normalized results include `runId`, `results[]`, per-task `taskId`, and `aggregateSummary` | `.pi/extensions/subagent-dispatch/index.ts` |
| `pi-subagent-dispatch-baseline` | backend-specific execution details are hidden behind the repository-owned layer while real execution is bridged to `pi-subagents` | `.pi/extensions/subagent-dispatch/index.ts`, `.pi/npm/node_modules/pi-subagents/subagent-executor.ts` |
| `pi-subagent-dispatch-baseline` | dispatch scope includes builtin subagents in addition to user/project definitions | `.pi/extensions/subagent-dispatch/index.ts`, `.pi/npm/node_modules/pi-subagents/agents.ts`, `/Users/nantasmac/projects/agentic/pi-mono/packages/coding-agent/examples/extensions/subagent/README.md` |

## Task-to-Evidence Coverage

| Task | Evidence |
| --- | --- |
| 1.1 | `openspec/changes/add-pi-subagent-baseline/specs/pi-subagent-agent-contract/spec.md`, `.pi/agents/code-writer.md`, `.pi/agents/dispatch-planner.md` |
| 1.2 | `openspec/changes/add-pi-subagent-baseline/specs/pi-subagent-dispatch-baseline/spec.md`, `.pi/extensions/subagent-dispatch/index.ts` |
| 1.3 | `docs/plans/pi-customization-blueprint.md`, `docs/plans/pi-customization-reference.md`, `docs/pi-phase1-boundary.md`, `.pi/settings.json` |
| 2.1 | `.pi/extensions/subagent-dispatch/index.ts`, `.pi/settings.json`, `scripts/sync-pi-agent.sh` |
| 2.2 | `.pi/agents/code-writer.md`, `.pi/agents/dispatch-planner.md`, `.pi/extensions/subagent-dispatch/index.ts` |
| 2.3 | `.pi/extensions/subagent-dispatch/index.ts`, `.pi/extensions/subagent-dispatch/core.js`, `tests/subagent-dispatch-core.test.mjs` |
| 2.4 | `.pi/extensions/subagent-dispatch/index.ts`, `.pi/npm/node_modules/pi-subagents/subagent-executor.ts`, `.pi/npm/node_modules/pi-subagents/agents.ts`, `scripts/sync-pi-agent.sh` |
| 2.5 | `.pi/settings.json` |
| 2.6 | `.pi/agents/code-writer.md`, `.pi/agents/dispatch-planner.md` |
| 2.7 | `.pi/extensions/subagent-dispatch/index.ts`, `/Users/nantasmac/projects/agentic/pi-mono/packages/coding-agent/docs/extensions.md`, `/Users/nantasmac/projects/agentic/pi-mono/packages/coding-agent/examples/extensions/send-user-message.ts` |
| 2.8 | `.pi/extensions/subagent-dispatch/index.ts`, `/Users/nantasmac/projects/agentic/pi-mono/packages/coding-agent/examples/extensions/subagent/README.md`, `/Users/nantasmac/.pi/agent/agents/code-writer.md` |
| 2.9 | `.pi/agents/dispatch-planner.md`, `.pi/extensions/subagent-dispatch/core.js`, `.pi/extensions/subagent-dispatch/index.ts` |
| 回归修复 A | `.pi/extensions/subagent-dispatch/core.js`, `tests/subagent-dispatch-core.test.mjs`, `.pi/agents/dispatch-planner.md`, `.pi/agents/code-writer.md`, `.pi/npm/node_modules/pi-subagents/agents.ts` |
| 回归修复 B | `.pi/extensions/subagent-dispatch/index.ts`, `.pi/npm/node_modules/pi-subagents/agents.ts`, `/Users/nantasmac/projects/agentic/pi-mono/packages/coding-agent/examples/extensions/subagent/README.md` |
| 回归修复 C | `.pi/extensions/subagent-dispatch/index.ts`, `.pi/extensions/subagent-dispatch/core.js`, `tests/subagent-dispatch-core.test.mjs`, `.pi/npm/node_modules/pi-subagents/index.ts` |
| 回归修复 D | `.pi/extensions/subagent-dispatch/index.ts`, `.pi/extensions/subagent-dispatch/core.js`, `tests/subagent-dispatch-core.test.mjs`, `.pi/npm/node_modules/pi-subagents/execution.ts` |
| 回归修复 E | `.pi/extensions/subagent-dispatch/index.ts`, `.pi/extensions/subagent-dispatch/core.js`, `tests/subagent-dispatch-core.test.mjs`, `.pi/npm/node_modules/pi-subagents/slash-commands.ts` |
| 回归修复 F | `.pi/extensions/subagent-dispatch/index.ts`, `.pi/extensions/subagent-dispatch/core.js`, `openspec/changes/add-pi-subagent-baseline/specs/pi-subagent-dispatch-baseline/spec.md` |
| 3.1 | `.pi/extensions/subagent-dispatch/index.ts`, `.pi/npm/node_modules/pi-subagents/subagent-executor.ts`, `pi --help`, `pi --list-models` |
| 3.2 | `.pi/agents/code-writer.md`, `.pi/agents/dispatch-planner.md`, `.pi/extensions/subagent-dispatch/index.ts` |
| 3.3 | `.pi/settings.json`, `docs/pi-phase1-boundary.md`, `scripts/sync-pi-agent.sh`, `~/.pi/agent/settings.json`, `~/.pi/agent/extensions/subagent-dispatch/index.ts`, `~/.pi/agent/npm/node_modules/pi-subagents/agents.ts`, `~/.pi/agent/agents/dispatch-planner.md` |
| 3.4 | `.pi/extensions/subagent-dispatch/index.ts`, `/Users/nantasmac/projects/agentic/pi-mono/packages/coding-agent/docs/extensions.md`, `/Users/nantasmac/projects/agentic/pi-mono/packages/coding-agent/examples/extensions/send-user-message.ts` |
| 3.5 | `.pi/extensions/subagent-dispatch/index.ts`, `/Users/nantasmac/projects/agentic/pi-mono/packages/coding-agent/examples/extensions/subagent/README.md`, `/Users/nantasmac/.pi/agent/agents/code-writer.md` |
| 3.6 | `.pi/agents/dispatch-planner.md`, `.pi/extensions/subagent-dispatch/core.js`, `tests/subagent-dispatch-core.test.mjs` |
| 4.1 | 本文件整体 |
| 4.2 | `openspec/changes/add-pi-subagent-baseline/writeback.md` |
| 4.3 | `openspec/changes/add-pi-subagent-baseline/writeback.md` |
| 4.4 | `.pi/extensions/subagent-dispatch/index.ts`, `openspec/changes/add-pi-subagent-baseline/writeback.md` |
| 4.5 | `.pi/extensions/subagent-dispatch/index.ts`, `openspec/changes/add-pi-subagent-baseline/writeback.md` |

## 关键证据入口

| 证据类型 | 证据路径/链接 | 对应 requirement/task |
| --- | --- | --- |
| Agent contract samples | `.pi/agents/code-writer.md`, `.pi/agents/dispatch-planner.md` | 1.1, 1.3, 2.2, 2.6, 2.9, 3.2, 3.6 |
| Dispatch core helper | `.pi/extensions/subagent-dispatch/core.js` | 2.3, 2.9, 3.6 |
| Repository-owned dispatch tool | `.pi/extensions/subagent-dispatch/index.ts` | 1.2, 2.1, 2.3, 2.4, 3.1 |
| Repository-owned `/dispatch` command | `.pi/extensions/subagent-dispatch/index.ts` | 2.7, 3.4, 4.4 |
| `pi-mono` command/session injection evidence | `/Users/nantasmac/projects/agentic/pi-mono/packages/coding-agent/docs/extensions.md`, `/Users/nantasmac/projects/agentic/pi-mono/packages/coding-agent/examples/extensions/send-user-message.ts` | 2.7, 3.4 |
| `pi-subagents` built-in tool UX evidence | `.pi/npm/node_modules/pi-subagents/index.ts` | 回归修复 C |
| `pi-subagents` slash export evidence | `.pi/npm/node_modules/pi-subagents/slash-commands.ts` | 回归修复 E |
| `pi-mono` agent scope evidence | `/Users/nantasmac/projects/agentic/pi-mono/packages/coding-agent/examples/extensions/subagent/README.md` | 2.8, 3.5 |
| `pi-subagents` agent/frontmatter parser evidence | `.pi/npm/node_modules/pi-subagents/agents.ts` | 回归修复 A, 回归修复 B |
| `pi-subagents` result persistence evidence | `.pi/npm/node_modules/pi-subagents/execution.ts` | 回归修复 D |
| Installed `pi-subagents` bridge evidence | `.pi/npm/node_modules/pi-subagents/subagent-executor.ts`, `.pi/npm/node_modules/pi-subagents/agents.ts`, `~/.pi/agent/npm/node_modules/pi-subagents/agents.ts` | 2.4, 3.1, 3.3 |
| Global fallback agent sample | `/Users/nantasmac/.pi/agent/agents/code-writer.md` | 2.8, 3.5 |
| Core behavior tests | `tests/subagent-dispatch-core.test.mjs` | 2.3, 3.6, 回归修复 C, 回归修复 D, 回归修复 E |
| Pi settings impact | `.pi/settings.json`, `scripts/sync-pi-agent.sh` | 1.3, 2.1, 2.5, 3.3 |
| Global Pi settings sync status | `AGENTS.md`, `~/.pi/agent/settings.json`, `~/.pi/agent/extensions/subagent-dispatch/index.ts`, `~/.pi/agent/npm/node_modules/pi-subagents/agents.ts`, `~/.pi/agent/agents/dispatch-planner.md`, `openspec/changes/add-pi-subagent-baseline/writeback.md` | 3.3, 4.3 |

## 缺口与阻塞项

- 无实现阻塞。
- 本轮项目页旧回写路径已失效，若需要继续维护项目页回写，需要先重新确认当前 Obsidian vault 路径。
