# Tasks

## 1. Spec 覆盖与实现准备

- [ ] 1.1 确认所有 capability spec 文件就绪：`fff-retrieval`、`global-agent-guidance`、`global-mcp-config`、`global-agent-definitions`
- [ ] 1.2 确认 serena skill 目录 `.pi/skills/serena-code-intelligence/` 存在且可移动
- [ ] 1.3 确认 `archive/` 目录存在（如不存在则创建）

## 2. 核心实现任务

### 2.1 AGENTS.md 重构

- [ ] 2.1.1 删除 `### Grep / Find Tool` section（`specs/global-agent-guidance` → REMOVED: grep-find-tool-section）
  - 验证：AGENTS.md 中无 `### Grep / Find Tool` 标题
- [ ] 2.1.2 删除 `## LSP 代码智能` section（`specs/global-agent-guidance` → REMOVED: lsp-code-intelligence-section）
  - 验证：AGENTS.md 中无 `## LSP 代码智能` 标题，无 serena 相关内容
- [ ] 2.1.3 在 Tool Call Guidelines 和 Subagent 之间插入 `## 代码检索与文件定位（fff）` section（`specs/fff-retrieval` 全部 requirements + `specs/global-agent-guidance` → Requirement: fff-guidance-section）
  - 内容包含：核心规则声明、决策表、ffgrep 使用原则、fffind 使用原则、反模式示例、编辑工作流串联
  - 验证：section 位于正确位置，内容覆盖所有 spec requirements
- [ ] 2.1.4 重写 `## Subagent 自动委派` 的委派判断表为信息掌握度驱动（`specs/global-agent-guidance` → Requirement: delegation-by-information-level）
  - 验证：判断表中不出现具体工具名，以信息掌握度为判断轴

### 2.2 MCP 配置清理

- [ ] 2.2.1 编辑 `.pi/agent/mcp.json`，删除 `serena` 条目（`specs/global-mcp-config` → Requirement: mcp-server-entries）
  - 验证：`cat .pi/agent/mcp.json | python3 -c "import sys,json; d=json.load(sys.stdin); print('serena' not in d['mcpServers'])"` 输出 `True`

### 2.3 Serena skill 归档

- [ ] 2.3.1 移动 `.pi/skills/serena-code-intelligence/` → `archive/serena-code-intelligence/`（design D4）
  - 验证：`test -d archive/serena-code-intelligence/` 成功，`.pi/skills/serena-code-intelligence/` 不存在
- [ ] 2.3.2 编辑 `.pi/capabilities.yaml`，从 `global.skills` 中移除 `serena-code-intelligence` 条目
  - 验证：`grep serena-code-intelligence .pi/capabilities.yaml` 无匹配

### 2.4 Agent 定义更新

- [ ] 2.4.1 更新 `.pi/agents/context-builder.md`：`grep` → `ffgrep`，`find` → `fffind`（`specs/global-agent-definitions` → Requirement: agent-tools-whitelist）
- [ ] 2.4.2 更新 `.pi/agents/scout.md`：`grep` → `ffgrep`，`find` → `fffind`
- [ ] 2.4.3 更新 `.pi/agents/unity-worker.md`：`grep` → `ffgrep`，`find` → `fffind`
- [ ] 2.4.4 更新 `.pi/agents/worker.md`：`grep` → `ffgrep`，`find` → `fffind`
  - 验证：`grep -c 'ffgrep\|fffind' .pi/agents/{context-builder,scout,unity-worker,worker}.md` 每个文件各 ≥ 1

### 2.5 AGENTS.d 更新

- [ ] 2.5.1 检查并更新 `AGENTS.d/subagent-usage.md` 中对 serena 的引用
  - 验证：`grep -i serena AGENTS.d/subagent-usage.md` 无匹配

## 3. 收敛与验证准备

- [ ] 3.1 运行 `scripts/sync-pi-agent.sh`，确认同步成功且无 serena 相关错误
- [ ] 3.2 验证 `~/.pi/agent/mcp.json` 不含 serena 条目
- [ ] 3.3 验证 `~/.pi/agent/AGENTS.md` 包含 fff section、不含 serena section
- [ ] 3.4 验证 `~/.pi/agent/skills/` 不含 serena-code-intelligence
- [ ] 3.5 验证 `~/.pi/agent/agents/` 中的 4 个 agent 文件包含 ffgrep/fffind
- [ ] 3.6 git commit 所有变更

## 4. 验证与回写收敛

- [ ] 4.1 基于真实实现结果生成或更新 verification.md
- [ ] 4.2 基于 verification.md 结论生成或更新 writeback.md
