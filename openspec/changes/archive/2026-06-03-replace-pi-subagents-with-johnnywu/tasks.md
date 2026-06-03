# Tasks

## 1. Spec 覆盖与实现准备

- [x] 1.1 确认所有 7 个 agent 的 override 配置源（全局 vs 项目）并记录最终迁移值 — 参考 `specs/subagent-settings/spec.md` Requirement: remove-agent-overrides-from-settings
- [x] 1.2 确认 `.pi/agents/unity-worker.md` 不受影响（不在 override 列表中） — 参考 `specs/agent-file-definitions/spec.md` Requirement: agent-discovery-compatibility

## 2. 核心实现任务

### Phase A: Agent 文件创建 (`agent-file-definitions` spec)

- [x] 2.1 创建 `.pi/agents/scout.md` — frontmatter: `name: scout, model: zhipuai-coding-plan/glm-5.1, thinking: minimal, tools: read,grep,find,ls,bash,write,intercom,gitnexus_query,gitnexus_context,gitnexus_impact,gitnexus_list_repos`；编写 prompt body
- [x] 2.2 创建 `.pi/agents/worker.md` — frontmatter: `name: worker, model: zhipuai-coding-plan/glm-5.1, thinking: low, tools: read,grep,find,ls,bash,edit,write,contact_supervisor,gitnexus_query,gitnexus_context`；编写 prompt body
- [x] 2.3 创建 `.pi/agents/context-builder.md` — frontmatter: `name: context-builder, model: deepseek/deepseek-v4-flash, thinking: high, tools: read,grep,find,ls,bash,write,web_search,intercom,gitnexus_query,gitnexus_context,gitnexus_impact`；编写 prompt body
- [x] 2.4 创建 `.pi/agents/oracle.md` — frontmatter: `name: oracle, model: deepseek/deepseek-v4-flash, thinking: medium`；编写 prompt body
- [x] 2.5 创建 `.pi/agents/planner.md` — frontmatter: `name: planner, model: deepseek/deepseek-v4-flash, thinking: high`；编写 prompt body
- [x] 2.6 创建 `.pi/agents/researcher.md` — frontmatter: `name: researcher, model: kimi-coding/kimi-for-coding, thinking: high, tools: read,write,web_search,fetch_content,get_search_content,intercom,gitnexus_query`；编写 prompt body
- [x] 2.7 创建 `.pi/agents/reviewer.md` — frontmatter: `name: reviewer, model: kimi-coding/kimi-for-coding, thinking: high`；编写 prompt body

### Phase B: Settings 清理 (`subagent-settings` spec)

- [x] 2.8 从 `.pi/settings.json` 移除 `subagents` key — 验证: `cat .pi/settings.json | python3 -c "import json,sys; d=json.load(sys.stdin); assert 'subagents' not in d"`
- [x] 2.9 从 `.pi/capabilities.yaml` 移除 `global.settings.subagents` 整个 key — 验证: `grep -n "subagents:" .pi/capabilities.yaml` 应只出现在 packages 列表（package name），不作为独立 settings key

### Phase C: Package 替换 (`subagent-package` spec)

- [x] 2.10 更新 `.pi/capabilities.yaml` packages 列表：`npm:pi-subagents@0.24.0` → `npm:@johnnywu/pi-subagents@1.5.0` — 验证: `grep "pi-subagents" .pi/capabilities.yaml`
- [x] 2.11 更新 `.pi/capabilities.yaml` global.agents 列表：追加 7 个新 agent 文件名（scout, worker, context-builder, oracle, planner, researcher, reviewer）

### Phase D: 全局同步与安装

- [x] 2.12 执行 `scripts/sync-pi-agent.sh` 同步到 `~/.pi/agent/` — 验证: 检查 `~/.pi/agent/settings.json` 中 packages 和 `~/.pi/agent/agents/` 目录内容
- [x] 2.13 卸载旧版: `pi uninstall pi-subagents` 或 `npm uninstall -g pi-subagents` — 验证: `ls /Users/nantasmac/.nvm/versions/node/v24.15.0/lib/node_modules/pi-subagents` 应不存在
- [x] 2.14 安装新版: `pi install npm:@johnnywu/pi-subagents` — 验证: `ls /Users/nantasmac/.nvm/versions/node/v24.15.0/lib/node_modules/@johnnywu/pi-subagents`
- [x] 2.15 清理 Phase 1 克隆: `rm -rf /tmp/pkg-research-pi-subagents.laGWsC`

## 3. 收敛与验证准备

- [x] 3.1 验证 agent 文件格式正确：每个 `.pi/agents/*.md` 必须有 `---` frontmatter 且含 `name` 字段 — `for f in .pi/agents/*.md; do head -3 "$f" | grep -q "name:" || echo "MISSING name in $f"; done`
- [x] 3.2 验证新 pi session 中 `subagent` tool 可用且能列出所有 agent — 启动新 session 执行 `subagent({ action: "list" })` 确认 8 个 agent 可见（含 unity-worker）
- [x] 3.3 标记 verification.md 需覆盖的检查点: agent discovery、settings 清理、package 替换、旧版残留检查
- [x] 3.4 标记 writeback.md 需回写的目标: capabilities.yaml 最终状态、settings.json 最终状态、agent 文件列表

## 4. 验证与回写收敛

- [x] 4.1 生成 `verification.md` — 覆盖 spec-to-implementation 检查清单和 task-to-evidence 映射
- [x] 4.2 生成 `writeback.md` — 记录回写目标（capabilities.yaml 已变更字段、settings.json 已清理字段、agent 文件列表）
- [x] 4.3 执行回写：确认所有受控文件与 spec 一致，记录可审计证据
