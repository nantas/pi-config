# Proposal

## 问题定义

当前 `sync-pi-agent.sh` 的 `render_settings_file` 函数使用交集模式生成全局 settings.json：

```
全局 packages = (pi-config/.pi/settings.json 的 packages) ∩ (capabilities.yaml whitelist)
```

这种设计有两个问题：
1. **双重维护**：capabilities.yaml 的 whitelist 和 pi-config/.pi/settings.json 必须人工保持一致，否则不同步
2. **隐含依赖**：全局配置的最终内容受本地 settings.json 的内容限制，capabilities.yaml 不是完整的单一数据源

**目标**：将全局 settings.json 的生成方式改为直接从 capabilities.yaml 生成，去掉对 pi-config/.pi/settings.json 的依赖（但保留其作为本地开发配置的用途），同时去掉不再需要的 `exclude_keys` 字段。

## 范围边界

### 范围内
- `scripts/sync-pi-agent.sh` 中 `render_settings_file` 的逻辑重写
- `.pi/capabilities.yaml` 中 `global.settings` 的结构扩展（新增 defaultThinkingLevel、defaultProvider、defaultModel、subagents 等字段）
- `.pi/capabilities.yaml` 中 `global.settings.exclude_keys` 的移除
- `openspec/specs/pi-runtime-bootstrap-sync/spec.md` 中 Requirement 3 的更新
- `pi-config/.pi/settings.json` 中冗余全局配置字段的清理（仅保留本地开发用内容）
- `AGENTS.md` 中 Capability Manifest Governance 描述的更新

### 范围外
- 其他 `global.*` 字段（extensions、agents、skills、prompts、agent_md、mcp_config）的同步方式不变
- 同步脚本中的 `sync_from_manifest`、`sync_prompts_and_themes`、`sync_mcp_config`、`sync_agents_md` 等其他函数不变
- dedup 逻辑不变

## Capabilities

### New Capabilities
（无新 capability——修改的是已有的 pi-runtime-bootstrap-sync）

### Modified Capabilities
- `pi-runtime-bootstrap-sync`: 修改 Requirement 3（settings 过滤规则），从 whitelist+exclude_keys 交集模式改为 capabilities.yaml 直接生成+目标文件合并模式

## Capabilities 待确认项

- [x] 能力清单已与用户确认

## Impact

| 文件 | 影响 |
|------|------|
| `scripts/sync-pi-agent.sh` | 重写 `render_settings_file` 函数，改用 Python3 + PyYAML 解析 capabilities.yaml，直接生成 settings.json |
| `.pi/capabilities.yaml` | `global.settings` 新增 defaultThinkingLevel、defaultProvider、defaultModel、subagents 字段；移除 exclude_keys |
| `.pi/settings.json` | 移除 lastChangelogVersion、defaultThinkingLevel、defaultProvider、defaultModel、subagents，只保留本地开发用 packages |
| `~/.pi/agent/settings.json`（全局） | 生成方式改变但内容不变（user-managed 字段如 enabledModels 被保留） |
| `openspec/specs/pi-runtime-bootstrap-sync/spec.md` | 更新 Requirement 3 的描述和场景 |
| `.pi/agent/AGENTS.md` | 更新 Capability Manifest Governance 中关于 settings 的描述 |

## 关联绑定

- 关联 binding: `binding.md`
- 已确认标准页 / 项目页 / 回写目标：
  - 标准: `repo://orbitos/99_系统/Harness/OrbitOS_Spec_Standard/OrbitOS_Spec_Standard_v0.3.1.md`
  - 项目页: 无独立项目页面
  - 回写目标: pi-runtime-bootstrap-sync spec、capabilities.yaml、sync 脚本、AGENTS.md
