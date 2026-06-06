# Verification

## 验证结论

所有 spec requirements 已实现并验证通过。serena MCP 和 skill 已完全清理，fff 检索指导已作为全局默认配置生效。

## Spec-to-Implementation Coverage

### fff-retrieval

| Requirement | 实现 | 验证 |
|-------------|------|------|
| fff-default-retrieval | AGENTS.md `## 代码检索与文件定位（fff）` 核心规则声明 | ✅ grep -c 'ffgrep' → 12 matches |
| ffgrep-usage-guidelines | 决策表 + ffgrep 使用原则 section | ✅ 内容覆盖 query/path/exclude/read 流程 |
| fffind-usage-guidelines | 决策表 + fffind 使用原则 section | ✅ 内容覆盖模糊查询/path/精确文件名 |
| fff-editing-workflow | 编辑工作流 section | ✅ edit + bash sed 决策表 |
| fff-decision-table | 决策表 section | ✅ 6 行覆盖所有检索场景 |
| fff-anti-patterns | 反模式 section | ✅ 3 组 ❌/✅ 对比 |

### global-agent-guidance

| Requirement | 实现 | 验证 |
|-------------|------|------|
| tool-call-guidelines-sections | AGENTS.md Tool Call Guidelines 只含 Edit/Bash/Error Recovery/Web Search | ✅ grep 'Grep / Find Tool\|LSP 代码智能' → 0 |
| fff-guidance-section | `## 代码检索与文件定位（fff）` 在 Tool Call Guidelines 和 Subagent 之间 | ✅ section 位置正确 |
| delegation-by-information-level | 委派判断表以信息掌握度为轴，无工具名 | ✅ grep '信息掌握度' → 1 match |
| REMOVED: lsp-code-intelligence-section | 已删除 | ✅ grep 'serena' → 0 |
| REMOVED: grep-find-tool-section | 已删除 | ✅ grep 'Grep / Find Tool' → 0 |

### global-mcp-config

| Requirement | 实现 | 验证 |
|-------------|------|------|
| mcp-server-entries | mcp.json 只含 web-search-prime | ✅ python3 验证 serena not in mcpServers → True |
| REMOVED: serena-mcp-server | 已删除 | ✅ 同上 |

### global-agent-definitions

| Requirement | 实现 | 验证 |
|-------------|------|------|
| agent-tools-whitelist | 4 个 agent tools 行已更新 | ✅ 每个 agent 各 1 match (ffgrep+fffind in tools line) |

## Task-to-Evidence Coverage

| Task | Evidence |
|------|----------|
| 1.1 spec 文件就绪 | 4 个 spec 文件 test -f 全部 OK |
| 1.2 serena skill 可移动 | test -d 确认存在后 mv 成功 |
| 1.3 archive 目录 | mkdir -p archive 已创建 |
| 2.1.1 删除 Grep/Find Tool | grep 'Grep / Find Tool' → 0 |
| 2.1.2 删除 LSP 代码智能 | grep 'serena' AGENTS.md → 0 |
| 2.1.3 新增 fff section | grep '代码检索与文件定位' → 1 |
| 2.1.4 委派表重写 | grep '信息掌握度' → 1, 无工具名 |
| 2.2.1 mcp.json 清理 | python3 验证 → True |
| 2.3.1 skill 归档 | test -d archive/serena-code-intelligence → OK |
| 2.3.2 capabilities.yaml | grep serena → 0 |
| 2.4.1-2.4.4 agent tools | 4 个 agent 各含 ffgrep/fffind |
| 2.5.1 AGENTS.d | grep serena → 0 |
| 3.1 同步 | sync 脚本执行成功, 自动 Removed stale skill |
| 3.2 全局 mcp | ~/.pi/agent/mcp.json serena → True |
| 3.3 全局 AGENTS | ~/.pi/agent/AGENTS.md fff=1, serena=0 |
| 3.4 全局 skills | serena-code-intelligence 不存在 |
| 3.5 全局 agents | 4 个 agent ffgrep/fffind 各 ≥1 |
| 3.6 git commit | 623bc85 |

## 关键证据入口

| 证据类型 | 证据路径/链接 | 对应 requirement/task |
| --- | --- | --- |
| AGENTS.md 新内容 | `.pi/agent/AGENTS.md` → `## 代码检索与文件定位（fff）` | fff-retrieval all requirements |
| MCP 配置 | `.pi/agent/mcp.json` → only web-search-prime | global-mcp-config: mcp-server-entries |
| Agent tools | `.pi/agents/{context-builder,scout,unity-worker,worker}.md` | global-agent-definitions: agent-tools-whitelist |
| Skill 归档 | `archive/serena-code-intelligence/SKILL.md` | design D4 |
| Capabilities 清理 | `.pi/capabilities.yaml` → 无 serena | global-mcp-config |
| Git commit | `623bc85` | 全部 tasks |
| 同步执行 | sync 脚本输出 `Removed stale skill: serena-code-intelligence` | task 3.1 |

## 缺口与阻塞项

无。所有 tasks 已完成，所有 verification checks 已通过。
