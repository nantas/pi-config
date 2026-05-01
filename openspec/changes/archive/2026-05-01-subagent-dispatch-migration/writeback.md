# Writeback: subagent-dispatch-migration

## 回写目标

| 字段 | 值 |
|------|-----|
| 目标仓库 | `repo://orbitos` |
| 目标页面 | `20_项目/Pi_Config/项目进度总览.md` |
| 变更名称 | `subagent-dispatch-migration` |
| 变更链接 | `openspec/changes/subagent-dispatch-migration/` |
| 完成日期 | `2026-05-01` |

## 回写内容摘要

### 变更状态

**已实现并验证通过。**

### 变更内容

结构性迁移：将 subagent-dispatch 从 `.pi/packages/` 路径以 package 方式注册，迁移至 `.pi/extensions/` 路径以 extension 方式注册，与其功能本质（注册 `dispatch` tool + `/dispatch` command）一致。

### Deliverables

1. **目录迁移**：`.pi/packages/subagent-dispatch/` → `.pi/extensions/subagent-dispatch/`（代码不变）
2. **settings.json 清理**：从 `packages` 数组移除 `./packages/subagent-dispatch`
3. **capabilities.yaml 更新**：`global.extensions` 新增 `subagent-dispatch`；`global.settings.packages` 移除旧路径（3 项）
4. **sync 脚本调整**：移除本地 package 路径渲染逻辑；`ensure_local_package_dependencies` → 通用 `ensure_extension_dependencies`
5. **全局 sync 已验证**：`~/.pi/agent/extensions/` 从 3 → 4 项；`~/.pi/agent/settings.json` packages 从 4 → 3 项

### 验证结论

全部 9 个实现/验证项通过。迁移后功能代码未修改，sync 脚本语法正确，manifest 声明与全局状态一致。
