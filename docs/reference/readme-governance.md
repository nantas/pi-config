# README 维护治理

当仓库能力发生变更时，必须评估并更新 README.md 中的对应能力描述，保持 README 与 `capabilities.yaml` 一致。

## 触发条件

| 触发场景 | 条件 | 操作 |
|----------|------|------|
| **新增扩展** | 新文件添加到 `.pi/extensions/` | 更新"自定义扩展"节 |
| **新增全局包** | 通过 `pkg-research` 将包加入 `settings.json` `packages` | 更新"外部 Pi 包"节 |
| **仅 backlog 包** | 包被记录到 `pkg-backlog.md` 而非全局添加 | **不更新** README |
| **新增 Skill/Agent** | 新 skill/agent 加入 `.pi/skills/` 或 `.pi/agents/` | 更新对应节 |
| **移除资源** | 从 `capabilities.yaml` 或文件系统移除 | 从 README 删除对应条目 |
| **纯 bugfix/内部重构** | 无新增/移除用户可见能力 | **不更新** README |

## 更新检查清单

1. 在正确的数据类型节添加/删除条目
2. 包含三项内容：名称、功能说明、解决的问题
3. 添加源文件相对路径链接
4. 添加 OpenSpec spec 链接（如适用）
5. 验证节内条目与 `capabilities.yaml` 对应 section 一致
6. 更新 `docs/getting-started.md` 第三步的数量统计
7. 最终完整性检查：无坏链、无占位符文本

## 一致性校验

README 中的能力列表必须与 `.pi/capabilities.yaml` 保持同步：

| README 节 | 对应 capabilities.yaml 节 |
|-----------|------------------------------------------|
| 自定义扩展 | `global.extensions` |
| 外部 Pi 包 | `global.settings.packages` |
| Agent 定义 | `global.agents` |
| 工作流技能 | `global.skills` + `catalog.skills` |
| 环境变量 | `global.env`（按能力 ID 分组）+ `catalog.env`（预留） |

**校验方法**：对比 README 中列出的条目数量和名称与 `capabilities.yaml` 中对应 section 的条目是否一致。不一致时以 `capabilities.yaml` 为准修正 README。
