# Verification: subagent-dispatch-migration

## 验证结果总览

| 检查项 | 结果 | 备注 |
|--------|------|------|
| 1.1 目录迁移 | ✅ 通过 | `.pi/packages/subagent-dispatch/` → `.pi/extensions/subagent-dispatch/` 完整迁移 |
| 1.2 .gitkeep 占位 | ✅ 通过 | `.pi/packages/.gitkeep` 已创建 |
| 2.1 settings.json 移除 | ✅ 通过 | `./packages/subagent-dispatch` 已从 `packages` 数组移除 |
| 2.2 capabilities.yaml 更新 | ✅ 通过 | `global.extensions` 含 `subagent-dispatch`；`global.settings.packages` 为 3 项 |
| 3.1 移除本地路径渲染 | ✅ 通过 | `LOCAL_PACKAGE_SOURCE` / `LOCAL_PACKAGE_ROOT` env 及 node 渲染逻辑已移除 |
| 3.2 通用 extension npm install | ✅ 通过 | `ensure_extension_dependencies` 已替换 `ensure_local_package_dependencies` |
| 3.3 移除冗余变量 | ✅ 通过 | `LOCAL_PACKAGE_REL` / `LOCAL_PACKAGE_SOURCE` / `LOCAL_PACKAGE_ROOT` 已删除 |
| 4.2 Sync 全局状态 | ✅ 通过 | `extensions/` 4 项（含 `subagent-dispatch/`）；`settings.json` packages 3 项 |
| 4.3 capabilities.yaml 一致性 | ✅ 通过 | 声明与现状一致 |

## 详细验证记录

### 1.1 目录迁移
```
$ ls .pi/extensions/subagent-dispatch/
core.js  index.ts  node_modules  package.json

$ ls .pi/packages/subagent-dispatch/
> No such file or directory
```

### 2.1 settings.json 移除
```json
$ node -e "const s=JSON.parse(fs.readFileSync('.pi/settings.json','utf8'));
  console.log(s.packages.includes('./packages/subagent-dispatch'))"
> false
```

### 2.2 capabilities.yaml
```
global.extensions: [dollar-skill-invoke, planner-toggle, output-scroll-viewer, subagent-dispatch]  // length=4
global.settings.packages: [npm:pi-ask-tool-extension, npm:@tmustier/pi-tab-status, npm:pi-powerline-footer]  // length=3
```

### 3.0 Sync 脚本调整
```
$ bash -n scripts/sync-pi-agent.sh → exit: 0（语法正确）
$ grep LOCAL_PACKAGE scripts/sync-pi-agent.sh → No matches
```

### 4.2 全局 sync 结果
```
~/.pi/agent/extensions/: 3 → 4 项（新增 subagent-dispatch/）
~/.pi/agent/settings.json packages: 4 → 3 项（旧绝对路径已移除）

$ ls ~/.pi/agent/extensions/subagent-dispatch/
core.js  index.ts  node_modules  package.json
```

## 未验证项
- **`pi -e` 加载验证**：未在当前会话中测试（需 Pi 重启或 `/reload`）
- **`/dispatch` 命令功能**：需 Pi 重启后验证
- **`obsidian-tools` extension 的 stale cleanup**：sync 未报告移除 `obsidian-tools`，正确（它不在 global.extensions 中，在 catalog 中）

## 结论

**状态：✅ 全部 9 个实现/验证项通过**

结构迁移已完成：
- 目录从 `packages/` → `extensions/`
- Manifest 从 `global.settings.packages` → `global.extensions`
- Sync 脚本已调整，移除旧渲染逻辑，支持通用 extension npm install
- 全局 sync 已验证：manifest 驱动的白名单/清理机制正常工作
