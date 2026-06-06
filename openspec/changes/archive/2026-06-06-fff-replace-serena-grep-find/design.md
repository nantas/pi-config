# Design

## Context

pi-config 全局配置当前依赖 serena MCP（LSP 语义检索）+ 内置 `grep`/`find`（文本/路径检索）。serena 在大项目中频繁超时，内置工具无智能排序。已验证 fff（ffgrep + ffffind）在实战中表现更优，用户决定完全替代。

## Goals / Non-Goals

**Goals:**

- 全局配置中 fff 成为唯一的默认检索工具
- AGENTS.md 提供完整的 fff 使用指导（决策表 + 原则 + 反模式 + 编辑工作流）
- 委派判断表以信息掌握度为驱动轴
- serena 相关配置、skill、MCP 条目完全清理
- 4 个 agent 定义的 tools 白名单适配 fff

**Non-Goals:**

- fff 工具本身的安装、配置或增强
- serena 记忆迁移（不迁移、不保留）
- reviewer / planner / oracle agent 定义修改
- 保证所有仓库的检索结果与 serena 等价（明确接受效率换准确性）

## Decisions

### D1: AGENTS.md fff section 采用内联方式（非 AGENTS.d 按需加载）

**依据**: fff 是全局唯一默认检索工具，使用频率极高，规则需要每次调用时即时生效。按需加载增加遗忘风险。
**Spec 引用**: `global-agent-guidance` → Requirement: fff-guidance-section

### D2: fff section 位置在 Tool Call Guidelines 和 Subagent 之间

**依据**: 原 LSP 代码智能 section 的位置，保持工具指导与工作流指导的分离。
**Spec 引用**: `global-agent-guidance` → Requirement: fff-guidance-section

### D3: 委派判断表去掉工具名，改为信息掌握度驱动

**依据**: 具体工具倾向通过 agent 定义的 tools 白名单实现，AGENTS.md 只需要指导"什么时候委派"的判断逻辑。
**Spec 引用**: `global-agent-guidance` → Requirement: delegation-by-information-level

### D4: serena skill 移至 archive/ 而非删除

**依据**: 保留 skill 内容供未来参考，不丢失知识。从 capabilities.yaml 移除后不再同步到全局。
**Spec 引用**: `global-mcp-config` → Requirement: serena-mcp-server

### D5: 只修改有 grep/find 的 4 个 agent，其余保持不变

**依据**: researcher 无 grep/find 工具，reviewer / planner / oracle 无 tools 行，保持现状。
**Spec 引用**: `global-agent-definitions` → Requirement: agent-tools-whitelist

## Risks / Migration

### R1: 丧失 LSP 精准符号操作

**风险**: agent 无法通过语义查找"谁调用了 X"、"X 的定义在哪里"，只能靠文本匹配。
**缓解**: ffgrep 的 frecency 排名和 git-aware 特性部分弥补，对大多数场景够用。需要文本模式而非语义模式的思维转换。

### R2: 跨文件重命名准确性下降

**风险**: 无 `rename_symbol` 的原子性保证，`sed` 替换可能误改注释/字符串中的同名 token。
**缓解**: 替换后用 ffgrep 验证所有引用已更新，agent 指导中已包含此步骤。

### R3: agent 对 fff 的学习曲线

**风险**: 新的 fff 指导需要 agent 在实践中适应 query 构造风格和 path/exclude 参数使用。
**缓解**: AGENTS.md 中的反模式 section 和决策表提供明确边界，减少试错。
