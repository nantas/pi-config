# Design

## Context

当前 `render_settings_file` 函数通过 Node.js 脚本手动解析 YAML 行，从 `.pi/capabilities.yaml` 提取 whitelist 和 exclude_keys，再读取 `.pi/settings.json` 做交集运算后写入 `~/.pi/agent/settings.json`。这种方式存在双重维护问题和隐含依赖。

本次 change 将生成逻辑从"交集过滤"改为"直接生成+合并保留"，并利用 Python3 + PyYAML（系统已有）替代当前的手工 YAML 行解析。

## Goals / Non-Goals

**Goals:**
- 全局 settings.json 的 `packages` 直接来自 capabilities.yaml `global.settings.packages`
- 全局 settings.json 的其他管理字段（defaultProvider、defaultModel、defaultThinkingLevel、subagents）同样直接来自 capabilities.yaml
- caps.yaml 中未声明的 settings 字段（如 enabledModels、lastChangelogVersion）从目标文件保留
- 去掉 `global.settings.exclude_keys` 字段
- 同步脚本不再读取 pi-config/.pi/settings.json 用于全局生成
- 使用 Python3 + PyYAML 替代手工行解析（更可靠、易维护）

**Non-Goals:**
- 不改变 extensions/agents/skills/prompts/agent_md/mcp_config 的同步方式
- 不改变 dedup 逻辑
- 不改变 catalog 发布逻辑
- 不改变其他 `global.*` 字段的处理

## Decisions

### Decision 1: 用 Python3 + PyYAML 解析 capabilities.yaml

`render_settings_file` 当前使用 Node.js 手工行解析 YAML，对嵌套结构（如 subagents）支持脆弱。切换为 Python3 + PyYAML：
- PyYAML 已在系统上可用（`python3 -c "import yaml"` 成功）
- Python3 的 `json` 模块是 stdlib
- 避免添加 npm 依赖到纯配置仓库

**数据流：**
```
capabilities.yaml
    │
    ▼
python3: yaml.safe_load() → 提取 global.settings
    │
    ▼
python3: 读取目标 ~/.pi/agent/settings.json → 提取 user-managed 字段
    │
    ▼
python3: 合并（capabilities 字段覆盖 + 非 capabilities 字段保留）
    │
    ▼
~/.pi/agent/settings.json
```

### Decision 2: 合并策略

```
最终对象 = 从 capabilities.yaml 提取的 global.settings
         + 目标文件中 capabilities 未涵盖的键（如 enabledModels、lastChangelogVersion）
         - 显式 user-managed 键始终从目标文件取值（enabledModels）
```

- `enabledModels`：始终从目标文件保留（user-managed）
- `lastChangelogVersion`：不在 capabilities.yaml 中声明，从目标文件保留
- 其他自定义键：同样从目标文件保留

### Decision 3: 移除 exclude_keys 字段

原来 `exclude_keys` 用于从 settings.json 中删除某些 key。新方案改为**显式列出需要管理的 key**，不在 `global.settings` 中的 key 自动从目标保留。因此 exclude_keys 不再有意义。

### Decision 4: capabilities.yaml 结构扩展

`global.settings` 下新增字段：
```yaml
global:
  settings:
    packages: [...]               # 已有，升级为权威数据源
    defaultThinkingLevel: high    # 新增
    defaultProvider: deepseek     # 新增
    defaultModel: deepseek-v4-flash  # 新增
    subagents:                    # 新增（嵌套 YAML 结构）
      agentOverrides:
        context-builder:
          model: deepseek/deepseek-v4-flash
          ...
    # exclude_keys 被移除
```

### Decision 5: pi-config/.pi/settings.json 清理

全局同步不再依赖此文件，因此清理其中冗余的全局配置字段：
- 移除：`lastChangelogVersion`、`defaultThinkingLevel`、`defaultProvider`、`defaultModel`、`subagents`
- 保留：`packages`（仅本地开发用，如 `npm:lsp-pi`）

## Risks / Migration

| 风险 | 影响 | 缓解 |
|------|------|------|
| 第一次同步后，如果 capabilities.yaml 中漏了某个字段，该字段会回退到目标文件原有值 | 无数据丢失，但新值不被覆盖 | 在重写脚本后运行一次 dry-run 验证输出的 settings.json 正确性 |
| Python3 在某些环境中可能不可用 | sync 失败 | macOS 预装 Python3，当前运行环境已验证可用 |
| 旧版 whitelist 引用出现在文档或 AGENTS.md 中 | 文档过时 | 同步更新 AGENTS.md 中 Capability Manifest Governance 的描述 |
| capabilities.yaml 中新增字段后忘记同步到目标 | 新字段不生效 | 新增字段后应跑一次 sync 验证 |
