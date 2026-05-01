# Proposal

## 问题定义

在 Pi 中通过 Obsidian CLI 检索 vault 知识库时，当前存在两条不完整的路径：

1. **社区包** `@haispeed/pi-obsidian`：提供了 `obsidian_cli` tool（命令透传）和基础 skill，但检索管线为空——无排序、无上下文扩展、无降级、无输出截断。每次检索需要 LLM 自行解析原始 CLI 输出并决策下一步，导致 3-6 次 round-trip 和大量 token 消耗。
2. **obsidian-mind 内置 skill**（`obsidian-cli`）：拥有完整的策略档位和检索编排，但无 tool 层——所有执行依赖 bash 命令，无并行召回、无 session 级缓存、排序依赖 LLM 解读 skill 文本，每次检索仍产生 3-4 次 bash 调用。

两路径均达不到"高置信度高效率检索 + 关联探索 + 低 tool call 次数 + 低 token 消耗"的目标。

## 范围边界

**包含**：
- 自定义 Pi extension，注册 `obsidian_search`（智能检索）和 `obsidian_cli`（命令透传）两个 tool
- `obsidian_search` 内部管线：vault 解析 → preflight 缓存 → 并行召回 → 确定性排序 → 自动扩展升级 → Context Pack 输出 → 降级回退
- 配套 skill `obsidian-search`，指导 LLM 触发条件、query 优化、结果消费与路由
- vault 自动探测（显式传参 → cwd 向上遍历 → 报错）
- 开发环境验证：使用 obsidian-mind vault（1255 文件）作为测试目标

**不包含**：
- 不修改社区包 `@haispeed/pi-obsidian`
- 不在 tool 内部实现 query 自动改写引擎（由 LLM 在 skill 指导下预处理 query）
- 不对 Obsidian CLI 二进制做任何修改或包装

## Capabilities

### New Capabilities

- `obsidian-search-tool`: 注册 `obsidian_search` tool，内部执行完整检索管线（召回→排序→扩展→打包→降级），单 tool call 替代原 3-6 次 bash/LLM 往返
- `obsidian-cli-tool`: 注册 `obsidian_cli` tool，透传任意 Obsidian CLI 命令（read/create/property:set/tasks 等），带输入校验与超时控制
- `obsidian-search-skill`: 提供 `obsidian-search` 技能，覆盖触发条件判定、query 优化指导、fast/deep 模式选择、结果消费与路由协作
- `obsidian-vault-resolver`: 实现 vault 参数三级解析策略（显式 → cwd .obsidian/ 探测 → 报错），确保不会误检索到非预期 vault

## Capabilities 待确认项

- [x] 能力清单已与用户确认：用户已在 Phase A/B 设计讨论中确认 `obsidian_search` + `obsidian_cli` 双 tool 方案与配套 skill

## Impact

- **新增文件**：
  - `.pi/extensions/obsidian-tools/index.ts` — extension 入口
  - `.pi/extensions/obsidian-tools/cli-runner.ts` — CLI spawn 封装
  - `.pi/extensions/obsidian-tools/vault-resolver.ts` — vault 解析
  - `.pi/extensions/obsidian-tools/search-tool.ts` — `obsidian_search` 实现
  - `.pi/extensions/obsidian-tools/raw-tool.ts` — `obsidian_cli` 实现
  - `.pi/extensions/obsidian-tools/package.json` — pi extension 声明
  - `.pi/skills/obsidian-search/SKILL.md` — 使用指导
- **无删除，无现有文件修改**
- **全局启用后**：与 `repo://orbitos/.agents/skills/obsidian-cli/` 为替代关系，应在该仓库禁用旧 skill 以避免重复触发

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页 / 项目页 / 回写目标：
  - 标准页：`repo://orbitos/99_系统/Harness/OrbitOS_Spec_Standard/OrbitOS_Spec_Standard_v0.3.1.md`
  - 项目页：`repo://orbitos/20_项目/Pi_Config/Pi_Config.md`
  - 回写目标：`repo://orbitos/20_项目/Pi_Config/项目进度总览.md`
