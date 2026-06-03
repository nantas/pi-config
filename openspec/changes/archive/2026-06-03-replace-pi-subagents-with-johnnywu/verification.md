# Verification

## 验证结论

✅ 所有 specs 中的 requirements 均已实现并通过验证。无缺口、无阻塞项。

## Spec-to-Implementation Coverage

### agent-file-definitions spec

| Requirement | 状态 | 证据 |
|-------------|------|------|
| agent-frontmatter-format | ✅ | 7 个 `.pi/agents/*.md` 文件均有 `---` frontmatter 且含 `name` 字段；3.1 验证通过 |
| migrate-existing-overrides | ✅ | scout/worker 使用项目级 override 值，其余使用全局 override 值；已创建对应 .md 文件 |
| agent-discovery-compatibility | ✅ | sync 后 `~/.pi/agent/agents/` 包含 8 个 .md 文件（含原有 unity-worker） |

### subagent-package spec

| Requirement | 状态 | 证据 |
|-------------|------|------|
| package-reference-update | ✅ | capabilities.yaml 和 settings.json 中 `npm:pi-subagents@0.24.0` → `npm:@johnnywu/pi-subagents@1.5.0` |
| old-package-removal | ✅ | `npm uninstall -g pi-subagents` 成功；旧路径不存在 |

### subagent-settings spec

| Requirement | 状态 | 证据 |
|-------------|------|------|
| remove-agent-overrides-from-settings (global) | ✅ | `~/.pi/agent/settings.json` 中 `subagents` key 已移除；python assert 通过 |
| remove-agent-overrides-from-settings (project) | ✅ | `.pi/settings.json` 仅含 `{}` |
| remove-agent-overrides-from-settings (capabilities) | ✅ | `grep subagents .pi/capabilities.yaml` 只在 packages 行出现 |
| preserve-non-subagents-settings | ✅ | packages, defaultThinkingLevel, defaultProvider, defaultModel, enabledModels, quietStartup, lastChangelogVersion, hideThinkingBlock 均保留 |

## Task-to-Evidence Coverage

| Task | 状态 | 证据 |
|------|------|------|
| 1.1 确认 override 配置源 | ✅ | 7 agents 确认，来源记录 |
| 1.2 确认 unity-worker 不受影响 | ✅ | 文件存在且不在 override 列表 |
| 2.1-2.7 创建 7 个 agent 文件 | ✅ | 3.1 格式验证全部通过 |
| 2.8 移除 project settings subagents | ✅ | `.pi/settings.json` = `{}` |
| 2.9 移除 capabilities subagents | ✅ | grep 确认仅 packages 行出现 |
| 2.10 更新 capabilities packages | ✅ | `@johnnywu/pi-subagents@1.5.0` |
| 2.11 更新 capabilities agents 列表 | ✅ | 8 agents 在列表中 |
| 2.12 执行 sync | ✅ | sync 输出确认 8 agents 同步 |
| 2.13 卸载旧版 | ✅ | `npm uninstall -g pi-subagents` 成功 |
| 2.14 安装新版 | ✅ | `@johnnywu/pi-subagents@1.5.0` 已安装 |
| 2.15 清理克隆 | ✅ | `/tmp/pkg-research-pi-subagents.laGWsC` 已删除 |
| 3.1 agent 文件格式验证 | ✅ | 全部 8 文件通过 |
| 3.2 全局状态验证 | ✅ | python assert 全通过 |

## 关键证据入口

| 证据类型 | 证据路径/链接 | 对应 requirement/task |
| --- | --- | --- |
| Agent 文件 | `.pi/agents/{scout,worker,context-builder,oracle,planner,researcher,reviewer}.md` | agent-file-definitions / tasks 2.1-2.7 |
| 全局 agents | `~/.pi/agent/agents/` (8 .md files) | agent-discovery-compatibility / task 2.12 |
| Capabilities | `.pi/capabilities.yaml` (packages + agents sections) | subagent-package / subagent-settings |
| 全局 settings | `~/.pi/agent/settings.json` (packages + no subagents) | subagent-settings / task 2.12 |
| 项目 settings | `.pi/settings.json` (`{}`) | subagent-settings / task 2.8 |
| npm 安装 | `@johnnywu/pi-subagents@1.5.0` in global npm | subagent-package / task 2.14 |

## 缺口与阻塞项

无。所有 requirements 已覆盖，所有 tasks 已完成。

### 注意事项（非阻塞）

- 新版不支持 chain/parallel/async/slash commands — 这是已知的功能降级
- 旧版 `pi-subagents` skill（~400 行编排指南）不再自动注入 — 后续可按需创建替代 skill
- 需要在**新 pi session** 中验证 `subagent` tool 是否正常工作（当前 session 仍加载旧版 skill）
